import { redirect } from "next/navigation";
import { getGalleryPath } from "@/lib/gallery";

/**
 * 管理画面はランダムトークンURL(/a/{token})配下にしか存在しないため、
 * サイトのルートをそこへリダイレクトすると秘密のトークンをLocationヘッダーで
 * 漏らしてしまう。ルートは常に公開のギャラリーへ誘導する。
 */
export default function RootPage() {
  redirect(`/collection/${getGalleryPath()}`);
}
