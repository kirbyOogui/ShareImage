import { NextResponse } from "next/server";

/**
 * Vercelのサーバーレス関数がスリープしてコールドスタートが発生するのを緩和するための
 * 軽量なヘルスチェック用エンドポイント。DBやストレージには一切アクセスせず、
 * 関数を起動させるだけの最小限のレスポンスを返す(.github/workflows/keep-warm.ymlから定期的に叩かれる)。
 */
export async function GET() {
  return NextResponse.json({ ok: true });
}
