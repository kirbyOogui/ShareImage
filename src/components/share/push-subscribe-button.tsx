"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64Safe);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

type Status = "unsupported" | "loading" | "subscribed" | "unsubscribed" | "denied";

/**
 * 通知の購読/解除ボタン。Service Worker/PushManager非対応環境(iOS Safariの通常ブラウザ表示など)
 * では何も表示しない(PWAとしてホーム画面から起動した場合はiOS 16.4+でも対応)。
 */
export function PushSubscribeButton({ shareId }: { shareId: string }) {
  const [status, setStatus] = useState<Status>("loading");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        if (!cancelled) setStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        if (!cancelled) setStatus("denied");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!cancelled) setStatus(subscription ? "subscribed" : "unsubscribed");
    }
    check().catch(() => {
      if (!cancelled) setStatus("unsupported");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubscribe() {
    setPending(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }

      const keyRes = await fetch("/api/push/vapid-public-key");
      if (!keyRes.ok) throw new Error("VAPID公開鍵の取得に失敗しました");
      const { publicKey } = (await keyRes.json()) as { publicKey: string };

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });

      await fetch(`/api/share/${shareId}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      setStatus("subscribed");
    } catch {
      setStatus("unsubscribed");
    } finally {
      setPending(false);
    }
  }

  async function handleUnsubscribe() {
    setPending(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch(`/api/share/${shareId}/subscribe`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
    } finally {
      setStatus("unsubscribed");
      setPending(false);
    }
  }

  if (status === "unsupported" || status === "loading") return null;

  if (status === "denied") {
    return (
      <p className="mx-auto w-fit rounded-full bg-surface px-4 py-2 text-xs text-foreground/60">
        通知がブロックされています。ブラウザの設定から通知を許可してください。
      </p>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={status === "subscribed" ? handleUnsubscribe : handleSubscribe}
      className="mx-auto flex w-fit items-center gap-2 rounded-full bg-surface px-4 py-2 text-sm
        font-medium text-foreground/70 transition-colors hover:bg-border disabled:opacity-40"
    >
      {status === "subscribed" ? "更新通知をオフにする" : "更新通知を受け取る"}
    </button>
  );
}
