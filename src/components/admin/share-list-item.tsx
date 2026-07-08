import Link from "next/link";
import { formatDateTime } from "@/lib/format";

export interface ShareSummary {
  id: string;
  title: string | null;
  pageCount: number;
  hasPassword: boolean;
  hasPdf: boolean;
  expiresAt: Date | string | null;
  status: "ACTIVE" | "EXPIRED";
  updatedAt: Date | string;
}

export function ShareListItem({ share, token }: { share: ShareSummary; token: string }) {
  return (
    <Link
      href={`/a/${token}/admin/share/${share.id}`}
      className="flex items-center justify-between rounded-2xl border border-border bg-white px-5 py-4
        transition-colors hover:bg-surface"
    >
      <div className="flex flex-col gap-1">
        <span className="text-[15px] font-medium">{share.title || "(無題)"}</span>
        <span className="text-xs text-foreground/50">
          {share.pageCount}ページ・更新: {formatDateTime(share.updatedAt)}
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs">
        {share.hasPdf && <span className="rounded-full bg-surface px-2 py-1 text-foreground/60">PDF</span>}
        {share.hasPassword && (
          <span className="rounded-full bg-surface px-2 py-1 text-foreground/60">🔒 パスワード</span>
        )}
        <span
          className={`rounded-full px-2 py-1 ${
            share.status === "EXPIRED" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"
          }`}
        >
          {share.status === "EXPIRED" ? "期限切れ" : "公開中"}
        </span>
      </div>
    </Link>
  );
}
