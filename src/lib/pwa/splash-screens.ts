// iOSのapple-touch-startup-imageは「CSS論理ピクセル×デバイスピクセル比」の組み合わせでしか
// マッチしないため、生成する画像の実ピクセルサイズ(width/height)とは別に、機種ごとのCSS論理サイズ(cssWidth/cssHeight)
// とデバイスピクセル比(ratio)を保持する。generate-icons.ts(画像生成)とlayout.tsx(<link>タグ生成)の
// 両方がこの1箇所を参照することで、サイズ定義の重複・食い違いを防ぐ。
export interface SplashScreenSpec {
  name: string;
  width: number;
  height: number;
  cssWidth: number;
  cssHeight: number;
  ratio: number;
}

// 現行〜近年の主要iPhone/iPadの縦向き解像度。新機種が出た場合はここに追記する。
export const SPLASH_SCREENS: SplashScreenSpec[] = [
  { name: "iphone-se", width: 640, height: 1136, cssWidth: 320, cssHeight: 568, ratio: 2 },
  { name: "iphone-6-7-8", width: 750, height: 1334, cssWidth: 375, cssHeight: 667, ratio: 2 },
  { name: "iphone-xr-11", width: 828, height: 1792, cssWidth: 414, cssHeight: 896, ratio: 2 },
  { name: "iphone-x-xs-11pro", width: 1125, height: 2436, cssWidth: 375, cssHeight: 812, ratio: 3 },
  { name: "iphone-12-13-14-15", width: 1170, height: 2532, cssWidth: 390, cssHeight: 844, ratio: 3 },
  { name: "iphone-15-16", width: 1179, height: 2556, cssWidth: 393, cssHeight: 852, ratio: 3 },
  { name: "iphone-xsmax-11promax", width: 1242, height: 2688, cssWidth: 414, cssHeight: 896, ratio: 3 },
  { name: "iphone-12-13-14-promax", width: 1284, height: 2778, cssWidth: 428, cssHeight: 926, ratio: 3 },
  { name: "ipad-9-7", width: 1536, height: 2048, cssWidth: 768, cssHeight: 1024, ratio: 2 },
  { name: "ipad-10-2", width: 1620, height: 2160, cssWidth: 810, cssHeight: 1080, ratio: 2 },
  { name: "ipad-pro-11", width: 1668, height: 2388, cssWidth: 834, cssHeight: 1194, ratio: 2 },
  { name: "ipad-pro-12-9", width: 2048, height: 2732, cssWidth: 1024, cssHeight: 1366, ratio: 2 },
];

export function splashFileName(spec: SplashScreenSpec): string {
  return `${spec.name}-${spec.width}x${spec.height}.png`;
}

export function splashMediaQuery(spec: SplashScreenSpec): string {
  return `(device-width: ${spec.cssWidth}px) and (device-height: ${spec.cssHeight}px) and (-webkit-device-pixel-ratio: ${spec.ratio}) and (orientation: portrait)`;
}
