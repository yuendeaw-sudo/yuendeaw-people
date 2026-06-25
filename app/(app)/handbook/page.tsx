import Link from "next/link";
import { getAccessContext } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Badge, EmptyState } from "@/components/ui";
import { Icon } from "@/components/Icon";

export default async function HandbookPage() {
  const ctx = (await getAccessContext())!;
  const supabase = await createClient();
  const canEdit = can(ctx, "handbook", "edit");

  const { data: pages } = await supabase
    .from("handbook_pages")
    .select("id, slug, title, category, must_ack, is_published")
    .order("sort_order");

  let acked = new Set<string>();
  if (ctx.employeeId) {
    const { data } = await supabase
      .from("handbook_acknowledgments")
      .select("page_id")
      .eq("employee_id", ctx.employeeId);
    acked = new Set((data ?? []).map((a) => a.page_id));
  }

  const list = pages ?? [];
  const groups = list.reduce<Record<string, typeof list>>((acc, p) => {
    const k = p.category || "อื่น ๆ";
    (acc[k] ||= []).push(p);
    return acc;
  }, {});

  return (
    <div>
      <PageHeader
        title="คู่มือพนักงาน"
        icon="BookOpen"
        subtitle="นโยบาย วัฒนธรรม และกติกาของ YuenDeaw"
      />
      {list.length ? (
        <div className="space-y-6">
          {Object.entries(groups).map(([cat, items]) => (
            <div key={cat}>
              <h2 className="text-sm font-semibold text-muted mb-2">{cat}</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {items.map((p) => (
                  <Link key={p.id} href={`/handbook/${p.slug}`}>
                    <div className="card p-4 hover:shadow-pop transition flex items-center gap-3">
                      <div className="grid place-items-center size-10 rounded-xl bg-grape-soft text-grape shrink-0">
                        <Icon name="FileText" className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold truncate">{p.title}</div>
                        <div className="flex items-center gap-1.5 mt-1">
                          {!p.is_published && <Badge tone="amber">ฉบับร่าง</Badge>}
                          {p.must_ack &&
                            (acked.has(p.id) ? (
                              <Badge tone="mint">
                                <Icon name="Check" className="size-3" /> รับทราบแล้ว
                              </Badge>
                            ) : (
                              <Badge tone="rose">ต้องอ่าน</Badge>
                            ))}
                        </div>
                      </div>
                      <Icon name="ChevronRight" className="size-4 text-muted" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon="BookOpen" title="ยังไม่มีหน้าคู่มือ" />
      )}
      {canEdit && (
        <p className="text-xs text-muted mt-6">
          <Icon name="Info" className="size-3.5 inline" /> คุณมีสิทธิ์แก้ไขคู่มือ — แก้เนื้อหาและเผยแพร่ได้ในเฟสถัดไป
        </p>
      )}
    </div>
  );
}
