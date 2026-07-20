import { Editor } from "@tiptap/core";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BLOCK_COMMANDS } from "../commands/block-commands";
import { createEditorExtensions } from "../extensions/editor-extensions";
import SlashMenu, { SlashMenuPanel } from "../menus/slash/SlashMenu";
import type { SlashGroup } from "../menus/slash/slash-model";

const groups: SlashGroup[] = [{
  id: "basic",
  label: "基础",
  commands: [BLOCK_COMMANDS[0], BLOCK_COMMANDS[1], BLOCK_COMMANDS[2]],
}];

describe("SlashMenuPanel", () => {
  it("moves through commands and executes the active item", () => {
    const onSelect = vi.fn();
    render(
      <SlashMenuPanel
        groups={groups}
        position={{ left: 20, top: 30 }}
        onSelect={onSelect}
        onClose={() => undefined}
      />,
    );

    const options = screen.getAllByRole("option");
    expect(options[0]).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(options[1]).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(window, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith(groups[0].commands[1]);
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    render(
      <SlashMenuPanel
        groups={groups}
        position={{ left: 20, top: 30 }}
        onSelect={() => undefined}
        onClose={onClose}
      />,
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes when focus moves outside the editor and menu", async () => {
    const element = document.createElement("div");
    document.body.appendChild(element);
    const editor = new Editor({
      element,
      extensions: createEditorExtensions({ placeholder: "" }),
      content: "<p></p>",
    });
    render(
      <>
        <button type="button">标题输入框</button>
        <SlashMenu editor={editor} pickImage={() => undefined} />
      </>,
    );

    act(() => {
      editor.commands.focus("start");
      editor.commands.insertContent("/");
    });
    expect(await screen.findByRole("listbox", { name: "插入内容" })).toBeInTheDocument();

    fireEvent.pointerDown(screen.getByRole("button", { name: "标题输入框" }));
    expect(screen.queryByRole("listbox", { name: "插入内容" })).not.toBeInTheDocument();
    editor.destroy();
  });
});
