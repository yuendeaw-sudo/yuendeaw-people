import { redirect } from "next/navigation";
import { getAccessContext } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { Icon } from "@/components/Icon";
import { SignOutButton } from "@/components/SignOutButton";

// Logged in, but not yet linked to an employee record and not the owner.
// They need an invite from HR. Friendly holding page — not a dead end.
export default async function PendingPage() {
  const ctx = await getAccessContext();
  if (!ctx) redirect("/login");
  if (ctx.isOwner || ctx.employeeId) redirect("/dashboard");

  return (
    <div className="min-h-screen grid place-items-center bg-paper p-6">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center mb-6">
          <Logo size={56} />
        </div>
        <div className="card p-8">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-brand-soft">
            <Icon name="MailCheck" className="size-7 text-gold" />
          </div>
          <h1 className="text-xl font-bold">รอการเชิญเข้าใช้งาน</h1>
          <p className="text-muted text-sm mt-2 leading-relaxed">
            คุณเข้าสู่ระบบด้วยอีเมล
            <br />
            <span className="font-semibold text-ink">{ctx.email}</span>
            <br />
            แต่ยังไม่ได้ถูกเพิ่มเข้าทีม — กรุณาแจ้ง HR ให้เพิ่มอีเมลนี้
            และส่งคำเชิญ แล้วเข้าสู่ระบบใหม่อีกครั้งครับ 🙌
          </p>
          <div className="mt-6 flex justify-center">
            <SignOutButton />
          </div>
        </div>
        <p className="text-xs text-muted mt-5">
          ติดปัญหา? ติดต่อทีม People ที่ people.yuendeaw.com
        </p>
      </div>
    </div>
  );
}
