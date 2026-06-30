import { redirect } from "next/navigation";
import { getAccessContext } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { ApplicationsBrowser } from "@/components/applications/ApplicationsBrowser";

export default async function ApplicationsPage() {
  const ctx = (await getAccessContext())!;
  if (!can(ctx, "applications", "view")) redirect("/dashboard");
  const supabase = await createClient();

  const { data: apps } = await supabase
    .from("applications")
    .select(
      "id, full_name, nickname, applicant_type, kind, age, location, email, stage, interested_roles, tags, hr_recommendation, score, intro_video_url, portfolio_url, portfolio_links, available_date, expected_salary, created_at"
    )
    .order("created_at", { ascending: false });

  const list = apps ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="ใบสมัคร · Talent Pool"
        icon="FileUser"
        subtitle="คลังคนเก่งที่อยากร่วมงานกับยืนเดี่ยว"
        action={
          <a href="/apply/talent" target="_blank" className="btn-outline">
            <Icon name="ExternalLink" className="size-4" /> หน้าสมัคร (public)
          </a>
        }
      />

      {list.length ? (
        <ApplicationsBrowser apps={list} />
      ) : (
        <EmptyState
          icon="FileUser"
          title="ยังไม่มีใบสมัคร"
          subtitle="แชร์ลิงก์หน้าสมัคร /apply/talent ในโซเชียล เพื่อเริ่มเก็บ Talent Pool"
        />
      )}
    </div>
  );
}
