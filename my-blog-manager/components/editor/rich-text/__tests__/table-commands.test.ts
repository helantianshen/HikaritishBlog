import { Editor } from "@tiptap/core";
import { describe, expect, it } from "vitest";
import { createEditorExtensions } from "../extensions/editor-extensions";
import {
  moveTableColumnByIndex,
  moveTableRowByIndex,
  setCellBackground,
} from "../table/table-commands";

function createTableEditor() {
  const editor = new Editor({
    extensions: createEditorExtensions({ placeholder: "" }),
    content: {
      type: "doc",
      content: [{
        type: "table",
        content: [
          {
            type: "tableRow",
            content: [
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "a" }] }] },
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "b" }] }] },
            ],
          },
          {
            type: "tableRow",
            content: [
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "c" }] }] },
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "d" }] }] },
            ],
          },
        ],
      }],
    },
  });
  editor.commands.setTextSelection(4);
  return editor;
}

function tableRows(editor: Editor): string[] {
  const table = editor.state.doc.firstChild;
  const rows: string[] = [];
  table?.forEach((row) => rows.push(row.textContent));
  return rows;
}

describe("table commands", () => {
  it("reorders rows without losing cell content", () => {
    const editor = createTableEditor();
    expect(moveTableRowByIndex(editor, 0, 1)).toBe(true);
    expect(tableRows(editor)).toEqual(["cd", "ab"]);
    editor.destroy();
  });

  it("reorders columns without losing cell content", () => {
    const editor = createTableEditor();
    expect(moveTableColumnByIndex(editor, 0, 1)).toBe(true);
    expect(tableRows(editor)).toEqual(["ba", "dc"]);
    editor.destroy();
  });

  it("persists the selected cell background color", () => {
    const editor = createTableEditor();
    expect(setCellBackground(editor, "#e0e7ff")).toBe(true);
    expect(editor.state.doc.firstChild?.firstChild?.firstChild?.attrs)
      .toMatchObject({ backgroundColor: "#e0e7ff" });
    editor.destroy();
  });
});
