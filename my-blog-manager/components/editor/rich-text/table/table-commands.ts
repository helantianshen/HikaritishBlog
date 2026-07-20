import type { Editor } from "@tiptap/core";
import { moveTableColumn, moveTableRow } from "@tiptap/pm/tables";

export function moveTableRowByIndex(
  editor: Editor,
  from: number,
  to: number,
): boolean {
  if (!editor.isActive("table") || from === to) return false;
  const command = moveTableRow({ from, to, select: false });
  const moved = command(editor.state, editor.view.dispatch);
  if (moved) editor.view.focus();
  return moved;
}

export function moveTableColumnByIndex(
  editor: Editor,
  from: number,
  to: number,
): boolean {
  if (!editor.isActive("table") || from === to) return false;
  const command = moveTableColumn({ from, to, select: false });
  const moved = command(editor.state, editor.view.dispatch);
  if (moved) editor.view.focus();
  return moved;
}

export function setCellBackground(editor: Editor, color: string | null): boolean {
  if (!editor.isActive("table")) return false;
  return editor.chain().focus().setCellAttribute("backgroundColor", color).run();
}
