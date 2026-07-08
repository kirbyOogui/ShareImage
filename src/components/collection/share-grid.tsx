"use client";

import { useState } from "react";
import { formatDateTime } from "@/lib/format";
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

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(190px,1fr))] sm:gap-5">
        {shares.map((share, index) => (
          <button
            type="button"
            key={share.id}
            onClick={() => setOpenShareId(share.id)}
            className="flex w-full flex-col gap-2.5 rounded-3xl border border-border bg-white p-3 text-left shadow-sm shadow-black/[0.03] transition-colors hover:bg-surface"
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
            </div>
            <div className="flex flex-col px-1 pb-1">
              <span className="truncate text-[15px] font-semibold tracking-tight">
                {share.title || "(無題)"}
              </span>
              <span className="text-xs text-foreground/40">{formatDateTime(share.updatedAt)}</span>
            </div>
          </button>
        ))}
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
