import type { MetadataRoute } from "next";
import { getGalleryPath } from "@/lib/gallery";

// PWAとしてホーム画面から起動した際、ドメイン直下(/)は管理画面へのリダイレクトのみで
// 一般の閲覧者向けではないため、start_urlは常に閲覧用ギャラリーのランダムURLを指すようにする。
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "掲示板シェア",
    short_name: "掲示板シェア",
    description: "社内掲示物をスマホで簡単・安全に閲覧できる共有サービス",
    start_url: `/collection/${getGalleryPath()}`,
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    orientation: "portrait",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
