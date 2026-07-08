import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPush } from "@/lib/push/web-push-client";
import { getGalleryUrl } from "@/lib/gallery";

interface RouteParams {
  params: Promise<{ shareId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { shareId } = await params;

  const share = await prisma.share.findUnique({ where: { id: shareId } });
  if (!share) {
    return NextResponse.json({ error: "共有が見つかりません" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim().slice(0, 200) : "";

  const subscriptions = await prisma.pushSubscription.findMany({ where: { shareId } });
  if (subscriptions.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, total: 0 });
  }

  const origin = process.env.NEXT_PUBLIC_APP_ORIGIN ?? "";
  const payload = {
    title: share.title || "共有ページが更新されました",
    body: message || "内容が更新されました。タップして確認してください。",
    url: getGalleryUrl(origin),
  };

  let sent = 0;
  const staleEndpoints: string[] = [];
  await Promise.all(
    subscriptions.map(async (subscription) => {
      const result = await sendPush(subscription, payload);
      if (result.ok) {
        sent += 1;
      } else if (result.shouldRemove) {
        staleEndpoints.push(subscription.endpoint);
      }
    })
  );

  if (staleEndpoints.length > 0) {
    // ブラウザ側で購読が破棄済み(410/404)の宛先はDBからも削除して以後の送信対象から外す
    await prisma.pushSubscription.deleteMany({ where: { endpoint: { in: staleEndpoints } } });
  }

  return NextResponse.json({ ok: true, sent, total: subscriptions.length });
}
