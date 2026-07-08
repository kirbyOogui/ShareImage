import { SignJWT, jwtVerify } from "jose";
import { getSessionSecretKey } from "./session-secret";

// パスワード付き共有ページの閲覧セッション。shareIdごとにCookie名を分けることで、
// 同じブラウザで複数の共有ページを閲覧しても互いに干渉しない。
export function viewTokenCookieName(shareId: string): string {
  return `view_token_${shareId}`;
}

export async function createViewToken(shareId: string, maxAgeSeconds: number): Promise<string> {
  return new SignJWT({ shareId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + maxAgeSeconds)
    .sign(getSessionSecretKey());
}

export async function verifyViewToken(token: string, shareId: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, getSessionSecretKey());
    return payload.shareId === shareId;
  } catch {
    return false;
  }
}
