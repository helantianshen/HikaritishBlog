import { describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import { createEditorExtensions } from "../extensions/editor-extensions";

describe("editor extensions", () => {
  it("registers the complete schema and interaction set", () => {
    const editor = new Editor({
      extensions: createEditorExtensions({ placeholder: "开始写作" }),
      content: "",
    });
    const names = editor.extensionManager.extensions.map((extension) => extension.name);

    for (const name of [
      "paragraph",
      "heading",
      "bulletList",
      "orderedList",
      "taskList",
      "table",
      "tableRow",
      "tableHeader",
      "tableCell",
      "image",
      "codeBlock",
      "indent",
      "cellBackground",
      "smartSelectAll",
      "trailingNode",
      "characterCount",
      "placeholder",
      "markdown",
    ]) {
      expect(names).toContain(name);
    }
    editor.destroy();
  });

  it("does not register duplicate extension names", () => {
    const editor = new Editor({
      extensions: createEditorExtensions({ placeholder: "开始写作" }),
      content: "",
    });
    const names = editor.extensionManager.extensions.map((extension) => extension.name);
    expect(new Set(names).size).toBe(names.length);
    editor.destroy();
  });
});
