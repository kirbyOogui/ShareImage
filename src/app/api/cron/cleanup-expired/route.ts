import { NextResponse, type NextRequest } from "next/server";
import { cleanupExpiredShares } from "@/lib/cron/cleanup-expired";

/**
 * Vercel Cron Jobs(vercel.jsonで1日1回登録)から呼ばれる、期限切れ共有の物理削除エンドポイント。
 * ローカル開発では代わりにsrc/instrumentation.tsのnode-cronが同じ処理を定期実行するため、
 * このルートはVercel(サーバーレス)環境専用。
 * Vercelはcronからの呼び出し時、環境変数CRON_SECRETと同じ値を
 * `Authorization: Bearer {CRON_SECRET}`ヘッダーに自動で付与するため、それを検証する。
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const count = await cleanupExpiredShares();
  return NextResponse.json({ ok: true, deletedCount: count });
}
