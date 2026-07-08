"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { loadImage } from "@/lib/image/load-image";
import { IMAGE_OUTPUT_FORMATS, IMAGE_OUTPUT_QUALITY, mimeForFormat, type ImageOutputFormat } from "@/lib/image/format";
import type { EditResult } from "./types";

interface FormatToolProps {
  dataUrl: string;
  width: number;
  height: number;
  currentFormat: ImageOutputFormat;
  onApply: (result: EditResult) => void;
}

export function FormatTool({ dataUrl, width, height, currentFormat, onApply }: FormatToolProps) {
  const [selected, setSelected] = useState<ImageOutputFormat>(currentFormat);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApply() {
    setApplying(true);
    setError(null);
    try {
      const img = await loadImage(dataUrl);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas context取得に失敗しました");
      // JPEGは透過を保持できないため、変換前に白背景で塗りつぶしておく
      if (selected === "jpeg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
      }
      ctx.drawImage(img, 0, 0, width, height);
      const mime = mimeForFormat(selected);
      const quality = selected === "png" ? undefined : IMAGE_OUTPUT_QUALITY / 100;
      onApply({ dataUrl: canvas.toDataURL(mime, quality), width, height, format: selected });
    } catch {
      setError("形式変換に失敗しました");
    } finally {
      setApplying(false);
    }
  }

  const currentLabel = IMAGE_OUTPUT_FORMATS.find((f) => f.value === currentFormat)?.label;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-foreground/60">保存する画像形式を選んでください(現在: {currentLabel})。</p>
      <div className="flex flex-wrap gap-2">
        {IMAGE_OUTPUT_FORMATS.map((f) => (
          <button
            type="button"
            key={f.value}
            onClick={() => setSelected(f.value)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-all active:scale-95
              ${selected === f.value ? "bg-accent text-accent-foreground" : "bg-surface text-foreground/70 active:bg-border"}`}
          >
            {f.label}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="button" variant="secondary" onClick={handleApply} disabled={applying} className="w-fit">
        {applying ? "変換中..." : "この形式に変換"}
      </Button>
    </div>
  );
}
