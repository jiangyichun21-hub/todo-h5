"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/");
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      if (session) router.replace("/");
    });

    return () => listener?.subscription.unsubscribe();
  }, [router]);

  const cnError = (msg: string) => {
    const map: Record<string, string> = {
      "Invalid login credentials": "昵称或密码错误",
      "For security purposes": "操作过于频繁，请稍后再试",
      "Email rate limit exceeded": "请求过多，请稍后再试",
      "duplicate key value violates unique constraint": "该昵称已被注册",
      "duplicate key": "该昵称已被注册",
      "Signup requires a valid password": "密码格式不正确",
      "Password should be at least": "密码长度至少6位",
      "User already registered": "该昵称已被注册",
    };
    for (const [key, val] of Object.entries(map)) {
      if (msg.includes(key)) return val;
    }
    return msg;
  };

  const findEmailByNickname = async (nickname: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("email")
      .eq("nickname", nickname)
      .maybeSingle();

    return data?.email ?? null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (isLogin) {
      const email = await findEmailByNickname(nickname.trim());
      if (!email) {
        setError("该昵称未注册");
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);

      if (error) {
        setError(cnError(error.message));
      }
    } else {
      const randomId = Math.random().toString(36).slice(2) + Date.now().toString(36);
      const email = `user_${randomId}@todo.app`;

      const { error: signUpError, data: signUpData } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { nickname: nickname.trim() },
        },
      });

      if (signUpError) {
        setError(cnError(signUpError.message));
        setLoading(false);
        return;
      }

      if (signUpData.user) {
        const { error: profileError } = await supabase
          .from("profiles")
          .upsert({ id: signUpData.user.id, email, nickname: nickname.trim() }, { onConflict: "id" });

        if (profileError) {
          setError("注册失败：" + cnError(profileError.message));
          setLoading(false);
          return;
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          setError("注册成功，请重新登录");
          setIsLogin(true);
        }
      }

      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white dark:from-zinc-950 dark:to-zinc-900 flex flex-col items-center justify-center px-6">
      {/* Logo & Title */}
      <div className="mb-10 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#a896b0] text-white mb-4 shadow-lg shadow-purple-400/20">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          待办事项
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          {isLogin ? "登录以继续" : "创建你的账号"}
        </p>
      </div>

      {/* Card */}
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white dark:bg-zinc-800 rounded-2xl shadow-xl shadow-zinc-200/60 dark:shadow-zinc-900/60 p-6 space-y-4">
        <input
          className="w-full rounded-xl border border-zinc-200 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-700 px-4 py-3 text-base text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#a896b0]/40 focus:border-[#a896b0] transition-all"
          type="text"
          placeholder="昵称"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          required
        />
        <input
          className="w-full rounded-xl border border-zinc-200 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-700 px-4 py-3 text-base text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#a896b0]/40 focus:border-[#a896b0] transition-all"
          type="password"
          placeholder="密码（至少6位）"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && (
          <p className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
        )}

        <button
          className="w-full rounded-xl bg-[#a896b0] hover:bg-[#9a85a3] active:bg-[#8d7697] py-3 font-semibold text-base text-white shadow-md shadow-purple-400/15 transition-all disabled:opacity-50"
          type="submit"
          disabled={loading}
        >
          {loading ? "处理中..." : isLogin ? "登录" : "注册"}
        </button>
      </form>

      <button
        className="mt-6 text-sm text-zinc-500 dark:text-zinc-400 hover:text-[#a896b0] transition-colors"
        onClick={() => {
          setIsLogin(!isLogin);
          setError("");
        }}
      >
        {isLogin ? "没有账号？去注册" : "已有账号？去登录"}
      </button>
    </div>
  );
}
