"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" />
    </svg>
  );
}

function EditIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
    </svg>
  );
}

function ShareIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
    </svg>
  );
}

/**
 * 管理画面下部の固定タブバー。スマホアプリのような常設ナビゲーションとして、
 * 選択画面(ホーム)/編集/共有の3セクションをいつでも1タップで行き来できるようにする。
 * これにより各ページ側の「戻る」リンクは不要になった(ホームタブが同じ役割を果たすため)。
 */
export function BottomTabBar({ token }: { token: string }) {
  const pathname = usePathname();
  const base = `/a/${token}/admin`;

  const tabs = [
    { href: base, label: "ホーム", Icon: HomeIcon, active: pathname === base },
    { href: `${base}/edit`, label: "編集", Icon: EditIcon, active: pathname.startsWith(`${base}/edit`) },
    { href: `${base}/share`, label: "共有", Icon: ShareIcon, active: pathname.startsWith(`${base}/share`) },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/85 backdrop-blur-md
        pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto flex max-w-3xl">
        {tabs.map(({ href, label, Icon, active }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors
              ${active ? "text-accent" : "text-foreground/45 hover:text-foreground/70"}`}
          >
            <Icon active={active} />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
