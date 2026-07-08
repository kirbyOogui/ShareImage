let cachedSecret: string | null = null;
let cachedKey: Uint8Array | null = null;

/** IPハッシュ化等、生の文字列としてSESSION_SECRETが必要な箇所向け。 */
export function getSessionSecretString(): string {
  if (cachedSecret) return cachedSecret;
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET が未設定、または短すぎます(32文字以上のランダムな文字列を .env に設定してください)"
    );
  }
  cachedSecret = secret;
  return cachedSecret;
}

/** Cookie署名に使うHMAC鍵。SESSION_SECRETは`openssl rand -hex 32`等で生成した32文字以上の値を想定。 */
export function getSessionSecretKey(): Uint8Array {
  if (cachedKey) return cachedKey;
  cachedKey = new TextEncoder().encode(getSessionSecretString());
  return cachedKey;
}
