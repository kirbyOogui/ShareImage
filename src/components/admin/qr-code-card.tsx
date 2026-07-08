"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";

export function QrCodeCard({ url }: { url: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(url, {
      width: 512,
      margin: 2,
      color: { dark: "#1d1d1f", light: "#ffffff" },
    })
      .then((result) => {
        if (!cancelled) setDataUrl(result);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  function handleDownload() {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = "qrcode.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- data URLはnext/imageの最適化対象外のため素のimgを使用
        <img
          src={dataUrl}
          alt="共有URLのQRコード"
          width={180}
          height={180}
          className="rounded-2xl border border-border"
        />
      ) : (
        <div className="h-[180px] w-[180px] animate-pulse rounded-2xl bg-surface" />
      )}
      <Button type="button" variant="secondary" onClick={handleDownload} disabled={!dataUrl} className="w-fit">
        QRコードをPNG保存
      </Button>
    </div>
  );
}
