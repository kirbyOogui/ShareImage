// PWA用のアイコン・スプラッシュスクリーン一式を、提供されたソースPNGから生成する。
// 実行: npx tsx scripts/generate-icons.ts
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { SPLASH_SCREENS, splashFileName } from "../src/lib/pwa/splash-screens";

const SOURCE_ICON = path.resolve(process.cwd(), "ChatGPT Image 2026年7月6日 21_24_07.png");
const ICONS_DIR = path.resolve(process.cwd(), "public/icons");
const SPLASH_DIR = path.resolve(process.cwd(), "public/splash");
const FAVICON_PATH = path.resolve(process.cwd(), "src/app/favicon.ico");

const BACKGROUND = "#ffffff";

const ICON_SIZES = [192, 512];
const FAVICON_SIZES = [16, 32, 48];

/**
 * PNGをそのままフレームとして格納する簡易ICOコンテナを組み立てる
 * (Windows Vista以降・主要ブラウザはICO内のPNG圧縮フレームをサポートしているため、
 * 別途ico変換ライブラリを追加せずに複数解像度のfavicon.icoを生成できる)。
 */
function buildIco(frames: { size: number; png: Buffer }[]): Buffer {
  const HEADER_SIZE = 6;
  const ENTRY_SIZE = 16;
  const header = Buffer.alloc(HEADER_SIZE);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: 1 = icon
  header.writeUInt16LE(frames.length, 4);

  const entries: Buffer[] = [];
  const images: Buffer[] = [];
  let offset = HEADER_SIZE + ENTRY_SIZE * frames.length;

  for (const frame of frames) {
    const entry = Buffer.alloc(ENTRY_SIZE);
    entry.writeUInt8(frame.size >= 256 ? 0 : frame.size, 0); // width
    entry.writeUInt8(frame.size >= 256 ? 0 : frame.size, 1); // height
    entry.writeUInt8(0, 2); // color palette count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(frame.png.length, 8); // image data size
    entry.writeUInt32LE(offset, 12); // image data offset
    entries.push(entry);
    images.push(frame.png);
    offset += frame.png.length;
  }

  return Buffer.concat([header, ...entries, ...images]);
}

async function generateIcons() {
  await mkdir(ICONS_DIR, { recursive: true });

  for (const size of ICON_SIZES) {
    await sharp(SOURCE_ICON)
      .resize(size, size, { fit: "contain", background: BACKGROUND })
      .png()
      .toFile(path.join(ICONS_DIR, `icon-${size}.png`));
  }

  // maskable icon: OSがアイコンを円形/角丸等でトリミングしても主要素が欠けないよう、
  // コンテンツを80%に縮小し中央配置する(セーフゾーンの確保)。
  await sharp(SOURCE_ICON)
    .resize(Math.round(512 * 0.8), Math.round(512 * 0.8), { fit: "contain", background: BACKGROUND })
    .extend({
      top: Math.round(512 * 0.1),
      bottom: Math.round(512 * 0.1),
      left: Math.round(512 * 0.1),
      right: Math.round(512 * 0.1),
      background: BACKGROUND,
    })
    .png()
    .toFile(path.join(ICONS_DIR, "icon-maskable-512.png"));

  // apple-touch-icon: iOSは角丸処理を自動で行うため、透過なしの正方形画像を用意する。
  await sharp(SOURCE_ICON)
    .resize(180, 180, { fit: "contain", background: BACKGROUND })
    .flatten({ background: BACKGROUND })
    .png()
    .toFile(path.join(ICONS_DIR, "apple-touch-icon.png"));

  console.log(`アイコンを生成しました: ${ICONS_DIR}`);
}

async function generateFavicon() {
  const frames = await Promise.all(
    FAVICON_SIZES.map(async (size) => ({
      size,
      png: await sharp(SOURCE_ICON)
        .resize(size, size, { fit: "contain", background: BACKGROUND })
        .flatten({ background: BACKGROUND })
        .png()
        .toBuffer(),
    }))
  );
  await writeFile(FAVICON_PATH, buildIco(frames));
  console.log(`favicon.icoを生成しました: ${FAVICON_PATH}`);
}

async function generateSplashScreens() {
  await mkdir(SPLASH_DIR, { recursive: true });

  for (const spec of SPLASH_SCREENS) {
    const { width, height } = spec;
    // スプラッシュ画面: 白背景の中央にアイコンを配置する(画面の短辺の40%程度のサイズ感)。
    const iconSize = Math.round(Math.min(width, height) * 0.4);
    const icon = await sharp(SOURCE_ICON)
      .resize(iconSize, iconSize, { fit: "contain", background: BACKGROUND })
      .toBuffer();

    await sharp({
      create: { width, height, channels: 3, background: BACKGROUND },
    })
      .composite([
        {
          input: icon,
          left: Math.round((width - iconSize) / 2),
          top: Math.round((height - iconSize) / 2),
        },
      ])
      .png()
      .toFile(path.join(SPLASH_DIR, splashFileName(spec)));
  }

  console.log(`スプラッシュスクリーンを生成しました: ${SPLASH_DIR}(${SPLASH_SCREENS.length}種)`);
}

async function main() {
  await generateIcons();
  await generateFavicon();
  await generateSplashScreens();
}

main();
