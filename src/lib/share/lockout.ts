import { prisma } from "@/lib/prisma";
import { generateId } from "@/lib/id/generate";

// 4〜8桁の弱いパスワード前提のため、プロセス再起動をまたいでも失効しないDB永続化のロックアウトを実装する。
const MAX_FAILURES_BEFORE_LOCK = 5;
const BASE_LOCK_MS = 5 * 60 * 1000; // 5分
const MAX_LOCK_MS = 24 * 60 * 60 * 1000; // 24時間

function computeLockDurationMs(failCount: number): number {
  const overBy = failCount - MAX_FAILURES_BEFORE_LOCK;
  if (overBy < 0) return 0;
  return Math.min(BASE_LOCK_MS * 2 ** overBy, MAX_LOCK_MS);
}

export interface LockoutStatus {
  locked: boolean;
  retryAfterMs: number;
}

export async function checkLockout(shareId: string, ipHash: string): Promise<LockoutStatus> {
  const attempt = await prisma.shareLoginAttempt.findUnique({
    where: { shareId_ipHash: { shareId, ipHash } },
  });
  if (attempt?.lockedUntil && attempt.lockedUntil.getTime() > Date.now()) {
    return { locked: true, retryAfterMs: attempt.lockedUntil.getTime() - Date.now() };
  }
  return { locked: false, retryAfterMs: 0 };
}

export async function recordFailure(shareId: string, ipHash: string): Promise<void> {
  const existing = await prisma.shareLoginAttempt.findUnique({
    where: { shareId_ipHash: { shareId, ipHash } },
  });
  const failCount = (existing?.failCount ?? 0) + 1;
  const lockMs = computeLockDurationMs(failCount);
  const lockedUntil = lockMs > 0 ? new Date(Date.now() + lockMs) : null;
  const now = new Date();

  await prisma.shareLoginAttempt.upsert({
    where: { shareId_ipHash: { shareId, ipHash } },
    create: { id: generateId(), shareId, ipHash, failCount, lockedUntil, lastAttemptAt: now },
    update: { failCount, lockedUntil, lastAttemptAt: now },
  });
}

export async function resetAttempts(shareId: string, ipHash: string): Promise<void> {
  await prisma.shareLoginAttempt.deleteMany({ where: { shareId, ipHash } });
}
