const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** ファイル名として使えない文字("/"や制御文字など)を"_"に置き換える */
function sanitizeFilename(name: string): string {
  return name.replace(/[/\\?%*:|"<>\x00-\x1f]/g, "_").trim() || "image";
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

/**
 * 画像を保存する。スマホ(iOS Safari/Android Chrome等)でWeb Share APIの
 * ファイル共有に対応している場合はnavigator.share()でOSの共有シートを開き、
 * そこから「写真に保存」を選ぶとワンタップで写真アプリに追加できる。
 * 非対応環境(PCブラウザ等)では、従来通り<a download>でのファイルダウンロードにフォールバックする。
 */
export async function downloadImage(src: string, filenameWithoutExtension: string): Promise<void> {
  const res = await fetch(src);
  const blob = await res.blob();
  const extension = EXTENSION_BY_MIME[blob.type] ?? "jpg";
  const filename = `${sanitizeFilename(filenameWithoutExtension)}.${extension}`;

  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };

  if (nav.share && nav.canShare) {
    const file = new File([blob], filename, { type: blob.type || "image/jpeg" });
    if (nav.canShare({ files: [file] })) {
      try {
        await nav.share({ files: [file] });
        return;
      } catch (err) {
        // ユーザーが共有シートをキャンセルした場合(AbortError)は何もしない。
        // それ以外の失敗時はフォールバックのダウンロードを試みる。
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }
  }

  triggerBlobDownload(blob, filename);
}
