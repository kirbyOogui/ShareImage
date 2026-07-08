import path from "node:path";
import type { StorageAdapter } from "./types";
import { LocalStorageAdapter, ensureUploadDirExists } from "./local-storage";
import { S3StorageAdapter } from "./s3-storage";

declare global {
  var __storage: StorageAdapter | undefined;
}

function createStorage(): StorageAdapter {
  const driver = process.env.STORAGE_DRIVER ?? "local";

  if (driver === "s3") {
    const endpoint = process.env.S3_ENDPOINT;
    const region = process.env.S3_REGION ?? "auto";
    const bucket = process.env.S3_BUCKET;
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
    if (!bucket || !accessKeyId || !secretAccessKey) {
      throw new Error(
        "STORAGE_DRIVER=s3 の場合は S3_BUCKET / S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY が必須です"
      );
    }
    return new S3StorageAdapter({ endpoint, region, bucket, accessKeyId, secretAccessKey });
  }

  const uploadDir = path.resolve(process.env.UPLOAD_DIR ?? "./data/uploads");
  // 起動時に一度だけディレクトリ作成を保証する(fire-and-forget、失敗時はput時のmkdirでリカバーされる)
  void ensureUploadDirExists(uploadDir);
  return new LocalStorageAdapter(uploadDir);
}

export const storage: StorageAdapter = global.__storage ?? createStorage();

if (process.env.NODE_ENV !== "production") {
  global.__storage = storage;
}

export type { StorageAdapter } from "./types";
