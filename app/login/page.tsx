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

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [error, setError] = useState<string | null>(
    params.get("error") === "oauth" ? "เข้าสู่ระบบด้วย Google ไม่สำเร็จ ลองอีกครั้ง" : null
  );

  async function google() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const origin = window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) {
      setError(translate(error.message));
      setLoading(false);
    }
    // on success the browser is redirected to Google — no further code runs
  }

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(translate(error.message));
    else {
      router.push(next);
      router.refresh();
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

          <h2 className="text-2xl font-bold">เข้าสู่ระบบ</h2>
          <p className="text-muted text-sm mt-1">ยินดีต้อนรับเข้าทีม ยืนเดี่ยว 👋</p>

          {/* Google SSO — primary path for everyone */}
          <button
            onClick={google}
            disabled={loading}
            className="mt-6 w-full flex items-center justify-center gap-3 rounded-xl border border-sand bg-white px-4 py-3 font-semibold hover:bg-sand/40 transition disabled:opacity-60"
          >
            <GoogleMark />
            {loading ? "กำลังพาไป Google…" : "เข้าสู่ระบบด้วย Google"}
          </button>

          <p className="text-xs text-muted mt-3 text-center leading-relaxed">
            ใช้อีเมล Google ที่ HR เพิ่มไว้ในระบบ
            <br />
            ยังไม่ได้รับเชิญ? แจ้ง HR ให้เพิ่มอีเมลของคุณก่อน
          </p>

          {error && (
            <p className="text-sm text-rose bg-rose-soft rounded-lg px-3 py-2 mt-4">{error}</p>
          )}

          {/* Admin fallback — email + password */}
          <div className="mt-8">
            <button
              onClick={() => setShowEmail((v) => !v)}
              className="text-xs text-muted hover:text-ink flex items-center gap-1 mx-auto"
            >
              <Icon name={showEmail ? "ChevronUp" : "ChevronDown"} className="size-3.5" />
              เข้าสู่ระบบด้วยอีเมล (สำหรับแอดมิน)
            </button>

            {showEmail && (
              <form onSubmit={submitEmail} className="mt-4 space-y-4">
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
                <button type="submit" disabled={loading} className="btn-outline w-full">
                  {loading ? "กำลังดำเนินการ…" : "เข้าสู่ระบบด้วยอีเมล"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22 22-9.8 22-22c0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M3.3 12.7l6.6 4.8C11.7 14 17.4 10 24 10c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 4.1 29.6 2 24 2 15.4 2 7.9 6.9 3.3 12.7z" />
      <path fill="#4CAF50" d="M24 46c5.5 0 10.4-2.1 14.1-5.5l-6.5-5.5c-2.1 1.5-4.8 2.4-7.6 2.4-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C8.5 41 15.7 46 24 46z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.5 5.5c-.5.4 7.3-5.3 7.3-15.1 0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  );
}

function translate(msg: string) {
  if (/invalid login credentials/i.test(msg)) return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
  if (/email not confirmed/i.test(msg)) return "กรุณายืนยันอีเมลก่อนเข้าใช้งาน";
  return msg;
}
