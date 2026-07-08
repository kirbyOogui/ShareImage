"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DEFAULT_IMAGE_OUTPUT_FORMAT, OUTPUT_FORMATS, type OutputFormat } from "@/lib/image/format";

export function ReplacePdfForm({ shareId }: { shareId: string }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>(DEFAULT_IMAGE_OUTPUT_FORMAT);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (files.length === 0) {
      setError("差し替えるPDFまたは画像ファイルを選択してください");
      return;
    }

    // 既存の共有内容を上書きする大きな操作のため、一度確認を挟んでから実行する。
    if (!confirming) {
      setError(null);
      setConfirming(true);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));
      formData.set("outputFormat", outputFormat);
      const res = await fetch(`/api/admin/shares/${shareId}`, { method: "PATCH", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "更新に失敗しました");
        setConfirming(false);
        return;
      }
      setFiles([]);
      setConfirming(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    } catch {
      setError("通信エラーが発生しました");
      setConfirming(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <p className="text-sm text-foreground/60">
        新しいPDFまたは画像(複数選択すると1つの共有としてまとめて結合されます)をアップロードすると、
        共有URLはそのままで画像だけが更新されます。
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf,image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          multiple
          onChange={(e) => setFiles(e.target.files ? Array.from(e.target.files) : [])}
          className="text-sm"
        />
        {!confirming && (
          <Button type="submit" variant="secondary" size="sm" disabled={loading || files.length === 0}>
            この内容に更新する
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {OUTPUT_FORMATS.map((f) => (
          <button
            type="button"
            key={f.value}
            onClick={() => setOutputFormat(f.value)}
            className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all active:scale-95
              ${outputFormat === f.value ? "bg-accent text-accent-foreground" : "bg-surface text-foreground/70 active:bg-border"}`}
          >
            {f.label}
          </button>
        ))}
      </div>
      {files.length > 1 && (
        <p className="text-xs text-foreground/50">
          {files.map((f) => f.name).join(" / ")}
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {confirming && (
        <div className="flex flex-col gap-2 rounded-2xl bg-surface p-4">
          <p className="text-sm text-foreground/70">
            現在公開中の内容をこの内容に置き換えます。よろしいですか？(元に戻せません)
          </p>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={loading} className="flex-1">
              {loading ? "更新中..." : "更新する"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setConfirming(false)}
              disabled={loading}
            >
              キャンセル
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
