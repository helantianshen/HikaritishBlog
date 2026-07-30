"use client";

import { useRef, useState } from "react";
import { ImagePlus, LoaderCircle, X } from "lucide-react";
import { adminAPI } from "@/lib/admin-api";

export function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
        {label}
      </span>
      {children}
      {hint && <span className="mt-2 block text-[11px] text-slate-600">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "h-11 w-full rounded-xl border border-white/10 bg-white/[.045] px-3.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-indigo-400/50 focus:bg-white/[.07] focus:ring-4 focus:ring-indigo-400/10";

export const textareaClass =
  "w-full rounded-xl border border-white/10 bg-white/[.045] px-3.5 py-3 text-sm leading-relaxed text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-indigo-400/50 focus:bg-white/[.07] focus:ring-4 focus:ring-indigo-400/10";

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[.035] px-4 py-3 text-left"
    >
      <span>
        <span className="block text-sm font-bold text-slate-200">{label}</span>
        {description && (
          <span className="mt-0.5 block text-[11px] text-slate-500">
            {description}
          </span>
        )}
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked ? "bg-indigo-400" : "bg-slate-700"
        }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </span>
    </button>
  );
}

export function ImageURLField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const upload = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const asset = await adminAPI.uploadImage(file);
      onChange(asset.publicUrl);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "图片上传失败");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <Field label={label} hint={hint}>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="https://... 或上传到 RustFS"
          className={inputClass}
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 text-slate-500 hover:bg-white/[.05] hover:text-white"
            title="清空"
          >
            <X size={16} />
          </button>
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-indigo-400 px-3.5 text-xs font-black text-slate-950 disabled:opacity-50"
        >
          {uploading ? <LoaderCircle className="animate-spin" size={15} /> : <ImagePlus size={15} />}
          上传
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,image/avif"
          className="hidden"
          onChange={(event) => void upload(event.target.files?.[0])}
        />
      </div>
      {value && (
        <div className="mt-3 h-28 overflow-hidden rounded-xl border border-white/10 bg-black/20">
          <img src={value} alt="" className="h-full w-full object-cover" />
        </div>
      )}
      {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}
    </Field>
  );
}

export function PanelMessage({
  tone = "info",
  children,
}: {
  tone?: "info" | "success" | "error";
  children: React.ReactNode;
}) {
  const classes = {
    info: "border-indigo-300/15 bg-indigo-400/[.07] text-indigo-200",
    success: "border-emerald-300/15 bg-emerald-400/[.07] text-emerald-200",
    error: "border-rose-300/15 bg-rose-400/[.07] text-rose-200",
  };
  return (
    <div className={`rounded-xl border px-4 py-3 text-xs font-medium ${classes[tone]}`}>
      {children}
    </div>
  );
}
