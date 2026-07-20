import { Extension } from "@tiptap/core";
import { AllSelection, Plugin, PluginKey, TextSelection, type Selection } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

function isFullBlockSelection(selection: Selection): boolean {
  return selection instanceof AllSelection
    || (selection instanceof TextSelection && !selection.$from.sameParent(selection.$to));
}

export const SmartSelectAll = Extension.create({
  name: "smartSelectAll",
  addKeyboardShortcuts() {
    return {
      "Mod-a": () => {
        const { state, view } = this.editor;
        const { selection, doc } = state;
        const { $from, $to } = selection;
        if (selection instanceof AllSelection) return true;

        let codeDepth = -1;
        for (let depth = $from.depth; depth > 0; depth -= 1) {
          if ($from.node(depth).type.name === "codeBlock") {
            codeDepth = depth;
            break;
          }
        }
        if (codeDepth >= 0) {
          const start = $from.start(codeDepth);
          const end = $from.end(codeDepth);
          const next = selection.from === start && selection.to === end
            ? new AllSelection(doc)
            : TextSelection.create(doc, start, end);
          view.dispatch(state.tr.setSelection(next));
          return true;
        }

        if (!$from.sameParent($to)) {
          view.dispatch(state.tr.setSelection(new AllSelection(doc)));
          return true;
        }

        const start = $from.start($from.depth);
        const end = $from.end($from.depth);
        const next = start === end || (selection.from === start && selection.to === end)
          ? new AllSelection(doc)
          : TextSelection.create(doc, start, end);
        view.dispatch(state.tr.setSelection(next));
        return true;
      },
    };
  },
  addProseMirrorPlugins() {
    return [new Plugin({
      key: new PluginKey("smartSelectAllDecoration"),
      props: {
        attributes: (state): Record<string, string> => isFullBlockSelection(state.selection)
          ? { class: "pm-select-all" }
          : {},
        decorations: (state) => {
          if (!isFullBlockSelection(state.selection)) return null;
          const decorations: Decoration[] = [];
          const { from, to } = state.selection;
          state.doc.nodesBetween(from, to, (node, pos) => {
            const inside = pos >= from && pos + node.nodeSize <= to;
            if (!inside) return undefined;
            if (["tableCell", "tableHeader"].includes(node.type.name) || node.isTextblock) {
              decorations.push(Decoration.node(pos, pos + node.nodeSize, {
                class: "pm-block-selected",
              }));
              return false;
            }
            return undefined;
          });
          return DecorationSet.create(state.doc, decorations);
        },
      },
    })];
  },
});
