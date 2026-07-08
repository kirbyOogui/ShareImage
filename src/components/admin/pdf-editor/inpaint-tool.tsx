"use client";

import { useEffect, useRef, useState } from "react";
import { TransformWrapper, TransformComponent, type ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import { Button } from "@/components/ui/button";
import { loadImage } from "@/lib/image/load-image";
import type { EditResult } from "./types";

interface InpaintToolProps {
  dataUrl: string;
  width: number;
  height: number;
  onApply: (result: EditResult) => void;
}

const DEFAULT_BRUSH_SIZE = 40;
// 塗った範囲の周囲にどれだけ文脈(背景)を含めてAIに渡すかの倍率
const CROP_PADDING_FACTOR = 0.75;
// 極端に小さいクロップ(AIが文脈を把握できない)にならないための下限
const MIN_CROP_SIZE = 256;

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * 印鑑・手書き・付箋・ゴミ・指などをブラシで塗って囲むと、その部分をAI(OpenAI gpt-image-1)が
 * 周囲から自然に補完して消す「消しゴムマジック」的な機能。
 * 表示用キャンバス(塗った範囲を半透明の赤でプレビュー)と、実際に送信するマスク用キャンバス
 * (destination-outで「塗った箇所だけ透明」にする、OpenAIのマスク仕様どおり)の2枚を同時に描画する。
 *
 * ページ全体をAIに渡すと、モデルの解像度制限による画質劣化がマスク範囲外(文字など)にまで
 * 及んでしまうため、塗った範囲の周辺だけを正方形に切り出してAIに渡し、返ってきた結果を
 * 元のページ画像(無加工)の上にその位置だけ貼り戻す。ページの残り部分は一切AIを通さないため、
 * 塗っていない箇所が歪む・劣化することはない。
 */
export function InpaintTool({ dataUrl, width, height, onApply }: InpaintToolProps) {
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const zoomRef = useRef<ReactZoomPanPinchRef>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  // 2本指以上になった時点で塗りをやめてピンチズームに操作を譲るため、指の本数を追跡する
  const activePointersRef = useRef<Set<number>>(new Set());
  const hasMaskRef = useRef(false);
  const boundsRef = useRef<Bounds | null>(null);

  const [brushSize, setBrushSize] = useState(DEFAULT_BRUSH_SIZE);
  const [hasMask, setHasMask] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadImage(dataUrl).then((img) => {
      if (cancelled) return;
      const displayCanvas = displayCanvasRef.current;
      const maskCanvas = maskCanvasRef.current;
      if (!displayCanvas || !maskCanvas) return;

      displayCanvas.width = width;
      displayCanvas.height = height;
      maskCanvas.width = width;
      maskCanvas.height = height;

      const displayCtx = displayCanvas.getContext("2d");
      const maskCtx = maskCanvas.getContext("2d");
      if (!displayCtx || !maskCtx) return;

      displayCtx.drawImage(img, 0, 0, width, height);
      // マスクは「不透明=保持、透明=AIが再生成する範囲」。初期状態は全域保持(不透明)にしておく。
      maskCtx.fillStyle = "rgba(0, 0, 0, 1)";
      maskCtx.fillRect(0, 0, width, height);
      hasMaskRef.current = false;
      boundsRef.current = null;
      setHasMask(false);
    });
    return () => {
      cancelled = true;
    };
  }, [dataUrl, width, height]);

  function getCanvasPoint(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = displayCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  function expandBounds(x: number, y: number) {
    const r = brushSize / 2;
    const next = { minX: x - r, minY: y - r, maxX: x + r, maxY: y + r };
    if (!boundsRef.current) {
      boundsRef.current = next;
      return;
    }
    boundsRef.current = {
      minX: Math.min(boundsRef.current.minX, next.minX),
      minY: Math.min(boundsRef.current.minY, next.minY),
      maxX: Math.max(boundsRef.current.maxX, next.maxX),
      maxY: Math.max(boundsRef.current.maxY, next.maxY),
    };
  }

  function drawSegment(from: { x: number; y: number }, to: { x: number; y: number }) {
    const displayCtx = displayCanvasRef.current?.getContext("2d");
    const maskCtx = maskCanvasRef.current?.getContext("2d");
    if (!displayCtx || !maskCtx) return;

    displayCtx.globalCompositeOperation = "source-over";
    displayCtx.strokeStyle = "rgba(239, 68, 68, 0.5)";
    displayCtx.lineWidth = brushSize;
    displayCtx.lineCap = "round";
    displayCtx.lineJoin = "round";
    displayCtx.beginPath();
    displayCtx.moveTo(from.x, from.y);
    displayCtx.lineTo(to.x, to.y);
    displayCtx.stroke();

    maskCtx.globalCompositeOperation = "destination-out";
    maskCtx.strokeStyle = "rgba(0, 0, 0, 1)";
    maskCtx.lineWidth = brushSize;
    maskCtx.lineCap = "round";
    maskCtx.lineJoin = "round";
    maskCtx.beginPath();
    maskCtx.moveTo(from.x, from.y);
    maskCtx.lineTo(to.x, to.y);
    maskCtx.stroke();

    expandBounds(from.x, from.y);
    expandBounds(to.x, to.y);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    activePointersRef.current.add(event.pointerId);
    if (activePointersRef.current.size > 1) {
      // 2本指目が触れた=ピンチズーム操作なので、塗りは開始・継続しない
      drawingRef.current = false;
      lastPointRef.current = null;
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = getCanvasPoint(event);
    if (!point) return;
    drawingRef.current = true;
    lastPointRef.current = point;
    // クリックだけ(ドラッグ無し)でも1点消せるよう、同じ座標へ線を引く
    drawSegment(point, point);
    if (!hasMaskRef.current) {
      hasMaskRef.current = true;
      setHasMask(true);
    }
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

  async function handleClearMask() {
    const img = await loadImage(dataUrl);
    const displayCtx = displayCanvasRef.current?.getContext("2d");
    const maskCtx = maskCanvasRef.current?.getContext("2d");
    if (!displayCtx || !maskCtx) return;
    displayCtx.globalCompositeOperation = "source-over";
    displayCtx.clearRect(0, 0, width, height);
    displayCtx.drawImage(img, 0, 0, width, height);
    maskCtx.globalCompositeOperation = "source-over";
    maskCtx.fillStyle = "rgba(0, 0, 0, 1)";
    maskCtx.fillRect(0, 0, width, height);
    hasMaskRef.current = false;
    boundsRef.current = null;
    setHasMask(false);
  }

  async function handleApply() {
    const maskCanvas = maskCanvasRef.current;
    const bounds = boundsRef.current;
    if (!maskCanvas || !hasMask || !bounds) {
      setError("消したい範囲をブラシで塗ってください");
      return;
    }
    setProcessing(true);
    setError(null);
    try {
      const img = await loadImage(dataUrl);

      // 塗った範囲(+周囲の文脈)だけを正方形に切り出し、ページ全体ではなくその部分だけをAIに渡す。
      const bboxWidth = bounds.maxX - bounds.minX;
      const bboxHeight = bounds.maxY - bounds.minY;
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;
      const rawSide = Math.max(bboxWidth, bboxHeight) * (1 + 2 * CROP_PADDING_FACTOR);
      const side = Math.round(Math.min(Math.max(rawSide, MIN_CROP_SIZE), Math.min(width, height)));
      const cropX = Math.round(Math.max(0, Math.min(centerX - side / 2, width - side)));
      const cropY = Math.round(Math.max(0, Math.min(centerY - side / 2, height - side)));

      const cropImageCanvas = document.createElement("canvas");
      cropImageCanvas.width = side;
      cropImageCanvas.height = side;
      const cropImageCtx = cropImageCanvas.getContext("2d");
      if (!cropImageCtx) throw new Error("canvas context取得に失敗しました");
      cropImageCtx.drawImage(img, cropX, cropY, side, side, 0, 0, side, side);

      const cropMaskCanvas = document.createElement("canvas");
      cropMaskCanvas.width = side;
      cropMaskCanvas.height = side;
      const cropMaskCtx = cropMaskCanvas.getContext("2d");
      if (!cropMaskCtx) throw new Error("canvas context取得に失敗しました");
      cropMaskCtx.drawImage(maskCanvas, cropX, cropY, side, side, 0, 0, side, side);

      const res = await fetch("/api/admin/edit/inpaint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: cropImageCanvas.toDataURL("image/png"),
          mask: cropMaskCanvas.toDataURL("image/png"),
          width: side,
          height: side,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "AIによる編集に失敗しました");
        return;
      }

      // 元のページ画像(無加工)の上に、AIが生成したクロップ部分だけを同じ位置に貼り戻す。
      // ページの他の部分は一切AIを経由しないため、塗っていない箇所が歪むことはない。
      const patchImg = await loadImage(data.dataUrl);
      const resultCanvas = document.createElement("canvas");
      resultCanvas.width = width;
      resultCanvas.height = height;
      const resultCtx = resultCanvas.getContext("2d");
      if (!resultCtx) throw new Error("canvas context取得に失敗しました");
      resultCtx.drawImage(img, 0, 0, width, height);
      resultCtx.drawImage(patchImg, cropX, cropY, side, side);

      onApply({ dataUrl: resultCanvas.toDataURL("image/png"), width, height, format: "png" });
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-foreground/60">
        印鑑・手書き・付箋・ゴミ・指などの消したい部分をブラシでなぞって塗りつぶし、
        「AIで消す」を押してください。AIが周囲から自然に補完します(塗った範囲の周辺だけを
        処理するため、ページの他の部分が変化することはありません)。
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
              ref={displayCanvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="mx-auto max-h-[60vh] w-auto max-w-full touch-none"
            />
          </TransformComponent>
        </TransformWrapper>
        <canvas ref={maskCanvasRef} className="hidden" />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => zoomRef.current?.resetTransform()}
          className="shrink-0 rounded-xl bg-surface px-4 py-2 text-sm font-medium text-foreground/70 transition-all active:scale-95 active:bg-border"
        >
          ズームを戻す
        </button>
        <span className="text-sm text-foreground/50 shrink-0">ブラシの太さ</span>
        <input
          type="range"
          min={10}
          max={120}
          value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
          className="w-full"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={handleClearMask} disabled={processing || !hasMask}>
          塗りをやり直す
        </Button>
        <Button type="button" onClick={handleApply} disabled={processing || !hasMask}>
          {processing ? "AIが処理中..." : "AIで消す"}
        </Button>
      </div>
    </div>
  );
}
