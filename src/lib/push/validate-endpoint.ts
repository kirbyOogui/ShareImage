export class PushEndpointValidationError extends Error {}

// プライベート/ローカルホスト向けのendpointを拒否し、通知送信時(サーバーからendpointへの
// アウトバウンドHTTPリクエスト)がSSRFの踏み台にならないようにする。
const PRIVATE_HOSTNAME_PATTERNS = [
  /^localhost$/i,
  /\.local$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^169\.254\./,
  /^0\.0\.0\.0$/,
  /^\[?::1\]?$/,
  /^\[?fc[0-9a-f]{2}:/i,
  /^\[?fe80:/i,
];

export function assertValidPushEndpoint(endpoint: string): void {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new PushEndpointValidationError("endpointの形式が不正です");
  }
  if (url.protocol !== "https:") {
    throw new PushEndpointValidationError("endpointはhttpsのURLである必要があります");
  }
  if (PRIVATE_HOSTNAME_PATTERNS.some((pattern) => pattern.test(url.hostname))) {
    throw new PushEndpointValidationError("endpointに内部/ローカルホストは指定できません");
  }
}
