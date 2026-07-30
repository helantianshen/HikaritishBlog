"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BookOpenText,
  Database,
  ExternalLink,
  FolderKanban,
  Images,
  LockKeyhole,
  RefreshCw,
  Settings2,
  Sparkles,
} from "lucide-react";
import {
  AdminAPIError,
  adminAPI,
  setAdminToken,
} from "@/lib/admin-api";
import ArticlePanel from "./ArticlePanel";
import SettingsPanel from "./SettingsPanel";
import CollectionsPanel from "./CollectionsPanel";
import AssetsPanel from "./AssetsPanel";

type Section = "articles" | "collections" | "assets" | "settings";
type AccessState = "checking" | "ready" | "locked" | "offline";

const sections: Array<{
  id: Section;
  label: string;
  description: string;
  icon: typeof BookOpenText;
}> = [
  {
    id: "articles",
    label: "内容轨道",
    description: "文章、杂谈、说说与关于",
    icon: BookOpenText,
  },
  {
    id: "collections",
    label: "内容集合",
    description: "友链、项目与相册",
    icon: FolderKanban,
  },
  {
    id: "assets",
    label: "光影仓库",
    description: "RustFS 图片资源",
    icon: Images,
  },
  {
    id: "settings",
    label: "站点核心",
    description: "个人资料与全站设置",
    icon: Settings2,
  },
];

export default function AdminConsole() {
  const [section, setSection] = useState<Section>("articles");
  const [access, setAccess] = useState<AccessState>("checking");
  const [errorMessage, setErrorMessage] = useState("");
  const [accessVersion, setAccessVersion] = useState(0);

  const checkAccess = useCallback(async () => {
    setAccess("checking");
    setErrorMessage("");
    try {
      await adminAPI.settings();
      setAccess("ready");
    } catch (error) {
      if (error instanceof AdminAPIError && error.status === 401) {
        setAccess("locked");
        return;
      }
      setAccess("offline");
      setErrorMessage(error instanceof Error ? error.message : "无法连接到 Gin API");
    }
  }, []);

  useEffect(() => {
    void checkAccess();
  }, [accessVersion, checkAccess]);

  const unlock = (token: string) => {
    setAdminToken(token);
    setAccessVersion((value) => value + 1);
  };

  if (access !== "ready") {
    return (
      <AdminAccessScreen
        state={access}
        message={errorMessage}
        onUnlock={unlock}
        onRetry={() => setAccessVersion((value) => value + 1)}
      />
    );
  }

  const activeSection = sections.find((item) => item.id === section)!;

  return (
    <div className="fixed inset-0 z-[2147483000] overflow-hidden bg-[#07101f] text-slate-100 font-sans">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -left-32 top-[-20%] h-[520px] w-[520px] rounded-full bg-indigo-500/20 blur-[140px]" />
        <div className="absolute bottom-[-35%] right-[-10%] h-[620px] w-[620px] rounded-full bg-cyan-400/10 blur-[150px]" />
        <div className="admin-grid absolute inset-0 opacity-30" />
      </div>

      <div className="relative flex h-full min-h-0">
        <aside className="hidden w-[280px] shrink-0 border-r border-white/10 bg-slate-950/50 p-5 backdrop-blur-3xl lg:flex lg:flex-col">
          <div className="mb-10 flex items-center gap-3 px-2 pt-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-indigo-300/20 bg-indigo-400/10 text-indigo-300 shadow-[0_0_30px_rgba(99,102,241,.2)]">
              <Sparkles size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.32em] text-indigo-300">
                Blog Workspace
              </p>
              <h1 className="text-lg font-black tracking-tight text-white">
                博客控制台
              </h1>
            </div>
          </div>

          <nav className="space-y-2">
            {sections.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={`group flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                    active
                      ? "border-indigo-300/20 bg-indigo-400/12 shadow-[0_12px_35px_rgba(30,41,59,.35)]"
                      : "border-transparent hover:border-white/10 hover:bg-white/[.04]"
                  }`}
                >
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                      active
                        ? "bg-indigo-400 text-slate-950"
                        : "bg-white/[.05] text-slate-400 group-hover:text-white"
                    }`}
                  >
                    <Icon size={18} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-slate-100">
                      {item.label}
                    </span>
                    <span className="block truncate text-[11px] text-slate-500">
                      {item.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="mt-auto space-y-3">
            <div className="rounded-2xl border border-emerald-300/10 bg-emerald-400/[.06] p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold text-emerald-300">
                <Database size={14} />
                数据库直连模式
              </div>
              <p className="text-[11px] leading-relaxed text-slate-400">
                保存即写入 PostgreSQL；发布后刷新公开页面即可看到更新。
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setAdminToken("");
                setAccessVersion((value) => value + 1);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-xs font-bold text-slate-400 transition hover:bg-white/[.05] hover:text-white"
            >
              <LockKeyhole size={14} />
              清除管理凭证
            </button>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="flex shrink-0 items-center justify-between border-b border-white/10 bg-slate-950/25 px-4 py-4 backdrop-blur-2xl sm:px-7">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-indigo-300">
                Live database workspace
              </p>
              <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">
                {activeSection.label}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="/"
                target="_blank"
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-3 text-xs font-bold text-slate-300 transition hover:bg-white/[.08] hover:text-white"
              >
                查看站点 <ExternalLink size={14} />
              </a>
            </div>
          </header>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-white/10 bg-slate-950/20 px-3 py-2 lg:hidden">
              {sections.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSection(item.id)}
                    className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold ${
                      section === item.id
                        ? "bg-indigo-400 text-slate-950"
                        : "bg-white/[.04] text-slate-400"
                    }`}
                  >
                    <Icon size={14} />
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
              {section === "articles" && <ArticlePanel />}
              {section === "collections" && <CollectionsPanel />}
              {section === "assets" && <AssetsPanel />}
              {section === "settings" && <SettingsPanel />}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function AdminAccessScreen({
  state,
  message,
  onUnlock,
  onRetry,
}: {
  state: AccessState;
  message: string;
  onUnlock: (token: string) => void;
  onRetry: () => void;
}) {
  const [token, setToken] = useState("");

  return (
    <div className="fixed inset-0 z-[2147483000] flex items-center justify-center overflow-auto bg-[#07101f] p-5 font-sans text-slate-100">
      <div className="absolute inset-0 admin-grid opacity-30" />
      <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/20 blur-[130px]" />
      <div className="relative w-full max-w-md rounded-[32px] border border-white/10 bg-slate-950/65 p-7 shadow-2xl backdrop-blur-3xl sm:p-9">
        <div className="mb-7 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-400/10 text-indigo-300">
          {state === "checking" ? (
            <RefreshCw className="animate-spin" size={20} />
          ) : (
            <LockKeyhole size={20} />
          )}
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.32em] text-indigo-300">
          Private control plane
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-white">
          {state === "checking"
            ? "正在连接管理中枢"
            : state === "locked"
              ? "输入管理凭证"
              : "Gin API 暂不可用"}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          {state === "locked"
            ? "凭证只保存在当前浏览器标签页的 sessionStorage，不会写入代码或数据库。"
            : state === "offline"
              ? message
              : "正在检查数据库连接与管理接口。"}
        </p>

        {state === "locked" && (
          <form
            className="mt-7 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              onUnlock(token);
            }}
          >
            <input
              type="password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              autoFocus
              placeholder="ADMIN_TOKEN"
              className="h-12 w-full rounded-2xl border border-white/10 bg-white/[.05] px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-indigo-400/50 focus:ring-4 focus:ring-indigo-400/10"
            />
            <button
              type="submit"
              className="h-12 w-full rounded-2xl bg-indigo-400 text-sm font-black text-slate-950 transition hover:bg-indigo-300"
            >
              解锁工作台
            </button>
          </form>
        )}

        {state === "offline" && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-7 inline-flex h-11 items-center gap-2 rounded-xl bg-indigo-400 px-5 text-sm font-black text-slate-950"
          >
            <RefreshCw size={15} />
            重新连接
          </button>
        )}
      </div>
    </div>
  );
}
