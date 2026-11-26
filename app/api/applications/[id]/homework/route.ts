import { getAccessContext, audit } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, emailShell, emailButton } from "@/lib/email";
import { CREATIVE_INTERN_SET } from "@/lib/applications";
import { HOMEWORK_ROLE, HOMEWORK_ROLE_TITLE, HOMEWORK_TTL_MS, createHomeworkToken, tokenHash, homeworkQuestions, saveHomework } from "@/lib/intern-homework";
export const runtime = "nodejs";

export async function POST(req: Request, {params}: {params: Promise<{id:string}>}) {
  const ctx = await getAccessContext();
  if(!ctx) return new Response("unauthorized",{status:401});
  if(!ctx.isOwner && !can(ctx,"applications","edit")) return new Response("forbidden",{status:403});
  const {id}=await params, body=await req.json().catch(()=>({}));
  const admin=createAdminClient();
  const {data:a,error}=await admin.from("applications").select("id,email,applicant_type,interested_roles,answers,updated_at").eq("id",id).maybeSingle();
  if(error) return new Response("โหลดใบสมัครไม่สำเร็จ",{status:500});
  if(!a) return new Response("ไม่พบใบสมัคร",{status:404});
  if(a.applicant_type!=="internship") return new Response("ใช้สำหรับผู้สมัครฝึกงานเท่านั้น",{status:400});
  if(body.action==="review") {
    const h=a.answers?.homework;
    if(!h?.submitted_at) return new Response("ผู้สมัครยังไม่ได้ส่งการบ้าน",{status:409});
    if(!["pass","hold","reject"].includes(body.decision) || typeof body.note!=="string" || body.note.length>12000) return new Response("กรุณาเลือกผลตรวจและตรวจความยาวหมายเหตุ",{status:400});
    const saved=await saveHomework(admin,a,{...h,review:{decision:body.decision,note:body.note,reviewed_at:new Date().toISOString(),reviewed_by:ctx.userId}},"homework_reviewed");
    if(!saved)return new Response("ข้อมูลเปลี่ยนแล้ว กรุณาโหลดใหม่",{status:409});
    await audit(ctx,"intern_homework_reviewed",{module:"applications",entity:"application",entityId:id,meta:{decision:body.decision}});
    return Response.json({ok:true});
  }
  if(body.action!=="invite")return new Response("action required",{status:400});
  if(body.role!==HOMEWORK_ROLE)return new Response("ตำแหน่งนี้ยังไม่มีชุดการบ้าน",{status:400});
  const roles=[...(a.interested_roles??[]),a.answers?.primary_role].filter(Boolean);
  if(!roles.includes(HOMEWORK_ROLE))return new Response("ต้องเลือกหมวดที่ผู้สมัครสมัครไว้",{status:400});
  if(a.answers?.homework?.submitted_at)return new Response("ผู้สมัครส่งการบ้านแล้ว ให้ตรวจคำตอบแทน",{status:409});
  if(a.answers?.homework?.email_delivery==="pending" && Date.now()-Date.parse(a.answers.homework.invited_at)<120000)return new Response("กำลังส่งอีเมล กรุณารอสักครู่",{status:409});
  if(!process.env.RESEND_API_KEY || !process.env.RESEND_FROM)return new Response("ยังไม่ได้ตั้งค่าระบบส่งอีเมล",{status:503});
  const token=createHomeworkToken(id), now=new Date();
  const h={role:HOMEWORK_ROLE,role_title:HOMEWORK_ROLE_TITLE,version:CREATIVE_INTERN_SET.version,questions:homeworkQuestions(),token_hash:tokenHash(token),invited_at:now.toISOString(),expires_at:new Date(now.getTime()+HOMEWORK_TTL_MS).toISOString(),invited_by:ctx.userId,email_delivery:"pending"};
  const saved=await saveHomework(admin,a,h,"homework_shortlisted");
  if(!saved)return new Response("ข้อมูลเปลี่ยนแล้ว กรุณาโหลดใหม่",{status:409});
  const site=process.env.NEXT_PUBLIC_SITE_URL||"https://people.yuendeaw.com";
  const url=`${site}/internship/homework/${token}`;
  const sent=await sendEmail({to:a.email,subject:"คุณผ่านเข้ารอบฝึกงานยืนเดี่ยว — การบ้านครีเอทีฟ",html:emailShell(`<h2>คุณผ่านเข้ารอบคัดเลือกฝึกงานแล้ว</h2><p>ทีมยืนเดี่ยวพิจารณาใบสมัครของคุณแล้ว ขอเชิญทำการบ้านหมวด ${HOMEWORK_ROLE_TITLE} จำนวน 5 ข้อ ผ่านลิงก์ส่วนตัวด้านล่าง</p>${emailButton(url,"เปิดการบ้านและส่งคำตอบ",true)}<p>ลิงก์นี้ใช้ได้ 14 วัน กรุณาเก็บลิงก์ไว้เป็นส่วนตัว เมื่อส่งคำตอบแล้วทีมจะตรวจและติดต่อแจ้งขั้นตอนถัดไป</p>`)});
  // Delivery recording must not overwrite a submission that races the email response.
  await saveHomework(admin,saved,{...h,email_delivery:sent?"sent":"failed"},sent?"homework_sent":"homework_shortlisted");
  await audit(ctx,sent?"intern_homework_invited":"intern_homework_email_failed",{module:"applications",entity:"application",entityId:id,meta:{role:HOMEWORK_ROLE}});
  if(!sent)return new Response("ส่งอีเมลไม่สำเร็จ กรุณาลองส่งใหม่",{status:502});
  return Response.json({ok:true});
}
