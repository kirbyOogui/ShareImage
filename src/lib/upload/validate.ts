import { MediaValidationError } from "./errors";

export const MAX_UPLOAD_SIZE_BYTES = 30 * 1024 * 1024; // 30MB
export const MAX_UPLOAD_PAGES = 50;

export type UploadKind = "pdf" | "image";

const PDF_MAGIC_BYTES = Buffer.from("%PDF-", "ascii");
const PNG_MAGIC_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);

function isPng(buffer: Buffer): boolean {
  return buffer.length >= PNG_MAGIC_BYTES.length && buffer.subarray(0, PNG_MAGIC_BYTES.length).equals(PNG_MAGIC_BYTES);
}

function isJpeg(buffer: Buffer): boolean {
  return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
}

function isWebp(buffer: Buffer): boolean {
  return (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  );
}

/**
 * 拡張子とマジックバイトの二重チェックで、拡張子偽装ファイルを拒否しつつ
 * PDF/画像(JPEG・PNG・WebP)のどちらとしてアップロードされたかを判定する。
 */
export function assertValidUpload(file: { name: string; size: number }, buffer: Buffer): UploadKind {
  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    throw new MediaValidationError(
      `ファイルサイズが上限(${MAX_UPLOAD_SIZE_BYTES / 1024 / 1024}MB)を超えています`
    );
  }

  const extension = file.name.toLowerCase().split(".").pop() ?? "";

  if (extension === "pdf") {
    if (buffer.length < PDF_MAGIC_BYTES.length || !buffer.subarray(0, 5).equals(PDF_MAGIC_BYTES)) {
      throw new MediaValidationError(
        "ファイルの内容がPDF形式ではありません(拡張子を偽装したファイルは許可されません)"
      );
    }
    return "pdf";
  }

  if (IMAGE_EXTENSIONS.has(extension)) {
    if (!isPng(buffer) && !isJpeg(buffer) && !isWebp(buffer)) {
      throw new MediaValidationError(
        "ファイルの内容が画像形式(JPEG/PNG/WebP)ではありません(拡張子を偽装したファイルは許可されません)"
      );
    }
    return "image";
  }

  throw new MediaValidationError("PDF、またはJPEG/PNG/WebP画像ファイルのみアップロードできます");
}
