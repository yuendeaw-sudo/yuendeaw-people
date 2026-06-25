import Link from "next/link";
import { getAccessContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, Badge, EmptyState } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { AckButton } from "@/components/handbook/AckButton";

export default async function HandbookDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = (await getAccessContext())!;
  const supabase = await createClient();

  const { data: page } = await supabase
    .from("handbook_pages")
    .select("id, title, category, body, version, must_ack, is_published")
    .eq("slug", slug)
    .maybeSingle();

  if (!page) {
    return <EmptyState icon="FileX" title="ไม่พบหน้านี้" />;
  }

  let acked = false;
  if (ctx.employeeId && page.must_ack) {
    const { data } = await supabase
      .from("handbook_acknowledgments")
      .select("id")
      .eq("page_id", page.id)
      .eq("employee_id", ctx.employeeId)
      .eq("version", page.version)
      .maybeSingle();
    acked = !!data;
  }

  return (
    <div>
      <Link href="/handbook" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink mb-4">
        <Icon name="ChevronLeft" className="size-4" /> กลับไปคู่มือ
      </Link>

      <Card>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            {page.category && <Badge tone="grape">{page.category}</Badge>}
            <h1 className="text-2xl font-bold mt-2">{page.title}</h1>
          </div>
          {!page.is_published && <Badge tone="amber">ฉบับร่าง</Badge>}
        </div>

        {page.body ? (
          <div className="prose-sm whitespace-pre-wrap text-ink/90 leading-relaxed">{page.body}</div>
        ) : (
          <p className="text-muted text-sm">
            เนื้อหายังไม่ถูกเพิ่ม — HR จะอัปเดตคู่มือหัวข้อนี้เร็ว ๆ นี้
          </p>
        )}

        {page.must_ack && ctx.employeeId && (
          <div className="mt-6 pt-5 border-t border-sand/70 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-muted">หัวข้อนี้กำหนดให้พนักงานอ่านและกดรับทราบ</p>
            <AckButton pageId={page.id} employeeId={ctx.employeeId} version={page.version} acked={acked} />
          </div>
        )}
      </Card>
    </div>
  );
}
