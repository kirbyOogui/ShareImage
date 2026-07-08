const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** ファイル名として使えない文字("/"や制御文字など)を"_"に置き換える */
function sanitizeFilename(name: string): string {
  return name.replace(/[/\\?%*:|"<>\x00-\x1f]/g, "_").trim() || "image";
}

/** 画像URLをfetchしてBlobとして取得し、ブラウザのファイル保存ダイアログ相当の挙動で保存する */
export async function downloadImage(src: string, filenameWithoutExtension: string): Promise<void> {
  const res = await fetch(src);
  const blob = await res.blob();
  const extension = EXTENSION_BY_MIME[blob.type] ?? "jpg";
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = `${sanitizeFilename(filenameWithoutExtension)}.${extension}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}
