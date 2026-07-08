"use client";

import { useState, type KeyboardEvent, type MouseEvent } from "react";
import { formatDateTime } from "@/lib/format";
import { downloadImage } from "@/lib/image/download";
import { DownloadIcon } from "@/components/ui/download-icon";
import { ShareLightbox } from "@/components/share/share-lightbox";

export interface GridShare {
  id: string;
  title: string | null;
  updatedAt: Date | string;
  hasPassword: boolean;
  hasPdf: boolean;
  pageCount: number;
  pages: { pageNumber: number; width: number; height: number }[];
}

/**
 * サムネイル+タイトル+更新日のカードグリッド。トップページ(全共有)と
 * コレクションページの両方から共通で使う。カードをタップするとページ遷移せず
 * ShareLightboxがその場で開く(パスワード付き共有もライトボックス内で認証する)。
 */
export function ShareGrid({ shares }: { shares: GridShare[] }) {
  const [openShareId, setOpenShareId] = useState<string | null>(null);
  const openShare = shares.find((share) => share.id === openShareId) ?? null;

  async function handleThumbnailDownload(event: MouseEvent | KeyboardEvent, share: GridShare) {
    // 親カードのクリック(ライトボックスを開く)を発火させない
    event.stopPropagation();
    event.preventDefault();
    await downloadImage(`/api/share/${share.id}/pages/1`, share.title || share.id);
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(190px,1fr))] sm:gap-5">
        {shares.map((share, index) => {
          const canDownloadThumbnail = !share.hasPassword && share.pageCount > 0;
          return (
            // カード内に保存ボタン(<button>)をネストするため、カード自体は<button>ではなく
            // role="button"のdivにしてキーボード操作(Enter/Space)を自前でハンドリングする。
            <div
              key={share.id}
              role="button"
              tabIndex={0}
              onClick={() => setOpenShareId(share.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setOpenShareId(share.id);
                }
              }}
              className="flex w-full cursor-pointer flex-col gap-2.5 rounded-3xl border border-border bg-white p-3 text-left shadow-sm shadow-black/[0.03] transition-all hover:bg-surface active:scale-[0.97] active:bg-surface"
            >
              <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-surface">
                {share.hasPassword || share.pageCount === 0 ? (
                  <span className="text-4xl">🔒</span>
                ) : (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element -- サムネイルは自前APIの画像をそのまま縮小表示するだけのため */}
                    <img
                      src={`/api/share/${share.id}/pages/1`}
                      alt={share.title || "共有ページ"}
                      className="h-full w-full object-cover"
                      // 最初の数枚は遅延読み込みを避け、ページを開いた直後にサムネイルが
                      // 順番に「ポップイン」して見た目が落ち着かない印象になるのを防ぐ
                      loading={index < 6 ? "eager" : "lazy"}
                    />
                    {(share.hasPdf || share.pageCount > 1) && (
                      <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                        {share.hasPdf ? "PDF" : `${share.pageCount}ページ`}
                      </span>
                    )}
                  </>
                )}
                {canDownloadThumbnail && (
                  <button
                    type="button"
                    onClick={(event) => handleThumbnailDownload(event, share)}
                    aria-label="画像を保存"
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full
                      bg-black/50 text-white backdrop-blur-sm transition-all hover:bg-black/70 active:scale-90 active:bg-black/80"
                  >
                    <DownloadIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="flex flex-col px-1 pb-1">
                <span className="truncate text-[15px] font-semibold tracking-tight">
                  {share.title || "(無題)"}
                </span>
                <span className="text-xs text-foreground/40">{formatDateTime(share.updatedAt)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {openShare && (
        <ShareLightbox
          shareId={openShare.id}
          title={openShare.title}
          hasPassword={openShare.hasPassword}
          hasPdf={openShare.hasPdf}
          pages={openShare.pages}
          onClose={() => setOpenShareId(null)}
        />
      )}
    </>
  );
}
