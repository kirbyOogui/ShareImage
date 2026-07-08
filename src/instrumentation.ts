export async function register() {
  // Vercel等のサーバーレス環境には常駐プロセスが無く、setInterval式のnode-cronは機能しない
  // (関数インスタンスがいつ破棄されるか分からないため)。本番(Vercel)では代わりに
  // vercel.jsonで登録したVercel Cron Jobsが/api/cron/cleanup-expiredを定期的に叩く。
  // ローカル開発時(VERCEL環境変数が無い場合)のみ、従来通りNode.jsランタイムでcronを起動する。
  if (process.env.NEXT_RUNTIME === "nodejs" && !process.env.VERCEL) {
    const { startExpiryCleanupCron } = await import("./lib/cron/cleanup-expired");
    startExpiryCleanupCron();
  }
}
