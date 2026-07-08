"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function DeleteShareButton({ shareId }: { shareId: string }) {
  const router = useRouter();
  const { token } = useParams<{ token: string }>();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      await fetch(`/api/admin/shares/${shareId}`, { method: "DELETE" });
      router.push(`/a/${token}/admin/share`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (!confirming) {
    return (
      <Button variant="danger" size="sm" onClick={() => setConfirming(true)}>
        削除
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-foreground/60">本当に削除しますか？元に戻せません</span>
      <Button variant="danger" size="sm" onClick={handleDelete} disabled={loading}>
        {loading ? "削除中..." : "削除する"}
      </Button>
      <Button variant="secondary" size="sm" onClick={() => setConfirming(false)}>
        キャンセル
      </Button>
    </div>
  );
}
