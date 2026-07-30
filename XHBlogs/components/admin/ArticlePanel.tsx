"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronRight,
  Circle,
  Clock3,
  FilePlus2,
  LoaderCircle,
  MapPin,
  Newspaper,
  Save,
  Send,
  Sparkles,
  Trash2,
  Undo2,
} from "lucide-react";
import { adminAPI, ArticleWriteInput } from "@/lib/admin-api";
import type {
  Article,
  ArticleKind,
  ArticleRevision,
  ArticleStatus,
} from "@/lib/types";
import {
  Field,
  ImageURLField,
  PanelMessage,
  inputClass,
  textareaClass,
} from "./AdminFields";
import RichEditor from "./RichEditor";

interface EditorDocument extends ArticleWriteInput {
  id: number;
  status: ArticleStatus;
  publishedAt: string | null;
  updatedAt: string;
}

const kindLabels: Record<ArticleKind, string> = {
  post: "文章",
  chatter: "杂谈",
  moment: "说说",
  page: "关于我",
};

export default function ArticlePanel() {
  const [items, setItems] = useState<Article[]>([]);
  const [document, setDocument] = useState<EditorDocument | null>(null);
  const [kindFilter, setKindFilter] = useState<"all" | ArticleKind>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | ArticleStatus>("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [revisions, setRevisions] = useState<ArticleRevision[]>([]);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);

  const load = useCallback(async (keepID?: number) => {
    setLoading(true);
    try {
      const result = await adminAPI.articles("?page=1&pageSize=100");
      setItems(result.items);
      if (keepID) {
        const updated = result.items.find((item) => item.id === keepID);
        if (updated) setDocument(toEditorDocument(updated));
      }
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "读取内容失败",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () =>
      items.filter(
        (item) =>
          (kindFilter === "all" || item.kind === kindFilter) &&
          (statusFilter === "all" || item.status === statusFilter),
      ),
    [items, kindFilter, statusFilter],
  );

  const choose = async (item: Article) => {
    setMessage(null);
    setSlugTouched(true);
    try {
      const [full, history] = await Promise.all([
        adminAPI.article(item.id),
        adminAPI.articleRevisions(item.id),
      ]);
      setDocument(toEditorDocument(full));
      setRevisions(history);
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "读取内容详情失败",
      });
    }
  };

  const createNew = (kind: ArticleKind) => {
    setMessage(null);
    setSlugTouched(kind === "page");
    setRevisions([]);
    setDocument(blankDocument(kind));
  };

  const update = <K extends keyof EditorDocument>(
    key: K,
    value: EditorDocument[K],
  ) => {
    setDocument((current) => (current ? { ...current, [key]: value } : current));
  };

  const updateTitle = (title: string) => {
    setDocument((current) => {
      if (!current) return current;
      const next = { ...current, title };
      if (current.id === 0 && !slugTouched && current.kind !== "page") {
        next.slug = slugFromTitle(title);
      }
      return next;
    });
  };

  const persist = async (publish: boolean) => {
    if (!document) return;
    const validation = validateDocument(document);
    if (validation) {
      setMessage({ tone: "error", text: validation });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const input = toWriteInput(document);
      const saved = document.id
        ? await adminAPI.updateArticle(document.id, input)
        : await adminAPI.createArticle(input);
      const result = publish
        ? await adminAPI.publishArticle(saved.id)
        : saved;
      setDocument(toEditorDocument(result));
      setSlugTouched(true);
      await load(result.id);
      setRevisions(await adminAPI.articleRevisions(result.id));
      setMessage({
        tone: "success",
        text: publish
          ? "已发布。公开页面刷新后会读取最新内容，无需重新构建。"
          : result.status === "published"
            ? "已保存并记录修订版本；刷新公开页面即可看到更新。"
            : "草稿已保存到 PostgreSQL。",
      });
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "保存失败",
      });
    } finally {
      setSaving(false);
    }
  };

  const unpublish = async () => {
    if (!document?.id) return;
    setSaving(true);
    setMessage(null);
    try {
      const result = await adminAPI.unpublishArticle(document.id);
      setDocument(toEditorDocument(result));
      await load(result.id);
      setMessage({ tone: "success", text: "内容已撤回为草稿。" });
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "撤回失败",
      });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!document?.id) {
      setDocument(null);
      setRevisions([]);
      return;
    }
    if (!window.confirm(`确认删除《${document.title}》？该操作会进行软删除。`)) return;
    setSaving(true);
    try {
      await adminAPI.deleteArticle(document.id);
      setDocument(null);
      await load();
      setMessage({ tone: "success", text: "内容已移入软删除状态。" });
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "删除失败",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col xl:h-full xl:flex-row">
      <section className="shrink-0 border-b border-white/10 bg-slate-950/20 xl:w-[350px] xl:border-b-0 xl:border-r">
        <div className="border-b border-white/10 p-4">
          <div className="grid grid-cols-4 gap-2">
            {(["post", "chatter", "moment", "page"] as ArticleKind[]).map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => createNew(kind)}
                className="flex flex-col items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/[.035] px-1 py-2.5 text-[10px] font-bold text-slate-400 transition hover:border-indigo-300/30 hover:bg-indigo-400/[.08] hover:text-indigo-200"
              >
                <FilePlus2 size={15} />
                {kindLabels[kind]}
              </button>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <select
              value={kindFilter}
              onChange={(event) => setKindFilter(event.target.value as "all" | ArticleKind)}
              className={inputClass}
            >
              <option value="all">全部类型</option>
              {Object.entries(kindLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "all" | ArticleStatus)}
              className={inputClass}
            >
              <option value="all">全部状态</option>
              <option value="draft">草稿</option>
              <option value="published">已发布</option>
              <option value="archived">已归档</option>
            </select>
          </div>
        </div>

        <div className="max-h-[300px] overflow-auto p-2 xl:max-h-none xl:h-[calc(100vh-272px)]">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-xs text-slate-500">
              <LoaderCircle className="mr-2 animate-spin" size={15} />
              读取数据库
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-16 text-center">
              <Newspaper className="mx-auto mb-3 text-slate-700" size={28} />
              <p className="text-sm font-bold text-slate-400">还没有内容</p>
              <p className="mt-1 text-xs text-slate-600">从上方选择一种类型开始写作。</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((item) => {
                const active = document?.id === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => void choose(item)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
                      active
                        ? "border-indigo-300/20 bg-indigo-400/[.1]"
                        : "border-transparent hover:bg-white/[.035]"
                    }`}
                  >
                    <StatusDot status={item.status || "draft"} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-slate-200">
                        {item.title || "无标题"}
                      </span>
                      <span className="mt-1 flex items-center gap-2 text-[10px] text-slate-500">
                        <span>{kindLabels[item.kind]}</span>
                        <span>·</span>
                        <span>{formatDate(item.updatedAt)}</span>
                      </span>
                    </span>
                    <ChevronRight size={14} className="text-slate-600" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="min-w-0 flex-1">
        {!document ? (
          <div className="flex min-h-[620px] items-center justify-center p-8 xl:h-full">
            <div className="max-w-md text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-indigo-300/10 bg-indigo-400/[.07] text-indigo-300">
                <Sparkles size={26} />
              </div>
              <h3 className="text-2xl font-black text-white">选择一条内容轨道</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-500">
                左侧可新建或打开内容。草稿保存与正式发布分开，发布不会触发构建。
              </p>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-[1260px] p-4 pb-28 sm:p-7 sm:pb-28">
            <div className="mb-5 flex flex-col gap-4 rounded-2xl border border-white/10 bg-slate-950/35 p-4 sm:flex-row sm:items-center sm:justify-between">
              <PublishRail document={document} />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void persist(false)}
                  disabled={saving}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[.05] px-4 text-xs font-black text-slate-200 transition hover:bg-white/[.09] disabled:opacity-50"
                >
                  {saving ? <LoaderCircle className="animate-spin" size={14} /> : <Save size={14} />}
                  {document.status === "published" ? "保存并更新线上" : "保存草稿"}
                </button>
                {document.status === "published" ? (
                  <button
                    type="button"
                    onClick={() => void unpublish()}
                    disabled={saving}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-amber-300 px-4 text-xs font-black text-slate-950 disabled:opacity-50"
                  >
                    <Undo2 size={14} />
                    撤回
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void persist(true)}
                    disabled={saving}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-400 px-4 text-xs font-black text-slate-950 shadow-[0_10px_30px_rgba(99,102,241,.2)] transition hover:bg-indigo-300 disabled:opacity-50"
                  >
                    <Send size={14} />
                    正式发布
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void remove()}
                  disabled={saving}
                  title="删除"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-300/10 text-rose-300 transition hover:bg-rose-400/10 disabled:opacity-50"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            {message && (
              <div className="mb-5">
                <PanelMessage tone={message.tone}>{message.text}</PanelMessage>
              </div>
            )}

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
              <div className="space-y-5">
                <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-5">
                  <div className="grid gap-4 sm:grid-cols-[150px_minmax(0,1fr)]">
                    <Field label="内容类型">
                      <select
                        value={document.kind}
                        disabled={document.kind === "page"}
                        onChange={(event) => update("kind", event.target.value as ArticleKind)}
                        className={inputClass}
                      >
                        {Object.entries(kindLabels).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="标题">
                      <input
                        value={document.title}
                        onChange={(event) => updateTitle(event.target.value)}
                        className={inputClass}
                        placeholder="输入标题"
                        disabled={document.kind === "page"}
                      />
                    </Field>
                  </div>
                  <div className="mt-4">
                    <Field
                      label="Slug"
                      hint="公开 URL 标识；仅允许不含斜杠的短文本，保存后仍可修改。"
                    >
                      <input
                        value={document.slug}
                        disabled={document.kind === "page"}
                        onChange={(event) => {
                          setSlugTouched(true);
                          update("slug", event.target.value);
                        }}
                        className={inputClass}
                      />
                    </Field>
                  </div>
                </div>

                <RichEditor
                  value={document.contentHtml}
                  onChange={(value) => update("contentHtml", value)}
                />
              </div>

              <aside className="space-y-5">
                <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-5">
                  <h3 className="mb-5 text-sm font-black text-white">展示信息</h3>
                  <div className="space-y-5">
                    <ImageURLField
                      label="封面图"
                      value={document.coverUrl}
                      onChange={(value) => update("coverUrl", value)}
                      hint="支持保留旧外链，也可上传新图片到 RustFS。"
                    />
                    {document.kind !== "page" && (
                      <Field label="摘要">
                        <textarea
                          rows={5}
                          value={document.summary}
                          onChange={(event) => update("summary", event.target.value)}
                          className={textareaClass}
                          placeholder="首页卡片和搜索结果使用的短摘要"
                        />
                      </Field>
                    )}
                    {document.kind !== "page" && (
                      <Field label="标签" hint="使用逗号分隔">
                        <input
                          value={document.tags.join(", ")}
                          onChange={(event) =>
                            update("tags", splitValues(event.target.value))
                          }
                          className={inputClass}
                          placeholder="Go, PostgreSQL, 随笔"
                        />
                      </Field>
                    )}
                    {document.kind === "chatter" && (
                      <Field label="心情">
                        <input
                          value={document.mood}
                          onChange={(event) => update("mood", event.target.value)}
                          className={inputClass}
                          placeholder="平静 / 开心 / 炼丹中"
                        />
                      </Field>
                    )}
                    {document.kind === "moment" && (
                      <>
                        <Field label="地点">
                          <div className="relative">
                            <MapPin className="absolute left-3 top-3 text-slate-600" size={15} />
                            <input
                              value={document.location}
                              onChange={(event) => update("location", event.target.value)}
                              className={`${inputClass} pl-9`}
                            />
                          </div>
                        </Field>
                        <Field label="说说图片" hint="每行一个外链或 RustFS 图片 URL">
                          <textarea
                            rows={7}
                            value={document.imageUrls.join("\n")}
                            onChange={(event) =>
                              update("imageUrls", splitLines(event.target.value))
                            }
                            className={textareaClass}
                          />
                        </Field>
                      </>
                    )}
                  </div>
                </div>
                {document.id > 0 && (
                  <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="flex items-center gap-2 text-sm font-black text-white">
                        <Clock3 size={14} className="text-indigo-300" />
                        发布修订
                      </h3>
                      <span className="text-[10px] font-bold text-slate-600">
                        {revisions.length} 个快照
                      </span>
                    </div>
                    {revisions.length === 0 ? (
                      <p className="text-xs leading-relaxed text-slate-600">
                        首次发布后会生成版本快照；已发布内容每次保存也会记录。
                      </p>
                    ) : (
                      <div className="max-h-52 space-y-2 overflow-auto pr-1">
                        {revisions.map((revision) => (
                          <div
                            key={revision.id}
                            className="rounded-xl border border-white/[.07] bg-white/[.025] px-3 py-2.5"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-xs font-black text-slate-300">
                                v{revision.revision}
                              </span>
                              <time className="text-[10px] text-slate-600">
                                {formatDateTime(revision.createdAt)}
                              </time>
                            </div>
                            <p className="mt-1 truncate text-[10px] text-slate-500">
                              {revision.title}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </aside>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function PublishRail({ document }: { document: EditorDocument }) {
  const saved = document.id > 0;
  const published = document.status === "published";
  const steps = [
    { label: "编辑中", active: true },
    { label: "已入库", active: saved },
    { label: "已发布", active: published },
  ];
  return (
    <div className="flex items-center gap-2">
      {steps.map((step, index) => (
        <div key={step.label} className="flex items-center gap-2">
          <span
            className={`flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[10px] font-black uppercase tracking-wide ${
              step.active
                ? "bg-indigo-400/15 text-indigo-200"
                : "bg-white/[.035] text-slate-600"
            }`}
          >
            {step.active ? <Check size={11} /> : <Circle size={10} />}
            {step.label}
          </span>
          {index < steps.length - 1 && (
            <span className={`h-px w-5 ${steps[index + 1].active ? "bg-indigo-300/50" : "bg-white/10"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function StatusDot({ status }: { status: ArticleStatus }) {
  const className =
    status === "published"
      ? "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.45)]"
      : status === "archived"
        ? "bg-slate-500"
        : "bg-amber-300";
  return <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${className}`} />;
}

function blankDocument(kind: ArticleKind): EditorDocument {
  const now = new Date();
  const page = kind === "page";
  const moment = kind === "moment";
  const momentSlug = `moment-${now
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(0, 14)}`;
  return {
    id: 0,
    kind,
    status: "draft",
    slug: page ? "about" : moment ? momentSlug : "",
    title: page
      ? "关于我"
      : moment
        ? `生活动态 ${now.toLocaleDateString("zh-CN")}`
        : "",
    summary: "",
    mood: "",
    location: "",
    coverUrl: "",
    tags: [],
    imageUrls: [],
    contentHtml: "<p></p>",
    publishedAt: null,
    updatedAt: now.toISOString(),
  };
}

function toEditorDocument(article: Article): EditorDocument {
  return {
    id: article.id,
    kind: article.kind,
    status: article.status || "draft",
    slug: article.slug,
    title: article.title,
    summary: article.summary || "",
    mood: article.mood || "",
    location: article.location || "",
    coverUrl: article.coverUrl || "",
    tags: article.tags || [],
    imageUrls: article.imageUrls || [],
    contentHtml: article.contentHtml || article.renderedHtml || "<p></p>",
    publishedAt: article.publishedAt,
    updatedAt: article.updatedAt,
  };
}

function toWriteInput(document: EditorDocument): ArticleWriteInput {
  return {
    kind: document.kind,
    slug: document.kind === "page" ? "about" : document.slug.trim(),
    title: document.kind === "page" ? "关于我" : document.title.trim(),
    summary: document.summary.trim(),
    mood: document.mood.trim(),
    location: document.location.trim(),
    coverUrl: document.coverUrl.trim(),
    tags: document.tags,
    imageUrls: document.imageUrls,
    contentHtml: document.contentHtml,
  };
}

function validateDocument(document: EditorDocument) {
  if (!document.title.trim()) return "标题不能为空。";
  if (!document.slug.trim()) return "Slug 不能为空。";
  if (document.slug.includes("/") || document.slug.includes("..")) {
    return "Slug 不能包含斜杠或连续点号。";
  }
  return "";
}

function slugFromTitle(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[/?#%\\]+/g, "")
    .replace(/-+/g, "-")
    .slice(0, 160);
}

function splitValues(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[,，]/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function splitLines(value: string) {
  return Array.from(
    new Set(
      value
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
