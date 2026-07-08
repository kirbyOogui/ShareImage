import webpush from "web-push";

let configured = false;

// 初回送信時に遅延初期化する(モジュール読み込み時点では環境変数が未設定のテスト等でも
// importだけなら失敗しないようにするため)。
function ensureConfigured(): void {
  if (configured) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subjectEmail = process.env.VAPID_SUBJECT_EMAIL;
  if (!publicKey || !privateKey || !subjectEmail) {
    throw new Error(
      "VAPID鍵が設定されていません。scripts/generate-vapid-keys.ts で生成し.envに設定してください"
    );
  }
  webpush.setVapidDetails(`mailto:${subjectEmail}`, publicKey, privateKey);
  configured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  url: string;
}

export interface PushSubscriptionRecord {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export type PushSendResult = { ok: true } | { ok: false; shouldRemove: boolean };

/**
 * endpointが無効(410 Gone / 404 Not Found)な場合は、購読者側でブラウザが購読を破棄した
 * と判断しshouldRemove: trueを返す。呼び出し側はこれを見てDBからも削除する。
 */
export async function sendPush(
  subscription: PushSubscriptionRecord,
  payload: PushPayload
): Promise<PushSendResult> {
  ensureConfigured();
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload)
    );
    return { ok: true };
  } catch (err) {
    const statusCode = (err as { statusCode?: number })?.statusCode;
    return { ok: false, shouldRemove: statusCode === 404 || statusCode === 410 };
  }
}
