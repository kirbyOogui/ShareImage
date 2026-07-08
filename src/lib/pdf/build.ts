import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { MediaConversionError } from "@/lib/upload/errors";

export interface BuildPdfInputFile {
  kind: "pdf" | "image";
  buffer: Buffer;
}

/**
 * 「PDFのまま(変換しない)」共有用のPDF組み立て。渡されたファイルを順番に、
 * PDFならそのページをすべてコピーし、画像なら1ページの画像として埋め込んで、
 * 1つのPDFに結合する(既存の複数PDF/画像混在アップロードと同じ「結合して1つの共有にする」
 * 挙動をPDFのまま実現する)。
 * 画像はPNG/JPEG以外(WebP等)をpdf-libが直接埋め込めないため、常に`sharp`でPNGへ
 * 正規化してから埋め込む。
 */
export async function buildOutputPdf(files: BuildPdfInputFile[]): Promise<Buffer> {
  const outDoc = await PDFDocument.create();

  for (const file of files) {
    if (file.kind === "pdf") {
      let srcDoc: PDFDocument;
      try {
        srcDoc = await PDFDocument.load(file.buffer);
      } catch {
        throw new MediaConversionError("PDFの読み込みに失敗しました。ファイルが破損している可能性があります");
      }
      const copiedPages = await outDoc.copyPages(srcDoc, srcDoc.getPageIndices());
      copiedPages.forEach((page) => outDoc.addPage(page));
    } else {
      const pngBuffer = await sharp(file.buffer).png().toBuffer();
      const image = await outDoc.embedPng(pngBuffer);
      const page = outDoc.addPage([image.width, image.height]);
      page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
    }
  }

  const bytes = await outDoc.save();
  return Buffer.from(bytes);
}

export async function getPdfPageCount(pdfBuffer: Buffer): Promise<number> {
  const doc = await PDFDocument.load(pdfBuffer);
  return doc.getPageCount();
}
