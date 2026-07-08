"use client";

import Link from "next/link";
import type { ReactNode } from "react";

const CLASS_NAME =
  "inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm " +
  "font-medium text-foreground/70 shadow-sm shadow-black/[0.03] transition-colors " +
  "hover:border-accent/30 hover:bg-accent/5 hover:text-accent";

/**
 * ログイン/ログアウトなど、ヘッダーに置く「アイコン+文字」の認証系ボタンの共通デザイン。
 * アイコンは常にアクセントカラーで表示し、地味なテキストだけのボタンにならないようにする。
 */
export function NavActionButton({
  icon,
  children,
  href,
  onClick,
}: {
  icon: ReactNode;
  children: ReactNode;
  href?: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className="text-accent">{icon}</span>
      {children}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={CLASS_NAME}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={CLASS_NAME}>
      {content}
    </button>
  );
}
