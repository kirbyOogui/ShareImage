export type ExpiryOption = "1d" | "7d" | "30d" | "none";

const DURATIONS_MS: Record<Exclude<ExpiryOption, "none">, number> = {
  "1d": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

export function computeExpiresAt(option: ExpiryOption): Date | null {
  if (option === "none") return null;
  return new Date(Date.now() + DURATIONS_MS[option]);
}

export function isValidExpiryOption(value: unknown): value is ExpiryOption {
  return value === "1d" || value === "7d" || value === "30d" || value === "none";
}

export const SHARE_PASSWORD_PATTERN = /^\d{4,8}$/;

/**
 * statusフィールド(cronによる非同期更新)とexpiresAt(即時判定)の両方をチェックする。
 * cronがまだ走っていないタイミングでも、期限切れの共有には即座にアクセスできないようにするため。
 */
export function isShareExpired(share: { status: string; expiresAt: Date | null }): boolean {
  if (share.status === "EXPIRED") return true;
  if (share.expiresAt && share.expiresAt.getTime() <= Date.now()) return true;
  return false;
}
