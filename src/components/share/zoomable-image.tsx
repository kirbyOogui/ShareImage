"use client";

import { useCallback, useState } from "react";
import { TransformWrapper, TransformComponent, type ReactZoomPanPinchRef } from "react-zoom-pan-pinch";

interface ZoomableImageProps {
  src: string;
  width: number;
  height: number;
  alt: string;
  /** trueの場合、最初に画像をタップするまでピンチ/ダブルタップズーム・パンを一切無効化する */
  requireTapToActivate?: boolean;
  /**
   * trueの場合、親要素(高さが確定しているコンテナ)いっぱいに収まるよう画像の縦横比を保ったまま
   * 縮小表示する。1ページのみの共有をスクロール無しで画面内に収めるためのモード。
   */
  fitContainer?: boolean;
}

/**
 * ページ縦スクロールと両立させるため、拡大していない(scale===1)間はpanningを無効化し、
 * 一本指の縦ドラッグがページの通常スクロールとして機能するようにする。
 * ピンチ(2本指)とダブルタップは常に有効なため、ズームイン操作自体は妨げられない。
 */
export function ZoomableImage({
  src,
  width,
  height,
  alt,
  requireTapToActivate = false,
  fitContainer = false,
}: ZoomableImageProps) {
  const [zoomed, setZoomed] = useState(false);
  const [activated, setActivated] = useState(!requireTapToActivate);

  const handleTransform = useCallback((_ref: ReactZoomPanPinchRef, state: { scale: number }) => {
    setZoomed(state.scale > 1.01);
  }, []);

  return (
    <div className={`relative ${fitContainer ? "h-full" : ""}`}>
      <TransformWrapper
        initialScale={1}
        minScale={1}
        maxScale={4}
        centerOnInit
        doubleClick={{ mode: "toggle", step: 2.5 }}
        pinch={{ step: 5 }}
        panning={{ disabled: !zoomed }}
        onTransform={handleTransform}
      >
        <TransformComponent
          wrapperStyle={fitContainer ? { width: "100%", height: "100%" } : { width: "100%" }}
          contentStyle={
            fitContainer
              ? { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }
              : { width: "100%" }
          }
        >
          {/* next/imageの自動最適化はズームライブラリの生DOM参照制御と相性が悪いため素のimgを使用する */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            width={width}
            height={height}
            alt={alt}
            className={
              fitContainer
                ? "h-auto max-h-full w-auto max-w-full select-none rounded-2xl border border-border object-contain"
                : "mx-auto h-auto max-h-[85dvh] w-auto max-w-full select-none rounded-2xl border border-border object-contain"
            }
            // react-zoom-pan-pinchのデフォルトCSS(.content img { pointer-events: none })と
            // -webkit-touch-callout: none(iOSの長押し保存メニュー無効化)を打ち消し、
            // 閲覧者が画像を長押し/右クリックで保存できるようにする。
            style={{ pointerEvents: "auto", WebkitTouchCallout: "default" }}
            draggable={false}
            loading="lazy"
          />
        </TransformComponent>
      </TransformWrapper>
      {!activated && (
        // タップするまでピンチ/ダブルタップズーム・パンを丸ごと奪う透明なオーバーレイ。
        // TransformWrapper内部の個別設定に手を入れるより単純かつ確実。
        <button
          type="button"
          onClick={() => setActivated(true)}
          aria-label="タップして操作を有効化"
          className="absolute inset-0 z-10 cursor-zoom-in"
        />
      )}
    </div>
  );
}
