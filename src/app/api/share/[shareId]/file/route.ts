import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { isShareExpired } from "@/lib/share/expiry";
import { verifyViewToken, viewTokenCookieName } from "@/lib/auth/view-token";

interface RouteParams {
  params: Promise<{ shareId: string }>;
}

/**
 * 「PDFのまま(変換しない)」共有の元PDFファイルをそのまま配信する。
 * ページ画像配信(/pages/[n])と同じ認証・有効期限チェックを行う。
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { shareId } = await params;

  const share = await prisma.share.findUnique({ where: { id: shareId } });
  if (!share || isShareExpired(share) || !share.pdfStorageKey) {
    return NextResponse.json({ error: "共有が見つかりません" }, { status: 404 });
  }

  if (share.passwordHash) {
    const token = request.cookies.get(viewTokenCookieName(shareId))?.value;
    const authorized = token ? await verifyViewToken(token, shareId) : false;
    if (!authorized) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }
  }

  const etag = `"${share.updatedAt.getTime()}-pdf"`;
  if (request.headers.get("if-none-match") === etag) {
    return new NextResponse(null, { status: 304, headers: { ETag: etag } });
  }

  const buffer = await storage.get(share.pdfStorageKey);
  if (!buffer) {
    return NextResponse.json({ error: "PDFデータが見つかりません" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${encodeURIComponent(share.title || "document")}.pdf"`,
      "Cache-Control": "private, no-cache, must-revalidate",
      ETag: etag,
    },
  });
}
