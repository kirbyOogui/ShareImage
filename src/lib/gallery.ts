/**
 * 閲覧者向け一覧ページ(全共有をグリッド表示するギャラリー)のURLパスを解決する。
 * かつては「コレクション」としてDBで複数管理していたが、常に1つだけあれば十分なため、
 * DBを使わずADMIN_LOGIN_PATHと同じ方式(.envのランダムな固定値)に統一した。
 */
export function getGalleryPath(): string {
  const path = process.env.GALLERY_PATH;
  if (!path) {
    throw new Error(
      "GALLERY_PATH が未設定です。scripts/generate-gallery-path.ts で生成し.envに設定してください"
    );
  }
  return path;
}

export function getGalleryUrl(origin = ""): string {
  return `${origin}/collection/${getGalleryPath()}`;
}
