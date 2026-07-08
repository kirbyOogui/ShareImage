import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/auth/admin-session";
import { isCsrfSafe } from "@/lib/csrf";

const PUBLIC_ADMIN_API_PATHS = new Set(["/api/admin/login"]);

/**
 * Next.js公式のnonceベースCSPパターン(リクエストヘッダーx-nonce経由でNext自身が生成する
 * インラインスクリプトに自動でnonceを付与する仕組み)に準拠。このアプリはdangerouslySetInnerHTMLや
 * 独自のインラインscript/style属性を一切使っていないため、Next.js自身が付与するnonce付きscriptタグ
 * だけを信頼すればよく、'unsafe-inline'は不要(styleのみ、Tailwind外の保険として許可)。
 */
// 「PDFのまま(変換しない)」共有をアプリ自身の<iframe>で表示するためだけの例外パス。
// このパスの応答だけは同一オリジンからのフレーム埋め込みを許可する必要がある。
const PDF_FILE_PATH_PATTERN = /^\/api\/share\/[^/]+\/file$/;

function buildCsp(nonce: string, allowSameOriginFraming: boolean): string {
  // 開発時のFast Refresh(next dev)はモジュールの差し替えにeval()を使うため、
  // 'unsafe-eval'が無いと画面のJS実行自体が丸ごと止まる(本番ビルドでは不要かつ危険なため
  // 本番では付与しない)。
  const scriptSrc =
    process.env.NODE_ENV === "production"
      ? `'self' 'nonce-${nonce}' 'strict-dynamic'`
      : `'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval'`;
  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    `frame-ancestors ${allowSameOriginFraming ? "'self'" : "'none'"}`,
    "upgrade-insecure-requests",
  ].join("; ");
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isCsrfSafe(request)) {
    return NextResponse.json({ error: "不正なリクエストです" }, { status: 403 });
  }

  // 管理画面ダッシュボードは/admin(固定パス)ではなく、ログインページと同じランダムトークン配下
  // (/a/{ADMIN_LOGIN_PATH}/admin)に存在する。トークンが未設定・不一致の場合はここでは何も
  // ガードしない(その場合は該当パス自体がNext.js側のnotFound()で404になる)。
  const adminLoginPath = process.env.ADMIN_LOGIN_PATH;
  const adminBasePath = adminLoginPath ? `/a/${adminLoginPath}/admin` : null;
  const isAdminPage = adminBasePath !== null && pathname.startsWith(adminBasePath);
  const isAdminApi = pathname.startsWith("/api/admin") && !PUBLIC_ADMIN_API_PATHS.has(pathname);

  if (isAdminPage || isAdminApi) {
    const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    const valid = token ? await verifyAdminSessionToken(token) : false;
    if (!valid) {
      if (isAdminApi) {
        return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
      }
      // 固定パス(/admin)を推測されても管理画面の存在自体が分からないよう、
      // ログイン画面へリダイレクトせず素の404を返す(ログイン画面は/a/{ADMIN_LOGIN_PATH}のみ)。
      return new NextResponse(null, { status: 404 });
    }
  }

  const allowSameOriginFraming = PDF_FILE_PATH_PATTERN.test(pathname);
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce, allowSameOriginFraming);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Frame-Options", allowSameOriginFraming ? "SAMEORIGIN" : "DENY");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), usb=(), payment=(), interest-cohort=()"
  );
  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
  }
  // 管理画面/管理APIは常に最新の認証状態・データを反映する必要があり、共有端末等での
  // キャッシュ経由の情報漏えいを避けるため、ブラウザ・中間キャッシュ双方にキャッシュさせない。
  if (isAdminPage || pathname.startsWith("/api/admin")) {
    response.headers.set("Cache-Control", "no-store");
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest|sw.js).*)",
  ],
};
