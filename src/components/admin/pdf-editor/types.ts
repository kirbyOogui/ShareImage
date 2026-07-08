import type { ImageOutputFormat } from "@/lib/image/format";

export interface EditorPage {
  pageNumber: number;
  width: number;
  height: number;
  dataUrl: string;
  format: ImageOutputFormat;
}

export type EditResult = Pick<EditorPage, "dataUrl" | "width" | "height" | "format">;
