import sharp from "sharp";
import { MediaConversionError } from "@/lib/upload/errors";
import { MAX_OUTPUT_DIMENSION } from "@/lib/pdf/convert";
import { DEFAULT_IMAGE_OUTPUT_FORMAT, IMAGE_OUTPUT_QUALITY, type ImageOutputFormat } from "./format";

type SharpPipeline = ReturnType<typeof sharp>;

function applyOutputFormat(pipeline: SharpPipeline, format: ImageOutputFormat): SharpPipeline {
  switch (format) {
    case "jpeg":
      return pipeline.jpeg({ quality: IMAGE_OUTPUT_QUALITY });
    case "png":
      return pipeline.png();
    default:
      return pipeline.webp({ quality: IMAGE_OUTPUT_QUALITY });
  }
}

export interface ConvertedImagePage {
  buffer: Buffer;
  width: number;
  height: number;
}

/**
 * PDFではなく画像ファイル(JPEG/PNG/WebP)がそのまま共有・編集対象としてアップロードされた場合に、
 * PDFページ変換と同じ最大寸法の制約(MAX_OUTPUT_DIMENSION)を適用しつつ、指定形式へ再エンコードする。
 * EXIFの回転情報は`.rotate()`で正しい向きに補正してから処理する。
 */
export async function convertImageToPage(
  buffer: Buffer,
  format: ImageOutputFormat = DEFAULT_IMAGE_OUTPUT_FORMAT
): Promise<ConvertedImagePage> {
  let pipeline = sharp(buffer, { failOn: "none" }).rotate();

  const metadata = await pipeline.metadata();
  if (!metadata.width || !metadata.height) {
    throw new MediaConversionError("画像を読み込めませんでした。ファイルが破損している可能性があります");
  }

  pipeline = pipeline.resize({
    width: MAX_OUTPUT_DIMENSION,
    height: MAX_OUTPUT_DIMENSION,
    fit: "inside",
    withoutEnlargement: true,
  });
  pipeline = applyOutputFormat(pipeline, format);

  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
  return { buffer: data, width: info.width, height: info.height };
}

export { applyOutputFormat };
