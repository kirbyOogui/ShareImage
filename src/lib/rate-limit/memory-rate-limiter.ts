interface Bucket {
  count: number;
  windowStart: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs: number;
}

declare global {
  var __rateLimitBuckets: Map<string, Bucket> | undefined;
}

const buckets = global.__rateLimitBuckets ?? new Map<string, Bucket>();
if (process.env.NODE_ENV !== "production") {
  global.__rateLimitBuckets = buckets;
}

/**
 * 固定ウィンドウ方式のインメモリレート制限(単一プロセス運用が前提)。
 * 将来複数インスタンスにスケールする場合は、同一シグネチャ(key, limit, windowMs) => RateLimitResult を保ったまま
 * ioredis の INCR + PEXPIRE ベースの実装に差し替えれば良い。
 */
export function consumeRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart >= windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (bucket.count < limit) {
    bucket.count += 1;
    return { allowed: true, retryAfterMs: 0 };
  }

  return { allowed: false, retryAfterMs: windowMs - (now - bucket.windowStart) };
}

// 古いバケットが溜まり続けないよう定期的に掃除する
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
const BUCKET_MAX_AGE_MS = 60 * 60 * 1000;
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStart > BUCKET_MAX_AGE_MS) buckets.delete(key);
  }
}, CLEANUP_INTERVAL_MS);
cleanupTimer.unref();
