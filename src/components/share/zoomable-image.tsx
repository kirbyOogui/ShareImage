"use client";

import { useCallback, useState } from "react";
import { TransformWrapper, TransformComponent, type ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import { downloadImage } from "@/lib/image/download";
import { DownloadIcon } from "@/components/ui/download-icon";

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
  /** 保存ボタン押下時にダウンロードされるファイル名(拡張子は実際のContent-Typeから自動付与) */
  downloadName?: string;
}

/**
 * ページ縦スクロールと両立させるため、拡大していない(scale===1)間はpanningを無効化し、
 * 一本指の縦ドラッグがページの通常スクロールとして機能するようにする。
 * requireTapToActivateがtrueの場合、最初に画像をタップするまではピンチ/ダブルタップズームも
 * 無効化する(スクロール中の誤操作防止)。ズームを塞ぐのはpinch/doubleClickの`disabled`設定のみで、
 * 画像の上に透明な要素を重ねる方式は使わない(重ねるとブラウザのimg長押し保存メニューが
 * 出せなくなるため)。
 */
export function ZoomableImage({
  src,
  width,
  height,
  alt,
  requireTapToActivate = false,
  fitContainer = false,
  downloadName = "image",
}: ZoomableImageProps) {
  const [zoomed, setZoomed] = useState(false);
  const [activated, setActivated] = useState(!requireTapToActivate);
  const [downloading, setDownloading] = useState(false);

  const handleTransform = useCallback((_ref: ReactZoomPanPinchRef, state: { scale: number }) => {
    setZoomed(state.scale > 1.01);
  }, []);

  async function handleDownload() {
    if (downloading) return;
    setDownloading(true);
    try {
      await downloadImage(src, downloadName);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className={`relative ${fitContainer ? "h-full" : ""}`}>
      <TransformWrapper
        initialScale={1}
        minScale={1}
        maxScale={4}
        centerOnInit
        doubleClick={{ mode: "toggle", step: 2.5, disabled: !activated }}
        pinch={{ step: 5, disabled: !activated }}
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
            // 閲覧者が画像を長押し/右クリックで(最初のタップ前でも)保存できるようにする。
            style={{ pointerEvents: "auto", WebkitTouchCallout: "default" }}
            draggable={false}
            loading="lazy"
            onClick={() => setActivated(true)}
          />
        </TransformComponent>
      </TransformWrapper>
      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        aria-label="画像を保存"
        className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full
          bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70 disabled:opacity-50"
      >
        <DownloadIcon />
      </button>
    </div>
  );
}
