import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const nextConfig: NextConfig = {
  // ネイティブバイナリを含むパッケージ・webpackバンドルと相性が悪いパッケージは
  // webpackにバンドルさせず、実行時にrequire/importさせる。
  // (@napi-rs/canvasはネイティブ.node バイナリのパースエラー回避のため。
  // pdfjs-distはlegacyビルドがglobalThisへのpolyfillパッチをOwnESM前提で行っており、
  // webpackでバンドルすると`Object.defineProperty called on non-object`で実行時エラーになるため)
  serverExternalPackages: ["@napi-rs/canvas", "pdfjs-dist"],
  // "X-Powered-By: Next.js"ヘッダーを送出しないようにし、フレームワークの指紋情報を減らす
  poweredByHeader: false,
};

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

export default withSerwist(nextConfig);
