import type { ReactNode } from "react";
import Link from "next/link";

export function BackArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
  );
}

/**
 * アイコン+タイトル+サブテキスト+右側アクションのヘッダー。
 * ギャラリー・管理画面など、サイト内の各ページ見出しで共通して使う。
 * `backHref`を渡すと、タイトルの上に前のページへ戻るリンクを表示する。
 */
export function PageHeader({
  icon,
  title,
  subtitle,
  action,
  backHref,
  backLabel = "戻る",
  className = "",
}: {
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  backHref?: string;
  backLabel?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex w-fit items-center gap-1 text-sm text-foreground/50 transition-opacity hover:text-foreground active:opacity-50"
        >
          <BackArrowIcon />
          {backLabel}
        </Link>
      )}
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          {icon && <div className="shrink-0">{icon}</div>}
          <div className="flex min-w-0 flex-col gap-0.5">
            <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
            {subtitle && <p className="truncate text-xs text-foreground/40 sm:text-sm">{subtitle}</p>}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}

/** カード内などの小見出し用。アイコン+ラベルの組み合わせを共通化する。 */
export function SectionLabel({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-sm font-medium text-foreground/50">
      <span className="text-accent">{icon}</span>
      {children}
    </div>
  );
}
