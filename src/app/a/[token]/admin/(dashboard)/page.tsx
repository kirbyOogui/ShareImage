import Link from "next/link";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

function EditIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-16 w-16 sm:h-20 sm:w-20"
      aria-hidden="true"
    >
      <path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
      <path d="M19.5 7.125L16.875 4.5" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-16 w-16 sm:h-20 sm:w-20"
      aria-hidden="true"
    >
      <path d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
    </svg>
  );
}

/**
 * ログイン直後に表示する選択画面。「PDFを編集」と「共有する」の入口を分ける。
 */
export default async function AdminChoicePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">何をしますか?</h1>
        <p className="text-sm text-foreground/40">編集してから共有することも、そのまま共有することもできます</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link href={`/a/${token}/admin/edit`}>
          <Card
            className="flex h-full min-h-64 flex-col items-center justify-center gap-4 p-8 text-center
              transition-all hover:bg-surface active:scale-[0.97] active:bg-surface sm:min-h-72"
          >
            <span className="flex h-28 w-28 items-center justify-center rounded-full bg-accent/10 text-accent sm:h-32 sm:w-32">
              <EditIcon />
            </span>
            <span className="text-2xl font-semibold tracking-tight">PDFを編集</span>
            <p className="text-sm text-foreground/50">
              PDFや画像をドロップして、トリミング・拡大縮小・形式変換・AIで不要なものを消す編集ができます。
            </p>
          </Card>
        </Link>
        <Link href={`/a/${token}/admin/share`}>
          <Card
            className="flex h-full min-h-64 flex-col items-center justify-center gap-4 p-8 text-center
              transition-all hover:bg-surface active:scale-[0.97] active:bg-surface sm:min-h-72"
          >
            <span className="flex h-28 w-28 items-center justify-center rounded-full bg-accent/10 text-accent sm:h-32 sm:w-32">
              <ShareIcon />
            </span>
            <span className="text-2xl font-semibold tracking-tight">共有する</span>
            <p className="text-sm text-foreground/50">
              PDFや画像をアップロードして共有ページを作成したり、既存の共有を管理できます。
            </p>
          </Card>
        </Link>
      </div>
    </div>
  );
}
