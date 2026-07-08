import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { SPLASH_SCREENS, splashFileName, splashMediaQuery } from "@/lib/pwa/splash-screens";
import "./globals.css";

export const metadata: Metadata = {
  title: "掲示板シェア",
  description: "社内掲示物をスマホで簡単・安全に閲覧できる共有サービス",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "掲示板シェア",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  other: {
    // Next.jsのappleWebApp.capableは標準の"mobile-web-app-capable"のみ出力するため、
    // 旧バージョンのiOSでもスタンドアロン表示を認識させるためのレガシータグを別途追加する。
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // proxy.tsが発行したnonceをheaders()経由で読むことで、Next.js自身が生成する
  // インラインスクリプト/バンドルスクリプトにCSPのnonceが自動的に付与されるようになる
  // (読まないとNext.jsがCSP適用中であることを検知できず、nonce無しでスクリプトを出力してしまう)。
  await headers();
  return (
    <html lang="ja" className="h-full antialiased">
      <head>
        {/* iOSのapple-touch-startup-imageはMetadata APIが対応していないため、機種別に手動で列挙する */}
        {SPLASH_SCREENS.map((spec) => (
          <link
            key={spec.name}
            rel="apple-touch-startup-image"
            href={`/splash/${splashFileName(spec)}`}
            media={splashMediaQuery(spec)}
          />
        ))}
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">{children}</body>
    </html>
  );
}
