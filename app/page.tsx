"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

interface Todo {
  id: number;
  user_id: string;
  text: string;
  completed: boolean;
  created_at: string;
  completed_at?: string;
}

type Filter = "all" | "active" | "completed";

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState("");
  const [toast, setToast] = useState("");
  const router = useRouter();

  const fetchTodos = useCallback(async () => {
    const { data } = await supabase
      .from("todos")
      .select("*")
      .order("created_at", { ascending: true });

    if (data) setTodos(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace("/login");
      } else {
        const nick = data.session.user.user_metadata?.nickname ?? data.session.user.email ?? "";
        setNickname(nick);
        fetchTodos();
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) router.replace("/login");
      if (event === "SIGNED_IN") fetchTodos();
    });

    return () => listener?.subscription.unsubscribe();
  }, [router, fetchTodos]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  };

  const addTodo = async () => {
    const text = input.trim();
    if (!text) {
      showToast("请填写待办内容");
      return;
    }

    const { data } = await supabase
      .from("todos")
      .insert({ text, completed: false })
      .select()
      .single();

    if (data) {
      setTodos((prev) => [...prev, data]);
      setInput("");
    }
  };

  const toggleTodo = async (id: number) => {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;

    const { data } = await supabase
      .from("todos")
      .update({ completed: !todo.completed, completed_at: !todo.completed ? new Date().toISOString() : null })
      .eq("id", id)
      .select()
      .single();

    if (data) {
      setTodos((prev) => prev.map((t) => (t.id === id ? data : t)));
    }
  };

  const deleteTodo = async (id: number) => {
    await supabase.from("todos").delete().eq("id", id);
    setTodos((prev) => prev.filter((t) => t.id !== id));
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const filteredTodos = todos
    .filter((t) => {
      if (filter === "active") return !t.completed;
      if (filter === "completed") return t.completed;
      return true;
    })
    .toSorted((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const aTime = a.completed ? a.completed_at : a.created_at;
      const bTime = b.completed ? b.completed_at : b.created_at;
      return new Date(bTime ?? 0).getTime() - new Date(aTime ?? 0).getTime();
    });

  const formatTime = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const hour = d.getHours();
    const min = d.getMinutes();
    return `${month}月${day}日 ${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-black font-sans">
      {/* Toast */}
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 text-sm px-5 py-2.5 rounded-full shadow-xl animate-[fade-in_0.2s_ease-out]">
          {toast}
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-200/60 dark:border-zinc-800">
        <div className="mx-auto max-w-lg px-4 pt-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#a896b0] flex items-center justify-center shadow-sm shadow-purple-400/20">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold text-zinc-900 dark:text-white leading-tight">
                  待办事项
                </h1>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {todos.filter((t) => !t.completed).length} 项未完成
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-full">
                {nickname}
              </span>
              <button
                className="text-xs text-zinc-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 px-2 py-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                onClick={signOut}
              >
                退出
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 pt-4 pb-24">
        {/* Input */}
        <div className="flex gap-2 mb-5">
          <input
            className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2.5 text-base text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#a896b0]/30 focus:border-[#a896b0] shadow-sm transition-all"
            type="text"
            placeholder="添加待办事项..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTodo()}
          />
          <button
            className="rounded-xl bg-[#a896b0] hover:bg-[#9a85a3] active:bg-[#8d7697] px-5 py-2.5 font-semibold text-base text-white shadow-sm shadow-purple-400/15 transition-all min-w-[72px]"
            onClick={addTodo}
          >
            添加
          </button>
        </div>

        {/* Todo List */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-[#a896b0] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <ul className="space-y-1.5">
            {filteredTodos.map((todo) => (
              <li
                key={todo.id}
                className="group flex items-center gap-3 rounded-xl bg-white dark:bg-zinc-900 px-4 py-3 shadow-sm shadow-zinc-200/50 dark:shadow-zinc-900/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-all"
              >
                {/* Checkbox */}
                <button
                  className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all active:scale-90 ${
                    todo.completed
                      ? "border-[#a896b0] bg-[#a896b0] shadow-sm shadow-purple-400/20"
                      : "border-zinc-300 dark:border-zinc-600 hover:border-[#a896b0]"
                  }`}
                  onClick={() => toggleTodo(todo.id)}
                >
                  {todo.completed && (
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <span
                    className={`text-[15px] leading-5 transition-all ${
                      todo.completed
                        ? "line-through text-zinc-400 dark:text-zinc-500"
                        : "text-zinc-800 dark:text-zinc-100"
                    }`}
                  >
                    {todo.text}
                  </span>
                  <div className="flex flex-wrap gap-x-3 gap-y-0 mt-0.5 text-[11px] text-zinc-400 dark:text-zinc-500">
                    <span>创建于 {formatTime(todo.created_at)}</span>
                    {todo.completed && todo.completed_at && (
                      <span>完成于 {formatTime(todo.completed_at)}</span>
                    )}
                  </div>
                </div>

                {/* Delete */}
                <button
                  className="flex-shrink-0 p-1.5 opacity-0 group-hover:opacity-100 rounded-lg text-zinc-300 dark:text-zinc-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                  onClick={() => deleteTodo(todo.id)}
                >
                  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Empty State */}
        {!loading && filteredTodos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-zinc-200/60 dark:bg-zinc-800 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-zinc-400 dark:text-zinc-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                {filter === "all" ? (
                  <path d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                ) : (
                  <path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" strokeLinecap="round" strokeLinejoin="round" />
                )}
              </svg>
            </div>
            <p className="text-sm text-zinc-400 dark:text-zinc-500">
              {filter === "all"
                ? "还没有待办事项"
                : "没有匹配的事项"}
            </p>
          </div>
        )}
      </div>

      {/* Bottom Filter Bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-zinc-200/60 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl">
        <div className="flex max-w-lg mx-auto px-4">
          {(["all", "active", "completed"] as Filter[]).map((f) => (
            <button
              key={f}
              className={`flex-1 py-3 text-sm font-medium transition-all ${
                filter === f
                  ? "text-[#a896b0]"
                  : "text-zinc-500 dark:text-zinc-400 active:text-zinc-700"
              }`}
              onClick={() => setFilter(f)}
            >
              <div className="flex flex-col items-center gap-1">
                {f === "all" ? "全部" : f === "active" ? "进行中" : "已完成"}
                {filter === f && (
                  <span className="w-5 h-0.5 rounded-full bg-[#a896b0]" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
