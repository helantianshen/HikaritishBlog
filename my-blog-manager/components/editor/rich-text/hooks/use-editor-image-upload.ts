"use client";

import { useCallback } from "react";
import type { Editor } from "@tiptap/core";
import { useToast } from "../../../ToastProvider";
import { siteConfig } from "../../../../siteConfig";

interface BackendConfig {
  api_port: number;
}

interface UploadResponse {
  success: boolean;
  url?: string;
  message?: string;
}

export function useEditorImageUpload() {
  const { showToast } = useToast();

  const uploadAndInsert = useCallback(async (editor: Editor, file: File) => {
    if (!file.type.startsWith("image/")) return;
    const picUrl = siteConfig.picBedUrl || "https://pic.dusays.com";
    const picToken = siteConfig.picBedToken;
    if (!picToken) {
      showToast("未配置图床 Token！", "error");
      return;
    }

    const insertPosition = editor.state.selection.from;
    showToast("正在上传图片...", "info");
    try {
      const configResponse = await fetch(`/backend_config.json?t=${Date.now()}`);
      const config = await configResponse.json() as BackendConfig;
      const form = new FormData();
      form.append("file", file);
      form.append("url", picUrl);
      form.append("token", picToken);
      const response = await fetch(`http://127.0.0.1:${config.api_port}/api/picbed/upload`, {
        method: "POST",
        body: form,
      });
      const result = await response.json() as UploadResponse;
      if (!result.success || !result.url) {
        throw new Error(result.message || "上传失败");
      }
      const position = Math.min(insertPosition, editor.state.doc.content.size);
      editor.chain().focus().setTextSelection(position).setImage({ src: result.url }).run();
      showToast("图片已插入正文", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "上传失败";
      showToast(`图片上传失败: ${message}`, "error");
    }
  }, [showToast]);

  const pickAndInsert = useCallback((editor: Editor) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) void uploadAndInsert(editor, file);
    };
    input.click();
  }, [uploadAndInsert]);

  return { pickAndInsert, uploadAndInsert };
}
