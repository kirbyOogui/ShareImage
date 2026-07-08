import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { SectionLabel, BackArrowIcon } from "@/components/ui/page-header";
import { NotifyForm } from "@/components/admin/notify-form";
import { ShareSettingsForm } from "@/components/admin/share-settings-form";
import { ReplacePdfForm } from "@/components/admin/replace-pdf-form";
import { DeleteShareButton } from "@/components/admin/delete-share-button";

export const dynamic = "force-dynamic";

function BellIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a7.65 7.65 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}

export default async function ShareDetailPage({
  params,
}: {
  params: Promise<{ token: string; shareId: string }>;
}) {
  const { token, shareId } = await params;
  const share = await prisma.share.findUnique({ where: { id: shareId } });
  if (!share) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Link
          href={`/a/${token}/admin/share`}
          className="inline-flex items-center gap-1 text-sm text-foreground/50 hover:text-foreground"
        >
          <BackArrowIcon />
          共有一覧に戻る
        </Link>
        <span
          className={`rounded-full px-3 py-1 text-xs ${
            share.status === "EXPIRED" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"
          }`}
        >
          {share.status === "EXPIRED" ? "期限切れ" : "公開中"}
        </span>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{share.title || "(無題)"}</h1>
        <p className="mt-1 text-sm text-foreground/50">
          {share.pageCount}ページ・最終更新: {formatDateTime(share.updatedAt)}・有効期限:{" "}
          {formatDateTime(share.expiresAt)}
          {share.pdfStorageKey && (
            <span className="ml-2 rounded-full bg-surface px-2 py-0.5 text-xs text-foreground/60">
              PDFとして保存
            </span>
          )}
        </p>
      </div>

      <Card>
        <div className="mb-4">
          <SectionLabel icon={<BellIcon />}>更新通知</SectionLabel>
        </div>
        <NotifyForm shareId={share.id} />
      </Card>

      <Card>
        <div className="mb-4">
          <SectionLabel icon={<GearIcon />}>設定</SectionLabel>
        </div>
        <ShareSettingsForm
          shareId={share.id}
          initialTitle={share.title ?? ""}
          hasPassword={Boolean(share.passwordHash)}
        />
      </Card>

      <Card>
        <div className="mb-4">
          <SectionLabel icon={<RefreshIcon />}>PDFを更新</SectionLabel>
        </div>
        <ReplacePdfForm shareId={share.id} />
      </Card>

      <Card className="flex items-center justify-between">
        <SectionLabel icon={<TrashIcon />}>この共有を削除</SectionLabel>
        <DeleteShareButton shareId={share.id} />
      </Card>
    </div>
  );
}
