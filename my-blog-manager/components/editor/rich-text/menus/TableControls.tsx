"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/core";
import { CellSelection } from "@tiptap/pm/tables";
import { GripHorizontal, GripVertical, Plus } from "lucide-react";
import { moveTableColumnByIndex, moveTableRowByIndex } from "../table/table-commands";

interface TableGeometry {
  table: HTMLTableElement;
  rect: DOMRect;
}

interface TableControlsProps {
  editor: Editor;
}

function activeTable(editor: Editor): TableGeometry | null {
  const { $from } = editor.state.selection;
  let tablePosition: number | null = null;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type.name === "table") {
      tablePosition = $from.before(depth);
      break;
    }
  }
  if (tablePosition === null) return null;
  const dom = editor.view.nodeDOM(tablePosition);
  const table = dom instanceof HTMLTableElement
    ? dom
    : dom instanceof HTMLElement
      ? dom.querySelector("table")
      : null;
  return table ? { table, rect: table.getBoundingClientRect() } : null;
}

function resolveCellBefore(editor: Editor, cell: HTMLElement) {
  const position = editor.view.posAtDOM(cell, 0);
  if (position < 0) return null;
  const resolved = editor.state.doc.resolve(position);
  for (let depth = resolved.depth; depth > 0; depth -= 1) {
    if (["tableCell", "tableHeader"].includes(resolved.node(depth).type.name)) {
      return editor.state.doc.resolve(resolved.before(depth));
    }
  }
  return null;
}

export default function TableControls({ editor }: TableControlsProps) {
  const [geometry, setGeometry] = useState<TableGeometry | null>(null);
  const [dropLine, setDropLine] = useState<{
    axis: "row" | "column";
    coordinate: number;
    rect: DOMRect;
  } | null>(null);

  useEffect(() => {
    const update = () => setGeometry(activeTable(editor));
    const close = () => setGeometry(null);
    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", close, true);
    update();
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", close, true);
    };
  }, [editor]);

  if (!geometry || typeof document === "undefined") return null;
  const rows = Array.from(geometry.table.rows);
  const columns = Array.from(rows[0]?.cells || []);

  const select = (axis: "row" | "column", cell: HTMLElement) => {
    const resolved = resolveCellBefore(editor, cell);
    if (!resolved) return;
    const selection = axis === "row"
      ? CellSelection.rowSelection(resolved)
      : CellSelection.colSelection(resolved);
    editor.view.dispatch(editor.state.tr.setSelection(selection));
    editor.view.focus();
  };

  const insert = (
    axis: "row" | "column",
    cell: HTMLElement,
    before: boolean,
  ) => {
    const position = editor.view.posAtDOM(cell, 0);
    if (position < 0) return;
    const chain = editor.chain().focus().setTextSelection(position);
    if (axis === "row") {
      (before ? chain.addRowBefore() : chain.addRowAfter()).run();
    } else {
      (before ? chain.addColumnBefore() : chain.addColumnAfter()).run();
    }
  };

  const columnBoundaries = columns.map((cell, index) => ({
    cell,
    before: true,
    coordinate: cell.getBoundingClientRect().left,
    label: `在第 ${index + 1} 列前插入列`,
  }));
  const lastColumn = columns.at(-1);
  if (lastColumn) {
    columnBoundaries.push({
      cell: lastColumn,
      before: false,
      coordinate: lastColumn.getBoundingClientRect().right,
      label: "在最后一列后插入列",
    });
  }

  const rowBoundaries = rows.flatMap((row, index) => {
    const cell = row.cells[0];
    return cell ? [{
      cell,
      before: true,
      coordinate: row.getBoundingClientRect().top,
      label: `在第 ${index + 1} 行前插入行`,
    }] : [];
  });
  const lastRow = rows.at(-1);
  const lastRowCell = lastRow?.cells[0];
  if (lastRow && lastRowCell) {
    rowBoundaries.push({
      cell: lastRowCell,
      before: false,
      coordinate: lastRow.getBoundingClientRect().bottom,
      label: "在最后一行后插入行",
    });
  }

  const beginReorder = (
    axis: "row" | "column",
    index: number,
    cell: HTMLElement,
    event: React.PointerEvent,
  ) => {
    event.preventDefault();
    const horizontal = axis === "column";
    const start = horizontal ? event.clientX : event.clientY;
    const rects = horizontal
      ? columns.map((item) => item.getBoundingClientRect())
      : rows.map((item) => item.getBoundingClientRect());
    const edges = rects.map((rect) => horizontal ? rect.left : rect.top);
    const last = rects.at(-1);
    if (last) edges.push(horizontal ? last.right : last.bottom);
    let dragging = false;
    let boundary = index;

    const move = (moveEvent: PointerEvent) => {
      const coordinate = horizontal ? moveEvent.clientX : moveEvent.clientY;
      if (!dragging && Math.abs(coordinate - start) < 4) return;
      dragging = true;
      boundary = edges.reduce((best, edge, edgeIndex) => (
        Math.abs(edge - coordinate) < Math.abs(edges[best] - coordinate) ? edgeIndex : best
      ), 0);
      setDropLine({ axis, coordinate: edges[boundary], rect: geometry.rect });
    };

    const finish = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      setDropLine(null);
      if (!dragging) {
        select(axis, cell);
        return;
      }
      const to = boundary > index ? boundary - 1 : boundary;
      select(axis, cell);
      if (axis === "row") moveTableRowByIndex(editor, index, to);
      else moveTableColumnByIndex(editor, index, to);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish);
  };

  return createPortal(
    <>
      <div className="pointer-events-none fixed z-[100] rounded-lg ring-1 ring-indigo-500/25" style={{ left: geometry.rect.left, top: geometry.rect.top, width: geometry.rect.width, height: geometry.rect.height }} />
      {columns.map((cell, index) => {
        const rect = cell.getBoundingClientRect();
        return (
          <button
            key={`column-${index}`}
            type="button"
            aria-label={`选择或移动第 ${index + 1} 列`}
            title="点击选择列，拖动调整顺序"
            onPointerDown={(event) => beginReorder("column", index, cell, event)}
            className="fixed z-[102] flex h-5 items-center justify-center rounded-t-lg border border-white/40 bg-white/75 text-slate-400 shadow-sm backdrop-blur-xl hover:bg-indigo-500 hover:text-white dark:border-white/10 dark:bg-slate-800/80"
            style={{ left: rect.left, top: geometry.rect.top - 21, width: rect.width }}
          >
            <GripHorizontal size={12} />
          </button>
        );
      })}
      {columnBoundaries.map((boundary, index) => (
        <button
          key={`column-insert-${index}`}
          type="button"
          aria-label={boundary.label}
          title={boundary.label}
          onMouseDown={(event) => {
            event.preventDefault();
            insert("column", boundary.cell, boundary.before);
          }}
          className="group fixed z-[104] flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-white opacity-0 shadow-md shadow-indigo-500/30 transition-opacity duration-150 hover:opacity-100 focus:opacity-100"
          style={{ left: boundary.coordinate - 10, top: geometry.rect.top - 43 }}
        >
          <Plus size={12} />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-full w-0.5 -translate-x-1/2 bg-indigo-500 opacity-0 group-hover:opacity-70 group-focus:opacity-70"
            style={{ height: geometry.rect.height + 23 }}
          />
        </button>
      ))}
      {rows.map((row, index) => {
        const rect = row.getBoundingClientRect();
        const cell = row.cells[0];
        if (!cell) return null;
        return (
          <button
            key={`row-${index}`}
            type="button"
            aria-label={`选择或移动第 ${index + 1} 行`}
            title="点击选择行，拖动调整顺序"
            onPointerDown={(event) => beginReorder("row", index, cell, event)}
            className="fixed z-[102] flex w-5 items-center justify-center rounded-l-lg border border-white/40 bg-white/75 text-slate-400 shadow-sm backdrop-blur-xl hover:bg-indigo-500 hover:text-white dark:border-white/10 dark:bg-slate-800/80"
            style={{ left: geometry.rect.left - 21, top: rect.top, height: rect.height }}
          >
            <GripVertical size={12} />
          </button>
        );
      })}
      {rowBoundaries.map((boundary, index) => (
        <button
          key={`row-insert-${index}`}
          type="button"
          aria-label={boundary.label}
          title={boundary.label}
          onMouseDown={(event) => {
            event.preventDefault();
            insert("row", boundary.cell, boundary.before);
          }}
          className="group fixed z-[104] flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-white opacity-0 shadow-md shadow-indigo-500/30 transition-opacity duration-150 hover:opacity-100 focus:opacity-100"
          style={{ left: geometry.rect.left - 43, top: boundary.coordinate - 10 }}
        >
          <Plus size={12} />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-full top-1/2 h-0.5 -translate-y-1/2 bg-indigo-500 opacity-0 group-hover:opacity-70 group-focus:opacity-70"
            style={{ width: geometry.rect.width + 23 }}
          />
        </button>
      ))}
      {dropLine && (
        <div
          className="pointer-events-none fixed z-[130] bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]"
          style={dropLine.axis === "column"
            ? { left: dropLine.coordinate - 1, top: dropLine.rect.top, width: 2, height: dropLine.rect.height }
            : { left: dropLine.rect.left, top: dropLine.coordinate - 1, width: dropLine.rect.width, height: 2 }}
        />
      )}
    </>,
    document.body,
  );
}
