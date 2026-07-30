"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FolderKanban,
  ImagePlus,
  Link2,
  LoaderCircle,
  Plus,
  Save,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";
import { adminAPI } from "@/lib/admin-api";
import type { Album, Friend, Photo, Project } from "@/lib/types";
import {
  Field,
  ImageURLField,
  PanelMessage,
  Toggle,
  inputClass,
  textareaClass,
} from "./AdminFields";

type CollectionTab = "friends" | "projects" | "albums";
type FriendDraft = Omit<Friend, "id"> & { id?: number };
type ProjectDraft = Omit<Project, "id"> & { id?: number };
type AlbumDraft = Omit<Album, "id"> & { id?: number };

export default function CollectionsPanel() {
  const [tab, setTab] = useState<CollectionTab>("friends");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [friendData, projectData, albumData] = await Promise.all([
        adminAPI.friends(),
        adminAPI.projects(),
        adminAPI.albums(),
      ]);
      setFriends(friendData);
      setProjects(projectData);
      setAlbums(albumData);
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "读取内容集合失败",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex min-h-[640px] items-center justify-center text-sm text-slate-500">
        <LoaderCircle className="mr-2 animate-spin" size={16} />
        正在读取内容集合
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1220px] p-4 pb-28 sm:p-7 sm:pb-28">
      <div className="mb-5 flex gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/30 p-2">
        <TabButton
          active={tab === "friends"}
          onClick={() => setTab("friends")}
          icon={<UsersRound size={15} />}
          label={`友链 ${friends.length}`}
        />
        <TabButton
          active={tab === "projects"}
          onClick={() => setTab("projects")}
          icon={<FolderKanban size={15} />}
          label={`项目 ${projects.length}`}
        />
        <TabButton
          active={tab === "albums"}
          onClick={() => setTab("albums")}
          icon={<ImagePlus size={15} />}
          label={`相册 ${albums.length}`}
        />
      </div>

      {message && (
        <div className="mb-5">
          <PanelMessage tone={message.tone}>{message.text}</PanelMessage>
        </div>
      )}

      {tab === "friends" && (
        <FriendsEditor
          items={friends}
          reload={load}
          notify={setMessage}
        />
      )}
      {tab === "projects" && (
        <ProjectsEditor
          items={projects}
          reload={load}
          notify={setMessage}
        />
      )}
      {tab === "albums" && (
        <AlbumsEditor
          items={albums}
          reload={load}
          notify={setMessage}
        />
      )}
    </div>
  );
}

function FriendsEditor({
  items,
  reload,
  notify,
}: {
  items: Friend[];
  reload: () => Promise<void>;
  notify: Notify;
}) {
  const [draft, setDraft] = useState<FriendDraft | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!draft) return;
    if (!draft.name.trim() || !draft.url.trim()) {
      notify({ tone: "error", text: "友链名称和链接不能为空。" });
      return;
    }
    setSaving(true);
    try {
      const saved = await adminAPI.saveFriend(draft);
      await reload();
      setDraft({ ...saved });
      notify({ tone: "success", text: "友链已保存。" });
    } catch (error) {
      notifyError(notify, error, "保存友链失败");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!draft?.id) {
      setDraft(null);
      return;
    }
    if (!window.confirm(`确认删除友链「${draft.name}」？`)) return;
    setSaving(true);
    try {
      await adminAPI.deleteFriend(draft.id);
      setDraft(null);
      await reload();
      notify({ tone: "success", text: "友链已删除。" });
    } catch (error) {
      notifyError(notify, error, "删除友链失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <CollectionWorkspace
      title="友链"
      description="管理公开友链列表；排序值越小越靠前。"
      items={items.map((item) => ({
        id: item.id,
        title: item.name,
        subtitle: item.url,
        visible: item.visible,
      }))}
      selectedID={draft?.id}
      onSelect={(id) => {
        const item = items.find((value) => value.id === id);
        if (item) setDraft({ ...item });
      }}
      onCreate={() => setDraft(blankFriend())}
    >
      {draft ? (
        <EditorCard
          title={draft.id ? "编辑友链" : "新增友链"}
          saving={saving}
          onSave={() => void save()}
          onDelete={() => void remove()}
        >
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="名称">
              <input
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="链接">
              <input
                value={draft.url}
                onChange={(event) => setDraft({ ...draft, url: event.target.value })}
                className={inputClass}
              />
            </Field>
            <ImageURLField
              label="头像"
              value={draft.avatarUrl}
              onChange={(avatarUrl) => setDraft({ ...draft, avatarUrl })}
            />
            <Field label="主题色" hint="例如 rgba(99, 102, 241, .5) 或 #6366f1">
              <input
                value={draft.themeColor}
                onChange={(event) => setDraft({ ...draft, themeColor: event.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="简介" className="md:col-span-2">
              <textarea
                rows={5}
                value={draft.description}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                className={textareaClass}
              />
            </Field>
            <Field label="排序">
              <input
                type="number"
                value={draft.sortOrder}
                onChange={(event) => setDraft({ ...draft, sortOrder: Number(event.target.value) || 0 })}
                className={inputClass}
              />
            </Field>
            <Toggle
              checked={draft.visible}
              onChange={(visible) => setDraft({ ...draft, visible })}
              label="公开展示"
            />
          </div>
        </EditorCard>
      ) : (
        <EmptyEditor label="选择或新增一条友链" />
      )}
    </CollectionWorkspace>
  );
}

function ProjectsEditor({
  items,
  reload,
  notify,
}: {
  items: Project[];
  reload: () => Promise<void>;
  notify: Notify;
}) {
  const [draft, setDraft] = useState<ProjectDraft | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!draft) return;
    if (!draft.name.trim()) {
      notify({ tone: "error", text: "项目名称不能为空。" });
      return;
    }
    setSaving(true);
    try {
      const saved = await adminAPI.saveProject(draft);
      await reload();
      setDraft({ ...saved });
      notify({ tone: "success", text: "项目已保存。" });
    } catch (error) {
      notifyError(notify, error, "保存项目失败");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!draft?.id) {
      setDraft(null);
      return;
    }
    if (!window.confirm(`确认删除项目「${draft.name}」？`)) return;
    setSaving(true);
    try {
      await adminAPI.deleteProject(draft.id);
      setDraft(null);
      await reload();
      notify({ tone: "success", text: "项目已删除。" });
    } catch (error) {
      notifyError(notify, error, "删除项目失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <CollectionWorkspace
      title="项目"
      description="公开项目卡片可跳转项目主页或代码仓库。"
      items={items.map((item) => ({
        id: item.id,
        title: item.name,
        subtitle: item.repoUrl || item.url || "未设置链接",
        visible: item.visible,
      }))}
      selectedID={draft?.id}
      onSelect={(id) => {
        const item = items.find((value) => value.id === id);
        if (item) setDraft({ ...item, tags: [...item.tags] });
      }}
      onCreate={() => setDraft(blankProject())}
    >
      {draft ? (
        <EditorCard
          title={draft.id ? "编辑项目" : "新增项目"}
          saving={saving}
          onSave={() => void save()}
          onDelete={() => void remove()}
        >
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="项目名称">
              <input
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="图标" hint="可直接填写 emoji">
              <input
                value={draft.icon}
                onChange={(event) => setDraft({ ...draft, icon: event.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="项目主页">
              <input
                value={draft.url}
                onChange={(event) => setDraft({ ...draft, url: event.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="代码仓库">
              <input
                value={draft.repoUrl}
                onChange={(event) => setDraft({ ...draft, repoUrl: event.target.value })}
                className={inputClass}
              />
            </Field>
            <ImageURLField
              label="项目封面"
              value={draft.coverUrl}
              onChange={(coverUrl) => setDraft({ ...draft, coverUrl })}
            />
            <Field label="标签" hint="使用逗号分隔">
              <input
                value={draft.tags.join(", ")}
                onChange={(event) => setDraft({ ...draft, tags: splitComma(event.target.value) })}
                className={inputClass}
              />
            </Field>
            <Field label="项目简介" className="md:col-span-2">
              <textarea
                rows={6}
                value={draft.description}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                className={textareaClass}
              />
            </Field>
            <Field label="排序">
              <input
                type="number"
                value={draft.sortOrder}
                onChange={(event) => setDraft({ ...draft, sortOrder: Number(event.target.value) || 0 })}
                className={inputClass}
              />
            </Field>
            <Toggle
              checked={draft.visible}
              onChange={(visible) => setDraft({ ...draft, visible })}
              label="公开展示"
            />
          </div>
        </EditorCard>
      ) : (
        <EmptyEditor label="选择或新增一个项目" />
      )}
    </CollectionWorkspace>
  );
}

function AlbumsEditor({
  items,
  reload,
  notify,
}: {
  items: Album[];
  reload: () => Promise<void>;
  notify: Notify;
}) {
  const [draft, setDraft] = useState<AlbumDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const save = async () => {
    if (!draft) return;
    if (!draft.name.trim() || !draft.slug.trim()) {
      notify({ tone: "error", text: "相册名称和 slug 不能为空。" });
      return;
    }
    setSaving(true);
    try {
      const saved = await adminAPI.saveAlbum(draft);
      await reload();
      setDraft(cloneAlbum(saved));
      notify({ tone: "success", text: "相册与照片列表已保存。" });
    } catch (error) {
      notifyError(notify, error, "保存相册失败");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!draft?.id) {
      setDraft(null);
      return;
    }
    if (!window.confirm(`确认删除相册「${draft.name}」及其照片记录？`)) return;
    setSaving(true);
    try {
      await adminAPI.deleteAlbum(draft.id);
      setDraft(null);
      await reload();
      notify({ tone: "success", text: "相册已删除，RustFS 原图未自动删除。" });
    } catch (error) {
      notifyError(notify, error, "删除相册失败");
    } finally {
      setSaving(false);
    }
  };

  const addUploadedPhoto = async (file?: File) => {
    if (!file || !draft) return;
    setUploading(true);
    try {
      const asset = await adminAPI.uploadImage(file);
      setDraft({
        ...draft,
        photos: [
          ...draft.photos,
          {
            url: asset.publicUrl,
            thumbnailUrl: "",
            alt: file.name,
            caption: "",
            takenAt: null,
            sortOrder: draft.photos.length,
          },
        ],
      });
      notify({ tone: "success", text: "图片已上传；保存相册后写入照片记录。" });
    } catch (error) {
      notifyError(notify, error, "上传照片失败");
    } finally {
      setUploading(false);
    }
  };

  const updatePhoto = (index: number, patch: Partial<Photo>) => {
    if (!draft) return;
    setDraft({
      ...draft,
      photos: draft.photos.map((photo, photoIndex) =>
        photoIndex === index ? { ...photo, ...patch } : photo,
      ),
    });
  };

  return (
    <CollectionWorkspace
      title="相册"
      description="相册只保存图片 URL 与说明；删除相册不会级联删除 RustFS 原图。"
      items={items.map((item) => ({
        id: item.id,
        title: item.name,
        subtitle: `${item.photos.length} 张照片 · ${item.slug}`,
        visible: item.visible,
      }))}
      selectedID={draft?.id}
      onSelect={(id) => {
        const item = items.find((value) => value.id === id);
        if (item) setDraft(cloneAlbum(item));
      }}
      onCreate={() => setDraft(blankAlbum())}
    >
      {draft ? (
        <EditorCard
          title={draft.id ? "编辑相册" : "新增相册"}
          saving={saving}
          onSave={() => void save()}
          onDelete={() => void remove()}
        >
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="相册名称">
              <input
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Slug">
              <input
                value={draft.slug}
                onChange={(event) => setDraft({ ...draft, slug: event.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="展示日期" hint="例如 2026.07">
              <input
                value={draft.displayDate}
                onChange={(event) => setDraft({ ...draft, displayDate: event.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="排序">
              <input
                type="number"
                value={draft.sortOrder}
                onChange={(event) => setDraft({ ...draft, sortOrder: Number(event.target.value) || 0 })}
                className={inputClass}
              />
            </Field>
            <ImageURLField
              label="相册封面"
              value={draft.coverUrl}
              onChange={(coverUrl) => setDraft({ ...draft, coverUrl })}
            />
            <Toggle
              checked={draft.visible}
              onChange={(visible) => setDraft({ ...draft, visible })}
              label="公开展示"
            />
            <Field label="相册简介" className="md:col-span-2">
              <textarea
                rows={4}
                value={draft.description}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                className={textareaClass}
              />
            </Field>
          </div>

          <div className="mt-8 border-t border-white/10 pt-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-black text-white">照片列表</h4>
                <p className="mt-1 text-[11px] text-slate-500">
                  支持 RustFS 上传，也可以手动填入旧图片外链。
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      photos: [
                        ...draft.photos,
                        blankPhoto(draft.photos.length),
                      ],
                    })
                  }
                  className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/10 px-3 text-[11px] font-bold text-slate-300"
                >
                  <Link2 size={13} /> 添加外链
                </button>
                <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl bg-indigo-400 px-3 text-[11px] font-black text-slate-950">
                  {uploading ? <LoaderCircle className="animate-spin" size={13} /> : <ImagePlus size={13} />}
                  上传图片
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp,image/avif"
                    className="hidden"
                    disabled={uploading}
                    onChange={(event) => {
                      void addUploadedPhoto(event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />
                </label>
              </div>
            </div>

            <div className="space-y-3">
              {draft.photos.map((photo, index) => (
                <div
                  key={photo.id || index}
                  className="grid gap-3 rounded-2xl border border-white/10 bg-white/[.025] p-3 md:grid-cols-[110px_minmax(0,1fr)_minmax(0,1fr)_auto]"
                >
                  <div className="h-24 overflow-hidden rounded-xl bg-black/30">
                    {photo.url ? (
                      <img src={photo.url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] text-slate-600">
                        暂无图片
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <input
                      value={photo.url}
                      onChange={(event) => updatePhoto(index, { url: event.target.value })}
                      placeholder="图片 URL"
                      className={inputClass}
                    />
                    <input
                      value={photo.alt}
                      onChange={(event) => updatePhoto(index, { alt: event.target.value })}
                      placeholder="替代文本"
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-2">
                    <input
                      value={photo.caption}
                      onChange={(event) => updatePhoto(index, { caption: event.target.value })}
                      placeholder="照片说明"
                      className={inputClass}
                    />
                    <input
                      type="number"
                      value={photo.sortOrder}
                      onChange={(event) => updatePhoto(index, { sortOrder: Number(event.target.value) || 0 })}
                      placeholder="排序"
                      className={inputClass}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        photos: draft.photos.filter((_, photoIndex) => photoIndex !== index),
                      })
                    }
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-rose-300 hover:bg-rose-400/10"
                    title="移除照片记录"
                  >
                    <X size={15} />
                  </button>
                </div>
              ))}
              {draft.photos.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/10 py-12 text-center text-xs text-slate-600">
                  相册中还没有照片
                </div>
              )}
            </div>
          </div>
        </EditorCard>
      ) : (
        <EmptyEditor label="选择或新增一个相册" />
      )}
    </CollectionWorkspace>
  );
}

function CollectionWorkspace({
  title,
  description,
  items,
  selectedID,
  onSelect,
  onCreate,
  children,
}: {
  title: string;
  description: string;
  items: Array<{ id: number; title: string; subtitle: string; visible: boolean }>;
  selectedID?: number;
  onSelect: (id: number) => void;
  onCreate: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="rounded-2xl border border-white/10 bg-slate-950/30 p-3">
        <div className="mb-3 flex items-start justify-between gap-3 px-2 pt-1">
          <div>
            <h3 className="text-base font-black text-white">{title}</h3>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{description}</p>
          </div>
          <button
            type="button"
            onClick={onCreate}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-400 text-slate-950"
            title={`新增${title}`}
          >
            <Plus size={15} />
          </button>
        </div>
        <div className="max-h-[560px] space-y-1 overflow-auto">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                selectedID === item.id
                  ? "border-indigo-300/20 bg-indigo-400/[.09]"
                  : "border-transparent hover:bg-white/[.035]"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    item.visible ? "bg-emerald-400" : "bg-slate-600"
                  }`}
                />
                <span className="truncate text-sm font-bold text-slate-200">{item.title}</span>
              </div>
              <p className="mt-1 truncate pl-4 text-[10px] text-slate-600">{item.subtitle}</p>
            </button>
          ))}
          {items.length === 0 && (
            <div className="py-16 text-center text-xs text-slate-600">暂无数据</div>
          )}
        </div>
      </aside>
      <div>{children}</div>
    </div>
  );
}

function EditorCard({
  title,
  saving,
  onSave,
  onDelete,
  children,
}: {
  title: string;
  saving: boolean;
  onSave: () => void;
  onDelete: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-950/30 p-5 sm:p-6">
      <div className="mb-6 flex items-center justify-between gap-3 border-b border-white/10 pb-4">
        <h3 className="text-lg font-black text-white">{title}</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onDelete}
            disabled={saving}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-300/10 text-rose-300 hover:bg-rose-400/10 disabled:opacity-50"
          >
            <Trash2 size={15} />
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-400 px-4 text-xs font-black text-slate-950 disabled:opacity-50"
          >
            {saving ? <LoaderCircle className="animate-spin" size={14} /> : <Save size={14} />}
            保存
          </button>
        </div>
      </div>
      {children}
    </section>
  );
}

function EmptyEditor({ label }: { label: string }) {
  return (
    <div className="flex min-h-[520px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-slate-950/20 text-sm font-bold text-slate-600">
      {label}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-xs font-black transition ${
        active
          ? "bg-indigo-400 text-slate-950"
          : "text-slate-400 hover:bg-white/[.05] hover:text-white"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

type Notify = React.Dispatch<
  React.SetStateAction<{ tone: "success" | "error"; text: string } | null>
>;

function notifyError(notify: Notify, error: unknown, fallback: string) {
  notify({
    tone: "error",
    text: error instanceof Error ? error.message : fallback,
  });
}

function blankFriend(): FriendDraft {
  return {
    name: "",
    url: "",
    avatarUrl: "",
    description: "",
    themeColor: "rgba(99, 102, 241, .5)",
    sortOrder: 0,
    visible: true,
  };
}

function blankProject(): ProjectDraft {
  return {
    name: "",
    description: "",
    url: "",
    repoUrl: "",
    coverUrl: "",
    icon: "🚀",
    tags: [],
    sortOrder: 0,
    visible: true,
  };
}

function blankAlbum(): AlbumDraft {
  return {
    slug: "",
    name: "",
    description: "",
    coverUrl: "",
    displayDate: "",
    sortOrder: 0,
    visible: true,
    photos: [],
  };
}

function cloneAlbum(album: Album): AlbumDraft {
  return {
    ...album,
    photos: album.photos.map((photo) => ({ ...photo })),
  };
}

function blankPhoto(sortOrder: number): Photo {
  return {
    url: "",
    thumbnailUrl: "",
    alt: "",
    caption: "",
    takenAt: null,
    sortOrder,
  };
}

function splitComma(value: string) {
  return value
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}
