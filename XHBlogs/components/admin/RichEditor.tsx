"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import TextAlign from "@tiptap/extension-text-align";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code2,
  Heading1,
  Heading2,
  Highlighter,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  ListTodo,
  LoaderCircle,
  Quote,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";
import { adminAPI } from "@/lib/admin-api";

export default function RichEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadedValueRef = useRef(value);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        link: false,
        underline: false,
      }),
      TextStyle,
      Color,
      Underline,
      Highlight.configure({ multicolor: true }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
      Image.configure({
        allowBase64: false,
        HTMLAttributes: {
          loading: "lazy",
        },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({
        placeholder: "从这里开始写作。支持粘贴文本，也可以上传 RustFS 图片。",
      }),
    ],
    content: value || "<p></p>",
    onUpdate: ({ editor: liveEditor }) => {
      const html = liveEditor.getHTML();
      loadedValueRef.current = html;
      onChange(html);
    },
  });

  useEffect(() => {
    if (!editor || value === loadedValueRef.current) return;
    loadedValueRef.current = value;
    editor.commands.setContent(value || "<p></p>", { emitUpdate: false });
  }, [editor, value]);

  if (!editor) {
    return (
      <div className="flex min-h-[480px] items-center justify-center text-sm text-slate-500">
        <LoaderCircle className="mr-2 animate-spin" size={16} />
        正在初始化编辑器
      </div>
    );
  }

  const setLink = () => {
    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const previous = editor.getAttributes("link").href || "";
    const input = window.prompt("输入链接地址", previous);
    if (input === null) return;
    const href = input.trim();
    if (!href) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const normalized = /^(https?:\/\/|mailto:)/i.test(href)
      ? href
      : `https://${href}`;
    editor.chain().focus().extendMarkRange("link").setLink({ href: normalized }).run();
  };

  const uploadImage = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const asset = await adminAPI.uploadImage(file);
      editor.chain().focus().setImage({ src: asset.publicUrl, alt: file.name }).run();
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "图片上传失败");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="admin-editor overflow-hidden rounded-2xl border border-white/10 bg-slate-950/45">
      <div className="flex flex-wrap items-center gap-1 border-b border-white/10 bg-slate-950/65 p-2">
        <ToolButton label="撤销" onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 size={15} />
        </ToolButton>
        <ToolButton label="重做" onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 size={15} />
        </ToolButton>
        <Divider />
        <ToolButton
          label="一级标题"
          active={editor.isActive("heading", { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 size={15} />
        </ToolButton>
        <ToolButton
          label="二级标题"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 size={15} />
        </ToolButton>
        <Divider />
        <ToolButton
          label="加粗"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold size={15} />
        </ToolButton>
        <ToolButton
          label="斜体"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic size={15} />
        </ToolButton>
        <ToolButton
          label="下划线"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon size={15} />
        </ToolButton>
        <ToolButton
          label="删除线"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough size={15} />
        </ToolButton>
        <ToolButton
          label="高亮"
          active={editor.isActive("highlight")}
          onClick={() =>
            editor.chain().focus().toggleHighlight({ color: "#fef08a" }).run()
          }
        >
          <Highlighter size={15} />
        </ToolButton>
        <ToolButton label="链接" active={editor.isActive("link")} onClick={setLink}>
          <Link2 size={15} />
        </ToolButton>
        <Divider />
        <ToolButton
          label="无序列表"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List size={15} />
        </ToolButton>
        <ToolButton
          label="有序列表"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered size={15} />
        </ToolButton>
        <ToolButton
          label="任务列表"
          active={editor.isActive("taskList")}
          onClick={() => editor.chain().focus().toggleTaskList().run()}
        >
          <ListTodo size={15} />
        </ToolButton>
        <ToolButton
          label="引用"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote size={15} />
        </ToolButton>
        <ToolButton
          label="代码块"
          active={editor.isActive("codeBlock")}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          <Code2 size={15} />
        </ToolButton>
        <Divider />
        <ToolButton
          label="左对齐"
          active={editor.isActive({ textAlign: "left" })}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        >
          <AlignLeft size={15} />
        </ToolButton>
        <ToolButton
          label="居中"
          active={editor.isActive({ textAlign: "center" })}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        >
          <AlignCenter size={15} />
        </ToolButton>
        <ToolButton
          label="右对齐"
          active={editor.isActive({ textAlign: "right" })}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
        >
          <AlignRight size={15} />
        </ToolButton>
        <Divider />
        <ToolButton
          label="清除格式"
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
        >
          <RemoveFormatting size={15} />
        </ToolButton>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="ml-auto inline-flex h-9 items-center gap-2 rounded-lg bg-indigo-400 px-3 text-[11px] font-black text-slate-950 transition hover:bg-indigo-300 disabled:opacity-50"
        >
          {uploading ? (
            <LoaderCircle className="animate-spin" size={14} />
          ) : (
            <ImagePlus size={14} />
          )}
          插入图片
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,image/avif"
          className="hidden"
          onChange={(event) => void uploadImage(event.target.files?.[0])}
        />
      </div>
      {uploadError && (
        <div className="border-b border-rose-300/10 bg-rose-400/[.06] px-4 py-2 text-xs text-rose-200">
          {uploadError}
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolButton({
  label,
  active = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`flex h-9 w-9 items-center justify-center rounded-lg transition ${
        active
          ? "bg-indigo-400 text-slate-950"
          : "text-slate-400 hover:bg-white/[.07] hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-white/10" />;
}
