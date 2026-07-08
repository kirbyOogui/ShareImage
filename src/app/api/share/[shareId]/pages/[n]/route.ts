import { NextResponse, type NextRequest } from "next/server";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { isShareExpired } from "@/lib/share/expiry";
import { verifyViewToken, viewTokenCookieName } from "@/lib/auth/view-token";
import { mimeForExtension } from "@/lib/image/format";

interface RouteParams {
  params: Promise<{ shareId: string; n: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { shareId, n } = await params;
  const pageNumber = Number(n);
  if (!Number.isInteger(pageNumber) || pageNumber < 1) {
    return NextResponse.json({ error: "不正なページ番号です" }, { status: 400 });
  }

  const share = await prisma.share.findUnique({
    where: { id: shareId },
    include: { pages: { where: { pageNumber } } },
  });
  if (!share || isShareExpired(share)) {
    return NextResponse.json({ error: "共有が見つかりません" }, { status: 404 });
  }

  if (share.passwordHash) {
    const token = request.cookies.get(viewTokenCookieName(shareId))?.value;
    const authorized = token ? await verifyViewToken(token, shareId) : false;
    if (!authorized) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }
  }

  const page = share.pages[0];
  if (!page) {
    return NextResponse.json({ error: "ページが見つかりません" }, { status: 404 });
  }

  // 更新日時+ページ番号をETagにすることで、「同じURLのまま更新」してもキャッシュが正しく無効化される。
  const etag = `"${share.updatedAt.getTime()}-${page.pageNumber}"`;
  if (request.headers.get("if-none-match") === etag) {
    return new NextResponse(null, { status: 304, headers: { ETag: etag } });
  }

  const buffer = await storage.get(page.storageKey);
  if (!buffer) {
    return NextResponse.json({ error: "画像データが見つかりません" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": mimeForExtension(path.extname(page.storageKey)),
      "Cache-Control": "private, no-cache, must-revalidate",
      ETag: etag,
    },
  });
}
