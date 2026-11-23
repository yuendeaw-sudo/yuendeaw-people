import {redirect} from 'next/navigation';
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){const params=await searchParams,q=new URLSearchParams();for(const [k,v] of Object.entries(params))if(typeof v==='string')q.set(k,v);redirect('/internship/apply'+(q.size?'?'+q.toString():''))}
