import type { Editor } from "@tiptap/core";
import { Fragment, Slice } from "@tiptap/pm/model";
import { NodeSelection } from "@tiptap/pm/state";

export function startBlockDrag(editor: Editor, position: number, event: DragEvent) {
  const { state, view } = editor;
  const node = state.doc.nodeAt(position);
  if (!node) return false;

  try {
    const selection = NodeSelection.create(state.doc, position);
    view.dispatch(state.tr.setSelection(selection));
    let slice: Slice;
    let draggedNode: NodeSelection | undefined = selection;

    if (node.type.name === "listItem" || node.type.name === "taskItem") {
      const resolved = state.doc.resolve(position);
      const wrapped = resolved.parent.type.create(null, node);
      slice = new Slice(Fragment.from(wrapped), 1, 1);
      draggedNode = undefined;
    } else {
      slice = selection.content();
    }

    const dragging = { slice, move: true, node: draggedNode };
    view.dragging = dragging;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/html", "");
    }
    return true;
  } catch {
    return false;
  }
}

export function finishBlockDrag(editor: Editor) {
  editor.view.dragging = null;
}
