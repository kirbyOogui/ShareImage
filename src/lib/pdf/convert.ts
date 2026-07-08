import path from "node:path";
import { createCanvas, DOMMatrix, ImageData, Path2D, type Canvas } from "@napi-rs/canvas";
import { MAX_UPLOAD_PAGES } from "@/lib/upload/validate";
import { MediaConversionError } from "@/lib/upload/errors";
import { DEFAULT_IMAGE_OUTPUT_FORMAT, IMAGE_OUTPUT_QUALITY, type ImageOutputFormat } from "@/lib/image/format";

// pdfjs-distはNode環境で動作する際、globalThisにPath2D/DOMMatrix/ImageDataが
// 無ければ自動的に@napi-rs/canvasから読み込んでポリフィルする(pdf.mjs内の`isNodeJS`分岐)。
// ところが、その内部require(`createRequire(import.meta.url)`経由)がこのファイルの
// importとは別インスタンスの@napi-rs/canvasを読み込んでしまうことがあり、結果として
// 埋め込みフォント(Word/Excel印刷PDF等でよく使われる)のグリフをPath2Dで描画する際に、
// pdfjs側が生成したPath2Dインスタンスと、このファイルでcreateCanvasしたcontextの
// ネイティブ実装が別クラス扱いになり、`ctx.fill(path)`が
// `Value is none of these types \`String\`, \`Path\`,`で失敗していた
// (標準14フォントの文字はネイティブfillTextの別経路を通るため気づかれにくい)。
// pdfjs-dist側のポリフィルは「まだ設定されていなければ」だけ行うため、
// 先にこのファイルがimportした同一インスタンスのクラスをglobalThisへ設定しておくことで解決する。
const globalScope = globalThis as unknown as Record<"Path2D" | "DOMMatrix" | "ImageData", unknown>;
globalScope.Path2D ??= Path2D;
globalScope.DOMMatrix ??= DOMMatrix;
globalScope.ImageData ??= ImageData;

export interface ConvertedPage {
  pageNumber: number;
  buffer: Buffer;
  width: number;
  height: number;
}

// 出力画像のサイズ方針:
// - 基準スケール(scale=1)でのページ幅がMIN_OUTPUT_WIDTHに満たない場合は拡大し、
//   小さな文字が潰れないようにする(最大MAX_SCALEまで)。
// - どれだけ拡大しても長辺がMAX_OUTPUT_DIMENSIONを超えないよう縮小する(転送量・メモリの上限)。
const MIN_OUTPUT_WIDTH = 1600;
export const MAX_OUTPUT_DIMENSION = 2480;
const MIN_SCALE = 2.0;
const MAX_SCALE = 3.0;

const pdfjsDistRoot = path.join(process.cwd(), "node_modules", "pdfjs-dist");

// pdfjs-distはcMapUrl/standardFontDataUrlを"file:// URL相当"の文字列として扱うため、
// Windowsのバックスラッシュ区切りではなく常にスラッシュ区切り+末尾スラッシュにする必要がある。
function toFactoryUrl(...segments: string[]): string {
  return path.join(...segments).split(path.sep).join("/") + "/";
}

function computeScale(baseWidth: number, baseHeight: number): number {
  const rawScale = MIN_OUTPUT_WIDTH / baseWidth;
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, rawScale));
  const longestSide = Math.max(baseWidth, baseHeight) * scale;
  if (longestSide > MAX_OUTPUT_DIMENSION) {
    return scale * (MAX_OUTPUT_DIMENSION / longestSide);
  }
  return scale;
}

function encodeCanvas(canvas: Canvas, format: ImageOutputFormat): Buffer {
  if (format === "png") {
    return canvas.toBuffer("image/png");
  }
  return canvas.toBuffer(format === "jpeg" ? "image/jpeg" : "image/webp", IMAGE_OUTPUT_QUALITY);
}

/**
 * PDFの各ページをスマホで文字が潰れない高画質画像に変換する。
 * pdfjs-dist(pure-JS PDFパーサ)+ @napi-rs/canvas(ネイティブラスタライズ、Windows含めprebuiltバイナリ)を使用し、
 * Ghostscript/Poppler等の外部バイナリには一切依存しない。
 */
export async function convertPdfToImagePages(
  pdfBuffer: Buffer,
  format: ImageOutputFormat = DEFAULT_IMAGE_OUTPUT_FORMAT,
  options?: { maxPages?: number }
): Promise<ConvertedPage[]> {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const loadingTask = getDocument({
    data: new Uint8Array(pdfBuffer),
    useSystemFonts: true,
    isEvalSupported: false,
    cMapUrl: toFactoryUrl(pdfjsDistRoot, "cmaps"),
    cMapPacked: true,
    standardFontDataUrl: toFactoryUrl(pdfjsDistRoot, "standard_fonts"),
  });

  let pdfDocument: Awaited<typeof loadingTask.promise>;
  try {
    pdfDocument = await loadingTask.promise;
  } catch {
    throw new MediaConversionError("PDFの読み込みに失敗しました。ファイルが破損している可能性があります");
  }

  try {
    if (pdfDocument.numPages < 1) {
      throw new MediaConversionError("PDFにページが含まれていません");
    }
    if (pdfDocument.numPages > MAX_UPLOAD_PAGES) {
      throw new MediaConversionError(
        `ページ数が上限(${MAX_UPLOAD_PAGES}ページ)を超えています(${pdfDocument.numPages}ページ)`
      );
    }

    const pages: ConvertedPage[] = [];
    // サムネイル用途など「先頭の数ページだけでよい」場合に、残りのページを無駄に
    // ラスタライズしないための上限(ページ数超過チェック自体は常に全ページ数で行う)。
    const pagesToRender = Math.min(pdfDocument.numPages, options?.maxPages ?? pdfDocument.numPages);

    // ページ毎に逐次処理(並列化するとメモリ使用量が跳ね上がるため、あえて直列に処理する)
    for (let pageNumber = 1; pageNumber <= pagesToRender; pageNumber++) {
      const page = await pdfDocument.getPage(pageNumber);
      try {
        const baseViewport = page.getViewport({ scale: 1 });
        const scale = computeScale(baseViewport.width, baseViewport.height);
        const viewport = page.getViewport({ scale });

        const width = Math.max(1, Math.round(viewport.width));
        const height = Math.max(1, Math.round(viewport.height));
        const canvas: Canvas = createCanvas(width, height);
        const context = canvas.getContext("2d");
        // pdfjs-distはCanvasRenderingContext2D相当のAPIを要求するが、
        // @napi-rs/canvasのcontextは公式にサポートされたNode向け実装のため安全にキャストする。
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, width, height);

        const renderTask = page.render({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          canvasContext: context as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          canvas: canvas as any,
          viewport,
        });
        await renderTask.promise;

        const buffer = encodeCanvas(canvas, format);
        pages.push({ pageNumber, buffer, width, height });
      } finally {
        page.cleanup();
      }
    }

    return pages;
  } finally {
    await pdfDocument.destroy();
  }
}

/**
 * 複数のPDFを1つの共有として扱うため、渡された順に変換して結合し、ページ番号を
 * 通し番号(1ファイル目→2ファイル目→…の連番)に振り直す。合計ページ数がMAX_UPLOAD_PAGESを
 * 超える場合はエラーにする(単一ファイルの上限チェックはconvertPdfToImagePages内で別途行われる)。
 */
export async function convertPdfsToImagePages(
  pdfBuffers: Buffer[],
  format: ImageOutputFormat = DEFAULT_IMAGE_OUTPUT_FORMAT
): Promise<ConvertedPage[]> {
  const merged: ConvertedPage[] = [];
  for (const buffer of pdfBuffers) {
    const pages = await convertPdfToImagePages(buffer, format);
    merged.push(...pages);
  }

  if (merged.length > MAX_UPLOAD_PAGES) {
    throw new MediaConversionError(
      `合計ページ数が上限(${MAX_UPLOAD_PAGES}ページ)を超えています(${merged.length}ページ)`
    );
  }

  return merged.map((page, index) => ({ ...page, pageNumber: index + 1 }));
}
