"use client";

import { useRef, useState, type DragEvent, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEFAULT_IMAGE_OUTPUT_FORMAT, OUTPUT_FORMATS, type OutputFormat } from "@/lib/image/format";

const EXPIRY_OPTIONS = [
  { value: "1d", label: "1日" },
  { value: "7d", label: "7日" },
  { value: "30d", label: "30日" },
  { value: "none", label: "無期限" },
] as const;

const ACCEPTED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".webp"];

export function UploadDropzone() {
  const router = useRouter();
  const { token } = useParams<{ token: string }>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState("");
  const [password, setPassword] = useState("");
  const [expiresIn, setExpiresIn] = useState<(typeof EXPIRY_OPTIONS)[number]["value"]>("7d");
  const [outputFormat, setOutputFormat] = useState<OutputFormat>(DEFAULT_IMAGE_OUTPUT_FORMAT);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // 複数ファイルを選択・ドロップした場合、すべて1つの共有としてページ順に結合する。
  // 追加のたびに既存の選択に足し込むので、ドロップゾーンを複数回使って徐々に集められる。
  function pickFiles(candidates: FileList | File[] | undefined | null) {
    if (!candidates) return;
    const incoming = Array.from(candidates);
    const validFiles = incoming.filter((f) =>
      ACCEPTED_EXTENSIONS.some((ext) => f.name.toLowerCase().endsWith(ext))
    );
    setError(
      validFiles.length < incoming.length ? "PDFまたはJPEG/PNG/WebP画像以外は除外されました" : null
    );
    if (validFiles.length === 0) return;
    setFiles((prev) => [...prev, ...validFiles]);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    pickFiles(event.dataTransfer.files);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (files.length === 0) {
      setError("PDFまたは画像ファイルを選択してください");
      return;
    }
    if (password && !/^\d{4,8}$/.test(password)) {
      setError("パスワードは4〜8桁の数字で入力してください");
      return;
    }

    // アップロードはページを公開する大きな操作のため、一度確認を挟んでから実行する。
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
      if (title) formData.set("title", title);
      if (password) formData.set("password", password);
      formData.set("expiresIn", expiresIn);
      formData.set("outputFormat", outputFormat);

      const res = await fetch("/api/admin/shares", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "アップロードに失敗しました");
        setConfirming(false);
        return;
      }

      setFiles([]);
      setTitle("");
      setPassword("");
      setConfirming(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.push(`/a/${token}/admin/share/${data.shareId}`);
      router.refresh();
    } catch {
      setError("通信エラーが発生しました");
      setConfirming(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2
          border-dashed px-6 py-10 text-center transition-colors
          ${dragging ? "border-accent bg-accent/5" : "border-border bg-surface"}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf,image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          multiple
          className="hidden"
          onChange={(e) => {
            pickFiles(e.target.files);
            e.target.value = "";
          }}
        />
        {files.length > 0 ? (
          <p className="text-[15px] font-medium">{files.length}件のファイルを選択中(タップで追加)</p>
        ) : (
          <>
            <p className="text-[15px] font-medium">PDFまたは画像をドラッグ&ドロップ</p>
            <p className="text-sm text-foreground/50">
              またはタップして選択(複数ファイルをまとめて1つの共有にできます)
            </p>
          </>
        )}
      </div>

      {files.length > 0 && (
        <ul className="flex flex-col gap-2">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center justify-between gap-3 rounded-xl bg-surface px-4 py-2 text-sm"
            >
              <span className="truncate">
                {i + 1}. {f.name}
              </span>
              <button
                type="button"
                onClick={() => removeFile(i)}
                aria-label={`${f.name}を選択解除`}
                className="shrink-0 text-foreground/40 transition-all hover:text-red-600 active:scale-90 active:text-red-700"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <Input
        placeholder="タイトル(未入力なら1つ目のファイル名)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <Input
        placeholder="閲覧パスワード(4〜8桁の数字・任意)"
        inputMode="numeric"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <div className="flex flex-col gap-2">
        <span className="text-sm text-foreground/50">有効期限</span>
        <div className="flex flex-wrap gap-2">
          {EXPIRY_OPTIONS.map((opt) => (
            <button
              type="button"
              key={opt.value}
              onClick={() => setExpiresIn(opt.value)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors
                ${expiresIn === opt.value ? "bg-accent text-accent-foreground" : "bg-surface text-foreground/70"}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm text-foreground/50">変換する形式</span>
        <div className="flex flex-wrap gap-2">
          {OUTPUT_FORMATS.map((f) => (
            <button
              type="button"
              key={f.value}
              onClick={() => setOutputFormat(f.value)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors
                ${outputFormat === f.value ? "bg-accent text-accent-foreground" : "bg-surface text-foreground/70"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {confirming ? (
        <div className="flex flex-col gap-2 rounded-2xl bg-surface p-4">
          <p className="text-sm text-foreground/70">
            この内容で共有ページを作成します。よろしいですか？
          </p>
          <div className="flex gap-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "アップロード中..." : "作成する"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setConfirming(false)}
              disabled={loading}
            >
              キャンセル
            </Button>
          </div>
        </div>
      ) : (
        <Button type="submit" disabled={files.length === 0} className="w-full">
          アップロードして共有ページを作成
        </Button>
      )}
    </form>
  );
}
