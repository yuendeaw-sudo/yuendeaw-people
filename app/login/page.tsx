"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/Icon";
import { Logo } from "@/components/Logo";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    const supabase = createClient();

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(translate(error.message));
      else {
        router.push(next);
        router.refresh();
      }
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) setError(translate(error.message));
      else if (data.session) {
        router.push(next);
        router.refresh();
      } else {
        setInfo("สร้างบัญชีแล้ว — กรุณายืนยันอีเมลก่อนเข้าใช้งาน");
        setMode("signin");
      }
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-col justify-between bg-ink text-paper p-12">
        <div className="flex items-center gap-3">
          <Logo size={44} />
          <span className="font-extrabold text-lg">YuenDeaw People OS</span>
        </div>
        <div>
          <h1 className="text-4xl font-extrabold leading-tight">
            ที่ทำงานของ<br />คนรุ่นใหม่ <span className="text-brand">.</span>
          </h1>
          <p className="mt-4 text-paper/70 max-w-sm">
            บริหารคน เติบโตในสายงาน และทำงานแบบมืออาชีพ —
            ระบบเดียวสำหรับทีม creative, content, production และ AI
          </p>
        </div>
        <div className="flex gap-2 text-paper/50 text-sm">
          <Icon name="Sparkles" className="size-4" /> people.yuendeaw.com
        </div>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center p-6 sm:p-12 bg-paper">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <Logo size={40} />
            <span className="font-extrabold">People OS</span>
          </div>

          <h2 className="text-2xl font-bold">
            {mode === "signin" ? "เข้าสู่ระบบ" : "สร้างบัญชี"}
          </h2>
          <p className="text-muted text-sm mt-1">
            {mode === "signin" ? "ยินดีต้อนรับกลับมา 👋" : "เริ่มต้นใช้งาน People OS"}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <div>
                <label className="label">ชื่อ-นามสกุล</label>
                <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
            )}
            <div>
              <label className="label">อีเมล</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yuendeaw.com"
                required
              />
            </div>
            <div>
              <label className="label">รหัสผ่าน</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>

            {error && <p className="text-sm text-rose bg-rose-soft rounded-lg px-3 py-2">{error}</p>}
            {info && <p className="text-sm text-mint bg-mint-soft rounded-lg px-3 py-2">{info}</p>}

            <button type="submit" disabled={loading} className="btn-brand w-full">
              {loading ? "กำลังดำเนินการ…" : mode === "signin" ? "เข้าสู่ระบบ" : "สร้างบัญชี"}
            </button>
          </form>

          <p className="text-sm text-muted mt-6 text-center">
            {mode === "signin" ? "ยังไม่มีบัญชี?" : "มีบัญชีอยู่แล้ว?"}{" "}
            <button
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError(null);
                setInfo(null);
              }}
              className="font-semibold text-gold hover:underline"
            >
              {mode === "signin" ? "สร้างบัญชีใหม่" : "เข้าสู่ระบบ"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function translate(msg: string) {
  if (/invalid login credentials/i.test(msg)) return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
  if (/already registered/i.test(msg)) return "อีเมลนี้มีบัญชีอยู่แล้ว";
  if (/email not confirmed/i.test(msg)) return "กรุณายืนยันอีเมลก่อนเข้าใช้งาน";
  return msg;
}
