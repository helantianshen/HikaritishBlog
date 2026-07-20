import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

export const TrailingNode = Extension.create({
  name: "trailingNode",
  addProseMirrorPlugins() {
    return [new Plugin({
      key: new PluginKey("richTextTrailingNode"),
      appendTransaction: (_transactions, _oldState, state) => {
        const paragraph = state.schema.nodes.paragraph;
        if (!paragraph || state.doc.lastChild?.type === paragraph) return null;
        return state.tr.insert(state.doc.content.size, paragraph.create());
      },
    })];
  },
});
