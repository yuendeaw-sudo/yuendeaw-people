import {getAccessContext} from '@/lib/auth';
import {can} from '@/lib/permissions';
import {createAdminClient} from '@/lib/supabase/admin';
export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){
 const ctx=await getAccessContext();if(!ctx)return new Response('unauthorized',{status:401});if(!ctx.isOwner&&!can(ctx,'applications','view'))return new Response('forbidden',{status:403});
 const {id}=await params,admin=createAdminClient();const {data}=await admin.from('applications').select('answers').eq('id',id).single();const path=data?.answers?.intro_video_path;if(typeof path!=='string')return new Response('not found',{status:404});
 const {data:file,error}=await admin.storage.from('applicant-videos').createSignedUrl(path,300);if(error)return new Response('not found',{status:404});return Response.redirect(file.signedUrl,302);
}
