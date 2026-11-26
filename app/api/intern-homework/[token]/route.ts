import { createAdminClient } from "@/lib/supabase/admin";
import { tokenApplicationId, validHomeworkToken, homeworkExpired, validateHomeworkAnswers, saveHomework } from "@/lib/intern-homework";
export const runtime="nodejs";
const headers={"Cache-Control":"no-store","Referrer-Policy":"no-referrer","X-Robots-Tag":"noindex, nofollow"};
async function lookup(token:string){
 const id=tokenApplicationId(token);if(!id)return null;
 const admin=createAdminClient();
 const {data,error}=await admin.from("applications").select("id,answers,updated_at").eq("id",id).maybeSingle();
 if(error)throw new Error("โหลดการบ้านไม่สำเร็จ");
 return data&&validHomeworkToken(token,data.answers?.homework)?{admin,a:data,h:data.answers.homework}:null;
}
export async function GET(_req:Request,{params}:{params:Promise<{token:string}>}){
 const result=await lookup((await params).token);
 if(!result)return new Response("ไม่พบลิงก์การบ้านนี้",{status:404,headers});
 const {h}=result;
 if(homeworkExpired(h))return new Response("ลิงก์หมดอายุ กรุณาติดต่อทีมยืนเดี่ยว",{status:410,headers});
 if(h.submitted_at)return Response.json({submitted:true},{headers});
 return Response.json({role:h.role_title,questions:h.questions,expires_at:h.expires_at},{headers});
}
export async function POST(req:Request,{params}:{params:Promise<{token:string}>}){
 const result=await lookup((await params).token);
 if(!result)return new Response("ไม่พบลิงก์การบ้านนี้",{status:404,headers});
 const {admin,a,h}=result;
 if(homeworkExpired(h))return new Response("ลิงก์หมดอายุ กรุณาติดต่อทีมยืนเดี่ยว",{status:410,headers});
 if(h.submitted_at)return new Response("ส่งการบ้านแล้ว ไม่สามารถส่งซ้ำ",{status:409,headers});
 const raw=await req.text();if(raw.length>80000)return new Response("คำตอบยาวเกินไป",{status:413,headers});
 let body;try{body=JSON.parse(raw)}catch{return new Response("ข้อมูลไม่ถูกต้อง",{status:400,headers})}
 const answers=validateHomeworkAnswers(body.answers,h.questions);
 if(!answers)return new Response("กรุณาตอบให้ครบ 5 ข้อ และเลือกข้อ 2–3 ข้อละหนึ่งตัวเลือก",{status:400,headers});
 const saved=await saveHomework(admin,a,{...h,responses:answers,submitted_at:new Date().toISOString()},"homework_submitted");
 if(!saved)return new Response("ข้อมูลเปลี่ยนแล้ว กรุณาโหลดใหม่ก่อนส่ง",{status:409,headers});
 return Response.json({ok:true},{headers});
}
