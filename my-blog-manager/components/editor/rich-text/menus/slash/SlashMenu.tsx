"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/core";
import type { BlockCommand } from "../../commands/block-commands";
import { filterSlashGroups, type SlashGroup } from "./slash-model";

export interface MenuPosition {
  left: number;
  top: number;
}

interface SlashMenuPanelProps {
  groups: SlashGroup[];
  position: MenuPosition;
  onSelect: (command: BlockCommand) => void;
  onClose: () => void;
}

export function SlashMenuPanel({
  groups,
  position,
  onSelect,
  onClose,
}: SlashMenuPanelProps) {
  const commands = useMemo(
    () => groups.flatMap((group) => group.commands),
    [groups],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const activeRef = useRef<HTMLButtonElement>(null);
  const safeActiveIndex = Math.min(activeIndex, Math.max(0, commands.length - 1));

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((index) => commands.length ? (index + 1) % commands.length : 0);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((index) => commands.length
          ? (index - 1 + commands.length) % commands.length
          : 0);
      } else if (event.key === "Enter") {
        if (!commands[safeActiveIndex]) return;
        event.preventDefault();
        onSelect(commands[safeActiveIndex]);
      } else if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [commands, onClose, onSelect, safeActiveIndex]);

  useEffect(() => {
    activeRef.current?.scrollIntoView?.({ block: "nearest" });
  }, [safeActiveIndex]);

  return (
    <div
      role="listbox"
      aria-label="插入内容"
      data-slash-menu="true"
      className="fixed z-[120] max-h-[min(28rem,60vh)] w-72 overflow-y-auto rounded-2xl border border-white/50 bg-white/90 p-2 shadow-2xl backdrop-blur-2xl motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 dark:border-white/10 dark:bg-slate-900/90"
      style={{ left: position.left, top: position.top }}
      onMouseDown={(event) => event.preventDefault()}
    >
      {groups.map((group, groupIndex) => (
        <div
          key={group.id}
          className={groupIndex ? "mt-2 border-t border-slate-200/70 pt-2 dark:border-white/10" : ""}
        >
          {group.label && (
            <p className="px-3 pb-1 pt-1 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
              {group.label}
            </p>
          )}
          {group.commands.map((command) => {
            const index = commands.findIndex((item) => item.id === command.id);
            const active = index === safeActiveIndex;
            const Icon = command.icon;
            return (
              <button
                key={command.id}
                ref={active ? activeRef : undefined}
                type="button"
                role="option"
                aria-selected={active}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => onSelect(command)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-150 ${
                  active
                    ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/20"
                    : command.group === "danger"
                      ? "text-red-500 hover:bg-red-500/10"
                      : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5"
                }`}
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  active ? "bg-white/15 text-white" : `bg-black/5 dark:bg-white/5 ${command.colorClass}`
                }`}>
                  <Icon size={16} />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-black">{command.label}</span>
                  <span className={`block truncate text-[9px] font-medium ${
                    active ? "text-white/70" : "text-slate-400"
                  }`}>
                    {command.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      ))}
      {!commands.length && (
        <p className="px-4 py-8 text-center text-xs font-bold text-slate-400">
          没有匹配的命令
        </p>
      )}
    </div>
  );
}

interface SlashState {
  from: number;
  to: number;
  query: string;
  position: MenuPosition;
}

interface SlashMenuProps {
  editor: Editor;
  pickImage: (editor: Editor) => void;
}

export default function SlashMenu({ editor, pickImage }: SlashMenuProps) {
  const [state, setState] = useState<SlashState | null>(null);

  useEffect(() => {
    const update = () => {
      const { selection } = editor.state;
      const { $from } = selection;
      if (!selection.empty || !$from.parent.isTextblock || editor.isActive("codeBlock")) {
        setState(null);
        return;
      }

      const textBefore = $from.parent.textBetween(0, $from.parentOffset, "\n", "\n");
      const match = textBefore.match(/(?:^|\s)\/([^\s/]*)$/);
      if (!match) {
        setState(null);
        return;
      }

      const slashIndex = textBefore.lastIndexOf("/");
      const coords = editor.view.coordsAtPos(selection.from);
      const width = 288;
      setState({
        from: selection.from - (textBefore.length - slashIndex),
        to: selection.from,
        query: match[1] || "",
        position: {
          left: Math.max(8, Math.min(coords.left, window.innerWidth - width - 8)),
          top: Math.max(8, Math.min(coords.bottom + 8, window.innerHeight - 360)),
        },
      });
    };

    editor.on("transaction", update);
    editor.on("selectionUpdate", update);
    return () => {
      editor.off("transaction", update);
      editor.off("selectionUpdate", update);
    };
  }, [editor]);

  useEffect(() => {
    const close = () => setState(null);
    const closeOnBlur = () => close();
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (editor.view.dom.contains(target) || target.closest('[data-slash-menu="true"]')) return;
      close();
    };

    editor.on("blur", closeOnBlur);
    document.addEventListener("pointerdown", closeOnOutsidePointer, true);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      editor.off("blur", closeOnBlur);
      document.removeEventListener("pointerdown", closeOnOutsidePointer, true);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [editor]);

  if (!state || typeof document === "undefined") return null;
  const groups = filterSlashGroups(state.query);

  return createPortal(
    <SlashMenuPanel
      groups={groups}
      position={state.position}
      onClose={() => setState(null)}
      onSelect={(command) => {
        editor.chain().focus().deleteRange({ from: state.from, to: state.to }).run();
        command.run(editor, { pickImage });
        setState(null);
      }}
    />,
    document.body,
  );
}
