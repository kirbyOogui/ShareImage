import { NextResponse, type NextRequest } from "next/server";
import { assertValidUpload } from "@/lib/upload/validate";
import { MediaValidationError, MediaConversionError } from "@/lib/upload/errors";
import { convertPdfToImagePages } from "@/lib/pdf/convert";
import { convertImageToPage } from "@/lib/image/convert-image";
import { DEFAULT_IMAGE_OUTPUT_FORMAT, mimeForFormat } from "@/lib/image/format";

/**
 * PDF編集画面向け。共有の作成は一切行わず、PDF or 画像ファイルを画像ページへ変換して
 * そのままdata URLとして返すだけ(編集セッションはブラウザ側のメモリ上で完結させる)。
 */
export async function POST(request: NextRequest) {
  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "リクエストの形式が正しくありません" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "PDFまたは画像ファイルを選択してください" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let kind: "pdf" | "image";
  try {
    kind = assertValidUpload({ name: file.name, size: file.size }, buffer);
  } catch (err) {
    if (err instanceof MediaValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  const format = DEFAULT_IMAGE_OUTPUT_FORMAT;
  const mime = mimeForFormat(format);

  try {
    if (kind === "pdf") {
      const pages = await convertPdfToImagePages(buffer, format);
      return NextResponse.json({
        pages: pages.map((p) => ({
          pageNumber: p.pageNumber,
          width: p.width,
          height: p.height,
          format,
          dataUrl: `data:${mime};base64,${p.buffer.toString("base64")}`,
        })),
      });
    }

    const page = await convertImageToPage(buffer, format);
    return NextResponse.json({
      pages: [
        {
          pageNumber: 1,
          width: page.width,
          height: page.height,
          format,
          dataUrl: `data:${mime};base64,${page.buffer.toString("base64")}`,
        },
      ],
    });
  } catch (err) {
    if (err instanceof MediaConversionError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
