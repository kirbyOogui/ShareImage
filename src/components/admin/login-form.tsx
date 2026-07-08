"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { LockIcon } from "@/components/ui/lock-icon";

export function LoginForm({ backHref, redirectTo }: { backHref: string; redirectTo: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "ログインに失敗しました");
        return;
      }
      router.replace(redirectTo);
      router.refresh();
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <Card>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-accent">
          <LockIcon />
        </div>
        <h1 className="text-xl font-semibold tracking-tight mb-1 text-center">管理者ログイン</h1>
        <p className="text-sm text-foreground/60 mb-6 text-center">パスワードを入力してください</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            type="password"
            inputMode="numeric"
            autoFocus
            placeholder="パスワード"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={loading || !password} className="w-full">
            {loading ? "確認中..." : "ログイン"}
          </Button>
        </form>
      </Card>
      <Link
        href={backHref}
        className="mx-auto mt-6 block w-fit text-xs text-foreground/40 underline underline-offset-2 transition-opacity hover:text-foreground/60 active:opacity-50"
      >
        ← 一覧に戻る
      </Link>
    </div>
  );
}
