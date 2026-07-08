"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CropTool } from "./crop-tool";
import { ResizeTool } from "./resize-tool";
import { DrawTool } from "./draw-tool";
import { InpaintTool } from "./inpaint-tool";
import { FormatTool } from "./format-tool";
import { ShareFromImagesForm } from "./share-from-images-form";
import { extensionForFormat } from "@/lib/image/format";
import type { EditorPage, EditResult } from "./types";

type Tool = "crop" | "resize" | "draw" | "format" | "inpaint";

const TOOL_LABELS: Record<Tool, string> = {
  crop: "トリミング",
  resize: "拡大縮小",
  draw: "描画",
  format: "形式変換",
  inpaint: "AIで消す",
};

const ACCEPTED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".webp"];

export function PdfEditor() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pages, setPages] = useState<EditorPage[]>([]);
  const [history, setHistory] = useState<EditorPage[][]>([]);
  const [future, setFuture] = useState<EditorPage[][]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [tool, setTool] = useState<Tool>("crop");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showShareForm, setShowShareForm] = useState(false);

  async function handleFileSelected(file: File | undefined | null) {
    if (!file) return;
    const name = file.name.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext))) {
      setError("PDF、またはJPEG/PNG/WebP画像ファイルを選択してください");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const res = await fetch("/api/admin/edit/convert", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "ファイルの変換に失敗しました");
        return;
      }
      setPages(data.pages);
      setHistory([]);
      setFuture([]);
      setSelectedIndex(0);
      setTool("crop");
      setShowShareForm(false);
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  function handleApply(result: EditResult) {
    if (selectedIndex === null) return;
    setHistory((prev) => [...prev, pages]);
    setFuture([]);
    setPages((prev) => prev.map((p, i) => (i === selectedIndex ? { ...p, ...result } : p)));
  }

  function handleUndo() {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setFuture((prev) => [pages, ...prev]);
    setPages(previous);
  }

  function handleRedo() {
    if (future.length === 0) return;
    const next = future[0];
    setFuture((prev) => prev.slice(1));
    setHistory((prev) => [...prev, pages]);
    setPages(next);
  }

  function handleReset() {
    setPages([]);
    setHistory([]);
    setFuture([]);
    setSelectedIndex(null);
    setShowShareForm(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleDownload() {
    if (selectedIndex === null) return;
    const page = pages[selectedIndex];
    const a = document.createElement("a");
    a.href = page.dataUrl;
    a.download = `page-${page.pageNumber}.${extensionForFormat(page.format)}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  const selectedPage = selectedIndex !== null ? pages[selectedIndex] : null;

  if (pages.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <div
          onClick={() => fileInputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2
            border-dashed border-border bg-surface px-6 py-10 text-center transition-colors"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf,image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={(e) => handleFileSelected(e.target.files?.[0])}
          />
          <p className="text-[15px] font-medium">
            {loading ? "変換中..." : "編集するPDFまたは画像をドラッグ&ドロップ"}
          </p>
          <p className="text-sm text-foreground/50">またはタップして選択</p>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {pages.map((page, i) => (
          <button
            key={page.pageNumber}
            type="button"
            onClick={() => {
              setSelectedIndex(i);
              setShowShareForm(false);
            }}
            className={`shrink-0 overflow-hidden rounded-xl border-2 transition-colors
              ${i === selectedIndex ? "border-accent" : "border-border"}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- サムネイル一覧のため素のimgで十分 */}
            <img src={page.dataUrl} alt={`${page.pageNumber}ページ`} className="h-24 w-auto" />
          </button>
        ))}
      </div>

      {selectedPage && !showShareForm && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleUndo}
              disabled={history.length === 0}
              className="rounded-xl bg-surface px-4 py-2 text-sm font-medium text-foreground/70
                transition-colors disabled:opacity-40"
            >
              ← 1つ前に戻る
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={future.length === 0}
              className="rounded-xl bg-surface px-4 py-2 text-sm font-medium text-foreground/70
                transition-colors disabled:opacity-40"
            >
              1つ先に進む →
            </button>
            {(Object.keys(TOOL_LABELS) as Tool[]).map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => setTool(t)}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors
                  ${tool === t ? "bg-accent text-accent-foreground" : "bg-surface text-foreground/70"}`}
              >
                {TOOL_LABELS[t]}
              </button>
            ))}
          </div>

          {tool === "crop" && <CropTool dataUrl={selectedPage.dataUrl} onApply={handleApply} />}
          {tool === "resize" && (
            <ResizeTool
              dataUrl={selectedPage.dataUrl}
              width={selectedPage.width}
              height={selectedPage.height}
              onApply={handleApply}
            />
          )}
          {tool === "draw" && (
            <DrawTool
              dataUrl={selectedPage.dataUrl}
              width={selectedPage.width}
              height={selectedPage.height}
              onApply={handleApply}
            />
          )}
          {tool === "format" && (
            <FormatTool
              dataUrl={selectedPage.dataUrl}
              width={selectedPage.width}
              height={selectedPage.height}
              currentFormat={selectedPage.format}
              onApply={handleApply}
            />
          )}
          {tool === "inpaint" && (
            <InpaintTool
              dataUrl={selectedPage.dataUrl}
              width={selectedPage.width}
              height={selectedPage.height}
              onApply={handleApply}
            />
          )}
        </div>
      )}

      {showShareForm ? (
        <ShareFromImagesForm pages={pages} onCancel={() => setShowShareForm(false)} />
      ) : (
        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          <Button type="button" variant="secondary" onClick={handleDownload}>
            この画像をダウンロード
          </Button>
          <Button type="button" variant="secondary" onClick={handleReset}>
            別のファイルを編集する
          </Button>
          <Button type="button" onClick={() => setShowShareForm(true)}>
            共有へ進む
          </Button>
        </div>
      )}
    </div>
  );
}
