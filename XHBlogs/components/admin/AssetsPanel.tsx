"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  Clipboard,
  ImagePlus,
  LoaderCircle,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { adminAPI } from "@/lib/admin-api";
import type { Asset } from "@/lib/types";
import { PanelMessage } from "./AdminFields";

export default function AssetsPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [copiedID, setCopiedID] = useState<number | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminAPI.assets();
      setItems(result.items);
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "读取图片资源失败",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setMessage(null);
    try {
      for (const file of Array.from(files)) {
        await adminAPI.uploadImage(file);
      }
      await load();
      setMessage({ tone: "success", text: `已上传 ${files.length} 张图片到 RustFS。` });
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "图片上传失败",
      });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const copy = async (asset: Asset) => {
    await navigator.clipboard.writeText(asset.publicUrl);
    setCopiedID(asset.id);
    window.setTimeout(() => setCopiedID(null), 1500);
  };

  const remove = async (asset: Asset) => {
    if (!window.confirm(`确认删除 RustFS 图片「${asset.originalName || asset.objectKey}」？该操作不可恢复。`)) return;
    try {
      await adminAPI.deleteAsset(asset.id);
      await load();
      setMessage({ tone: "success", text: "图片对象与资源记录已删除。" });
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "删除图片失败",
      });
    }
  };

  return (
    <div className="mx-auto max-w-[1260px] p-4 pb-28 sm:p-7 sm:pb-28">
      <div className="mb-5 flex flex-col gap-4 rounded-2xl border border-white/10 bg-slate-950/35 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-indigo-300">
            RustFS object library
          </p>
          <h3 className="mt-1 text-xl font-black text-white">光影仓库</h3>
          <p className="mt-1 text-xs text-slate-500">
            这里仅显示通过新后台上传并完成校验的图片；旧外链不会被复制或删除。
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 text-slate-400 hover:bg-white/[.05] hover:text-white"
            title="刷新"
          >
            <RefreshCw size={16} />
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-indigo-400 px-5 text-xs font-black text-slate-950 disabled:opacity-50"
          >
            {uploading ? <LoaderCircle className="animate-spin" size={15} /> : <ImagePlus size={15} />}
            上传图片
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/gif,image/webp,image/avif"
            className="hidden"
            onChange={(event) => void upload(event.target.files)}
          />
        </div>
      </div>

      {message && (
        <div className="mb-5">
          <PanelMessage tone={message.tone}>{message.text}</PanelMessage>
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[500px] items-center justify-center text-sm text-slate-500">
          <LoaderCircle className="mr-2 animate-spin" size={16} />
          正在读取资源
        </div>
      ) : items.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex min-h-[430px] w-full flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-slate-950/20 text-slate-600 transition hover:border-indigo-300/20 hover:text-indigo-300"
        >
          <ImagePlus size={34} />
          <span className="mt-4 text-sm font-black">上传第一张 RustFS 图片</span>
          <span className="mt-1 text-xs">JPEG、PNG、GIF、WebP 或 AVIF</span>
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {items.map((asset) => (
            <article
              key={asset.id}
              className="group overflow-hidden rounded-2xl border border-white/10 bg-slate-950/35"
            >
              <div className="relative aspect-square overflow-hidden bg-black/30">
                <img
                  src={asset.publicUrl}
                  alt={asset.originalName}
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-x-0 bottom-0 flex translate-y-full justify-end gap-1 bg-gradient-to-t from-black/90 to-transparent p-3 pt-10 transition group-hover:translate-y-0">
                  <button
                    type="button"
                    onClick={() => void copy(asset)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-white backdrop-blur"
                    title="复制 URL"
                  >
                    {copiedID === asset.id ? <Check size={15} /> : <Clipboard size={15} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(asset)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/20 text-rose-200 backdrop-blur"
                    title="删除图片"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <div className="p-3">
                <p className="truncate text-xs font-bold text-slate-300">
                  {asset.originalName || asset.objectKey.split("/").at(-1)}
                </p>
                <p className="mt-1 text-[10px] text-slate-600">
                  {formatBytes(asset.sizeBytes)}
                  {asset.width > 0 && asset.height > 0
                    ? ` · ${asset.width}×${asset.height}`
                    : ""}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}
