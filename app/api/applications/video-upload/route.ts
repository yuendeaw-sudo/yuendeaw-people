import { createAdminClient } from '@/lib/supabase/admin';
export const runtime='nodejs';
export async function POST(req:Request){
 const b=await req.json().catch(()=>({}));const size=Number(b.size),type=String(b.type||'').split(';')[0];
 if(!['video/webm','video/mp4'].includes(type)||!Number.isFinite(size)||size<=0||size>40*1024*1024)return new Response('คลิปต้องเป็น MP4 หรือ WebM ไม่เกิน 40 MB',{status:400});
 const admin=createAdminClient();const bucket='applicant-videos';const {data:existing,error:bucketError}=await admin.storage.getBucket(bucket);
 if(!existing){if(bucketError&& !/not found|does not exist/i.test(bucketError.message))return new Response('ตรวจพื้นที่เก็บคลิปไม่สำเร็จ',{status:503});const {error}=await admin.storage.createBucket(bucket,{public:false,fileSizeLimit:40*1024*1024,allowedMimeTypes:['video/webm','video/mp4']});if(error&&!/already exists/i.test(error.message))return new Response('เตรียมพื้นที่เก็บคลิปไม่สำเร็จ',{status:503})}
 const path=`${Date.now()}-${crypto.randomUUID()}.${type==='video/mp4'?'mp4':'webm'}`;const {data,error}=await admin.storage.from(bucket).createSignedUploadUrl(path,{upsert:false});
 if(error)return new Response('เตรียมอัปโหลดไม่สำเร็จ',{status:503});return Response.json({path,url:data.signedUrl});
}
