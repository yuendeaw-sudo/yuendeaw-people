import type {Metadata} from "next";
import InternHomeworkForm from "@/components/InternHomeworkForm";
export const metadata:Metadata={title:"การบ้านผู้เข้ารอบ — ยืนเดี่ยว",robots:{index:false,follow:false},referrer:"no-referrer"};
export default async function Page({params}:{params:Promise<{token:string}>}){return <InternHomeworkForm token={(await params).token}/>}
