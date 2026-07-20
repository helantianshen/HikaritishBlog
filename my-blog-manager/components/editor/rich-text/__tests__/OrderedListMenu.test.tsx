import { Editor } from "@tiptap/core";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createEditorExtensions } from "../extensions/editor-extensions";
import OrderedListMenu from "../menus/OrderedListMenu";

function createOrderedListEditor() {
  const element = document.createElement("div");
  document.body.appendChild(element);
  const editor = new Editor({
    element,
    extensions: createEditorExtensions({ placeholder: "" }),
    content: "<ol><li><p>one</p></li><li><p>two</p></li></ol><p>gap</p><ol><li><p>three</p></li></ol>",
  });
  const listPositions: number[] = [];
  editor.state.doc.descendants((node, position) => {
    if (node.type.name === "orderedList") listPositions.push(position);
  });
  editor.commands.setTextSelection(listPositions[1] + 3);
  return { editor, secondListPosition: listPositions[1] };
}


describe("OrderedListMenu numbering", () => {
  it("continues from the nearest previous ordered list", async () => {
    const { editor, secondListPosition } = createOrderedListEditor();
    render(<OrderedListMenu editor={editor} />);

    fireEvent.click(await screen.findByRole("button", { name: "设置列表起始编号" }));
    const continueButton = await screen.findByRole("button", { name: "继续之前编号（3）" });
    fireEvent.click(continueButton);

    await waitFor(() => {
      expect(editor.state.doc.nodeAt(secondListPosition)?.attrs.start).toBe(3);
    });
    editor.destroy();
  });
});
