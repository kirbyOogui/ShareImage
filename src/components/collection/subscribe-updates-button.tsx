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

function BellIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  );
}

function BellSlashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path d="M3 3l18 18M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9c0-.606-.084-1.192-.242-1.748M6.53 6.53A8.965 8.965 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  );
}

/**
 * 一覧ページ(最初の画面)に置く、ギャラリー全体の更新通知の購読/解除ボタン。
 * 個別の共有ごとではなく、一覧内のどの共有が更新されても通知を受け取れる。
 * InstallPromptButtonと同じ、アイコン+タイトル+説明文の横長カード型ボタンで統一している。
 * Service Worker/PushManager非対応環境(iOS Safariの通常ブラウザ表示など)では何も表示しない
 * (PWAとしてホーム画面から起動した場合はiOS 16.4+でも対応)。
 */
export function SubscribeUpdatesButton() {
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

      await fetch("/api/collection/subscribe", {
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
        await fetch("/api/collection/subscribe", {
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
      <div
        className="mx-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border border-border
          bg-surface px-4 py-3 text-left opacity-60"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-foreground/40">
          <BellSlashIcon />
        </span>
        <span className="flex flex-col">
          <span className="text-sm font-semibold text-foreground/70">通知がブロックされています</span>
          <span className="text-xs text-foreground/50">ブラウザの設定から通知を許可してください</span>
        </span>
      </div>
    );
  }

  const subscribed = status === "subscribed";

  return (
    <button
      type="button"
      disabled={pending}
      onClick={subscribed ? handleUnsubscribe : handleSubscribe}
      className={`mx-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border px-4 py-3 text-left
        transition-colors disabled:opacity-40
        ${subscribed ? "border-border bg-surface hover:bg-border" : "border-accent/20 bg-accent/5 hover:bg-accent/10"}`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full
          ${subscribed ? "bg-foreground/10 text-foreground/60" : "bg-accent/10 text-accent"}`}
      >
        <BellIcon />
      </span>
      <span className="flex flex-col">
        <span className="text-sm font-semibold text-foreground">
          {subscribed ? "更新通知をオフにする" : "更新通知を受け取る"}
        </span>
        <span className="text-xs text-foreground/50">
          {subscribed ? "この端末に通知が届かなくなります" : "新しい掲示物が追加・更新されたら通知します"}
        </span>
      </span>
    </button>
  );
}
