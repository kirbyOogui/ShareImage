import { prisma } from "@/lib/prisma";
import { getGalleryUrl, getGalleryPath } from "@/lib/gallery";
import { UploadDropzone } from "@/components/admin/upload-dropzone";
import { ShareListItem } from "@/components/admin/share-list-item";
import { CopyUrlButton } from "@/components/admin/copy-url-button";
import { QrCodeCard } from "@/components/admin/qr-code-card";
import { Card } from "@/components/ui/card";
import { PageHeader, SectionLabel } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

function LinkIcon() {
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
      <path d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
    </svg>
  );
}

function UploadIcon() {
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
      <path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  );
}

function ListIcon() {
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
      <path d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  );
}

export default async function AdminSharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const shares = await prisma.share.findMany({ orderBy: { createdAt: "desc" } });

  const origin = process.env.NEXT_PUBLIC_APP_ORIGIN ?? "";
  const galleryUrl = getGalleryUrl(origin);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="共有する" subtitle="アップロード・URL確認・共有一覧の管理ができます" />

      <Card className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <SectionLabel icon={<LinkIcon />}>
            閲覧用URL(社内で共有するURL・QRコードはこれ1つだけ)
          </SectionLabel>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={`/collection/${getGalleryPath()}`}
              target="_blank"
              rel="noreferrer"
              className="break-all text-[15px] text-accent underline underline-offset-2"
            >
              {galleryUrl}
            </a>
            <CopyUrlButton url={galleryUrl} />
          </div>
        </div>
        <QrCodeCard url={galleryUrl} />
      </Card>

      <Card>
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-accent">
            <UploadIcon />
          </span>
          <h2 className="text-xl font-semibold tracking-tight">新しい掲示物を共有</h2>
        </div>
        <UploadDropzone />
      </Card>

      <div className="flex flex-col gap-3">
        <SectionLabel icon={<ListIcon />}>共有一覧({shares.length}件)</SectionLabel>
        {shares.length === 0 ? (
          <p className="text-sm text-foreground/40">まだ共有はありません</p>
        ) : (
          <div className="flex flex-col gap-2">
            {shares.map((share) => (
              <ShareListItem
                key={share.id}
                token={token}
                share={{ ...share, hasPassword: Boolean(share.passwordHash), hasPdf: Boolean(share.pdfStorageKey) }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
