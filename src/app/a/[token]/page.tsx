import { notFound } from "next/navigation";
import { getGalleryPath } from "@/lib/gallery";
import { LoginForm } from "@/components/admin/login-form";

export const dynamic = "force-dynamic";

/**
 * 管理者ログイン画面。/admin/loginのような推測可能な固定パスではなく、
 * ADMIN_LOGIN_PATH(.envで設定するランダムな値)と一致するトークンでアクセスした場合のみ
 * ログインフォームを表示する。それ以外は通常の404として扱い、管理画面の存在自体を明かさない。
 */
export default async function AdminEntryPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const secret = process.env.ADMIN_LOGIN_PATH;
  if (!secret || token !== secret) {
    notFound();
  }

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <LoginForm backHref={`/collection/${getGalleryPath()}`} redirectTo={`/a/${token}/admin`} />
    </div>
  );
}
