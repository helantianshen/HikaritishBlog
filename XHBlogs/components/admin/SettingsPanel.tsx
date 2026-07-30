"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BadgeCheck,
  LayoutPanelTop,
  LoaderCircle,
  Palette,
  Plus,
  Save,
  UserRound,
  X,
} from "lucide-react";
import { adminAPI } from "@/lib/admin-api";
import type {
  FooterBadge,
  NavItem,
  SiteSettings,
  SocialLink,
} from "@/lib/types";
import {
  Field,
  ImageURLField,
  PanelMessage,
  Toggle,
  inputClass,
  textareaClass,
} from "./AdminFields";

type SettingsTab = "identity" | "appearance" | "navigation" | "features";

const tabs: Array<{
  id: SettingsTab;
  label: string;
  icon: typeof UserRound;
}> = [
  { id: "identity", label: "个人与站点", icon: UserRound },
  { id: "appearance", label: "视觉资源", icon: Palette },
  { id: "navigation", label: "导航与社交", icon: LayoutPanelTop },
  { id: "features", label: "功能与页脚", icon: BadgeCheck },
];

export default function SettingsPanel() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [tab, setTab] = useState<SettingsTab>("identity");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      setSettings(await adminAPI.settings());
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "读取站点设置失败",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = (values: Partial<SiteSettings>) => {
    setSettings((current) => (current ? { ...current, ...values } : current));
  };

  const save = async () => {
    if (!settings) return;
    if (!settings.siteTitle.trim()) {
      setMessage({ tone: "error", text: "站点标题不能为空。" });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const updated = await adminAPI.updateSettings(settings);
      setSettings(updated);
      setMessage({
        tone: "success",
        text: "站点设置已保存；刷新公开页面即可读取新配置。",
      });
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "保存设置失败",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[640px] items-center justify-center text-sm text-slate-500">
        <LoaderCircle className="mr-2 animate-spin" size={16} />
        正在读取站点设置
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="mx-auto max-w-xl p-8">
        {message && <PanelMessage tone={message.tone}>{message.text}</PanelMessage>}
        <button
          type="button"
          onClick={() => void load()}
          className="mt-4 rounded-xl bg-indigo-400 px-4 py-2 text-xs font-black text-slate-950"
        >
          重新读取
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1180px] p-4 pb-28 sm:p-7 sm:pb-28">
      <div className="mb-5 flex flex-col gap-4 rounded-2xl border border-white/10 bg-slate-950/35 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-indigo-300">
            Singleton settings row
          </p>
          <h3 className="mt-1 text-xl font-black text-white">全站可编辑配置</h3>
        </div>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-400 px-5 text-xs font-black text-slate-950 transition hover:bg-indigo-300 disabled:opacity-50"
        >
          {saving ? <LoaderCircle className="animate-spin" size={15} /> : <Save size={15} />}
          保存全部设置
        </button>
      </div>

      {message && (
        <div className="mb-5">
          <PanelMessage tone={message.tone}>{message.text}</PanelMessage>
        </div>
      )}

      <div className="mb-5 flex gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/25 p-2">
        {tabs.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-xs font-black transition ${
                tab === item.id
                  ? "bg-indigo-400 text-slate-950"
                  : "text-slate-400 hover:bg-white/[.05] hover:text-white"
              }`}
            >
              <Icon size={14} />
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === "identity" && (
        <SettingsSection title="个人与站点资料" description="这些字段替代旧 siteConfig 中硬编码的个人信息。">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="站点标题">
              <input
                value={settings.siteTitle}
                onChange={(event) => patch({ siteTitle: event.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="作者名称">
              <input
                value={settings.authorName}
                onChange={(event) => patch({ authorName: event.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="导航主标题">
              <input
                value={settings.navTitle}
                onChange={(event) => patch({ navTitle: event.target.value })}
                className={inputClass}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="导航连接词">
                <input
                  value={settings.navSuffix}
                  onChange={(event) => patch({ navSuffix: event.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="导航后缀">
                <input
                  value={settings.navAfter}
                  onChange={(event) => patch({ navAfter: event.target.value })}
                  className={inputClass}
                />
              </Field>
            </div>
            <Field label="个人简介" className="md:col-span-2">
              <textarea
                rows={4}
                value={settings.bio}
                onChange={(event) => patch({ bio: event.target.value })}
                className={textareaClass}
              />
            </Field>
            <ImageURLField
              label="头像"
              value={settings.avatarUrl}
              onChange={(avatarUrl) => patch({ avatarUrl })}
            />
            <ImageURLField
              label="站点图标"
              value={settings.faviconUrl}
              onChange={(faviconUrl) => patch({ faviconUrl })}
            />
            <Field label="建站日期">
              <input
                type="date"
                value={settings.buildDate ? settings.buildDate.slice(0, 10) : ""}
                onChange={(event) =>
                  patch({
                    buildDate: event.target.value
                      ? new Date(`${event.target.value}T00:00:00Z`).toISOString()
                      : null,
                  })
                }
                className={inputClass}
              />
            </Field>
            <Field label="杂谈页标题">
              <input
                value={settings.chatterTitle}
                onChange={(event) => patch({ chatterTitle: event.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="杂谈页说明" className="md:col-span-2">
              <input
                value={settings.chatterDescription}
                onChange={(event) => patch({ chatterDescription: event.target.value })}
                className={inputClass}
              />
            </Field>
          </div>
        </SettingsSection>
      )}

      {tab === "appearance" && (
        <SettingsSection title="视觉资源" description="旧图片外链可以继续保留；上传按钮只用于新增 RustFS 图片。">
          <div className="space-y-6">
            <Toggle
              checked={settings.useGradient}
              onChange={(useGradient) => patch({ useGradient })}
              label="使用渐变背景"
              description="关闭后使用下方背景图片轮播。"
            />
            <Field label="渐变颜色" hint="使用逗号分隔 CSS 颜色值">
              <input
                value={settings.themeColors.join(", ")}
                onChange={(event) => patch({ themeColors: splitComma(event.target.value) })}
                className={inputClass}
              />
            </Field>
            <StringListEditor
              label="背景图片"
              values={settings.backgroundImages}
              onChange={(backgroundImages) => patch({ backgroundImages })}
              imageMode
            />
            <div className="grid gap-5 md:grid-cols-2">
              <ImageURLField
                label="默认文章封面"
                value={settings.defaultPostCoverUrl}
                onChange={(defaultPostCoverUrl) => patch({ defaultPostCoverUrl })}
              />
              <ImageURLField
                label="照片墙默认封面"
                value={settings.photoWallCoverUrl}
                onChange={(photoWallCoverUrl) => patch({ photoWallCoverUrl })}
              />
            </div>
          </div>
        </SettingsSection>
      )}

      {tab === "navigation" && (
        <div className="space-y-5">
          <SettingsSection title="导航项目" description="按当前顺序展示在桌面端和移动端导航中。">
            <NavEditor
              values={settings.navItems}
              onChange={(navItems) => patch({ navItems })}
            />
          </SettingsSection>
          <SettingsSection title="社交链接" description="图标标识建议填写 github、gitee、google、email、qq 或 wechat。">
            <SocialEditor
              values={settings.socialLinks}
              onChange={(socialLinks) => patch({ socialLinks })}
            />
          </SettingsSection>
        </div>
      )}

      {tab === "features" && (
        <div className="space-y-5">
          <SettingsSection title="功能开关" description="关闭后对应前台组件不会发起外部请求。">
            <div className="grid gap-3 md:grid-cols-2">
              <Toggle
                checked={settings.enableMusicPlayer}
                onChange={(enableMusicPlayer) => patch({ enableMusicPlayer })}
                label="音乐播放器"
              />
              <Toggle
                checked={settings.enableDanmaku}
                onChange={(enableDanmaku) => patch({ enableDanmaku })}
                label="背景弹幕"
              />
              <Toggle
                checked={settings.enableLevelSystem}
                onChange={(enableLevelSystem) => patch({ enableLevelSystem })}
                label="灵境等级系统"
              />
              <Toggle
                checked={settings.publicComment.enabled}
                onChange={(enabled) =>
                  patch({
                    publicComment: { ...settings.publicComment, enabled },
                  })
                }
                label="Gitalk 评论"
              />
              <Toggle
                checked={settings.assistant.enabled}
                onChange={(enabled) =>
                  patch({ assistant: { ...settings.assistant, enabled } })
                }
                label="AI 猫助手"
                description="API Key 只配置在 Next.js 服务端环境变量中。"
              />
            </div>
          </SettingsSection>

          <SettingsSection title="AI 猫助手" description="这里只保存非敏感行为配置；GEMINI_API_KEY 不会写入数据库。">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Gemini 模型 ID">
                <input
                  value={settings.assistant.modelId}
                  onChange={(event) =>
                    patch({
                      assistant: {
                        ...settings.assistant,
                        modelId: event.target.value,
                      },
                    })
                  }
                  className={inputClass}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="最大输出 Token">
                  <input
                    type="number"
                    min={1}
                    max={8192}
                    value={settings.assistant.maxOutputTokens}
                    onChange={(event) =>
                      patch({
                        assistant: {
                          ...settings.assistant,
                          maxOutputTokens: Number(event.target.value),
                        },
                      })
                    }
                    className={inputClass}
                  />
                </Field>
                <Field label="温度">
                  <input
                    type="number"
                    min={0}
                    max={2}
                    step={0.05}
                    value={settings.assistant.temperature}
                    onChange={(event) =>
                      patch({
                        assistant: {
                          ...settings.assistant,
                          temperature: Number(event.target.value),
                        },
                      })
                    }
                    className={inputClass}
                  />
                </Field>
              </div>
              <Field label="系统提示词" className="md:col-span-2">
                <textarea
                  rows={8}
                  value={settings.assistant.systemPrompt}
                  onChange={(event) =>
                    patch({
                      assistant: {
                        ...settings.assistant,
                        systemPrompt: event.target.value,
                      },
                    })
                  }
                  className={textareaClass}
                />
              </Field>
            </div>
          </SettingsSection>

          <SettingsSection title="音乐与弹幕">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="网易云歌曲 ID" hint="使用逗号分隔">
                <input
                  value={settings.musicIds.join(", ")}
                  onChange={(event) => patch({ musicIds: splitComma(event.target.value) })}
                  className={inputClass}
                />
              </Field>
              <Field label="弹幕内容" hint="每行一条">
                <textarea
                  rows={6}
                  value={settings.danmakuList.join("\n")}
                  onChange={(event) => patch({ danmakuList: splitLines(event.target.value) })}
                  className={textareaClass}
                />
              </Field>
            </div>
          </SettingsSection>

          <SettingsSection title="评论公开配置" description="GitHub Client Secret 不存数据库，单独使用服务端环境变量。">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="GitHub Owner">
                <input
                  value={settings.publicComment.owner}
                  onChange={(event) =>
                    patch({
                      publicComment: {
                        ...settings.publicComment,
                        owner: event.target.value,
                      },
                    })
                  }
                  className={inputClass}
                />
              </Field>
              <Field label="Issue Repo">
                <input
                  value={settings.publicComment.repo}
                  onChange={(event) =>
                    patch({
                      publicComment: {
                        ...settings.publicComment,
                        repo: event.target.value,
                      },
                    })
                  }
                  className={inputClass}
                />
              </Field>
              <Field label="OAuth Client ID">
                <input
                  value={settings.publicComment.clientId}
                  onChange={(event) =>
                    patch({
                      publicComment: {
                        ...settings.publicComment,
                        clientId: event.target.value,
                      },
                    })
                  }
                  className={inputClass}
                />
              </Field>
              <Field label="管理员账号" hint="使用逗号分隔">
                <input
                  value={settings.publicComment.admins.join(", ")}
                  onChange={(event) =>
                    patch({
                      publicComment: {
                        ...settings.publicComment,
                        admins: splitComma(event.target.value),
                      },
                    })
                  }
                  className={inputClass}
                />
              </Field>
            </div>
          </SettingsSection>

          <SettingsSection title="页脚与友链">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="备案号">
                <input
                  value={settings.icpNumber}
                  onChange={(event) => patch({ icpNumber: event.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="备案链接">
                <input
                  value={settings.icpLink}
                  onChange={(event) => patch({ icpLink: event.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="友链申请格式" className="md:col-span-2">
                <textarea
                  rows={7}
                  value={settings.friendApplyFormat}
                  onChange={(event) => patch({ friendApplyFormat: event.target.value })}
                  className={textareaClass}
                />
              </Field>
            </div>
            <div className="mt-6">
              <FooterBadgeEditor
                values={settings.footerBadges}
                onChange={(footerBadges) => patch({ footerBadges })}
              />
            </div>
          </SettingsSection>
        </div>
      )}
    </div>
  );
}

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-950/30 p-5 sm:p-6">
      <div className="mb-6">
        <h3 className="text-lg font-black text-white">{title}</h3>
        {description && <p className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function StringListEditor({
  label,
  values,
  onChange,
  imageMode = false,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  imageMode?: boolean;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
          {label}
        </span>
        <button
          type="button"
          onClick={() => onChange([...values, ""])}
          className="inline-flex items-center gap-1 rounded-lg bg-white/[.06] px-2.5 py-1.5 text-[10px] font-bold text-slate-300"
        >
          <Plus size={12} /> 添加
        </button>
      </div>
      <div className="space-y-3">
        {values.map((value, index) => (
          <div key={index} className="rounded-xl border border-white/10 bg-white/[.025] p-3">
            {imageMode ? (
              <ImageURLField
                label={`图片 ${index + 1}`}
                value={value}
                onChange={(nextValue) =>
                  onChange(values.map((item, itemIndex) => itemIndex === index ? nextValue : item))
                }
              />
            ) : (
              <input
                value={value}
                onChange={(event) =>
                  onChange(values.map((item, itemIndex) => itemIndex === index ? event.target.value : item))
                }
                className={inputClass}
              />
            )}
            <button
              type="button"
              onClick={() => onChange(values.filter((_, itemIndex) => itemIndex !== index))}
              className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-rose-300"
            >
              <X size={11} /> 移除
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function NavEditor({
  values,
  onChange,
}: {
  values: NavItem[];
  onChange: (values: NavItem[]) => void;
}) {
  return (
    <RowEditor
      onAdd={() => onChange([...values, { label: "", href: "/" }])}
      empty={values.length === 0}
    >
      {values.map((item, index) => (
        <EditableRow key={index} onRemove={() => onChange(values.filter((_, i) => i !== index))}>
          <input
            value={item.label}
            onChange={(event) =>
              onChange(values.map((value, i) => i === index ? { ...value, label: event.target.value } : value))
            }
            placeholder="名称"
            className={inputClass}
          />
          <input
            value={item.href}
            onChange={(event) =>
              onChange(values.map((value, i) => i === index ? { ...value, href: event.target.value } : value))
            }
            placeholder="/path"
            className={inputClass}
          />
        </EditableRow>
      ))}
    </RowEditor>
  );
}

function SocialEditor({
  values,
  onChange,
}: {
  values: SocialLink[];
  onChange: (values: SocialLink[]) => void;
}) {
  return (
    <RowEditor
      onAdd={() => onChange([...values, { label: "", url: "", icon: "" }])}
      empty={values.length === 0}
    >
      {values.map((item, index) => (
        <EditableRow key={index} onRemove={() => onChange(values.filter((_, i) => i !== index))} columns={3}>
          <input
            value={item.label}
            onChange={(event) =>
              onChange(values.map((value, i) => i === index ? { ...value, label: event.target.value } : value))
            }
            placeholder="名称"
            className={inputClass}
          />
          <input
            value={item.icon}
            onChange={(event) =>
              onChange(values.map((value, i) => i === index ? { ...value, icon: event.target.value } : value))
            }
            placeholder="图标标识"
            className={inputClass}
          />
          <input
            value={item.url}
            onChange={(event) =>
              onChange(values.map((value, i) => i === index ? { ...value, url: event.target.value } : value))
            }
            placeholder="链接或联系方式"
            className={inputClass}
          />
        </EditableRow>
      ))}
    </RowEditor>
  );
}

function FooterBadgeEditor({
  values,
  onChange,
}: {
  values: FooterBadge[];
  onChange: (values: FooterBadge[]) => void;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
          页脚徽章
        </span>
        <button
          type="button"
          onClick={() => onChange([...values, { label: "", url: "", image: "" }])}
          className="inline-flex items-center gap-1 rounded-lg bg-white/[.06] px-2.5 py-1.5 text-[10px] font-bold text-slate-300"
        >
          <Plus size={12} /> 添加
        </button>
      </div>
      <div className="space-y-3">
        {values.map((item, index) => (
          <div key={index} className="grid gap-3 rounded-xl border border-white/10 bg-white/[.025] p-3 md:grid-cols-3">
            <input
              value={item.label}
              onChange={(event) =>
                onChange(values.map((value, i) => i === index ? { ...value, label: event.target.value } : value))
              }
              placeholder="名称"
              className={inputClass}
            />
            <input
              value={item.url}
              onChange={(event) =>
                onChange(values.map((value, i) => i === index ? { ...value, url: event.target.value } : value))
              }
              placeholder="跳转链接"
              className={inputClass}
            />
            <input
              value={item.image}
              onChange={(event) =>
                onChange(values.map((value, i) => i === index ? { ...value, image: event.target.value } : value))
              }
              placeholder="徽章图片 URL"
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => onChange(values.filter((_, i) => i !== index))}
              className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-300"
            >
              <X size={11} /> 移除
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function RowEditor({
  children,
  onAdd,
  empty,
}: {
  children: React.ReactNode;
  onAdd: () => void;
  empty: boolean;
}) {
  return (
    <div className="space-y-3">
      {children}
      {empty && (
        <div className="rounded-xl border border-dashed border-white/10 py-8 text-center text-xs text-slate-600">
          暂无项目
        </div>
      )}
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-3 text-[11px] font-bold text-slate-300"
      >
        <Plus size={13} /> 添加一项
      </button>
    </div>
  );
}

function EditableRow({
  children,
  onRemove,
  columns = 2,
}: {
  children: React.ReactNode;
  onRemove: () => void;
  columns?: number;
}) {
  return (
    <div
      className={`grid gap-3 rounded-xl border border-white/10 bg-white/[.025] p-3 ${
        columns === 3 ? "md:grid-cols-[1fr_1fr_2fr_auto]" : "md:grid-cols-[1fr_2fr_auto]"
      }`}
    >
      {children}
      <button
        type="button"
        onClick={onRemove}
        className="flex h-11 w-11 items-center justify-center rounded-xl text-rose-300 hover:bg-rose-400/10"
      >
        <X size={15} />
      </button>
    </div>
  );
}

function splitComma(value: string) {
  return value
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}
