import { mergeAttributes } from "@tiptap/core";
import { ListItem, OrderedList } from "@tiptap/extension-list";
import { Plugin } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export const CustomOrderedList = OrderedList.extend({
  renderHTML({ HTMLAttributes }) {
    const start = Number(HTMLAttributes.start ?? 1);
    return [
      "ol",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        style: `counter-reset: tiptap-counter ${start - 1}`,
      }),
      0,
    ];
  },
});

export const CustomListItem = ListItem.extend({
  content: "(paragraph | heading) block*",
  addKeyboardShortcuts() {
    return {
      Enter: () => {
        const { $from } = this.editor.state.selection;
        let headingLevel: number | null = null;
        let headingEmpty = false;
        for (let depth = $from.depth; depth > 0; depth -= 1) {
          const node = $from.node(depth);
          if (node.type.name === "heading") {
            headingLevel = node.attrs.level;
            headingEmpty = node.textContent === "";
          }
          if (node.type.name === this.name) break;
        }
        if (headingLevel !== null && headingEmpty) {
          return this.editor.chain().liftListItem(this.name).setParagraph().run();
        }
        if (headingLevel !== null) {
          return this.editor.chain().splitListItem(this.name)
            .setHeading({ level: headingLevel as 1 | 2 | 3 | 4 | 5 | 6 }).run();
        }
        return this.editor.commands.splitListItem(this.name);
      },
      Tab: () => this.editor.commands.sinkListItem(this.name),
      "Shift-Tab": () => this.editor.commands.liftListItem(this.name),
    };
  },
  addProseMirrorPlugins() {
    return [new Plugin({
      props: {
        decorations(state) {
          const decorations: Decoration[] = [];
          state.doc.descendants((node, pos) => {
            if (!["bulletList", "orderedList"].includes(node.type.name)) return;
            const resolved = state.doc.resolve(pos);
            let depth = 0;
            for (let current = 0; current <= resolved.depth; current += 1) {
              if (resolved.node(current).type.name === node.type.name) depth += 1;
            }
            const attribute = node.type.name === "bulletList" ? "data-ul-mod" : "data-ol-mod";
            decorations.push(Decoration.node(pos, pos + node.nodeSize, {
              [attribute]: String(depth % 3),
            }));
          });
          return DecorationSet.create(state.doc, decorations);
        },
      },
    })];
  },
});
