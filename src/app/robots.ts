import type { MetadataRoute } from "next";

// 社内限定の非公開サービスのため、検索エンジンによるクロールを全面的に拒否する
// (X-Robots-Tagヘッダーによる制御と合わせた多層防御)。
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
