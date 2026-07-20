"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/core";
import { Hash, RotateCcw } from "lucide-react";
import { clampMenuPosition, useAnchoredEditorMenu } from "../hooks/use-anchored-menu";

interface OrderedListInfo {
  position: number;
  start: number;
  previousEnd: number | null;
  rect: DOMRect;
}

function previousOrderedListEnd(editor: Editor, position: number): number | null {
  const resolved = editor.state.doc.resolve(position);
  const parent = resolved.parent;
  const index = resolved.index();
  for (let siblingIndex = index - 1; siblingIndex >= 0; siblingIndex -= 1) {
    const sibling = parent.child(siblingIndex);
    if (sibling.type.name !== "orderedList") continue;
    return Number(sibling.attrs.start || 1) + sibling.childCount - 1;
  }
  return null;
}

function orderedListInfo(editor: Editor): OrderedListInfo | null {
  const { $from } = editor.state.selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    if (node.type.name !== "orderedList") continue;
    const position = $from.before(depth);
    const dom = editor.view.nodeDOM(position);
    if (!(dom instanceof HTMLElement)) return null;
    return {
      position,
      start: Number(node.attrs.start || 1),
      previousEnd: previousOrderedListEnd(editor, position),
      rect: dom.getBoundingClientRect(),
    };
  }
  return null;
}

export default function OrderedListMenu({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<OrderedListInfo | null>(null);
  const position = useAnchoredEditorMenu(editor, () => {
    const next = orderedListInfo(editor);
    setInfo(next);
    if (!next) return null;
    return clampMenuPosition(
      { left: next.rect.left - 34, top: next.rect.top },
      { width: 30, height: 30 },
      { width: window.innerWidth, height: window.innerHeight },
    );
  });

  if (!position || !info || typeof document === "undefined") return null;

  const setStart = (start: number) => {
    const node = editor.state.doc.nodeAt(info.position);
    if (!node) return;
    editor.view.dispatch(editor.state.tr.setNodeMarkup(info.position, undefined, {
      ...node.attrs,
      start: Math.max(1, Math.round(start)),
    }));
    editor.view.focus();
    setOpen(false);
  };

  return createPortal(
    <div className="fixed z-[108]" style={position}>
      <button
        type="button"
        aria-label="设置列表起始编号"
        title="设置列表起始编号"
        onClick={() => setOpen((value) => !value)}
        className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/40 bg-white/70 text-[9px] font-black text-indigo-500 shadow-md backdrop-blur-xl dark:border-white/10 dark:bg-slate-800/80"
      >
        {info.start === 1 ? <Hash size={13} /> : info.start}
      </button>
      {open && (
        <div className="absolute left-full top-0 ml-2 w-44 rounded-2xl border border-white/50 bg-white/95 p-2 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/95">
          <button
            type="button"
            disabled={info.previousEnd === null}
            aria-label={info.previousEnd === null ? "继续之前编号" : `继续之前编号（${info.previousEnd + 1}）`}
            onClick={() => {
              if (info.previousEnd !== null) setStart(info.previousEnd + 1);
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[10px] font-bold text-slate-600 hover:bg-indigo-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-35 dark:text-slate-300"
          >
            <RotateCcw size={13} />
            {info.previousEnd === null ? "继续之前编号" : `继续之前编号（${info.previousEnd + 1}）`}
          </button>
          <button type="button" onClick={() => setStart(1)} className="w-full rounded-xl px-3 py-2 text-left text-[10px] font-bold text-slate-600 hover:bg-indigo-500 hover:text-white dark:text-slate-300">从 1 开始</button>
          <label className="mt-1 flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-[10px] font-bold text-slate-500 dark:bg-white/5 dark:text-slate-300">
            起始值
            <input
              type="number"
              min={1}
              defaultValue={info.start}
              onKeyDown={(event) => {
                if (event.key === "Enter") setStart(Number(event.currentTarget.value));
              }}
              className="min-w-0 flex-1 bg-transparent text-right font-black outline-none"
            />
          </label>
        </div>
      )}
    </div>,
    document.body,
  );
}
