/// <reference lib="webworker" />
/// <reference no-default-lib="true" />

import { defaultCache } from "@serwist/next/worker";
import { ExpirationPlugin, Serwist, StaleWhileRevalidate } from "serwist";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// 共有ページの画像は「オフライン時も最後に見た画像を表示する」という要件のため、
// StaleWhileRevalidate(キャッシュを即座に返しつつ裏で最新版に更新)でキャッシュする。
// PDF更新時はAPI側でETagが変わるため、オンライン復帰後は自動的に新しい画像へ差し替わる。
const sharePageImageCaching: RuntimeCaching = {
  matcher: ({ url, request }) =>
    request.method === "GET" && /^\/api\/share\/[^/]+\/pages\/\d+$/.test(url.pathname),
  handler: new StaleWhileRevalidate({
    cacheName: "share-page-images",
    plugins: [new ExpirationPlugin({ maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 })],
  }),
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  // 独自ルール(画像)を優先し、それ以外はNext.js向けの推奨デフォルト
  // (HTML/RSCはNetworkFirst、静的アセットはCacheFirst相当)に委ねる。
  runtimeCaching: [sharePageImageCaching, ...defaultCache],
});

serwist.addEventListeners();

interface PushPayload {
  title?: string;
  body?: string;
  url?: string;
}

// 管理画面からの「通知送信」ボタン押下時にサーバーから送られてくるPushイベントを受け取り、
// OS通知として表示する。
self.addEventListener("push", (event: PushEvent) => {
  if (!event.data) return;
  let payload: PushPayload;
  try {
    payload = event.data.json();
  } catch {
    return;
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "お知らせ", {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: payload.url },
    })
  );
});

// 通知タップ時、対象の共有ページが既に開いていればそのタブにフォーカス、無ければ新規タブで開く。
self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string } | undefined)?.url;
  if (!url) return;

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of allClients) {
        if (client.url === url && "focus" in client) {
          await client.focus();
          return;
        }
      }
      await self.clients.openWindow(url);
    })()
  );
});
