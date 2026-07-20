import { Editor } from "@tiptap/core";
import { describe, expect, it } from "vitest";
import { BLOCK_COMMANDS } from "../commands/block-commands";
import { createEditorExtensions } from "../extensions/editor-extensions";

describe("block command registry", () => {
  it("offers every required block action once", () => {
    expect(BLOCK_COMMANDS.map((item) => item.id)).toEqual([
      "paragraph",
      "heading1",
      "heading2",
      "heading3",
      "bulletList",
      "orderedList",
      "taskList",
      "codeBlock",
      "quote",
      "horizontalRule",
      "table",
      "image",
      "clearFormatting",
    ]);
  });

  it("does not duplicate command ids", () => {
    const ids = BLOCK_COMMANDS.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("converts a multi-item list without splitting the current item away", () => {
    const editor = new Editor({
      extensions: createEditorExtensions({ placeholder: "" }),
      content: "<ul><li><p>one</p></li><li><p>two</p></li></ul>",
    });
    editor.commands.setTextSelection(3);

    BLOCK_COMMANDS.find((command) => command.id === "orderedList")?.run(editor);

    const orderedLists: number[] = [];
    const bulletLists: number[] = [];
    editor.state.doc.descendants((node) => {
      if (node.type.name === "orderedList") orderedLists.push(node.childCount);
      if (node.type.name === "bulletList") bulletLists.push(node.childCount);
    });
    expect(orderedLists).toEqual([2]);
    expect(bulletLists).toEqual([]);
    editor.destroy();
  });
});
