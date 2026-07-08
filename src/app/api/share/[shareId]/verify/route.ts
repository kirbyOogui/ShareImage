import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createViewToken, viewTokenCookieName } from "@/lib/auth/view-token";
import { getSessionSecretString } from "@/lib/auth/session-secret";
import { isShareExpired } from "@/lib/share/expiry";
import { checkLockout, recordFailure, resetAttempts } from "@/lib/share/lockout";
import { getClientIp, hashIp } from "@/lib/security/ip";
import { consumeRateLimit } from "@/lib/rate-limit/memory-rate-limiter";

// 閲覧セッションの有効期間。一度パスワードを通過すれば、以後は同じURLを開くたびに
// 再入力を求めないようにするため長めに設定する。
const VIEW_TOKEN_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30日
const VERIFY_ATTEMPT_LIMIT = 10;
const VERIFY_ATTEMPT_WINDOW_MS = 60 * 1000;

interface RouteParams {
  params: Promise<{ shareId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { shareId } = await params;
  const ip = getClientIp(request);

  const rateLimit = consumeRateLimit(`share-verify:${ip}`, VERIFY_ATTEMPT_LIMIT, VERIFY_ATTEMPT_WINDOW_MS);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "試行回数が多すぎます。しばらくしてから再度お試しください" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rateLimit.retryAfterMs / 1000)) } }
    );
  }

  const share = await prisma.share.findUnique({ where: { id: shareId } });
  if (!share || isShareExpired(share)) {
    return NextResponse.json({ error: "共有が見つかりません" }, { status: 404 });
  }
  if (!share.passwordHash) {
    return NextResponse.json({ error: "この共有にパスワードは設定されていません" }, { status: 400 });
  }

  const ipHash = await hashIp(ip, getSessionSecretString());
  const lockout = await checkLockout(shareId, ipHash);
  if (lockout.locked) {
    return NextResponse.json(
      { error: "試行回数が多すぎます。しばらくしてから再度お試しください" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(lockout.retryAfterMs / 1000)) } }
    );
  }

  const body = await request.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";
  if (!password) {
    return NextResponse.json({ error: "パスワードを入力してください" }, { status: 400 });
  }

  const valid = await verifyPassword(password, share.passwordHash);
  if (!valid) {
    await recordFailure(shareId, ipHash);
    return NextResponse.json({ error: "パスワードが正しくありません" }, { status: 401 });
  }

  await resetAttempts(shareId, ipHash);

  const token = await createViewToken(shareId, VIEW_TOKEN_MAX_AGE_SECONDS);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(viewTokenCookieName(shareId), token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: VIEW_TOKEN_MAX_AGE_SECONDS,
  });
  return response;
}
