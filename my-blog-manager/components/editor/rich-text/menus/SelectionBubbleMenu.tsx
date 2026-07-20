"use client";

import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Braces,
  Columns3,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link2,
  Merge,
  Rows3,
  Split,
  Strikethrough,
  Trash2,
  Underline as UnderlineIcon,
} from "lucide-react";
import { BLOCK_COMMANDS } from "../commands/block-commands";
import { clampMenuPosition, useAnchoredEditorMenu } from "../hooks/use-anchored-menu";

interface SelectionBubbleMenuProps {
  editor: Editor;
}

interface BubbleButtonProps {
  label: string;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function BubbleButton({
  label,
  active,
  danger,
  disabled,
  onClick,
  children,
}: BubbleButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-30 ${
        danger
          ? "text-red-500 hover:bg-red-500/10"
          : active
            ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/30"
            : "text-slate-500 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-0.5 h-5 w-px shrink-0 bg-slate-300/60 dark:bg-white/10" />;
}

export default function SelectionBubbleMenu({ editor }: SelectionBubbleMenuProps) {
  const position = useAnchoredEditorMenu(editor, () => {
    const { selection } = editor.state;
    if (selection.empty || selection instanceof NodeSelection) return null;
    const start = editor.view.coordsAtPos(selection.from);
    const end = editor.view.coordsAtPos(selection.to);
    const width = Math.min(700, window.innerWidth - 16);
    return clampMenuPosition(
      {
        left: (start.left + end.right) / 2 - width / 2,
        top: Math.min(start.top, end.top) - 48,
      },
      { width, height: 40 },
      { width: window.innerWidth, height: window.innerHeight },
    );
  });

  if (!position || typeof document === "undefined") return null;

  const toggleLink = () => {
    const previous = String(editor.getAttributes("link").href || "");
    const value = window.prompt("请输入跳转链接 (URL):", previous);
    if (value === null) return;
    if (!value.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    const href = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  };

  const inTable = editor.isActive("table");
  const canMerge = inTable && editor.can().mergeCells();
  const canSplit = inTable && editor.can().splitCell();

  return createPortal(
    <div
      className="fixed z-[115] flex max-w-[calc(100vw-16px)] items-center gap-0.5 overflow-x-auto rounded-xl border border-white/50 bg-white/90 px-2 py-1.5 shadow-2xl backdrop-blur-2xl motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 dark:border-white/10 dark:bg-slate-900/90"
      style={position}
      onMouseDown={(event) => event.preventDefault()}
    >
      {inTable && (
        <>
          <BubbleButton label="添加行" onClick={() => editor.chain().focus().addRowAfter().run()}><Rows3 size={15} /></BubbleButton>
          <BubbleButton label="添加列" onClick={() => editor.chain().focus().addColumnAfter().run()}><Columns3 size={15} /></BubbleButton>
          <BubbleButton label="合并单元格" disabled={!canMerge} onClick={() => editor.chain().focus().mergeCells().run()}><Merge size={15} /></BubbleButton>
          <BubbleButton label="拆分单元格" disabled={!canSplit} onClick={() => editor.chain().focus().splitCell().run()}><Split size={15} /></BubbleButton>
          <BubbleButton label="切换表头" onClick={() => editor.chain().focus().toggleHeaderRow().run()}><Braces size={15} /></BubbleButton>
          <label className="relative flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-white/10" title="单元格背景色">
            <span className="h-4 w-4 rounded border border-slate-400 bg-indigo-100" />
            <input
              type="color"
              aria-label="单元格背景色"
              className="absolute inset-0 cursor-pointer opacity-0"
              onChange={(event) => editor.chain().focus().setCellAttribute("backgroundColor", event.target.value).run()}
            />
          </label>
          <BubbleButton label="删除行" danger onClick={() => editor.chain().focus().deleteRow().run()}><Trash2 size={15} /></BubbleButton>
          <BubbleButton label="删除列" danger onClick={() => editor.chain().focus().deleteColumn().run()}><Trash2 size={15} /></BubbleButton>
          <Divider />
        </>
      )}

      <select
        aria-label="块类型"
        value={BLOCK_COMMANDS.find((command) => command.isActive(editor))?.id || "paragraph"}
        onChange={(event) => BLOCK_COMMANDS.find((command) => command.id === event.target.value)?.run(editor)}
        className="h-8 shrink-0 rounded-lg bg-slate-100 px-2 text-[10px] font-black text-slate-700 outline-none dark:bg-white/10 dark:text-slate-200"
      >
        {BLOCK_COMMANDS.filter((command) => !["table", "image", "horizontalRule", "clearFormatting"].includes(command.id))
          .map((command) => <option key={command.id} value={command.id}>{command.label}</option>)}
      </select>
      <Divider />
      <BubbleButton label="左对齐" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}><AlignLeft size={15} /></BubbleButton>
      <BubbleButton label="居中" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}><AlignCenter size={15} /></BubbleButton>
      <BubbleButton label="右对齐" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}><AlignRight size={15} /></BubbleButton>
      <BubbleButton label="减少缩进" disabled={!editor.can().outdent()} onClick={() => editor.chain().focus().outdent().run()}><IndentDecrease size={15} /></BubbleButton>
      <BubbleButton label="增加缩进" disabled={!editor.can().indent()} onClick={() => editor.chain().focus().indent().run()}><IndentIncrease size={15} /></BubbleButton>
      <Divider />
      <BubbleButton label="粗体" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={15} /></BubbleButton>
      <BubbleButton label="斜体" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={15} /></BubbleButton>
      <BubbleButton label="删除线" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough size={15} /></BubbleButton>
      <BubbleButton label="下划线" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon size={15} /></BubbleButton>
      <BubbleButton label="行内代码" active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()}><Braces size={15} /></BubbleButton>
      <BubbleButton label="链接" active={editor.isActive("link")} onClick={toggleLink}><Link2 size={15} /></BubbleButton>
      <label className="relative flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg hover:bg-slate-200/70 dark:hover:bg-white/10" title="文字颜色">
        <span className="h-4 w-4 rounded-full border border-white shadow" style={{ backgroundColor: String(editor.getAttributes("textStyle").color || "#6366f1") }} />
        <input type="color" aria-label="文字颜色" className="absolute inset-0 cursor-pointer opacity-0" onChange={(event) => editor.chain().focus().setColor(event.target.value).run()} />
      </label>
      <label className="relative flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg hover:bg-slate-200/70 dark:hover:bg-white/10" title="高亮颜色">
        <span className="h-4 w-4 rounded border border-white bg-yellow-300 shadow" />
        <input type="color" aria-label="高亮颜色" className="absolute inset-0 cursor-pointer opacity-0" onChange={(event) => editor.chain().focus().setHighlight({ color: event.target.value }).run()} />
      </label>
    </div>,
    document.body,
  );
}
