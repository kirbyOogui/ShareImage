import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateId } from "@/lib/id/generate";
import { isShareExpired } from "@/lib/share/expiry";
import { isViewerAuthorized } from "@/lib/share/access";
import { assertValidPushEndpoint, PushEndpointValidationError } from "@/lib/push/validate-endpoint";
import { consumeRateLimit } from "@/lib/rate-limit/memory-rate-limiter";
import { getClientIp } from "@/lib/security/ip";

interface RouteParams {
  params: Promise<{ shareId: string }>;
}

interface SubscriptionBody {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
}

const SUBSCRIBE_ATTEMPT_LIMIT = 20;
const SUBSCRIBE_ATTEMPT_WINDOW_MS = 5 * 60 * 1000;

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { shareId } = await params;

  const ip = getClientIp(request);
  const rateLimit = consumeRateLimit(`push-subscribe:${ip}`, SUBSCRIBE_ATTEMPT_LIMIT, SUBSCRIBE_ATTEMPT_WINDOW_MS);
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
  if (!(await isViewerAuthorized(request, shareId, share.passwordHash))) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
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
    create: { id: generateId(), shareId, endpoint, p256dh, auth, userAgent },
    update: { shareId, p256dh, auth, userAgent },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { shareId } = await params;

  const share = await prisma.share.findUnique({ where: { id: shareId } });
  if (!share) {
    return NextResponse.json({ error: "共有が見つかりません" }, { status: 404 });
  }
  if (!(await isViewerAuthorized(request, shareId, share.passwordHash))) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const body: { endpoint?: string } | null = await request.json().catch(() => null);
  const endpoint = body?.endpoint;
  if (!endpoint) {
    return NextResponse.json({ error: "endpointが必要です" }, { status: 400 });
  }

  await prisma.pushSubscription.deleteMany({ where: { shareId, endpoint } });
  return NextResponse.json({ ok: true });
}
