import type { AnyExtension } from "@tiptap/core";
import CharacterCount from "@tiptap/extension-character-count";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { Color } from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import TextAlign from "@tiptap/extension-text-align";
import { FontSize, TextStyle } from "@tiptap/extension-text-style";
import StarterKit from "@tiptap/starter-kit";
import { createLowlight, all } from "lowlight";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { Markdown } from "tiptap-markdown";
import CodeBlockNodeView from "../node-views/CodeBlockNodeView";
import ImageNodeView from "../node-views/ImageNodeView";
import { CellBackground } from "./cell-background";
import { Indent } from "./indent";
import { CustomListItem, CustomOrderedList } from "./lists";
import {
  CustomBold,
  CustomCode,
  CustomItalic,
  CustomStrike,
  CustomUnderline,
} from "./marks";
import { SmartSelectAll } from "./select-all";
import { TrailingNode } from "./trailing-node";

const lowlight = createLowlight(all);

export const ResizableImage = Image.extend({
  inline: false,
  group: "block",
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: "100%",
        parseHTML: (element: HTMLElement) => {
          const rawWidth = element.style.width || element.getAttribute("width") || "";
          const pixelMatch = rawWidth.match(/^(\d+(?:\.\d+)?)px$/);
          if (pixelMatch) return Number(pixelMatch[1]);
          return /^\d+(?:\.\d+)?%$/.test(rawWidth) ? rawWidth : "100%";
        },
        renderHTML: (attributes: Record<string, string | number | null>) => {
          const width = typeof attributes.width === "number"
            ? `${attributes.width}px`
            : attributes.width || "100%";
          const margin = attributes.alignment === "left"
            ? "2rem auto 2rem 0"
            : attributes.alignment === "right"
              ? "2rem 0 2rem auto"
              : "2rem auto";
          return {
            style: `width: ${width}; max-width: 100%; height: auto; display: block; margin: ${margin}; border-radius: 2rem; box-shadow: 0 20px 50px rgba(0,0,0,0.15);`,
          };
        },
      },
      alignment: {
        default: "center",
        parseHTML: (element: HTMLElement) => element.getAttribute("data-align") || "center",
        renderHTML: (attributes: Record<string, string | number | null>) => ({
          "data-align": attributes.alignment || "center",
        }),
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },
});

export const CustomCodeBlock = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockNodeView);
  },
}).configure({
  lowlight,
  defaultLanguage: "cpp",
  enableTabIndentation: true,
  tabSize: 2,
});

export interface EditorExtensionOptions {
  placeholder: string;
}

export function createEditorExtensions(
  options: EditorExtensionOptions,
): AnyExtension[] {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4, 5, 6] },
      listItem: false,
      orderedList: false,
      bold: false,
      italic: false,
      strike: false,
      code: false,
      codeBlock: false,
      link: false,
      underline: false,
      trailingNode: false,
      dropcursor: { color: "#6366f1", width: 2 },
    }),
    CustomListItem,
    CustomOrderedList,
    TaskList,
    TaskItem.configure({ nested: true }),
    CustomBold,
    CustomItalic,
    CustomStrike,
    CustomUnderline,
    CustomCode,
    CustomCodeBlock,
    TextStyle,
    FontSize,
    Color,
    Highlight.configure({ multicolor: true }),
    Subscript,
    Superscript,
    ResizableImage,
    Table.configure({ resizable: true, renderWrapper: true }),
    TableRow,
    TableHeader,
    TableCell,
    CellBackground,
    Indent,
    TextAlign.configure({
      types: ["heading", "paragraph", "tableCell", "tableHeader"],
    }),
    Link.configure({
      openOnClick: false,
      autolink: false,
      linkOnPaste: true,
      HTMLAttributes: {
        class: "text-indigo-500 underline cursor-pointer font-bold",
        rel: "noopener noreferrer",
        target: "_blank",
      },
    }),
    SmartSelectAll,
    TrailingNode,
    CharacterCount,
    Placeholder.configure({ placeholder: options.placeholder }),
    Markdown.configure({ html: true, transformPastedText: true }),
  ];
}
