import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

declare global {
  var __prisma: PrismaClient | undefined;
}

// Prisma 7の新クライアントはDriver Adapter経由の接続が必須(接続文字列を直接渡す方式は廃止)。
// 実行時はSupabaseのTransaction pooler接続(DATABASE_URL、port 6543・?pgbouncer=true付き)を使う。
// サーバーレス環境では同時に多数の関数インスタンスが立ち上がるため、pooler無しの直接接続では
// Postgres側の接続数上限にすぐ達してしまう。マイグレーション用の直接接続はprisma.config.ts側
// (DIRECT_URL)で別途扱う。
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// Next.jsの開発時ホットリロードでPrismaClientが多重生成されるのを防ぐため、globalにキャッシュする。
export const prisma = global.__prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}
