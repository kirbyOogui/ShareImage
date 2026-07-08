"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-8 w-8"
      aria-hidden="true"
    >
      <path d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
}

interface PasswordFormProps {
  shareId: string;
  title: string | null;
  /** 指定時はページ全体のリロードの代わりにこれを呼ぶ(ライトボックス内でのその場切り替え用) */
  onSuccess?: () => void;
}

export function PasswordForm({ shareId, title, onSuccess }: PasswordFormProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/share/${shareId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "パスワードが正しくありません");
        return;
      }
      if (onSuccess) {
        onSuccess();
      } else {
        // サーバーコンポーネントを再評価させ、ビューアを表示させる
        window.location.reload();
      }
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent">
          <LockIcon />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">{title || "共有ページ"}</h1>
        <p className="mt-2 text-sm text-foreground/50">閲覧にはパスワードが必要です</p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          type="password"
          inputMode="numeric"
          autoFocus
          placeholder="パスワード(4〜8桁)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={loading || !password}>
          {loading ? "確認中..." : "閲覧する"}
        </Button>
      </form>
    </div>
  );
}
