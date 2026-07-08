"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function NotifyForm({ shareId }: { shareId: string }) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setResult(null);
    setSending(true);
    try {
      const res = await fetch(`/api/admin/shares/${shareId}/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "送信に失敗しました");
        return;
      }
      setResult(
        data.total === 0
          ? "購読している端末がまだありません"
          : `${data.sent}/${data.total}件に送信しました`
      );
      setMessage("");
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="通知メッセージ(任意・未入力時は既定文言)"
        maxLength={200}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      {result && <p className="text-sm text-foreground/50">{result}</p>}
      <Button type="submit" variant="secondary" disabled={sending} className="w-fit">
        {sending ? "送信中..." : "更新通知を送信"}
      </Button>
    </form>
  );
}
