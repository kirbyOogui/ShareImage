"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const EXPIRY_OPTIONS = [
  { value: "1d", label: "1日" },
  { value: "7d", label: "7日" },
  { value: "30d", label: "30日" },
  { value: "none", label: "無期限" },
] as const;

export function ShareSettingsForm({
  shareId,
  initialTitle,
  hasPassword,
}: {
  shareId: string;
  initialTitle: string;
  hasPassword: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [password, setPassword] = useState("");
  const [clearPassword, setClearPassword] = useState(false);
  const [expiresIn, setExpiresIn] = useState<(typeof EXPIRY_OPTIONS)[number]["value"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (password && !/^\d{4,8}$/.test(password)) {
      setError("パスワードは4〜8桁の数字で入力してください");
      return;
    }

    const body: Record<string, string> = { title };
    if (clearPassword) body.password = "";
    else if (password) body.password = password;
    if (expiresIn) body.expiresIn = expiresIn;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/shares/${shareId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "更新に失敗しました");
        return;
      }
      setPassword("");
      setClearPassword(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      router.refresh();
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="タイトル" />

      <div className="flex flex-col gap-2">
        <Input
          placeholder={hasPassword ? "新しいパスワード(変更する場合のみ・4〜8桁)" : "閲覧パスワード(4〜8桁・任意)"}
          inputMode="numeric"
          value={password}
          disabled={clearPassword}
          onChange={(e) => setPassword(e.target.value)}
        />
        {hasPassword && (
          <label className="flex items-center gap-2 text-sm text-foreground/60">
            <input
              type="checkbox"
              checked={clearPassword}
              onChange={(e) => setClearPassword(e.target.checked)}
            />
            パスワード保護を解除する
          </label>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm text-foreground/50">有効期限を変更(選択時のみ更新されます)</span>
        <div className="flex flex-wrap gap-2">
          {EXPIRY_OPTIONS.map((opt) => (
            <button
              type="button"
              key={opt.value}
              onClick={() => setExpiresIn(opt.value === expiresIn ? null : opt.value)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors
                ${expiresIn === opt.value ? "bg-accent text-accent-foreground" : "bg-surface text-foreground/70"}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" variant="secondary" disabled={saving} className="w-fit">
        {saving ? "保存中..." : saved ? "保存しました" : "設定を保存"}
      </Button>
    </form>
  );
}
