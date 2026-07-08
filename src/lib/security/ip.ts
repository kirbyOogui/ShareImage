import type { NextRequest } from "next/server";

/**
 * リバースプロキシ配下での運用を想定し x-forwarded-for を優先する。
 * 直接インターネットに公開する場合は、信頼できるプロキシ経由のみでこのヘッダーが
 * 設定されるようインフラ側で担保すること(さもないと偽装が可能)。
 */
export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

/** レート制限やロックアウト記録でIPを直接DBに保存しないためのハッシュ化 */
export async function hashIp(ip: string, secret: string): Promise<string> {
  const data = new TextEncoder().encode(`${secret}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Buffer.from(digest).toString("hex");
}
