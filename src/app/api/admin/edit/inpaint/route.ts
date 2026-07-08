import { NextResponse, type NextRequest } from "next/server";
import Replicate from "replicate";
import sharp from "sharp";

// Replicateでホストされている LaMa(Resolution-robust Large Mask Inpainting with
// Fourier Convolutions)モデル。テキストプロンプトを使わない純粋な画像インペインティングモデルで、
// マスク外の領域をほぼそのまま保持する設計のため、gpt-image-1のような汎用画像生成モデルと違い
// ページ全体が歪む問題が起きにくい。
// このモデルは「公式モデル」化されておらず、owner/nameのみの指定では404になるため、
// バージョンハッシュ(https://replicate.com/allenhooo/lama/versions の最新版)まで固定して指定する。
const DEFAULT_LAMA_MODEL = "allenhooo/lama:cdac78a1bec5b23c07fd29692fb70baa513ea403a39e643c48ec5edadb15fe72";

function parseDataUrl(dataUrl: unknown): Buffer {
  if (typeof dataUrl !== "string") {
    throw new Error("invalid data url");
  }
  const match = /^data:image\/[a-zA-Z0-9.+-]+;base64,(.*)$/.exec(dataUrl);
  if (!match) {
    throw new Error("invalid data url");
  }
  return Buffer.from(match[1], "base64");
}

/** ReplicateのFileOutput(blob()/url()を持つストリーム)・URL文字列・配列のいずれでも結果を取り出せるようにする */
async function extractOutputBuffer(output: unknown): Promise<Buffer | null> {
  const item = Array.isArray(output) ? output[0] : output;
  if (!item) return null;

  if (typeof item === "string") {
    const res = await fetch(item);
    return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
  }

  if (typeof item === "object") {
    const maybeBlob = item as { blob?: () => Promise<Blob> };
    if (typeof maybeBlob.blob === "function") {
      const blob = await maybeBlob.blob();
      return Buffer.from(await blob.arrayBuffer());
    }
    const maybeUrl = item as { url?: () => URL | string };
    if (typeof maybeUrl.url === "function") {
      const url = maybeUrl.url();
      const res = await fetch(url.toString());
      return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
    }
  }

  return null;
}

/**
 * 画像+マスク(消したい範囲を透明にしたPNG)を受け取り、Replicate経由でLaMaモデルを呼び出して
 * マスク範囲を周囲となじむよう自然に塗りつぶした画像を返す(いわゆる「消しゴムマジック」)。
 * このアプリのマスクcanvasは「不透明=保持、透明=修復対象」というアルファチャンネル方式
 * (元々OpenAIのマスク仕様向けに作った)だが、LaMaは「白=修復対象、黒=保持」という濃淡画像を
 * 要求するため、アルファチャンネルを抽出・反転してグレースケールマスクに変換してから渡す。
 */
export async function POST(request: NextRequest) {
  const apiToken = process.env.REPLICATE_API_TOKEN;
  if (!apiToken) {
    return NextResponse.json(
      { error: "REPLICATE_API_TOKEN が設定されていません。.envに設定してください" },
      { status: 500 }
    );
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "リクエストの形式が正しくありません" }, { status: 400 });
  }

  const width = Number(body.width);
  const height = Number(body.height);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    return NextResponse.json({ error: "画像サイズの指定が不正です" }, { status: 400 });
  }

  let imageBuffer: Buffer;
  let maskBuffer: Buffer;
  try {
    imageBuffer = parseDataUrl(body.image);
    maskBuffer = parseDataUrl(body.mask);
  } catch {
    return NextResponse.json({ error: "画像・マスクの形式が不正です" }, { status: 400 });
  }

  const lamaMaskBuffer = await sharp(maskBuffer)
    .ensureAlpha()
    .extractChannel("alpha")
    .negate()
    .png()
    .toBuffer();

  const replicate = new Replicate({ auth: apiToken });
  const model = (process.env.REPLICATE_LAMA_MODEL || DEFAULT_LAMA_MODEL) as
    | `${string}/${string}`
    | `${string}/${string}:${string}`;

  try {
    const output = await replicate.run(model, {
      input: {
        image: `data:image/png;base64,${imageBuffer.toString("base64")}`,
        mask: `data:image/png;base64,${lamaMaskBuffer.toString("base64")}`,
      },
    });

    const resultBuffer = await extractOutputBuffer(output);
    if (!resultBuffer) {
      return NextResponse.json({ error: "AI画像編集の結果が空でした" }, { status: 502 });
    }

    // LaMaは基本的に入力と同じ解像度で返すが、念のためサイズが異なる場合だけ
    // 縦横比を保ったまま(引き伸ばさずに)要求サイズへ合わせる。
    const metadata = await sharp(resultBuffer).metadata();
    const needsResize = metadata.width !== width || metadata.height !== height;
    const finalBuffer = needsResize
      ? await sharp(resultBuffer).resize(width, height, { fit: "cover", position: "centre" }).png().toBuffer()
      : await sharp(resultBuffer).png().toBuffer();

    return NextResponse.json({ dataUrl: `data:image/png;base64,${finalBuffer.toString("base64")}` });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI画像編集に失敗しました";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
