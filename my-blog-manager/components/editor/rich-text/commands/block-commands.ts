import type { Editor } from "@tiptap/core";
import type { LucideIcon } from "lucide-react";
import {
  Code2,
  Eraser,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Quote,
  Table2,
  Type,
} from "lucide-react";

export type BlockCommandId =
  | "paragraph"
  | "heading1"
  | "heading2"
  | "heading3"
  | "bulletList"
  | "orderedList"
  | "taskList"
  | "codeBlock"
  | "quote"
  | "horizontalRule"
  | "table"
  | "image"
  | "clearFormatting";

export type BlockCommandGroup = "basic" | "common" | "list" | "danger";

export interface BlockCommandOptions {
  pickImage?: (editor: Editor) => void;
}

export interface BlockCommand {
  id: BlockCommandId;
  label: string;
  description: string;
  icon: LucideIcon;
  colorClass: string;
  group: BlockCommandGroup;
  searchTerms: readonly string[];
  isActive: (editor: Editor) => boolean;
  run: (editor: Editor, options?: BlockCommandOptions) => void;
}

function headingCommand(
  level: 1 | 2 | 3,
  icon: LucideIcon,
): BlockCommand {
  return {
    id: `heading${level}`,
    label: `H${level}`,
    description: `${level === 1 ? "一级" : level === 2 ? "二级" : "三级"}标题`,
    icon,
    colorClass: "text-blue-500 dark:text-blue-400",
    group: "basic",
    searchTerms: [`h${level}`, `heading${level}`, `${level}级标题`, "标题"],
    isActive: (editor) => editor.isActive("heading", { level }),
    run: (editor) => {
      editor.chain().focus().toggleHeading({ level }).run();
    },
  };
}

function switchListType(editor: Editor, target: "bulletList" | "orderedList") {
  const { $from } = editor.state.selection;
  let currentList: "bulletList" | "orderedList" | null = null;

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const name = $from.node(depth).type.name;
    if (name === "bulletList" || name === "orderedList") {
      currentList = name;
      break;
    }
  }

  if (currentList === target) return;
  const chain = editor.chain().focus();
  if (target === "bulletList") chain.toggleBulletList().run();
  else chain.toggleOrderedList().run();
}

export const BLOCK_COMMANDS: readonly BlockCommand[] = [
  {
    id: "paragraph",
    label: "正文",
    description: "普通正文",
    icon: Type,
    colorClass: "text-slate-500 dark:text-slate-400",
    group: "basic",
    searchTerms: ["paragraph", "正文", "文本", "p"],
    isActive: (editor) => editor.isActive("paragraph"),
    run: (editor) => {
      editor.chain().focus().setParagraph().run();
    },
  },
  headingCommand(1, Heading1),
  headingCommand(2, Heading2),
  headingCommand(3, Heading3),
  {
    id: "bulletList",
    label: "无序列表",
    description: "项目符号列表",
    icon: List,
    colorClass: "text-violet-500 dark:text-violet-400",
    group: "list",
    searchTerms: ["bullet", "list", "ul", "无序列表", "列表"],
    isActive: (editor) => editor.isActive("bulletList"),
    run: (editor) => switchListType(editor, "bulletList"),
  },
  {
    id: "orderedList",
    label: "有序列表",
    description: "数字编号列表",
    icon: ListOrdered,
    colorClass: "text-violet-500 dark:text-violet-400",
    group: "list",
    searchTerms: ["ordered", "list", "ol", "有序列表", "编号"],
    isActive: (editor) => editor.isActive("orderedList"),
    run: (editor) => switchListType(editor, "orderedList"),
  },
  {
    id: "taskList",
    label: "待办列表",
    description: "带复选框的任务列表",
    icon: ListChecks,
    colorClass: "text-violet-500 dark:text-violet-400",
    group: "list",
    searchTerms: ["task", "todo", "checklist", "待办", "任务"],
    isActive: (editor) => editor.isActive("taskList"),
    run: (editor) => {
      editor.chain().focus().toggleTaskList().run();
    },
  },
  {
    id: "codeBlock",
    label: "代码块",
    description: "多行代码与语法高亮",
    icon: Code2,
    colorClass: "text-emerald-500 dark:text-emerald-400",
    group: "basic",
    searchTerms: ["code", "codeblock", "代码", "代码块"],
    isActive: (editor) => editor.isActive("codeBlock"),
    run: (editor) => {
      editor.chain().focus().toggleCodeBlock().run();
    },
  },
  {
    id: "quote",
    label: "引用",
    description: "引用段落",
    icon: Quote,
    colorClass: "text-amber-500 dark:text-amber-400",
    group: "basic",
    searchTerms: ["quote", "blockquote", "引用"],
    isActive: (editor) => editor.isActive("blockquote"),
    run: (editor) => {
      editor.chain().focus().toggleBlockquote().run();
    },
  },
  {
    id: "horizontalRule",
    label: "分割线",
    description: "插入水平分割线",
    icon: Minus,
    colorClass: "text-orange-500 dark:text-orange-400",
    group: "basic",
    searchTerms: ["divider", "horizontal", "hr", "分割线"],
    isActive: () => false,
    run: (editor) => {
      editor.chain().focus().setHorizontalRule().run();
    },
  },
  {
    id: "table",
    label: "表格",
    description: "插入 2 x 3 表格",
    icon: Table2,
    colorClass: "text-teal-500 dark:text-teal-400",
    group: "common",
    searchTerms: ["table", "grid", "表格", "biaoge"],
    isActive: (editor) => editor.isActive("table"),
    run: (editor) => {
      editor.chain().focus().insertTable({ rows: 2, cols: 3, withHeaderRow: false }).run();
    },
  },
  {
    id: "image",
    label: "图片",
    description: "上传并插入图片",
    icon: ImageIcon,
    colorClass: "text-pink-500 dark:text-pink-400",
    group: "common",
    searchTerms: ["image", "img", "picture", "photo", "图片", "tupian"],
    isActive: (editor) => editor.isActive("image"),
    run: (editor, options) => options?.pickImage?.(editor),
  },
  {
    id: "clearFormatting",
    label: "清除格式",
    description: "恢复为普通文本",
    icon: Eraser,
    colorClass: "text-red-500",
    group: "danger",
    searchTerms: ["clear", "remove", "format", "清除", "格式"],
    isActive: () => false,
    run: (editor) => {
      editor.chain().focus().clearNodes().unsetAllMarks().run();
    },
  },
];

export const BLOCK_COMMAND_BY_ID = new Map(
  BLOCK_COMMANDS.map((command) => [command.id, command]),
);
