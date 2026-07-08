"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { PasswordForm } from "./password-form";
import { ZoomableImage } from "./zoomable-image";

interface PageMeta {
  pageNumber: number;
  width: number;
  height: number;
}

function ShareTitleHeader({
  title,
  hasPdf,
  pageInfo,
}: {
  title: string | null;
  hasPdf: boolean;
  pageInfo: string | null;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-1">
      <h2 className="truncate text-lg font-semibold tracking-tight text-white">{title || "(無題)"}</h2>
      {(hasPdf || pageInfo) && (
        <span className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white/70">
          {hasPdf ? "PDF" : pageInfo}
        </span>
      )}
    </div>
  );
}

interface ShareLightboxProps {
  shareId: string;
  title: string | null;
  hasPassword: boolean;
  hasPdf: boolean;
  pages: PageMeta[];
  onClose: () => void;
}

/**
 * 一覧のカードをタップした際に、ページ遷移せずその場で共有の中身を開くためのライトボックス。
 * パスワード付き共有は、既にview_tokenクッキーを持っているか(＝以前認証済みか)を
 * 画像配信APIへの実際のリクエストのステータスで判定し、無ければその場でパスワード入力を表示する。
 */
export function ShareLightbox({ shareId, title, hasPassword, hasPdf, pages, onClose }: ShareLightboxProps) {
  const [checkingAuth, setCheckingAuth] = useState(hasPassword);
  const [unlocked, setUnlocked] = useState(!hasPassword);

  useEffect(() => {
    if (!hasPassword) return;
    let cancelled = false;
    fetch(`/api/share/${shareId}/pages/1`, { cache: "no-store" })
      .then((res) => {
        if (!cancelled) {
          setUnlocked(res.ok);
          setCheckingAuth(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUnlocked(false);
          setCheckingAuth(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [shareId, hasPassword]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
        <div className="min-w-0 flex-1">
          {unlocked && !checkingAuth && (
            <ShareTitleHeader
              title={title}
              hasPdf={hasPdf}
              pageInfo={!hasPdf && pages.length > 1 ? `全${pages.length}ページ` : null}
            />
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="閉じる"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-lg text-white transition-all hover:bg-white/20 active:scale-90 active:bg-white/30"
        >
          ✕
        </button>
      </div>

      <div
        className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 sm:px-6"
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        {checkingAuth ? (
          <p className="pt-10 text-center text-sm text-white/60">確認中...</p>
        ) : !unlocked ? (
          <Card className="mx-auto mt-10 w-full max-w-sm">
            <PasswordForm shareId={shareId} title={title} onSuccess={() => setUnlocked(true)} />
          </Card>
        ) : hasPdf ? (
          // 画面の縦幅いっぱいを使い、スクロール無しでPDFの1ページ目全体が見えるようにする
          <div className="mx-auto flex h-full min-h-0 max-w-4xl flex-col gap-3 pt-3">
            <iframe
              src={`/api/share/${shareId}/file`}
              title={title || "PDF"}
              className="w-full min-h-0 flex-1 rounded-2xl border-0 bg-white"
            />
          </div>
        ) : pages.length === 0 ? (
          <p className="pt-10 text-center text-sm text-white/60">表示できる画像がありません</p>
        ) : pages.length === 1 ? (
          // 1ページのみの共有は、画像全体がスクロール無しで画面に収まるように縮小表示する
          <div className="mx-auto flex h-full min-h-0 max-w-2xl flex-col gap-3 pt-3">
            <div className="min-h-0 flex-1">
              <ZoomableImage
                src={`/api/share/${shareId}/pages/${pages[0].pageNumber}`}
                width={pages[0].width}
                height={pages[0].height}
                alt="1ページ"
                requireTapToActivate
                fitContainer
                downloadName={title ? `${title}` : `${shareId}-page1`}
              />
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-2xl flex-col gap-6 pt-3">
            {pages.map((page) => (
              <ZoomableImage
                key={page.pageNumber}
                src={`/api/share/${shareId}/pages/${page.pageNumber}`}
                width={page.width}
                height={page.height}
                alt={`${page.pageNumber}ページ`}
                requireTapToActivate
                downloadName={`${title ? `${title}-` : ""}page${page.pageNumber}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
