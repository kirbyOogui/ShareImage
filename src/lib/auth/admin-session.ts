import { SignJWT, jwtVerify } from "jose";
import { getSessionSecretKey } from "./session-secret";

export const ADMIN_SESSION_COOKIE = "admin_session";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8時間

export async function createAdminSessionToken(): Promise<string> {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + ADMIN_SESSION_MAX_AGE_SECONDS)
    .sign(getSessionSecretKey());
}

export async function verifyAdminSessionToken(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, getSessionSecretKey());
    return payload.role === "admin";
  } catch {
    return false;
  }
}
