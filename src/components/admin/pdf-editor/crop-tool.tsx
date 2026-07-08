"use client";

import { useRef, useState } from "react";
import ReactCrop, { type Crop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Button } from "@/components/ui/button";
import { loadImage } from "@/lib/image/load-image";
import type { EditResult } from "./types";

interface CropToolProps {
  dataUrl: string;
  onApply: (result: EditResult) => void;
}

export function CropTool({ dataUrl, onApply }: CropToolProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [pixelCrop, setPixelCrop] = useState<PixelCrop | null>(null);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApply() {
    if (!pixelCrop || pixelCrop.width < 1 || pixelCrop.height < 1) {
      setError("トリミングする範囲をドラッグして選択してください");
      return;
    }
    const displayedImg = imgRef.current;
    if (!displayedImg) {
      setError("トリミングの適用に失敗しました");
      return;
    }
    setApplying(true);
    setError(null);
    try {
      const img = await loadImage(dataUrl);
      // react-image-cropのPixelCropは「画面上に表示されているimg要素の描画サイズ」基準の座標なので、
      // 表示サイズ÷実サイズ(naturalWidth/Height)の比率で実ピクセル座標に変換する必要がある。
      // 以前はloadImage()で新規生成した(DOMに繋がっていない)Image要素のwidth/heightを使っており、
      // これは常にnaturalWidthと同値になってしまう(=倍率が常に1)ため、表示が縮小されているとき
      // 選択範囲と実際に切り出される範囲が大きくズレるバグがあった。
      const scaleX = displayedImg.naturalWidth / displayedImg.width;
      const scaleY = displayedImg.naturalHeight / displayedImg.height;
      const sx = Math.round(pixelCrop.x * scaleX);
      const sy = Math.round(pixelCrop.y * scaleY);
      const sw = Math.round(pixelCrop.width * scaleX);
      const sh = Math.round(pixelCrop.height * scaleY);

      const canvas = document.createElement("canvas");
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas context取得に失敗しました");
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      onApply({ dataUrl: canvas.toDataURL("image/png"), width: sw, height: sh, format: "png" });
    } catch {
      setError("トリミングの適用に失敗しました");
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-foreground/60">残したい範囲をドラッグして選択してください。</p>
      <div className="flex justify-center overflow-hidden rounded-2xl border border-border bg-surface">
        <ReactCrop
          crop={crop}
          onChange={(_pixelCrop, percentCrop) => setCrop(percentCrop)}
          onComplete={(c) => setPixelCrop(c)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- クロップ範囲選択のためreact-image-cropが直接img要素を必要とする */}
          <img ref={imgRef} src={dataUrl} alt="編集中のページ" className="max-h-[60vh] w-auto" />
        </ReactCrop>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="button" variant="secondary" onClick={handleApply} disabled={applying} className="w-fit">
        {applying ? "適用中..." : "トリミングを適用"}
      </Button>
    </div>
  );
}
