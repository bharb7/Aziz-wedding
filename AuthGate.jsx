import React, { useState, useEffect } from "react";
import { supabase } from "./supabase";
import { Lock, LogOut } from "lucide-react";

// Usernames map to fake internal emails since Supabase Auth needs an
// email-shaped identifier. No real email is ever sent to these addresses.
const EMAIL_DOMAIN = "beitalward.app";

export default function AuthGate({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setSigningIn(true);
    const email = `${username.trim().toLowerCase()}@${EMAIL_DOMAIN}`;
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setSigningIn(false);
    if (signInError) {
      setError("اسم المستخدم أو كلمة المرور غير صحيحة");
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF6F0]">
        <p className="text-[#7A2E3A]">جاري التحميل…</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center bg-[#FAF6F0] px-4" style={{ fontFamily: "'Tajawal','Segoe UI',sans-serif" }}>
        <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm border border-[#E4D9C8]">
          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 rounded-full bg-[#7A2E3A] flex items-center justify-center mb-3">
              <Lock size={24} color="white" />
            </div>
            <h1 className="text-lg font-bold text-[#7A2E3A]" style={{ fontFamily: "'Amiri', serif" }}>بيت الورد</h1>
            <p className="text-xs text-[#9A8A78] mt-1">سجّل الدخول للمتابعة</p>
          </div>

          <label className="text-xs font-semibold text-[#7A2E3A] mb-1 block">اسم المستخدم</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-[#FAF6F0] border border-[#E4D9C8] rounded-lg px-3 py-2 text-sm mb-4 outline-none focus:border-[#B8935F]"
            placeholder="مثال: aziz"
            autoCapitalize="none"
            autoCorrect="off"
          />

          <label className="text-xs font-semibold text-[#7A2E3A] mb-1 block">كلمة المرور</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-[#FAF6F0] border border-[#E4D9C8] rounded-lg px-3 py-2 text-sm mb-4 outline-none focus:border-[#B8935F]"
            placeholder="••••••••"
          />

          {error && <p className="text-xs text-[#C1443D] mb-3">{error}</p>}

          <button
            type="submit"
            disabled={signingIn}
            className="w-full bg-[#7A2E3A] text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-[#8F3B49] disabled:opacity-60"
          >
            {signingIn ? "جاري الدخول…" : "دخول"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div className="fixed top-3 left-3 z-50">
        <button
          onClick={handleLogout}
          title="تسجيل الخروج"
          className="flex items-center gap-1.5 bg-white border border-[#E4D9C8] text-[#7A2E3A] text-xs rounded-full px-3 py-1.5 shadow hover:bg-[#FAF0E6]"
        >
          <LogOut size={12} /> خروج
        </button>
      </div>
      {children}
    </div>
  );
}
