import {timingSafeEqual} from 'node:crypto';
import {NextResponse} from 'next/server';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const statuses=['active','probation','intern','freelance','inactive','alumni','candidate'];
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});

/** Minimal identity contract for Communeed only; the older boolean API is unchanged. */
export async function GET(req:Request){
 const token=process.env.COMMUNEED_DIRECTORY_API_TOKEN;
 if(!token)return reply({error:'directory not configured'},503);
 const bearer=req.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
 if(!bearer||Buffer.byteLength(bearer)!==Buffer.byteLength(token)||!timingSafeEqual(Buffer.from(bearer),Buffer.from(token)))return reply({error:'unauthorized'},401);
 const params=new URL(req.url).searchParams,keys=[...params.keys()];
 if(keys.length!==1||!['email','employeeCode','employeeId'].includes(keys[0]))return reply({error:'one exact identifier required'},400);
 const kind=keys[0],value=params.get(kind)!.trim();
 if(kind==='email'&&(value.length>320||!/^[^@\s",()\\]+@[^@\s",()\\]+\.[^@\s",()\\]+$/.test(value))||kind==='employeeCode'&&!/^[A-Za-z0-9_-]{1,64}$/.test(value)||kind==='employeeId'&&!uuid.test(value))return reply({error:'invalid identifier'},400);
 const base=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!base||!key)return reply({error:'directory not configured'},503);
 try{
  const url=new URL('/rest/v1/employees',base);
  url.searchParams.set('select','id,employee_code,first_name,last_name,nickname,email,status,employment_types(key)');
  url.searchParams.set('limit','2');
  url.searchParams.set(kind==='employeeCode'?'employee_code':kind==='employeeId'?'id':'email','eq.'+(kind==='email'?value.toLowerCase():value));
  const res=await fetch(url,{headers:{apikey:key,Authorization:'Bearer '+key},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(5000)});
  if(!res.ok)return reply({error:'lookup unavailable'},503);
  const text=await res.text();if(text.length>16384)return reply({error:'invalid directory response'},502);
  const rows:unknown=JSON.parse(text);if(!Array.isArray(rows)||rows.length>2)return reply({error:'invalid directory response'},502);
  const candidates=rows.map((row:Record<string,unknown>)=>{
   if(!row||typeof row.id!=='string'||!uuid.test(row.id)||typeof row.first_name!=='string'||typeof row.status!=='string'||!statuses.includes(row.status))throw Error('invalid row');
   const str=(v:unknown,max:number)=>v==null?null:typeof v==='string'&&v.length<=max?v:(()=>{throw Error('invalid field')})();
   const email=str(row.email,320),code=str(row.employee_code,64),last=str(row.last_name,160),nick=str(row.nickname,160);
   if(row.first_name.length>160)throw Error('invalid name');
   const type=row.employment_types as {key?:unknown}|null;
   if(type!=null&&(typeof type!=='object'||Array.isArray(type)))throw Error('invalid employment type');
   const employeeId=row.id.toLowerCase();
   if(kind==='employeeId'&&employeeId!==value.toLowerCase()||kind==='employeeCode'&&code!==value||kind==='email'&&email?.toLowerCase()!==value.toLowerCase())throw Error('identity mismatch');
   return {employeeId,employeeCode:code,displayName:[row.first_name,last].filter(Boolean).join(' ')+(nick?' ('+nick+')':''),email,employmentType:str(type?.key,64),status:row.status};
  });
  return reply({candidates});
 }catch{return reply({error:'lookup unavailable'},503)}
}
