import type { NextRequest } from "next/server";
import { verifyViewToken, viewTokenCookieName } from "@/lib/auth/view-token";

/** パスワード無しの共有は誰でも閲覧可能、パスワード有りの場合のみview_tokenを検証する */
export async function isViewerAuthorized(
  request: NextRequest,
  shareId: string,
  passwordHash: string | null
): Promise<boolean> {
  if (!passwordHash) return true;
  const token = request.cookies.get(viewTokenCookieName(shareId))?.value;
  return token ? await verifyViewToken(token, shareId) : false;
}
