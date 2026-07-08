import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { generateId, generateShareId } from "@/lib/id/generate";
import { hashPassword } from "@/lib/auth/password";
import { computeExpiresAt, isValidExpiryOption, SHARE_PASSWORD_PATTERN } from "@/lib/share/expiry";
import { getGalleryUrl } from "@/lib/gallery";
import { applyOutputFormat } from "@/lib/image/convert-image";
import { buildOutputPdf } from "@/lib/pdf/build";
import {
  DEFAULT_IMAGE_OUTPUT_FORMAT,
  extensionForFormat,
  formatForMime,
  mimeForFormat,
} from "@/lib/image/format";

const MAX_IMAGES = 50;

/**
 * PDF編集画面(/admin/edit)で編集し終えた画像から、そのまま共有を作成するためのAPI。
 * 通常の共有作成(/api/admin/shares)がPDFを受け取ってページ画像へ変換するのに対し、
 * こちらはすでにブラウザ側で編集済みの画像をそのまま受け取る。編集画面の「形式変換」ツールで
 * 選ばれた形式(Blobのmimeタイプに反映済み)をそのまま尊重して再エンコードする。
 * outputFormatが"pdf"の場合は、各画像を1ページずつ持つ1つのPDFにまとめて保存する
 * (この場合は各画像の個別の形式選択より、まとめてPDF化する方を優先する)。
 */
export async function POST(request: NextRequest) {
  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "リクエストの形式が正しくありません" }, { status: 400 });
  }

  const files = formData.getAll("images").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "画像がありません" }, { status: 400 });
  }
  if (files.length > MAX_IMAGES) {
    return NextResponse.json({ error: `画像は${MAX_IMAGES}枚までです` }, { status: 400 });
  }

  const titleRaw = formData.get("title");
  const title = typeof titleRaw === "string" && titleRaw.trim() ? titleRaw.trim().slice(0, 200) : "編集した画像";

  const passwordRaw = formData.get("password");
  const password = typeof passwordRaw === "string" ? passwordRaw.trim() : "";
  if (password && !SHARE_PASSWORD_PATTERN.test(password)) {
    return NextResponse.json({ error: "パスワードは4〜8桁の数字で入力してください" }, { status: 400 });
  }

  const expiresInRaw = formData.get("expiresIn");
  const expiresIn = isValidExpiryOption(expiresInRaw) ? expiresInRaw : "none";

  const asPdf = formData.get("outputFormat") === "pdf";

  const shareId = generateShareId();
  const passwordHash = password ? await hashPassword(password) : null;

  if (asPdf) {
    const inputBuffers: Buffer[] = [];
    try {
      for (const file of files) {
        inputBuffers.push(Buffer.from(await file.arrayBuffer()));
      }
    } catch {
      return NextResponse.json({ error: "画像を読み込めませんでした" }, { status: 400 });
    }

    let pdfBuffer: Buffer;
    let thumbnailBuffer: Buffer;
    let thumbnailWidth: number;
    let thumbnailHeight: number;
    try {
      pdfBuffer = await buildOutputPdf(inputBuffers.map((buffer) => ({ kind: "image", buffer })));
      const thumbMeta = await sharp(inputBuffers[0]).metadata();
      if (!thumbMeta.width || !thumbMeta.height) throw new Error("invalid image");
      thumbnailBuffer = await applyOutputFormat(sharp(inputBuffers[0]), DEFAULT_IMAGE_OUTPUT_FORMAT).toBuffer();
      thumbnailWidth = thumbMeta.width;
      thumbnailHeight = thumbMeta.height;
    } catch {
      return NextResponse.json({ error: "PDFの作成に失敗しました" }, { status: 400 });
    }

    const thumbExtension = extensionForFormat(DEFAULT_IMAGE_OUTPUT_FORMAT);
    const pdfStorageKey = `${shareId}/document.pdf`;
    const thumbStorageKey = `${shareId}/page-1.${thumbExtension}`;

    try {
      await storage.put(pdfStorageKey, pdfBuffer, "application/pdf");
      await storage.put(thumbStorageKey, thumbnailBuffer, mimeForFormat(DEFAULT_IMAGE_OUTPUT_FORMAT));

      await prisma.share.create({
        data: {
          id: shareId,
          title,
          originalFilename: null,
          passwordHash,
          expiresAt: computeExpiresAt(expiresIn),
          pageCount: files.length,
          pdfStorageKey,
          pages: {
            create: [
              {
                id: generateId(),
                pageNumber: 1,
                storageKey: thumbStorageKey,
                width: thumbnailWidth,
                height: thumbnailHeight,
                byteSize: thumbnailBuffer.length,
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

  const pages: { pageNumber: number; buffer: Buffer; width: number; height: number; extension: string; mime: string }[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const format = formatForMime(file.type) ?? DEFAULT_IMAGE_OUTPUT_FORMAT;
    try {
      const inputBuffer = Buffer.from(await file.arrayBuffer());
      const metadata = await sharp(inputBuffer).metadata();
      if (!metadata.width || !metadata.height) {
        throw new Error("invalid image");
      }
      const buffer = await applyOutputFormat(sharp(inputBuffer), format).toBuffer();
      pages.push({
        pageNumber: i + 1,
        buffer,
        width: metadata.width,
        height: metadata.height,
        extension: extensionForFormat(format),
        mime: mimeForFormat(format),
      });
    } catch {
      return NextResponse.json({ error: `${i + 1}枚目の画像を読み込めませんでした` }, { status: 400 });
    }
  }

  try {
    for (const page of pages) {
      await storage.put(`${shareId}/page-${page.pageNumber}.${page.extension}`, page.buffer, page.mime);
    }

    await prisma.share.create({
      data: {
        id: shareId,
        title,
        originalFilename: null,
        passwordHash,
        expiresAt: computeExpiresAt(expiresIn),
        pageCount: pages.length,
        pages: {
          create: pages.map((p) => ({
            id: generateId(),
            pageNumber: p.pageNumber,
            storageKey: `${shareId}/page-${p.pageNumber}.${p.extension}`,
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
