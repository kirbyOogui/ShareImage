import { nanoid } from "nanoid";

// nanoidの標準アルファベット(A-Za-z0-9_-、64種類)で24文字生成。
// 24文字 = 約142bitのランダム性があり、共有URLの推測は現実的に不可能。
export function generateShareId(): string {
  return nanoid(24);
}

export function generateId(): string {
  return nanoid(24);
}
