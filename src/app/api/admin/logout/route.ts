import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/lib/auth/admin-session";
import { getGalleryPath } from "@/lib/gallery";

export async function POST() {
  // ログアウト後の遷移先は固定パスではなく、ギャラリーのランダムURLをここで解決して返す
  // (クライアント側はADMIN_LOGIN_PATH等の秘密情報を持たないため)。
  const response = NextResponse.json({ ok: true, redirectTo: `/collection/${getGalleryPath()}` });
  response.cookies.set(ADMIN_SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
