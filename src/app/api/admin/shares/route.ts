import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { generateId, generateShareId } from "@/lib/id/generate";
import { MediaValidationError, MediaConversionError } from "@/lib/upload/errors";
import { convertUploadsToPages } from "@/lib/upload/convert";
import { assertValidUpload } from "@/lib/upload/validate";
import { buildOutputPdf, getPdfPageCount } from "@/lib/pdf/build";
import { convertPdfToImagePages } from "@/lib/pdf/convert";
import { hashPassword } from "@/lib/auth/password";
import { computeExpiresAt, isValidExpiryOption, SHARE_PASSWORD_PATTERN } from "@/lib/share/expiry";
import { getGalleryUrl } from "@/lib/gallery";
import {
  DEFAULT_IMAGE_OUTPUT_FORMAT,
  extensionForFormat,
  isOutputFormat,
  mimeForFormat,
} from "@/lib/image/format";

export async function GET() {
  const shares = await prisma.share.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({
    shares: shares.map((s) => ({
      id: s.id,
      title: s.title,
      pageCount: s.pageCount,
      hasPassword: Boolean(s.passwordHash),
      expiresAt: s.expiresAt,
      status: s.status,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    })),
  });
}

export async function POST(request: NextRequest) {
  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "リクエストの形式が正しくありません" }, { status: 400 });
  }

  const files = formData.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "PDFまたは画像ファイルを選択してください" }, { status: 400 });
  }

  const titleRaw = formData.get("title");
  const title =
    typeof titleRaw === "string" && titleRaw.trim()
      ? titleRaw.trim().slice(0, 200)
      : files[0].name.replace(/\.[^.]+$/, "");

  const passwordRaw = formData.get("password");
  const password = typeof passwordRaw === "string" ? passwordRaw.trim() : "";
  if (password && !SHARE_PASSWORD_PATTERN.test(password)) {
    return NextResponse.json({ error: "パスワードは4〜8桁の数字で入力してください" }, { status: 400 });
  }

  const expiresInRaw = formData.get("expiresIn");
  const expiresIn = isValidExpiryOption(expiresInRaw) ? expiresInRaw : "none";

  const outputFormatRaw = formData.get("outputFormat");
  const outputFormat = isOutputFormat(outputFormatRaw) ? outputFormatRaw : DEFAULT_IMAGE_OUTPUT_FORMAT;

  const uploadFiles = await Promise.all(
    files.map(async (file) => ({ name: file.name, size: file.size, buffer: Buffer.from(await file.arrayBuffer()) }))
  );

  const shareId = generateShareId();
  const originalFilename = files.map((f) => f.name).join(", ").slice(0, 500);
  const passwordHash = password ? await hashPassword(password) : null;

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

    try {
      await storage.put(`${shareId}/document.pdf`, pdfBuffer, "application/pdf");
      await storage.put(`${shareId}/page-1.${thumbExtension}`, thumbnail.buffer, mimeForFormat(DEFAULT_IMAGE_OUTPUT_FORMAT));

      await prisma.share.create({
        data: {
          id: shareId,
          title,
          originalFilename,
          passwordHash,
          expiresAt: computeExpiresAt(expiresIn),
          pageCount,
          pdfStorageKey: `${shareId}/document.pdf`,
          pages: {
            create: [
              {
                id: generateId(),
                pageNumber: 1,
                storageKey: `${shareId}/page-1.${thumbExtension}`,
                width: thumbnail.width,
                height: thumbnail.height,
                byteSize: thumbnail.buffer.length,
              },
            ],
          },
        },
      });
    } catch (err) {
      await storage.deletePrefix(`${shareId}/`).catch(() => {});
      throw err;
    }

    return NextResponse.json({ shareId, url: getGalleryUrl() }, { status: 201 });
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

  try {
    for (const page of pages) {
      await storage.put(`${shareId}/page-${page.pageNumber}.${extension}`, page.buffer, mime);
    }

    await prisma.share.create({
      data: {
        id: shareId,
        title,
        originalFilename,
        passwordHash,
        expiresAt: computeExpiresAt(expiresIn),
        pageCount: pages.length,
        pages: {
          create: pages.map((p) => ({
            id: generateId(),
            pageNumber: p.pageNumber,
            storageKey: `${shareId}/page-${p.pageNumber}.${extension}`,
            width: p.width,
            height: p.height,
            byteSize: p.buffer.length,
          })),
        },
      },
    });
  } catch (err) {
    await storage.deletePrefix(`${shareId}/`).catch(() => {});
    throw err;
  }

  return NextResponse.json({ shareId, url: getGalleryUrl() }, { status: 201 });
}
