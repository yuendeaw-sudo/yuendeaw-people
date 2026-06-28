import { PageHeader } from "@/components/ui";
import { Icon } from "@/components/Icon";

const AI_URL = "https://ai.yuendeaw.com";

// ดึงหน้า ai.yuendeaw.com (ระบบ AI ของทีม) มาแสดงเต็ม ๆ ในแอป
export default function AIWorkplacePage() {
  return (
    <div className="space-y-3">
      <PageHeader
        title="AI Workplace"
        icon="Sparkles"
        subtitle="ผู้ช่วย AI (Claude) สำหรับทีม YuenDeaw"
        action={
          <a href={AI_URL} target="_blank" rel="noreferrer" className="btn-brand">
            <Icon name="ExternalLink" className="size-4" /> เปิดเต็มหน้าจอ
          </a>
        }
      />

      <div className="card p-0 overflow-hidden">
        <iframe
          src={AI_URL}
          title="ai.yuendeaw.com"
          className="w-full h-[calc(100vh-10.5rem)] border-0 bg-white"
          allow="clipboard-read; clipboard-write; microphone; camera"
        />
      </div>

      <p className="text-[11px] text-muted flex items-center gap-1.5">
        <Icon name="Info" className="size-3.5 shrink-0" />
        ถ้าด้านบนขึ้นให้เข้าสู่ระบบ ให้กด “เปิดเต็มหน้าจอ” เพื่อล็อกอินด้วย Google ครั้งแรก แล้วกลับมาหน้านี้ได้
      </p>
    </div>
  );
}
