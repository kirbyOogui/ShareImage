import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateId } from "@/lib/id/generate";
import { assertValidPushEndpoint, PushEndpointValidationError } from "@/lib/push/validate-endpoint";
import { consumeRateLimit } from "@/lib/rate-limit/memory-rate-limiter";
import { getClientIp } from "@/lib/security/ip";

interface SubscriptionBody {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
}

const SUBSCRIBE_ATTEMPT_LIMIT = 20;
const SUBSCRIBE_ATTEMPT_WINDOW_MS = 5 * 60 * 1000;

/**
 * ギャラリー(一覧ページ)全体の更新通知を購読する。個別の共有と異なりギャラリーは
 * パスワード保護が無い(常に誰でも閲覧できる)仕様のため、認証チェックは不要。
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = consumeRateLimit(`collection-subscribe:${ip}`, SUBSCRIBE_ATTEMPT_LIMIT, SUBSCRIBE_ATTEMPT_WINDOW_MS);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "試行回数が多すぎます。しばらくしてから再度お試しください" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rateLimit.retryAfterMs / 1000)) } }
    );
  }

  const body: SubscriptionBody | null = await request.json().catch(() => null);
  const endpoint = body?.endpoint;
  const p256dh = body?.keys?.p256dh;
  const auth = body?.keys?.auth;
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "購読情報の形式が不正です" }, { status: 400 });
  }

  try {
    assertValidPushEndpoint(endpoint);
  } catch (err) {
    if (err instanceof PushEndpointValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  const userAgent = request.headers.get("user-agent");
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { id: generateId(), endpoint, p256dh, auth, userAgent },
    update: { p256dh, auth, userAgent },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const body: { endpoint?: string } | null = await request.json().catch(() => null);
  const endpoint = body?.endpoint;
  if (!endpoint) {
    return NextResponse.json({ error: "endpointが必要です" }, { status: 400 });
  }

  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
  return NextResponse.json({ ok: true });
}
