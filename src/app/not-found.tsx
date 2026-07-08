import Link from "next/link";
import { getGalleryPath } from "@/lib/gallery";
import { Button } from "@/components/ui/button";

function CompassIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-10 w-10"
      aria-hidden="true"
    >
      <path d="M15.75 15.75l-2.489-6.75-6.75 2.489 2.489 6.75 6.75-2.489z" />
      <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-accent">
        <CompassIcon />
      </div>
      <h1 className="text-xl font-semibold tracking-tight">ページが見つかりません</h1>
      <p className="text-sm text-foreground/50">URLをご確認のうえ、もう一度お試しください。</p>
      <Link href={`/collection/${getGalleryPath()}`} className="mt-4">
        <Button variant="secondary" size="sm">
          一覧に戻る
        </Button>
      </Link>
    </main>
  );
}
