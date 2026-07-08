import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { generateId } from "@/lib/id/generate";
import { MediaValidationError, MediaConversionError } from "@/lib/upload/errors";
import { convertUploadsToPages } from "@/lib/upload/convert";
import { assertValidUpload } from "@/lib/upload/validate";
import { buildOutputPdf, getPdfPageCount } from "@/lib/pdf/build";
import { convertPdfToImagePages } from "@/lib/pdf/convert";
import { hashPassword } from "@/lib/auth/password";
import { computeExpiresAt, isValidExpiryOption, SHARE_PASSWORD_PATTERN } from "@/lib/share/expiry";
import {
  DEFAULT_IMAGE_OUTPUT_FORMAT,
  extensionForFormat,
  isOutputFormat,
  mimeForFormat,
} from "@/lib/image/format";

interface RouteParams {
  params: Promise<{ shareId: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { shareId } = await params;
  const share = await prisma.share.findUnique({
    where: { id: shareId },
    include: { pages: { orderBy: { pageNumber: "asc" } } },
  });
  if (!share) {
    return NextResponse.json({ error: "共有が見つかりません" }, { status: 404 });
  }
  return NextResponse.json({
    share: {
      id: share.id,
      title: share.title,
      pageCount: share.pageCount,
      hasPassword: Boolean(share.passwordHash),
      hasPdf: Boolean(share.pdfStorageKey),
      expiresAt: share.expiresAt,
      status: share.status,
      createdAt: share.createdAt,
      updatedAt: share.updatedAt,
    },
    pages: share.pages.map((p) => ({ pageNumber: p.pageNumber, width: p.width, height: p.height })),
  });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { shareId } = await params;
  const existing = await prisma.share.findUnique({
    where: { id: shareId },
    include: { pages: { orderBy: { pageNumber: "asc" } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "共有が見つかりません" }, { status: 404 });
  }

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const files = formData.getAll("files").filter((f): f is File => f instanceof File);
    if (files.length === 0) {
      return NextResponse.json({ error: "PDFまたは画像ファイルを選択してください" }, { status: 400 });
    }

    const outputFormatRaw = formData.get("outputFormat");
    const outputFormat = isOutputFormat(outputFormatRaw) ? outputFormatRaw : DEFAULT_IMAGE_OUTPUT_FORMAT;

    const uploadFiles = await Promise.all(
      files.map(async (file) => ({ name: file.name, size: file.size, buffer: Buffer.from(await file.arrayBuffer()) }))
    );

    const originalFilename = files.map((f) => f.name).join(", ").slice(0, 500);

    // 差し替え後に不要となった旧ファイル(ページ画像・PDF本体)を、新規書き込み後にまとめて掃除する。
    async function cleanupOldFiles(keepKeys: Set<string>) {
      for (const oldPage of existing!.pages) {
        if (!keepKeys.has(oldPage.storageKey)) {
          await storage.delete(oldPage.storageKey).catch(() => {});
        }
      }
      if (existing!.pdfStorageKey && !keepKeys.has(existing!.pdfStorageKey)) {
        await storage.delete(existing!.pdfStorageKey).catch(() => {});
      }
    }

    if (outputFormat === "pdf") {
      let pdfBuffer: Buffer;
      let thumbnail;
      try {
        const kinds = uploadFiles.map((f) => assertValidUpload({ name: f.name, size: f.size }, f.buffer));
        pdfBuffer = await buildOutputPdf(uploadFiles.map((f, i) => ({ kind: kinds[i], buffer: f.buffer })));
        const [firstPage] = await convertPdfToImagePages(pdfBuffer, DEFAULT_IMAGE_OUTPUT_FORMAT, { maxPages: 1 });
        thumbnail = firstPage;
      } catch (err) {
        if (err instanceof MediaValidationError || err instanceof MediaConversionError) {
          return NextResponse.json({ error: err.message }, { status: 400 });
        }
        throw err;
      }

      const pageCount = await getPdfPageCount(pdfBuffer);
      const thumbExtension = extensionForFormat(DEFAULT_IMAGE_OUTPUT_FORMAT);
      const pdfStorageKey = `${shareId}/document.pdf`;
      const thumbStorageKey = `${shareId}/page-1.${thumbExtension}`;

      await storage.put(pdfStorageKey, pdfBuffer, "application/pdf");
      await storage.put(thumbStorageKey, thumbnail.buffer, mimeForFormat(DEFAULT_IMAGE_OUTPUT_FORMAT));

      await prisma.$transaction([
        prisma.page.deleteMany({ where: { shareId } }),
        prisma.page.create({
          data: {
            id: generateId(),
            shareId,
            pageNumber: 1,
            storageKey: thumbStorageKey,
            width: thumbnail.width,
            height: thumbnail.height,
            byteSize: thumbnail.buffer.length,
          },
        }),
        prisma.share.update({
          where: { id: shareId },
          data: { pageCount, originalFilename, status: "ACTIVE", pdfStorageKey },
        }),
      ]);

      await cleanupOldFiles(new Set([pdfStorageKey, thumbStorageKey]));
      return NextResponse.json({ ok: true });
    }

    let pages;
    try {
      pages = await convertUploadsToPages(uploadFiles, outputFormat);
    } catch (err) {
      if (err instanceof MediaValidationError || err instanceof MediaConversionError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      throw err;
    }

    const extension = extensionForFormat(outputFormat);
    const mime = mimeForFormat(outputFormat);

    // 先に新しい画像を書き込んでからDBを更新し、最後に旧ページを削除する
    // (途中で失敗しても閲覧不能になる時間を最小化するため)
    for (const page of pages) {
      await storage.put(`${shareId}/page-${page.pageNumber}.${extension}`, page.buffer, mime);
    }

    await prisma.$transaction([
      prisma.page.deleteMany({ where: { shareId } }),
      prisma.page.createMany({
        data: pages.map((p) => ({
          id: generateId(),
          shareId,
          pageNumber: p.pageNumber,
          storageKey: `${shareId}/page-${p.pageNumber}.${extension}`,
          width: p.width,
          height: p.height,
          byteSize: p.buffer.length,
        })),
      }),
      prisma.share.update({
        where: { id: shareId },
        data: { pageCount: pages.length, originalFilename, status: "ACTIVE", pdfStorageKey: null },
      }),
    ]);

    await cleanupOldFiles(new Set(pages.map((p) => `${shareId}/page-${p.pageNumber}.${extension}`)));

    return NextResponse.json({ ok: true });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "リクエストの形式が正しくありません" }, { status: 400 });
  }

  const data: { title?: string; passwordHash?: string | null; expiresAt?: Date | null } = {};

  if (typeof body.title === "string") {
    data.title = body.title.trim().slice(0, 200);
  }

  if (typeof body.password === "string") {
    if (body.password === "") {
      data.passwordHash = null;
    } else if (SHARE_PASSWORD_PATTERN.test(body.password)) {
      data.passwordHash = await hashPassword(body.password);
    } else {
      return NextResponse.json(
        { error: "パスワードは4〜8桁の数字で入力してください" },
        { status: 400 }
      );
    }
  }

  if (typeof body.expiresIn === "string") {
    if (!isValidExpiryOption(body.expiresIn)) {
      return NextResponse.json({ error: "有効期限の指定が不正です" }, { status: 400 });
    }
    data.expiresAt = computeExpiresAt(body.expiresIn);
  }

  const updated = await prisma.share.update({ where: { id: shareId }, data });
  return NextResponse.json({ ok: true, share: { id: updated.id, updatedAt: updated.updatedAt } });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { shareId } = await params;
  const existing = await prisma.share.findUnique({ where: { id: shareId } });
  if (!existing) {
    return NextResponse.json({ error: "共有が見つかりません" }, { status: 404 });
  }

  await storage.deletePrefix(`${shareId}/`);
  await prisma.share.delete({ where: { id: shareId } });

  return new NextResponse(null, { status: 204 });
}
