import type { NextRequest } from "next/server";

const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * SameSite=Strict Cookieに加えた多層防御として、状態変更リクエストのOrigin/Refererを検証する。
 * 同一オリジンのfetchであれば必ずOriginヘッダーが付与されるため、これが自サイトと一致しない
 * (あるいは全く無い)リクエストはCSRFの可能性が高いとみなして拒否する。
 */
export function isCsrfSafe(request: NextRequest): boolean {
  if (!STATE_CHANGING_METHODS.has(request.method)) return true;

  const allowedOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN;
  if (!allowedOrigin) return true; // 未設定時は開発時の利便性を優先しスキップ(本番では必ず設定する)

  const origin = request.headers.get("origin");
  if (origin) return origin === allowedOrigin;

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).origin === allowedOrigin;
    } catch {
      return false;
    }
  }

  return false;
}
