"use client";

import { useEffect } from "react";

// iOSホーム画面PWA(standalone)の一部端末では、touch-action: pan-y(globals.css)だけでは
// 画面端からの「スワイプで前の画面へ戻る」ネイティブジェスチャーを防ぎきれないため、
// タッチ開始位置が画面の左右端付近だった場合はJS側でpreventDefaultし、ジェスチャー自体の
// 発火を止める。2本指以降(ピンチズーム操作)は対象外にし、意図的に横スクロールを許可し
// 直している要素(data-pan-x、PDF編集のサムネイル一覧など)の上では発火させない。
const EDGE_WIDTH_PX = 20;

export function EdgeSwipeGuard() {
  useEffect(() => {
    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;

      const touch = event.touches[0];
      const nearEdge = touch.clientX < EDGE_WIDTH_PX || touch.clientX > window.innerWidth - EDGE_WIDTH_PX;
      if (!nearEdge) return;

      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-pan-x]")) return;

      event.preventDefault();
    };

    document.addEventListener("touchstart", onTouchStart, { passive: false });
    return () => document.removeEventListener("touchstart", onTouchStart);
  }, []);

  return null;
}
