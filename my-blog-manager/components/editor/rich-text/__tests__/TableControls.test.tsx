import { Editor } from "@tiptap/core";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createEditorExtensions } from "../extensions/editor-extensions";
import TableControls from "../menus/TableControls";

function createTableEditor() {
  const element = document.createElement("div");
  document.body.appendChild(element);
  const editor = new Editor({
    element,
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

function tableShape(editor: Editor) {
  const table = editor.state.doc.firstChild;
  return {
    rows: table?.childCount ?? 0,
    columns: table?.firstChild?.childCount ?? 0,
  };
}


describe("TableControls insertion boundaries", () => {
  it("inserts a column from a boundary plus control", async () => {
    const editor = createTableEditor();
    render(<TableControls editor={editor} />);

    const insert = await screen.findByRole("button", { name: "在第 1 列前插入列" });
    fireEvent.mouseDown(insert);

    await waitFor(() => expect(tableShape(editor)).toEqual({ rows: 2, columns: 3 }));
    editor.destroy();
  });

  it("inserts a row from a boundary plus control", async () => {
    const editor = createTableEditor();
    render(<TableControls editor={editor} />);

    const insert = await screen.findByRole("button", { name: "在第 1 行前插入行" });
    fireEvent.mouseDown(insert);

    await waitFor(() => expect(tableShape(editor)).toEqual({ rows: 3, columns: 2 }));
    editor.destroy();
  });
});
