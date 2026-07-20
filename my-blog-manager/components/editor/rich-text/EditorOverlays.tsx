"use client";

import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/core";
import BlockHandle from "./menus/BlockHandle";
import ImageBubbleMenu from "./menus/ImageBubbleMenu";
import OrderedListMenu from "./menus/OrderedListMenu";
import SelectionBubbleMenu from "./menus/SelectionBubbleMenu";
import TableControls from "./menus/TableControls";
import SlashMenu from "./menus/slash/SlashMenu";

interface EditorOverlaysProps {
  editor: Editor;
  pickImage: (editor: Editor) => void;
}

export default function EditorOverlays({ editor, pickImage }: EditorOverlaysProps) {
  const [counts, setCounts] = useState({ selected: 0, total: 0 });

  useEffect(() => {
    const sync = () => {
      const { from, to, empty } = editor.state.selection;
      setCounts({
        total: editor.getText().length,
        selected: empty ? 0 : editor.state.doc.textBetween(from, to, "\n", "\n").length,
      });
    };
    editor.on("update", sync);
    editor.on("selectionUpdate", sync);
    sync();
    return () => {
      editor.off("update", sync);
      editor.off("selectionUpdate", sync);
    };
  }, [editor]);

  return (
    <>
      <SlashMenu editor={editor} pickImage={pickImage} />
      <SelectionBubbleMenu editor={editor} />
      <ImageBubbleMenu editor={editor} />
      <BlockHandle editor={editor} pickImage={pickImage} />
      <TableControls editor={editor} />
      <OrderedListMenu editor={editor} />
      <output
        aria-label="正文字符统计"
        className="pointer-events-none absolute bottom-2 right-2 z-20 rounded-xl border border-white/40 bg-white/60 px-3 py-1.5 text-[9px] font-black tabular-nums text-slate-400 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/60"
      >
        {counts.selected > 0 ? `${counts.selected} / ` : ""}{counts.total} 字
      </output>
    </>
  );
}
