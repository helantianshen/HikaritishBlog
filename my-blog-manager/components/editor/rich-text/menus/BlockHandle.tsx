"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/core";
import { GripVertical, Plus } from "lucide-react";
import { BLOCK_COMMANDS } from "../commands/block-commands";
import { finishBlockDrag, startBlockDrag } from "../hooks/use-block-drag";

interface HoveredBlock {
  position: number;
  rect: DOMRect;
  empty: boolean;
}

interface BlockHandleProps {
  editor: Editor;
  pickImage: (editor: Editor) => void;
}

function resolveTopLevelBlock(editor: Editor, target: EventTarget | null): HoveredBlock | null {
  if (!(target instanceof Node)) return null;
  const root = editor.view.dom;
  let element = target instanceof HTMLElement ? target : target.parentElement;
  while (element && element.parentElement !== root) element = element.parentElement;
  if (!element || element.parentElement !== root) return null;

  const domPosition = editor.view.posAtDOM(element, 0);
  if (domPosition < 0) return null;
  const resolved = editor.state.doc.resolve(Math.min(domPosition, editor.state.doc.content.size));
  const position = resolved.depth > 0 ? resolved.before(1) : domPosition;
  const node = editor.state.doc.nodeAt(position);
  if (!node) return null;
  return {
    position,
    rect: element.getBoundingClientRect(),
    empty: node.textContent.length === 0 && !node.isAtom,
  };
}

export default function BlockHandle({ editor, pickImage }: BlockHandleProps) {
  const [block, setBlock] = useState<HoveredBlock | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [tableSize, setTableSize] = useState({ rows: 2, cols: 3 });
  const handleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = editor.view.dom;
    const handleMove = (event: MouseEvent) => {
      const next = resolveTopLevelBlock(editor, event.target);
      if (next) setBlock(next);
    };
    const hide = () => {
      if (!menuOpen) setBlock(null);
    };
    root.addEventListener("mousemove", handleMove);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      root.removeEventListener("mousemove", handleMove);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, [editor, menuOpen]);

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!handleRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  if (!block || typeof document === "undefined") return null;
  const left = Math.max(8, block.rect.left - 42);
  const top = Math.max(8, block.rect.top + 2);

  const selectBlock = () => {
    const position = Math.min(block.position + 1, editor.state.doc.content.size);
    editor.chain().focus().setTextSelection(position).run();
  };

  return createPortal(
    <div ref={handleRef} className="fixed z-[105]" style={{ left, top }}>
      <button
        type="button"
        draggable={!block.empty}
        aria-label={block.empty ? "插入内容" : "拖动或转换内容块"}
        title={block.empty ? "插入内容" : "拖动内容块，点击转换"}
        onClick={() => {
          selectBlock();
          setMenuOpen((open) => !open);
        }}
        onDragStart={(event) => {
          selectBlock();
          startBlockDrag(editor, block.position, event.nativeEvent);
          setMenuOpen(false);
        }}
        onDragEnd={() => finishBlockDrag(editor)}
        className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/40 bg-white/70 text-slate-400 shadow-lg backdrop-blur-xl transition-all duration-150 hover:scale-105 hover:bg-indigo-500 hover:text-white dark:border-white/10 dark:bg-slate-800/70"
      >
        {block.empty ? <Plus size={16} /> : <GripVertical size={16} />}
      </button>

      {menuOpen && (
        <div className="absolute left-full top-0 ml-2 w-64 rounded-2xl border border-white/50 bg-white/95 p-2 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/95">
          <p className="px-2 pb-2 pt-1 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
            内容块
          </p>
          <div className="grid grid-cols-2 gap-1">
            {BLOCK_COMMANDS.filter((command) => !["table", "image", "clearFormatting"].includes(command.id)).map((command) => {
              const Icon = command.icon;
              return (
                <button
                  key={command.id}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    selectBlock();
                    command.run(editor, { pickImage });
                    setMenuOpen(false);
                  }}
                  className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[10px] font-bold text-slate-600 hover:bg-indigo-500 hover:text-white dark:text-slate-300"
                >
                  <Icon size={14} className={command.colorClass} />
                  {command.label}
                </button>
              );
            })}
          </div>

          <div className="mt-2 border-t border-slate-200/70 pt-2 dark:border-white/10">
            <p className="px-2 pb-1 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
              表格 {tableSize.rows} x {tableSize.cols}
            </p>
            <div className="grid grid-cols-6 gap-1 px-2 pb-2">
              {Array.from({ length: 36 }, (_, index) => {
                const row = Math.floor(index / 6) + 1;
                const col = index % 6 + 1;
                const active = row <= tableSize.rows && col <= tableSize.cols;
                return (
                  <button
                    key={index}
                    type="button"
                    aria-label={`插入 ${row} x ${col} 表格`}
                    onMouseEnter={() => setTableSize({ rows: row, cols: col })}
                    onClick={() => {
                      selectBlock();
                      editor.chain().focus().insertTable({ rows: row, cols: col, withHeaderRow: false }).run();
                      setMenuOpen(false);
                    }}
                    className={`aspect-square rounded-[3px] border ${
                      active
                        ? "border-indigo-500 bg-indigo-500/30"
                        : "border-slate-300 bg-slate-100 dark:border-slate-600 dark:bg-slate-800"
                    }`}
                  />
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => {
                selectBlock();
                pickImage(editor);
                setMenuOpen(false);
              }}
              className="w-full rounded-xl px-3 py-2 text-left text-[10px] font-bold text-pink-500 hover:bg-pink-500/10"
            >
              插入图片
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
