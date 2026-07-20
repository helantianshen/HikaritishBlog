import { Extension, type CommandProps } from "@tiptap/core";
import type { Node, ResolvedPos } from "@tiptap/pm/model";

const INDENT_STEP = 2;
const INDENT_MAX = 8;

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    indent: {
      indent: () => ReturnType;
      outdent: () => ReturnType;
    };
  }
}

function isInsideListItemPos($pos: ResolvedPos): boolean {
  for (let depth = $pos.depth; depth > 0; depth -= 1) {
    if ($pos.node(depth).type.name === "listItem") return true;
  }
  return false;
}

function isInsideListItem(doc: Node, pos: number): boolean {
  return isInsideListItemPos(doc.resolve(pos));
}

export const Indent = Extension.create({
  name: "indent",

  addGlobalAttributes() {
    return [{
      types: ["paragraph", "heading"],
      attributes: {
        indent: {
          default: 0,
          parseHTML: (element: HTMLElement) => {
            const value = element.style.textIndent;
            if (!value?.endsWith("em")) return 0;
            return Math.max(0, Math.round(Number.parseFloat(value) / INDENT_STEP));
          },
          renderHTML: (attributes: Record<string, number>) => (
            attributes.indent
              ? { style: `text-indent: ${attributes.indent * INDENT_STEP}em` }
              : {}
          ),
        },
      },
    }];
  },

  addCommands() {
    const changeIndent = (delta: 1 | -1) => () => ({ tr, state, dispatch }: CommandProps) => {
      const { from, to } = state.selection;
      let changed = false;
      state.doc.nodesBetween(from, to, (node: Node, pos: number) => {
        if (node.type.name !== "paragraph" && node.type.name !== "heading") return;
        if (delta > 0 && isInsideListItem(state.doc, pos)) return;
        const current = node.attrs.indent ?? 0;
        const next = Math.max(0, Math.min(INDENT_MAX, current + delta));
        if (next === current) return;
        tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: next });
        changed = true;
      });
      if (dispatch && changed) dispatch(tr);
      return changed;
    };

    return {
      indent: changeIndent(1),
      outdent: changeIndent(-1),
    };
  },

  addKeyboardShortcuts() {
    return {
      Tab: () => {
        const { $from } = this.editor.state.selection;
        if (isInsideListItemPos($from)) return false;
        this.editor.commands.indent();
        return true;
      },
      "Shift-Tab": () => {
        const { $from } = this.editor.state.selection;
        if (isInsideListItemPos($from)) return false;
        this.editor.commands.outdent();
        return true;
      },
      Backspace: () => {
        const { $from, empty } = this.editor.state.selection;
        if (!empty || $from.parentOffset !== 0) return false;
        if (!["paragraph", "heading"].includes($from.parent.type.name)) return false;
        if (!$from.parent.attrs.indent) return false;
        return this.editor.commands.outdent();
      },
      Enter: () => {
        const { $from, empty } = this.editor.state.selection;
        if (!empty || !["paragraph", "heading"].includes($from.parent.type.name)) return false;
        if (!$from.parent.attrs.indent) return false;
        return this.editor.chain().splitBlock().command(({ tr, state }) => {
          const next = state.selection.$from;
          if (next.parent.attrs.indent) {
            tr.setNodeMarkup(next.before(), undefined, { ...next.parent.attrs, indent: 0 });
          }
          return true;
        }).run();
      },
    };
  },
});
