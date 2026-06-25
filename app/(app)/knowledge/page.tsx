import { getAccessContext } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { DocForm } from "@/components/knowledge/DocForm";

export default async function KnowledgePage() {
  const ctx = (await getAccessContext())!;
  const supabase = await createClient();
  const canAdd = can(ctx, "knowledge", "create") || can(ctx, "knowledge", "edit");

  const [{ data: cats }, { data: docs }] = await Promise.all([
    supabase.from("knowledge_categories").select("id, name").order("sort_order"),
    supabase
      .from("documents")
      .select("id, title, external_url, storage_path, category_id, created_at")
      .is("employee_id", null)
      .order("created_at", { ascending: false }),
  ]);

  const categories = cats ?? [];
  const documents = docs ?? [];
  const byCat = (id: string) => documents.filter((d) => d.category_id === id);
  const uncategorized = documents.filter((d) => !d.category_id);

  return (
    <div>
      <PageHeader
        title="Knowledge Base"
        icon="Library"
        subtitle="เอกสาร SOP คู่มือ และ template ของบริษัท"
        action={canAdd && ctx.userId ? <DocForm categories={categories} uploaderId={ctx.userId} /> : undefined}
      />

      {documents.length === 0 && (
        <EmptyState
          icon="FolderOpen"
          title="ยังไม่มีเอกสาร"
          subtitle="เพิ่มลิงก์เอกสาร/SOP/template เพื่อให้ทีมค้นหาได้"
        />
      )}

      <div className="space-y-6">
        {categories.map((c) => {
          const items = byCat(c.id);
          return (
            <div key={c.id}>
              <h2 className="text-sm font-semibold text-muted mb-2 flex items-center gap-2">
                <Icon name="Folder" className="size-4 text-brand" /> {c.name}
                <span className="text-xs font-normal">({items.length})</span>
              </h2>
              {items.length ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map((d) => (
                    <a key={d.id} href={d.external_url ?? "#"} target="_blank" rel="noreferrer">
                      <Card className="hover:shadow-pop transition flex items-center gap-3 p-4">
                        <div className="grid place-items-center size-10 rounded-xl bg-grape-soft text-grape shrink-0">
                          <Icon name="FileText" className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-sm truncate">{d.title}</div>
                          {d.external_url && <div className="text-xs text-muted truncate">{d.external_url}</div>}
                        </div>
                      </Card>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted">— ยังไม่มีเอกสารในหมวดนี้</p>
              )}
            </div>
          );
        })}

        {uncategorized.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-muted mb-2">อื่น ๆ</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {uncategorized.map((d) => (
                <a key={d.id} href={d.external_url ?? "#"} target="_blank" rel="noreferrer">
                  <Card className="hover:shadow-pop transition flex items-center gap-3 p-4">
                    <div className="grid place-items-center size-10 rounded-xl bg-grape-soft text-grape shrink-0">
                      <Icon name="FileText" className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">{d.title}</div>
                      {d.external_url && <div className="text-xs text-muted truncate">{d.external_url}</div>}
                    </div>
                  </Card>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
