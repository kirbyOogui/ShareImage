import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isShareExpired } from "@/lib/share/expiry";
import { getGalleryPath } from "@/lib/gallery";
import { ShareGrid } from "@/components/collection/share-grid";
import { InstallPromptButton } from "@/components/share/install-prompt-button";
import { PageHeader } from "@/components/ui/page-header";
import { NavActionButton } from "@/components/ui/nav-action-button";

export const dynamic = "force-dynamic";

function LoginIcon() {
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
      <path d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l3 3m0 0l-3 3m3-3H3" />
    </svg>
  );
}

/**
 * 閲覧者向けの一覧ページ。常に1つだけ存在する仕様で、URLのidは`.env`の`GALLERY_PATH`と
 * 一致する場合のみ表示する(一致しなければ管理者ログイン画面と同様に素の404)。
 */
export default async function CollectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (id !== getGalleryPath()) notFound();

  const shares = await prisma.share.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      updatedAt: true,
      passwordHash: true,
      pageCount: true,
      status: true,
      expiresAt: true,
      pdfStorageKey: true,
      pages: {
        orderBy: { pageNumber: "asc" },
        select: { pageNumber: true, width: true, height: true },
      },
    },
  });

  // 期限切れの共有は一覧からも即座に除外する(実削除はcronに委ねる)
  const visibleShares = shares
    .filter((share) => !isShareExpired(share))
    .map(({ passwordHash, pdfStorageKey, ...share }) => ({
      ...share,
      hasPassword: Boolean(passwordHash),
      hasPdf: Boolean(pdfStorageKey),
    }));

  // ログインボタンは/admin/loginのような固定パスではなく、ランダムなADMIN_LOGIN_PATHを
  // 知っている場合のみ辿り着ける専用URL(/a/{token})へ直接リンクする。
  const adminLoginHref = process.env.ADMIN_LOGIN_PATH ? `/a/${process.env.ADMIN_LOGIN_PATH}` : "/admin";

  return (
    <div className="flex min-h-dvh flex-col">
      <div
        className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-md
          pt-[env(safe-area-inset-top)]"
      >
        <div className="mx-auto max-w-2xl px-4 py-5 lg:max-w-4xl">
          <PageHeader
            icon={
              // eslint-disable-next-line @next/next/no-img-element -- 固定の静的アセットを1枚表示するだけのため
              <img
                src="/icons/icon-192.png"
                alt=""
                className="h-12 w-12 rounded-2xl shadow-sm shadow-black/10 sm:h-14 sm:w-14"
              />
            }
            title="掲示板シェア"
            subtitle={
              <>
                社内の掲示物をまとめて確認できます
                <span className="mx-1.5 inline-block h-1 w-1 rounded-full bg-foreground/20 align-middle" />
                {visibleShares.length}件
              </>
            }
            action={
              <NavActionButton href={adminLoginHref} icon={<LoginIcon />}>
                ログイン
              </NavActionButton>
            }
          />
        </div>
      </div>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6 lg:max-w-4xl">
        <InstallPromptButton />

        {visibleShares.length === 0 ? (
          <p className="text-center text-sm text-foreground/40">まだ共有はありません</p>
        ) : (
          <ShareGrid shares={visibleShares} />
        )}
      </main>
    </div>
  );
}
