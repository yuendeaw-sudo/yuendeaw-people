import { createClient } from "@/lib/supabase/server";
import { ApplyForm } from "@/components/apply/ApplyForm";
import { Icon } from "@/components/Icon";
import { Logo } from "@/components/Logo";

export default async function ApplyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: form } = await supabase
    .from("application_forms")
    .select("id, kind, title, description, fields, is_open")
    .eq("slug", slug)
    .maybeSingle();

  return (
    <div className="min-h-screen bg-paper">
      <div className="bg-ink text-paper relative overflow-hidden">
        {/* playful spotlight glow */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 size-72 rounded-full bg-brand/20 blur-3xl" />
        <div className="absolute top-6 right-6 text-5xl rotate-12 opacity-30 select-none hidden sm:block">🎤</div>
        <div className="max-w-2xl mx-auto px-6 py-12 relative">
          <div className="flex items-center gap-2.5 mb-7">
            <Logo size={40} />
            <span className="font-extrabold">YuenDeaw</span>
          </div>
          <span className="chip bg-brand text-ink mb-3">เปิดรับสมัคร · We want you!</span>
          <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight">
            {form?.title ?? "ใบสมัคร"} <span className="text-brand">.</span>
          </h1>
          {form?.description && <p className="text-paper/70 mt-3 max-w-lg">{form.description}</p>}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">
        {!form ? (
          <div className="card p-10 text-center">
            <Icon name="FileX" className="size-8 text-muted mx-auto mb-3" />
            <p className="font-semibold">ไม่พบฟอร์มใบสมัคร</p>
          </div>
        ) : !form.is_open ? (
          <div className="card p-10 text-center">
            <Icon name="DoorClosed" className="size-8 text-muted mx-auto mb-3" />
            <p className="font-semibold">ขณะนี้ปิดรับสมัครชั่วคราว</p>
            <p className="text-sm text-muted mt-1">กรุณากลับมาใหม่ภายหลัง</p>
          </div>
        ) : (
          <ApplyForm form={form as any} />
        )}
      </div>
    </div>
  );
}
