"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loadImage } from "@/lib/image/load-image";
import type { EditResult } from "./types";

interface ResizeToolProps {
  dataUrl: string;
  width: number;
  height: number;
  onApply: (result: EditResult) => void;
}

export function ResizeTool({ dataUrl, width, height, onApply }: ResizeToolProps) {
  const aspectRatio = width / height;
  const [targetWidth, setTargetWidth] = useState(String(width));
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedWidth = Math.round(Number(targetWidth));
  const parsedHeight = Math.round(parsedWidth / aspectRatio);
  const scalePercent = width > 0 ? Math.round((parsedWidth / width) * 100) : 100;

  function setScale(percent: number) {
    setTargetWidth(String(Math.max(1, Math.round((width * percent) / 100))));
  }

  async function handleApply() {
    if (!Number.isFinite(parsedWidth) || parsedWidth < 1) {
      setError("幅を正しく入力してください");
      return;
    }
    setApplying(true);
    setError(null);
    try {
      const img = await loadImage(dataUrl);
      const canvas = document.createElement("canvas");
      canvas.width = parsedWidth;
      canvas.height = parsedHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas context取得に失敗しました");
      ctx.drawImage(img, 0, 0, parsedWidth, parsedHeight);
      onApply({ dataUrl: canvas.toDataURL("image/png"), width: parsedWidth, height: parsedHeight, format: "png" });
    } catch {
      setError("拡大縮小の適用に失敗しました");
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-foreground/60">
        現在のサイズ: {width} × {height}px
      </p>
      <div className="flex flex-wrap gap-2">
        {[50, 75, 100, 150, 200].map((percent) => (
          <button
            type="button"
            key={percent}
            onClick={() => setScale(percent)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors
              ${scalePercent === percent ? "bg-accent text-accent-foreground" : "bg-surface text-foreground/70"}`}
          >
            {percent}%
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Input
          inputMode="numeric"
          value={targetWidth}
          onChange={(e) => setTargetWidth(e.target.value)}
          className="max-w-32"
        />
        <span className="text-sm text-foreground/50">
          幅(px)・高さは自動計算されます({Number.isFinite(parsedHeight) ? parsedHeight : "-"}px)
        </span>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="button" variant="secondary" onClick={handleApply} disabled={applying} className="w-fit">
        {applying ? "適用中..." : "拡大縮小を適用"}
      </Button>
    </div>
  );
}
