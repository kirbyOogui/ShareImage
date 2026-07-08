import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { LogoutButton } from "./logout-button";
import { BottomTabBar } from "./bottom-tab-bar";

/**
 * 管理画面ダッシュボード配下(選択画面・編集・共有管理・共有詳細)の共通レイアウト。
 * ログインページ(/a/[token])と同じランダムトークンをそのままURLに含めることで、
 * ダッシュボード側も固定の推測可能なパスにならないようにしている。
 * セッションCookieの有無はproxy.tsが判定するため、ここではトークンの一致だけを見る
 * (proxy.tsの文字列一致チェックをすり抜けた不正なトークンでもここで確実に404にする)。
 */
export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const secret = process.env.ADMIN_LOGIN_PATH;
  if (!secret || token !== secret) {
    notFound();
  }

  const adminHref = `/a/${token}/admin`;

  return (
    <div className="flex flex-1 flex-col">
      <header
        className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-md
          pt-[env(safe-area-inset-top)]"
      >
        <div className="mx-auto max-w-3xl px-6 py-4">
          <PageHeader
            icon={
              <Link href={adminHref} className="inline-block transition-transform active:scale-90">
                {/* eslint-disable-next-line @next/next/no-img-element -- 固定の静的アセットを1枚表示するだけのため */}
                <img src="/icons/icon-192.png" alt="" className="h-10 w-10 rounded-xl shadow-sm shadow-black/10" />
              </Link>
            }
            title={
              <Link href={adminHref} className="transition-opacity hover:opacity-70 active:opacity-50">
                掲示板シェア
              </Link>
            }
            subtitle="管理画面"
            action={<LogoutButton />}
          />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-8 pb-32">{children}</main>
      <BottomTabBar token={token} />
    </div>
  );
}
