"use client";

import { useEffect, useRef, useState } from "react";
import { TransformWrapper, TransformComponent, type ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import { Button } from "@/components/ui/button";
import { loadImage } from "@/lib/image/load-image";
import type { EditResult } from "./types";

interface DrawToolProps {
  dataUrl: string;
  width: number;
  height: number;
  onApply: (result: EditResult) => void;
}

const DEFAULT_BRUSH_SIZE = 6;
const DEFAULT_COLOR = "#ff3b30";

function pixelToHex(data: Uint8ClampedArray): string {
  const [r, g, b] = data;
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * キャンバス上に自由に線を描き込むための描画ツール。手書きの注釈・矢印・丸囲みなどを
 * 追加したい場合に使う(AIによる自動補完は行わず、選んだ色でそのまま描画するだけ)。
 * 「スポイトで拾う」を有効にすると、次に画像をタップした位置のピクセル色を読み取り、
 * そのまま描画色に設定する(画像内の任意の色に正確に合わせて描き込みたい場合に使う)。
 */
export function DrawTool({ dataUrl, width, height, onApply }: DrawToolProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const zoomRef = useRef<ReactZoomPanPinchRef>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  // 2本指以上になった時点で描画をやめてピンチズームに操作を譲るため、指の本数を追跡する
  const activePointersRef = useRef<Set<number>>(new Set());

  const [color, setColor] = useState(DEFAULT_COLOR);
  const [brushSize, setBrushSize] = useState(DEFAULT_BRUSH_SIZE);
  const [pickingColor, setPickingColor] = useState(false);
  const [hasDrawing, setHasDrawing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadImage(dataUrl).then((img) => {
      if (cancelled) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, width, height);
      setHasDrawing(false);
    });
    return () => {
      cancelled = true;
    };
  }, [dataUrl, width, height]);

  function getCanvasPoint(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  function pickColorAt(point: { x: number; y: number }) {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const x = Math.min(width - 1, Math.max(0, Math.round(point.x)));
    const y = Math.min(height - 1, Math.max(0, Math.round(point.y)));
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    setColor(pixelToHex(pixel));
    setPickingColor(false);
  }

  function drawSegment(from: { x: number; y: number }, to: { x: number; y: number }) {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    activePointersRef.current.add(event.pointerId);
    if (activePointersRef.current.size > 1) {
      // 2本指目が触れた=ピンチズーム操作なので、描画は開始・継続しない
      drawingRef.current = false;
      lastPointRef.current = null;
      return;
    }
    const point = getCanvasPoint(event);
    if (!point) return;
    if (pickingColor) {
      pickColorAt(point);
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    lastPointRef.current = point;
    // クリックだけ(ドラッグ無し)でも1点描けるよう、同じ座標へ線を引く
    drawSegment(point, point);
    setHasDrawing(true);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (activePointersRef.current.size > 1) return;
    if (!drawingRef.current) return;
    const point = getCanvasPoint(event);
    if (!point || !lastPointRef.current) return;
    drawSegment(lastPointRef.current, point);
    lastPointRef.current = point;
  }

  function handlePointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    activePointersRef.current.delete(event.pointerId);
    drawingRef.current = false;
    lastPointRef.current = null;
  }

  async function handleResetDrawing() {
    const img = await loadImage(dataUrl);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    setHasDrawing(false);
  }

  function handleApply() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onApply({ dataUrl: canvas.toDataURL("image/png"), width, height, format: "png" });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-foreground/60">
        キャンバス上をなぞって自由に描画できます。「スポイトで拾う」を押してから画像上をタップすると、
        その部分の色をそのまま描画色として使えます。
      </p>
      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <TransformWrapper
          ref={zoomRef}
          initialScale={1}
          minScale={1}
          maxScale={4}
          panning={{ disabled: true }}
          pinch={{ step: 5 }}
          doubleClick={{ disabled: true }}
          wheel={{ step: 0.2 }}
        >
          <TransformComponent wrapperStyle={{ width: "100%" }} contentStyle={{ width: "100%" }}>
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className={`mx-auto max-h-[60vh] w-auto max-w-full touch-none ${pickingColor ? "cursor-crosshair" : ""}`}
            />
          </TransformComponent>
        </TransformWrapper>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => zoomRef.current?.resetTransform()}
          className="rounded-xl bg-surface px-4 py-2 text-sm font-medium text-foreground/70 transition-all active:scale-95 active:bg-border"
        >
          ズームを戻す
        </button>
        <label className="flex items-center gap-2 text-sm text-foreground/60">
          色
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-9 w-9 cursor-pointer rounded-lg border border-border p-0"
          />
        </label>
        <button
          type="button"
          onClick={() => setPickingColor((prev) => !prev)}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition-all active:scale-95
            ${pickingColor ? "bg-accent text-accent-foreground" : "bg-surface text-foreground/70 active:bg-border"}`}
        >
          {pickingColor ? "画像をタップして色を拾う..." : "スポイトで拾う"}
        </button>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-foreground/50 shrink-0">ペンの太さ</span>
        <input
          type="range"
          min={1}
          max={40}
          value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
          className="w-full"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={handleResetDrawing} disabled={!hasDrawing}>
          描画をやり直す
        </Button>
        <Button type="button" onClick={handleApply} disabled={!hasDrawing}>
          描画を適用
        </Button>
      </div>
    </div>
  );
}
