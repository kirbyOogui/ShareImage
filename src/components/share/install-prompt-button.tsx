"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function InstallIcon() {
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
      <path d="M10.5 1.5h3A2.25 2.25 0 0115.75 3.75v16.5A2.25 2.25 0 0113.5 22.5h-3a2.25 2.25 0 01-2.25-2.25V3.75A2.25 2.25 0 0110.5 1.5z" />
      <path d="M12 18.75h.007" />
    </svg>
  );
}

/**
 * Android/Chrome等、beforeinstallpromptに対応するブラウザでのみ表示される
 * 「ホーム画面に追加」ボタン。iOS Safariはこのイベントに対応していないため
 * (共有シートからの手動追加のみ)、対象外の環境では何も表示しない。
 */
export function InstallPromptButton() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    }
    function handleAppInstalled() {
      setInstalled(true);
      setPromptEvent(null);
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    await promptEvent.userChoice;
    setPromptEvent(null);
  }

  if (!promptEvent || installed) return null;

  return (
    <button
      type="button"
      onClick={handleInstall}
      className="flex max-w-sm flex-1 basis-[calc(50%-0.375rem)] items-center gap-3 rounded-2xl border border-accent/20
        bg-accent/5 px-4 py-3 text-left transition-all hover:bg-accent/10 active:scale-95 active:bg-accent/15"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
        <InstallIcon />
      </span>
      <span className="flex flex-col">
        <span className="text-sm font-semibold text-foreground">ホーム画面に追加</span>
        <span className="text-xs text-foreground/50">アプリのようにすぐ開けるようになります</span>
      </span>
    </button>
  );
}
