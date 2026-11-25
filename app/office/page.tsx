import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Users, Sparkles, Megaphone, LogIn, Heart, Compass } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import styles from "./portal.module.css";

export const metadata: Metadata = {
  title: "ยืนเดี่ยว — บ้านของทีมเรา",
  description: "ทีมเดียวกัน ภารกิจเดียวกัน — ประตูสู่ออฟฟิศยืนเดี่ยว People, AI Office และ Ads",
  robots: { index: false, follow: false },
};

const rooms = [
  { name: "People", title: "ดูแลคนของเรา", description: "วันลา ปฏิทินทีม ข้อมูลพนักงาน และการเติบโตในการทำงาน", href: "https://people.yuendeaw.com/dashboard", domain: "people.yuendeaw.com", icon: Users, color: "people" },
  { name: "AI Office", title: "ทำงานไปกับ AI", description: "เข้าสู่ออฟฟิศ AI ดูงานของผู้ช่วย และติดตามภารกิจที่กำลังเดินหน้า", href: "https://aioffice.yuendeaw.com", domain: "aioffice.yuendeaw.com", icon: Sparkles, color: "ai" },
  { name: "Ads", title: "พางานของเราไปไกลขึ้น", description: "ทางเข้าสำหรับงานโฆษณา แคมเปญ และการติดตามผลการตลาด", href: "https://ads.yuendeaw.com", domain: "ads.yuendeaw.com", icon: Megaphone, color: "ads" },
];

export default async function OfficePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return (
    <div className={styles.portal}>
      <header className={styles.header}>
        <Link href="/office" aria-label="หน้าแรกออฟฟิศยืนเดี่ยว" className={styles.brand}>
          <Image src="/join-crew/assets/yuendeaw-logo.png" alt="ยืนเดี่ยว" width={108} height={52} className={styles.logo} />
          <span>บ้านของทีมเรา<small>YUENDEAW OFFICE</small></span>
        </Link>
        <a href={user ? "#workspaces" : "https://people.yuendeaw.com/login?next=%2Foffice"} className={styles.login}>
          <LogIn size={18} aria-hidden="true" />{user ? "เลือกพื้นที่ทำงาน" : "เข้าสู่ระบบทีมงาน"}
        </a>
      </header>

      <main className={styles.main}>
        <section className={styles.welcome} aria-labelledby="welcome-title">
          <div className={styles.intro}>
            <p className={styles.eyebrow}>GOOD PEOPLE. GREAT JOURNEY.</p>
            <h1 id="welcome-title">ทีมเดียวกัน<br /><span>ภารกิจเดียวกัน.</span></h1>
            <p className={styles.lead}>สร้างเสียงหัวเราะ เปิดพื้นที่ให้ความคิดสร้างสรรค์<br className={styles.desktopBreak} /> และพาคนทำงานเติบโตไปด้วยกัน</p>
            <a className={styles.primary} href="#workspaces">{user ? "วันนี้ เราไปทำอะไรด้วยกันดี" : "สำรวจออฟฟิศของเรา"}</a>
          </div>
          <figure className={styles.art}>
            <Image src="/join-crew/assets/crew-likeness-v4.webp" alt="ภาพวาดทีมยืนเดี่ยวร่วมกันทำงานบนยานลำเล็ก ท่ามกลางหนังสือ ต้นไม้ และจักรวาลของความคิดสร้างสรรค์" width={1670} height={941} priority sizes="(max-width: 760px) 100vw, 65vw" />
            <figcaption><Heart size={15} aria-hidden="true" /> ยานลำเล็กของเรา ไปได้ไกลเมื่อไปด้วยกัน</figcaption>
          </figure>
        </section>

        <section id="workspaces" className={styles.workspaces} aria-labelledby="workspace-title">
          <div className={styles.sectionHead}><div><p className={styles.eyebrow}>OUR WORKSPACES</p><h2 id="workspace-title">ทุกส่วนของทีม อยู่ตรงนี้</h2></div><p>เลือกพื้นที่ที่คุณอยากเข้าไปทำงาน</p></div>
          <div className={styles.rooms}>
            {rooms.map(({ icon: Icon, ...room }) => (
              <a key={room.name} href={room.href} className={`${styles.room} ${styles[room.color]}`}>
                <div className={styles.roomTop}><span className={styles.roomIcon}><Icon size={25} strokeWidth={1.7} aria-hidden="true" /></span><span className={styles.roomName}>{room.name}</span></div>
                <h3>{room.title}</h3><p>{room.description}</p>
                <div className={styles.roomBottom}><span>{room.domain}</span><strong>เข้าใช้งาน</strong></div>
              </a>
            ))}
          </div>
          <p className={styles.accessNote}>{user ? "เข้าสู่ระบบ People แล้ว" : "ใช้บัญชีทีมงานเพื่อเข้าสู่ระบบ"} · แต่ละพื้นที่เปิดให้ใช้งานตามสิทธิ์ของคุณ</p>
        </section>

        <section className={styles.join} aria-labelledby="join-title">
          <div className={styles.joinIntro}><Compass size={26} aria-hidden="true" /><div><h2 id="join-title">มีที่ว่างให้คนที่อยากเดินทางไปด้วยกัน</h2><p>มารู้จักทีม และค้นหาจุดเริ่มต้นของคุณที่ยืนเดี่ยว</p></div></div>
          <div className={styles.joinLinks}><a href="https://people.yuendeaw.com/internship">ฝึกงานกับเรา</a><a href="https://people.yuendeaw.com/apply/team">ร่วมงานกับเรา</a></div>
        </section>
      </main>
      <footer className={styles.footer}><span>ยืนเดี่ยว · THE COMEDY HUB</span><span>คนหลายความถนัด บนเส้นทางเดียวกัน</span></footer>
    </div>
  );
}
