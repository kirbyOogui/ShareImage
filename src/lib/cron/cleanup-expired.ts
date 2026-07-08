import cron from "node-cron";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";

const CRON_EXPRESSION = "*/5 * * * *"; // 5分毎に期限切れ共有をチェックする

/**
 * expiresAtを過ぎた共有をストレージ(画像)ごと完全削除する。
 * Page/PushSubscription/ShareLoginAttemptはPrismaスキーマのonDelete: Cascadeで一括削除される。
 */
export async function cleanupExpiredShares(): Promise<number> {
  const expired = await prisma.share.findMany({
    where: { expiresAt: { lte: new Date() } },
    select: { id: true },
  });

  for (const { id } of expired) {
    await storage.deletePrefix(`${id}/`).catch((err) => {
      console.error(`[cron] ストレージ削除に失敗しました(shareId=${id})`, err);
    });
    await prisma.share.delete({ where: { id } }).catch((err) => {
      console.error(`[cron] DBレコード削除に失敗しました(shareId=${id})`, err);
    });
  }

  return expired.length;
}

declare global {
  var __expiryCronStarted: boolean | undefined;
}

/** Next.jsの開発時ホットリロードでcronタスクが多重登録されるのを防ぐ */
export function startExpiryCleanupCron(): void {
  if (global.__expiryCronStarted) return;
  global.__expiryCronStarted = true;

  cron.schedule(CRON_EXPRESSION, () => {
    cleanupExpiredShares()
      .then((count) => {
        if (count > 0) console.log(`[cron] 期限切れ共有を${count}件削除しました`);
      })
      .catch((err) => {
        console.error("[cron] 期限切れ共有の削除処理でエラーが発生しました", err);
      });
  });

  console.log(`[cron] 期限切れ共有の自動削除ジョブを登録しました(${CRON_EXPRESSION})`);
}
