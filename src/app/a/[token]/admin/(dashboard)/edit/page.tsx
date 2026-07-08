import { PdfEditor } from "@/components/admin/pdf-editor/pdf-editor";
import { PageHeader } from "@/components/ui/page-header";

export default function AdminEditPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="PDFを編集" subtitle="トリミング・拡大縮小・形式変換・AI消しゴムが使えます" />
      <PdfEditor />
    </div>
  );
}
