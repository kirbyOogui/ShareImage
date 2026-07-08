# 掲示板シェア

社内掲示物(シフト表・当番表・工程表・座席表・お知らせ等)を「Excel → 印刷 → 撮影 → LINE送信」という
手間から解放し、PDFをアップロードするだけでスマホから安全に閲覧できる共有ページ(URL/QRコード)を
発行できる、閲覧専用のWebサービスです。

## 主な機能

- **PDF/画像アップロード**: 管理画面からPDFまたはJPEG/PNG/WebP画像をドラッグ&ドロップするだけで、
  ページ毎に画像へ自動変換(変換先の画像形式はWebP/JPEG/PNG、または変換せず「PDFのまま」から選択可能。
  PDFのまま共有した場合、閲覧者はブラウザ標準のPDFビューアで閲覧する)
- **共有URL/QRコード**: ランダムな推測困難なURLを発行。QRコードをPNGで保存して掲示物にも印刷可能
- **パスワード保護**: 4〜8桁の数字パスワードで共有ページを保護(任意)。ブルートフォース対策として
  DB永続化の指数バックオフ式ロックアウト付き
- **有効期限**: 1日/7日/30日/無期限から選択。期限切れの共有はcronで自動削除
- **PWA対応**: ホーム画面に追加してアプリのように利用可能。オフライン時は最後に見たページを表示
- **Push通知**: 管理者が「通知を送信」を押した時のみ、購読している閲覧者へ更新通知を送信(自動送信なし)
- **ズームビューア**: ピンチ/ダブルタップでの拡大表示に対応した縦スクロールビューア
- **管理画面**: 単一の管理者パスワードで保護されたダッシュボードから、共有の作成・編集・PDF差し替え・削除が可能
- **PDF/画像編集**: 管理画面から任意のPDFまたは画像ファイルをドロップして、トリミング・拡大縮小・
  自由描画(色のスポイト機能付き)・画像形式変換(WebP/JPEG/PNG)・AIインペインティング
  (印鑑・手書き・付箋・ゴミ・指などをブラシで囲むとAIが周囲から自然に補完して消す「消しゴムマジック」)を実行し、
  そのままダウンロードするか共有ページ(画像のままでも、1つのPDFにまとめても)の作成に進める。
  何度でも「1つ前に戻る/進む」で操作を取り消し・やり直しできる

## 技術スタック

| 領域 | 採用技術 |
|---|---|
| フレームワーク | Next.js 16(App Router)+ TypeScript + Tailwind CSS 4 |
| PDF→画像変換 | `pdfjs-dist` + `@napi-rs/canvas`(外部バイナリ不要、WebP/JPEG/PNGをネイティブエンコード) |
| 画像ファイル変換 | `sharp`(JPEG/PNG/WebP画像の直接アップロード・再エンコード) |
| DB | Prisma 7 + Postgres(`@prisma/adapter-pg`。本番はSupabase Postgresを想定) |
| 画像ストレージ | 自前の`StorageAdapter`抽象化(Local実装 / S3互換実装。本番はSupabase StorageのS3互換APIを想定) |
| 認証 | `jose`(HS256署名Cookie)+ `bcryptjs`(パスワードハッシュ) |
| PWA | `@serwist/next`(Service Worker) |
| Push通知 | `web-push`(VAPID) |
| 期限切れ削除 | ローカル: `node-cron`(`src/instrumentation.ts`)。Vercel: Vercel Cron Jobs(`vercel.json`) |
| PDF編集(トリミング・拡大縮小・描画・形式変換) | `react-image-crop` + Canvas API |
| PDF編集(AIインペインティング) | Replicate経由のLaMa画像インペインティングモデル(`replicate`パッケージ) |
| 「PDFのまま」共有・PDF結合 | `pdf-lib`(複数PDF/画像を1つのPDFへ結合) |

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.example` を `.env` にコピーし、以下の値を設定してください。

```bash
cp .env.example .env
```

| 変数 | 説明 |
|---|---|
| `DATABASE_URL` | Postgres接続文字列(pooler経由)。ローカル開発でもSupabase等の実DBに接続する必要があります |
| `DIRECT_URL` | Postgres接続文字列(直接接続、`prisma migrate`等CLI専用) |
| `STORAGE_DRIVER` | `local`(ローカルディスク、開発専用)または`s3`(本番。Supabase Storage等のS3互換ストレージ) |
| `ADMIN_PASSWORD_HASH` | 管理者ログインパスワードのbcryptハッシュ(下記コマンドで生成) |
| `ADMIN_LOGIN_PATH` | 管理者ログイン画面のURL(`/a/{この値}`)に使うランダムな文字列(下記コマンドで生成) |
| `GALLERY_PATH` | 閲覧者向け一覧ページのURL(`/collection/{この値}`)に使うランダムな文字列(下記コマンドで生成) |
| `SESSION_SECRET` | Cookie署名・IPハッシュ化用の秘密鍵(32文字以上のランダム文字列) |
| `NEXT_PUBLIC_APP_ORIGIN` | 本番公開時の自サイトのオリジン(CSRF対策のOrigin検証に使用) |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT_EMAIL` | Push通知用のVAPID鍵(下記コマンドで生成) |
| `REPLICATE_API_TOKEN` | PDF編集画面のAIインペインティングで使用。[replicate.com/account/api-tokens](https://replicate.com/account/api-tokens)で発行。未設定でもそれ以外の機能は問題なく動作する |
| `REPLICATE_LAMA_MODEL` | 省略可。AIインペインティングに使うReplicateモデルを`owner/model-name`形式で差し替える場合に指定(既定値: `allenhooo/lama`) |
| `CRON_SECRET` | Vercel Cron Jobsからの呼び出しを認証するための秘密鍵。Vercelにデプロイする場合のみ必要(ローカル開発では未使用) |

管理者パスワードのハッシュを生成:

```bash
npx tsx scripts/hash-password.ts <設定したいパスワード>
```

管理者ログイン画面用のランダムURLを生成:

```bash
npx tsx scripts/generate-admin-login-path.ts
```

セッション秘密鍵を生成:

```bash
openssl rand -hex 32
```

VAPID鍵ペアを生成(Push通知用):

```bash
npx tsx scripts/generate-vapid-keys.ts
```

> **注意**: `ADMIN_PASSWORD_HASH`のbcryptハッシュは`$2b$12$...`のように`$`を含みます。
> Next.jsの`.env`読み込みが`$`を変数参照として解釈してしまわないよう、必ず`\$`にエスケープしてから
> 貼り付けてください(例: `\$2b\$12\$...`)。

### 3. データベースの初期化

DBはPostgres前提のため、ローカル開発でも実際に接続できるPostgres(Supabaseの無料プロジェクト等)が
必要です。`.env`に`DATABASE_URL`/`DIRECT_URL`を設定したうえで実行してください。

```bash
npx prisma migrate deploy
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

[http://localhost:3000/a/{ADMIN_LOGIN_PATHの値}](http://localhost:3000) を開いて管理者パスワードでログインしてください。
ドメイン直下(`/`)は閲覧用ギャラリーへのリダイレクトのみで、管理画面はログイン後もずっと
`/a/{ADMIN_LOGIN_PATHの値}/admin/...`というこのランダムなURL配下にしか存在しません
(固定パスの`/admin`は存在せず、推測されても管理画面の存在が分からないようになっています)。
ログイン後はまず「PDFを編集」「共有する」の選択画面が表示され、
「共有する」を選ぶと共有URL/QRコードの発行・共有一覧の管理画面へ、「PDFを編集」を選ぶと任意のPDFを
ドロップしてトリミング・拡大縮小・AIインペインティングを行う編集画面へ進みます。

> `@serwist/next`(Service Worker)がTurbopackと非互換のため、`dev`/`build`は`--webpack`フラグ付きで
> 実行するようスクリプトを設定しています。

## 本番ビルド

```bash
npm run build
npm run start
```

## 本番運用(GitHub + Vercel + Supabase、無料枠)

このアプリはVercelのようなサーバーレス環境でも動くよう、DB(Postgres)・ファイルストレージ(S3互換)
ともに外部サービス前提の抽象化がされています。GitHub + Vercel + Supabase(いずれも無料プラン)で
運用する場合の手順は以下の通りです。

### 1. Supabaseプロジェクトを作成

1. [supabase.com](https://supabase.com)で無料アカウント・新規プロジェクトを作成
2. **Project Settings > Database** から接続文字列を2つ取得:
   - `Transaction pooler`(6543番ポート)→ 末尾に`?pgbouncer=true`を付けて`DATABASE_URL`に設定
   - `Direct connection`(5432番ポート)→ そのまま`DIRECT_URL`に設定
3. **Storage** で新規バケットを作成し、**Storage > 設定(歯車アイコン) > S3 Connection**から
   エンドポイント・アクセスキー・シークレットキーを取得して`S3_ENDPOINT` / `S3_ACCESS_KEY_ID` /
   `S3_SECRET_ACCESS_KEY` / `S3_BUCKET`に設定、`STORAGE_DRIVER`は`s3`にする

### 2. GitHubへpush

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <あなたのGitHubリポジトリURL>
git push -u origin main
```

### 3. Vercelプロジェクトを作成

1. [vercel.com](https://vercel.com)で無料アカウント登録・GitHubリポジトリをImport
2. Environment Variablesに、`.env`に設定したものと同じ内容を(`STORAGE_DRIVER=s3`のS3系含めて)すべて登録。
   `NEXT_PUBLIC_APP_ORIGIN`はデプロイ後に分かる実際のURL(例: `https://your-app.vercel.app`)にする
3. `CRON_SECRET`も生成して登録(`openssl rand -hex 32`等)。VercelのCron Jobs機能が呼び出し時に
   自動でこの値を`Authorization`ヘッダーに付与してくれる(`vercel.json`で1日1回に設定済み。
   Hobbyプランはこれより高頻度のcronを設定できない制約があるため)
4. デプロイを実行

### 4. デプロイ後の初回マイグレーション

Vercelはビルド時に自動でマイグレーションを実行しないため、ローカルから`DIRECT_URL`を本番の
Supabaseに向けた状態で一度だけ実行する(以後のスキーマ変更時も同様):

```bash
npx prisma migrate deploy
```

### コールドスタート対策(任意)

Vercel Hobbyのサーバーレス関数は無アクセス状態が続くとスリープし、次回アクセス時に数秒の遅延
(コールドスタート)が発生します。`.github/workflows/keep-warm.yml`が10分間隔で`/api/health`を
pingすることでこれを緩和しますが、効果を保証するものではありません。有効にするには、GitHub
リポジトリの **Settings > Secrets and variables > Actions > Variables** で`APP_URL`に
デプロイ後のURLを設定してください。

## ディレクトリ構成(概要)

```
vercel.json                # Vercel Cron Jobsの設定(期限切れクリーンアップを1日1回実行)
.github/workflows/         # keep-warm.yml(コールドスタート対策の定期ping、任意)
prisma/schema.prisma       # Share / Page / PushSubscription / ShareLoginAttempt
src/
  proxy.ts                 # 認証・CSRF・CSP等のミドルウェア(Next.js 16の"proxy"規約)
  instrumentation.ts        # 起動時の期限切れ自動削除cron登録(ローカル開発専用。Vercelでは無効化)
  app/
    a/[token]/             # 管理者ログイン画面 + ダッシュボード(いずれもランダムURLでのみ到達可能)
      admin/
        (dashboard)/
          page.tsx         # ログイン後の選択画面(「PDFを編集」/「共有する」)
          share/           # 共有URL/QRコード発行・共有一覧・共有詳細
          edit/             # PDF編集画面(トリミング・拡大縮小・AIインペインティング)
    collection/[id]/       # 閲覧者向けの共有一覧(グリッド、ランダムURL)
    api/
      cron/cleanup-expired/ # Vercel Cron Jobsから呼ばれる期限切れ削除API
      health/               # コールドスタート対策用の軽量ヘルスチェック
    sw.ts                  # Service Worker(オフラインキャッシュ・Push通知)
  components/
    ui/                    # 共通UIパーツ(Button/Card/Input)
    admin/
      pdf-editor/          # PDF編集画面のコンポーネント(クロップ・リサイズ・インペインティング等)
    collection/            # 一覧グリッド用コンポーネント
    share/                 # 閲覧ページ用コンポーネント(ズーム・パスワードフォーム・ライトボックス等)
  lib/                     # 認証・ストレージ・PDF変換・Push送信等のドメインロジック
scripts/                   # 鍵生成・アイコン生成等のCLIスクリプト
```

## ストレージの切り替え

`STORAGE_DRIVER=local`にするとローカルディスク(`data/uploads/`)に画像を保存します(開発用。
Vercel等サーバーレス環境ではディスクが永続しないため本番では使えません)。`STORAGE_DRIVER=s3`にし、
`S3_ENDPOINT` / `S3_BUCKET` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY`を設定すれば、
コード変更なしにSupabase StorageやCloudflare R2等のS3互換ストレージへ切り替えられます
(`src/lib/storage/`のアダプタ抽象化による)。

## セキュリティ

- 管理画面・共有APIともにOrigin/Refererを検証するCSRF対策と、nonceベースのContent-Security-Policyを適用
- 管理者ログイン・共有パスワードの両方にレート制限(共有パスワードはDB永続化の指数バックオフロックアウト付き)
- Push通知の購読先(endpoint)はhttps以外・内部/ローカルホストを拒否し、SSRF対策を実施
- 社内限定サービスのため`robots.txt`・`X-Robots-Tag`で検索エンジンのクロールを全面的に拒否
- 閲覧用の一覧ページ・管理者ログイン画面・管理画面ダッシュボード全体は、いずれも推測不可能な
  ランダムURL(24文字)配下でのみ到達可能。ドメイン直下(`/`)に直接アクセスしても閲覧用ギャラリーに
  リダイレクトされるだけで、固定パスの管理画面URLは一切存在しない

## 既知の制限事項

- 管理者アカウントはユーザー管理なしの単一共有パスワード方式です(複数管理者・権限分けは非対応)
- Vercel Hobby(無料)プランのCron Jobsは1日1回までのため、期限切れ共有の実削除(ストレージ・DB行)も
  最短で1日1回になります。ただし共有一覧・詳細取得は毎回`expiresAt`をその場でチェックしているため、
  期限切れの共有が閲覧できてしまうことはありません
