"use client";

import { useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { extensionForFormat } from "@/lib/image/format";
import type { EditorPage } from "./types";

const EXPIRY_OPTIONS = [
  { value: "1d", label: "1日" },
  { value: "7d", label: "7日" },
  { value: "30d", label: "30日" },
  { value: "none", label: "無期限" },
] as const;

// CSPのconnect-src 'self'によりdata: URLへのfetch()がブロックされるため、
// fetch経由ではなくbase64を手動デコードしてBlobを組み立てる。
function dataUrlToBlob(dataUrl: string): Blob {
  const commaIndex = dataUrl.indexOf(",");
  const header = dataUrl.slice(0, commaIndex);
  const base64 = dataUrl.slice(commaIndex + 1);
  const mimeMatch = /data:(.*?);base64/.exec(header);
  const mime = mimeMatch?.[1] ?? "application/octet-stream";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

export function ShareFromImagesForm({ pages, onCancel }: { pages: EditorPage[]; onCancel: () => void }) {
  const router = useRouter();
  const { token } = useParams<{ token: string }>();
  const [title, setTitle] = useState("");
  const [password, setPassword] = useState("");
  const [expiresIn, setExpiresIn] = useState<(typeof EXPIRY_OPTIONS)[number]["value"]>("7d");
  const [asPdf, setAsPdf] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (password && !/^\d{4,8}$/.test(password)) {
      setError("パスワードは4〜8桁の数字で入力してください");
      return;
    }

    // 編集を終えて共有ページを実際に公開する大きな操作のため、一度確認を挟む。
    if (!confirming) {
      setError(null);
      setConfirming(true);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      for (const page of pages) {
        const blob = dataUrlToBlob(page.dataUrl);
        formData.append("images", blob, `page-${page.pageNumber}.${extensionForFormat(page.format)}`);
      }
      if (title) formData.set("title", title);
      if (password) formData.set("password", password);
      formData.set("expiresIn", expiresIn);
      if (asPdf) formData.set("outputFormat", "pdf");

      const res = await fetch("/api/admin/shares/from-images", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "共有の作成に失敗しました");
        setConfirming(false);
        return;
      }
      router.push(`/a/${token}/admin/share/${data.shareId}`);
    } catch {
      setError("通信エラーが発生しました");
      setConfirming(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 border-t border-border pt-4">
      <p className="text-sm text-foreground/60">編集済みの{pages.length}枚の画像で共有を作成します。</p>
      <Input placeholder="タイトル(未入力なら「編集した画像」)" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Input
        placeholder="閲覧パスワード(4〜8桁の数字・任意)"
        inputMode="numeric"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        {EXPIRY_OPTIONS.map((opt) => (
          <button
            type="button"
            key={opt.value}
            onClick={() => setExpiresIn(opt.value)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-all active:scale-95
              ${expiresIn === opt.value ? "bg-accent text-accent-foreground" : "bg-surface text-foreground/70 active:bg-border"}`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm text-foreground/70">
        <input type="checkbox" checked={asPdf} onChange={(e) => setAsPdf(e.target.checked)} />
        PDFファイルとしてまとめて共有する(画像の代わりに1つのPDFとして保存)
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {confirming ? (
        <div className="flex flex-col gap-2 rounded-2xl bg-surface p-4">
          <p className="text-sm text-foreground/70">
            編集した{pages.length}枚の画像で共有ページを作成します。よろしいですか？
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "作成中..." : "作成する"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setConfirming(false)} disabled={loading}>
              キャンセル
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
            戻る
          </Button>
          <Button type="submit" disabled={loading}>
            共有ページを作成
          </Button>
        </div>
      )}
    </form>
  );
}
