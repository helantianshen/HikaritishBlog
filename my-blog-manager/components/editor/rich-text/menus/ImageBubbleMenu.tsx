"use client";

import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import { AlignCenter, AlignLeft, AlignRight, Trash2 } from "lucide-react";
import { clampMenuPosition, useAnchoredEditorMenu } from "../hooks/use-anchored-menu";

interface ImageBubbleMenuProps {
  editor: Editor;
}

export default function ImageBubbleMenu({ editor }: ImageBubbleMenuProps) {
  const position = useAnchoredEditorMenu(editor, () => {
    const { selection } = editor.state;
    if (!(selection instanceof NodeSelection) || selection.node.type.name !== "image") return null;
    const dom = editor.view.nodeDOM(selection.from);
    if (!(dom instanceof HTMLElement)) return null;
    const rect = dom.getBoundingClientRect();
    return clampMenuPosition(
      { left: rect.left + rect.width / 2 - 82, top: rect.top - 48 },
      { width: 164, height: 40 },
      { width: window.innerWidth, height: window.innerHeight },
    );
  });

  if (!position || typeof document === "undefined") return null;

  const actions = [
    { label: "左对齐", icon: AlignLeft, value: "left" },
    { label: "居中", icon: AlignCenter, value: "center" },
    { label: "右对齐", icon: AlignRight, value: "right" },
  ] as const;

  return createPortal(
    <div
      className="fixed z-[116] flex items-center gap-1 rounded-xl border border-white/50 bg-white/90 p-1.5 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/90"
      style={position}
      onMouseDown={(event) => event.preventDefault()}
    >
      {actions.map(({ label, icon: Icon, value }) => (
        <button
          key={value}
          type="button"
          title={label}
          aria-label={label}
          onClick={() => editor.chain().focus().updateAttributes("image", { alignment: value }).run()}
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${
            editor.getAttributes("image").alignment === value
              ? "bg-indigo-500 text-white"
              : "text-slate-500 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-white/10"
          }`}
        >
          <Icon size={15} />
        </button>
      ))}
      <span className="h-5 w-px bg-slate-300/60 dark:bg-white/10" />
      <button
        type="button"
        title="删除图片"
        aria-label="删除图片"
        onClick={() => editor.chain().focus().deleteSelection().run()}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 hover:bg-red-500/10"
      >
        <Trash2 size={15} />
      </button>
    </div>,
    document.body,
  );
}
