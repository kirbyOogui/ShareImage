export type ImageOutputFormat = "webp" | "jpeg" | "png";
export type OutputFormat = ImageOutputFormat | "pdf";

export const DEFAULT_IMAGE_OUTPUT_FORMAT: ImageOutputFormat = "jpeg";

// 非可逆形式(webp/jpeg)のエンコード品質。PNGは可逆のため対象外。
export const IMAGE_OUTPUT_QUALITY = 85;

interface FormatInfo<F extends string> {
  value: F;
  label: string;
  extension: string;
  mime: string;
}

export const IMAGE_OUTPUT_FORMATS: readonly FormatInfo<ImageOutputFormat>[] = [
  { value: "webp", label: "WebP", extension: "webp", mime: "image/webp" },
  { value: "jpeg", label: "JPEG", extension: "jpg", mime: "image/jpeg" },
  { value: "png", label: "PNG", extension: "png", mime: "image/png" },
];

// アップロード・共有作成時の選択肢。画像形式に加え「PDFとして保存(画像化しない)」を選べる。
export const OUTPUT_FORMATS: readonly FormatInfo<OutputFormat>[] = [
  ...IMAGE_OUTPUT_FORMATS,
  { value: "pdf", label: "PDFとして保存(画像化しない)", extension: "pdf", mime: "application/pdf" },
];

export function isImageOutputFormat(value: unknown): value is ImageOutputFormat {
  return value === "webp" || value === "jpeg" || value === "png";
}

export function isOutputFormat(value: unknown): value is OutputFormat {
  return isImageOutputFormat(value) || value === "pdf";
}

export function extensionForFormat(format: OutputFormat): string {
  return OUTPUT_FORMATS.find((f) => f.value === format)!.extension;
}

export function mimeForFormat(format: OutputFormat): string {
  return OUTPUT_FORMATS.find((f) => f.value === format)!.mime;
}

/** 拡張子(先頭のドット有無どちらでも可)からContent-Typeを引く。保存済みファイル配信用。 */
export function mimeForExtension(extension: string): string {
  const ext = extension.replace(/^\./, "").toLowerCase();
  const match = OUTPUT_FORMATS.find((f) => f.extension === ext || (ext === "jpeg" && f.extension === "jpg"));
  return match?.mime ?? "application/octet-stream";
}

/** MIMEタイプ(例: "image/jpeg")からImageOutputFormatを引く。 */
export function formatForMime(mime: string): ImageOutputFormat | null {
  const match = IMAGE_OUTPUT_FORMATS.find((f) => f.mime === mime);
  return match?.value ?? null;
}
