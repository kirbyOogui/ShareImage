export interface StorageAdapter {
  put(key: string, data: Buffer, contentType?: string): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
  /** 指定プレフィックス配下を一括削除する(共有削除・期限切れ削除時に使用) */
  deletePrefix(prefix: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}
