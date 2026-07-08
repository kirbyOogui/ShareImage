import { assertValidUpload, MAX_UPLOAD_PAGES } from "./validate";
import { MediaConversionError } from "./errors";
import { convertPdfToImagePages, type ConvertedPage } from "@/lib/pdf/convert";
import { convertImageToPage } from "@/lib/image/convert-image";
import { DEFAULT_IMAGE_OUTPUT_FORMAT, type ImageOutputFormat } from "@/lib/image/format";

export interface UploadFile {
  name: string;
  size: number;
  buffer: Buffer;
}

/**
 * 共有作成・差し替え時のアップロードを1本化する入口。PDFと画像ファイルが混在していても、
 * 渡された順にページとして結合し、通し番号を振り直す(既存の複数PDF結合と同じ挙動)。
 * assertValidUploadで拡張子偽装ファイルは事前に弾かれている前提。
 */
export async function convertUploadsToPages(
  files: UploadFile[],
  format: ImageOutputFormat = DEFAULT_IMAGE_OUTPUT_FORMAT
): Promise<ConvertedPage[]> {
  const merged: ConvertedPage[] = [];

  for (const file of files) {
    const kind = assertValidUpload({ name: file.name, size: file.size }, file.buffer);
    if (kind === "pdf") {
      const pages = await convertPdfToImagePages(file.buffer, format);
      merged.push(...pages);
    } else {
      const page = await convertImageToPage(file.buffer, format);
      merged.push({ pageNumber: 0, ...page });
    }
  }

  if (merged.length > MAX_UPLOAD_PAGES) {
    throw new MediaConversionError(
      `合計ページ数が上限(${MAX_UPLOAD_PAGES}ページ)を超えています(${merged.length}ページ)`
    );
  }

  return merged.map((page, index) => ({ ...page, pageNumber: index + 1 }));
}
