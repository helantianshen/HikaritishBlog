# Rich Text Editor React Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the complete `ohmyblog` article-body editor experience to React inside `my-blog-manager` without changing the existing XinghuisamaBlogs editor page or toolbar styling.

**Architecture:** Keep `components/editor/RichTextEditor.tsx` as the stable visual shell and HTML adapter. Add focused React/Tiptap modules under `components/editor/rich-text/` for schema extensions, command registries, menus, hooks, and NodeViews; all new overlays use the existing indigo/slate glass styling and do not import Vue or `ohmyblog` CSS.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tiptap 3.28.0, ProseMirror, lowlight, tiptap-markdown, Vitest, jsdom, React Testing Library.

---

### Task 1: Test Runtime And Compatible Editor Dependencies

**Files:**
- Modify: `my-blog-manager/package.json`
- Modify: `my-blog-manager/package-lock.json`
- Create: `my-blog-manager/vitest.config.ts`
- Create: `my-blog-manager/vitest.setup.ts`
- Create: `my-blog-manager/components/editor/rich-text/__tests__/smoke.test.ts`

- [ ] **Step 1: Add the test command and required dependencies**

Set every direct `@tiptap/*` dependency to `3.28.0`. Add
`@tiptap/extension-character-count`, `@tiptap/extension-table`, and
`@tiptap/suggestion` at `3.28.0`. Add `vitest`, `jsdom`,
`@testing-library/react`, and `@testing-library/jest-dom` as development
dependencies, plus this script:

```json
{
  "scripts": {
    "test": "vitest run"
  }
}
```

- [ ] **Step 2: Add the Vitest environment**

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["components/**/*.test.{ts,tsx}"],
  },
});
```

```ts
// vitest.setup.ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 3: Install dependencies and prove the runner works**

```ts
// components/editor/rich-text/__tests__/smoke.test.ts
import { describe, expect, it } from "vitest";

describe("rich text test runtime", () => {
  it("runs in jsdom", () => {
    expect(document.createElement("div")).toBeInstanceOf(HTMLDivElement);
  });
});
```

Run: `npm install`

Run: `npm test -- components/editor/rich-text/__tests__/smoke.test.ts`

Expected: one passing test.

### Task 2: Shared HTML, Slash, And Block Command Models

**Files:**
- Create: `my-blog-manager/components/editor/rich-text/editor-html.ts`
- Create: `my-blog-manager/components/editor/rich-text/commands/block-commands.ts`
- Create: `my-blog-manager/components/editor/rich-text/menus/slash/slash-model.ts`
- Create: `my-blog-manager/components/editor/rich-text/__tests__/editor-html.test.ts`
- Create: `my-blog-manager/components/editor/rich-text/__tests__/slash-model.test.ts`
- Create: `my-blog-manager/components/editor/rich-text/__tests__/block-commands.test.ts`

- [ ] **Step 1: Write failing HTML boundary tests**

```ts
import { describe, expect, it } from "vitest";
import { normalizeEditorHtml, prepareInitialContent } from "../editor-html";

describe("editor HTML boundary", () => {
  it("keeps the existing empty-paragraph normalization", () => {
    expect(normalizeEditorHtml("<p></p><p><br></p>"))
      .toBe("<br>&zwj;<br>&zwj;");
  });

  it("converts legacy markdown strike syntax before loading", () => {
    expect(prepareInitialContent("<p>~~legacy~~</p>"))
      .toBe("<p><s>legacy</s></p>");
  });
});
```

Run the test and expect a module-not-found failure.

- [ ] **Step 2: Implement the stable HTML adapter**

```ts
export function normalizeEditorHtml(html: string): string {
  return html
    .replace(/<p><\/p>/gi, "<br>&zwj;")
    .replace(/<p><br><\/p>/gi, "<br>&zwj;");
}

export function prepareInitialContent(content: string): string {
  return content.replace(/~~([\s\S]*?)~~/g, "<s>$1</s>");
}
```

- [ ] **Step 3: Write failing command-registry and slash-filter tests**

```ts
import { describe, expect, it } from "vitest";
import { BLOCK_COMMANDS } from "../commands/block-commands";
import { filterSlashGroups } from "../menus/slash/slash-model";

describe("editor commands", () => {
  it("offers every required block action once", () => {
    expect(BLOCK_COMMANDS.map((item) => item.id)).toEqual([
      "paragraph", "heading1", "heading2", "heading3", "bulletList",
      "orderedList", "taskList", "codeBlock", "quote", "horizontalRule",
      "table", "image", "clearFormatting",
    ]);
  });

  it("finds slash commands by Chinese and English search terms", () => {
    expect(filterSlashGroups("biaoge").flatMap((g) => g.commands)
      .map((command) => command.id)).toEqual(["table"]);
    expect(filterSlashGroups("代码").flatMap((g) => g.commands)
      .map((command) => command.id)).toEqual(["codeBlock"]);
  });
});
```

Run and expect missing-module failures, then implement typed registries with
the exact IDs above. Each command receives an `Editor`, focuses it, and runs
the corresponding Tiptap chain. Table inserts 2x3 cells; image delegates to an
injected picker; clear formatting calls `clearNodes().unsetAllMarks()`.

- [ ] **Step 4: Run all Task 2 tests**

Run: `npm test -- components/editor/rich-text/__tests__/editor-html.test.ts components/editor/rich-text/__tests__/slash-model.test.ts components/editor/rich-text/__tests__/block-commands.test.ts`

Expected: all tests pass.

### Task 3: Shared Tiptap Schema And Interaction Extensions

**Files:**
- Create: `my-blog-manager/components/editor/rich-text/extensions/marks.ts`
- Create: `my-blog-manager/components/editor/rich-text/extensions/indent.ts`
- Create: `my-blog-manager/components/editor/rich-text/extensions/cell-background.ts`
- Create: `my-blog-manager/components/editor/rich-text/extensions/select-all.ts`
- Create: `my-blog-manager/components/editor/rich-text/extensions/trailing-node.ts`
- Create: `my-blog-manager/components/editor/rich-text/extensions/editor-extensions.ts`
- Create: `my-blog-manager/components/editor/rich-text/__tests__/editor-extensions.test.ts`

- [ ] **Step 1: Write the failing extension contract test**

```ts
import { describe, expect, it } from "vitest";
import { createEditorExtensions } from "../extensions/editor-extensions";

describe("editor extensions", () => {
  it("registers the complete schema and interaction set", () => {
    const names = createEditorExtensions({ placeholder: "开始写作" })
      .map((extension) => extension.name);
    for (const name of [
      "paragraph", "heading", "bulletList", "orderedList", "taskList",
      "table", "tableRow", "tableHeader", "tableCell", "image",
      "codeBlock", "indent", "cellBackground", "smartSelectAll",
      "trailingNode", "characterCount", "placeholder", "markdown",
    ]) expect(names).toContain(name);
  });
});
```

Run and expect the missing factory failure.

- [ ] **Step 2: Port pure extensions from `ohmyblog`**

Port the existing custom mark input rules, indent/outdent commands, cell
background attributes, progressive select-all behavior, and trailing paragraph
plugin. Imports must come from `@tiptap/core` or `@tiptap/pm/*`; do not import
Vue, router, i18n, or `ohmyblog` aliases.

- [ ] **Step 3: Build one extension factory**

`createEditorExtensions({ placeholder, imageNodeView?, codeBlockNodeView? })`
must configure StarterKit, the existing font-size/superscript/subscript/color
features, custom marks, lowlight code block, resizable image, TableKit, task
lists, indentation, link behavior, CharacterCount, Placeholder, Markdown,
SmartSelectAll, TrailingNode, and cell background. Disable duplicate
StarterKit extensions before adding replacements.

- [ ] **Step 4: Run extension tests**

Run: `npm test -- components/editor/rich-text/__tests__/editor-extensions.test.ts`

Expected: the schema test passes without duplicate-extension warnings.

### Task 4: React Image And Code Block NodeViews

**Files:**
- Create: `my-blog-manager/components/editor/rich-text/node-views/ImageNodeView.tsx`
- Create: `my-blog-manager/components/editor/rich-text/node-views/CodeBlockNodeView.tsx`
- Create: `my-blog-manager/components/editor/rich-text/node-views/node-view-utils.ts`
- Create: `my-blog-manager/components/editor/rich-text/__tests__/node-view-utils.test.ts`

- [ ] **Step 1: Write failing utility tests**

```ts
import { describe, expect, it } from "vitest";
import { clampImageWidth, countCodeLines } from "../node-views/node-view-utils";

describe("node view utilities", () => {
  it("keeps image widths usable", () => {
    expect(clampImageWidth(20, 640)).toBe(80);
    expect(clampImageWidth(900, 640)).toBe(640);
  });

  it("does not count the ProseMirror trailing newline", () => {
    expect(countCodeLines("a\nb\n")).toBe(2);
    expect(countCodeLines("")).toBe(1);
  });
});
```

Run and expect missing exports, then implement the two pure functions.

- [ ] **Step 2: Implement `ImageNodeView`**

Use `NodeViewWrapper` and `ReactNodeViewRenderer`. Render the existing rounded,
shadowed image appearance, a right-edge resize handle, and a selected indigo
outline. Pointer move changes local width only; pointer up calls
`updateAttributes({ width })` once. Clean up document listeners on unmount.

- [ ] **Step 3: Implement `CodeBlockNodeView`**

Use `NodeViewWrapper` and `NodeViewContent`. Render a compact header with the
existing dark code palette, searchable language input, line-number column,
and copy icon with 1.5-second confirmation. Language changes call
`updateAttributes({ language })`; line count uses `countCodeLines`.

- [ ] **Step 4: Run tests and type-check the NodeViews**

Run: `npm test -- components/editor/rich-text/__tests__/node-view-utils.test.ts`

Run: `npx tsc --noEmit`

Expected: utility tests pass and NodeView props type-check.

### Task 5: Slash Menu, Bubble Menu, And Image Upload

**Files:**
- Create: `my-blog-manager/components/editor/rich-text/hooks/use-anchored-menu.ts`
- Create: `my-blog-manager/components/editor/rich-text/hooks/use-editor-image-upload.ts`
- Create: `my-blog-manager/components/editor/rich-text/menus/slash/SlashMenu.tsx`
- Create: `my-blog-manager/components/editor/rich-text/menus/SelectionBubbleMenu.tsx`
- Create: `my-blog-manager/components/editor/rich-text/menus/ImageBubbleMenu.tsx`
- Create: `my-blog-manager/components/editor/rich-text/__tests__/SlashMenu.test.tsx`

- [ ] **Step 1: Write failing slash keyboard tests**

Render `SlashMenu` with three command records and assert ArrowDown changes the
active item, Enter executes it once, and Escape calls `onClose`. Also assert
the menu uses `role="listbox"` and commands use `role="option"`.

- [ ] **Step 2: Implement anchored menu behavior**

`useAnchoredMenu` accepts an anchor rectangle getter and returns fixed viewport
coordinates clamped to an 8px gutter. It updates on editor selection and closes
on outside pointer down, Escape, scroll, or resize. All listeners are cleaned
up on unmount.

- [ ] **Step 3: Implement the slash menu**

Listen to editor transactions. Show the menu when text from the current text
block start to the cursor matches `/query`. Filter with `filterSlashGroups`,
position from `editor.view.coordsAtPos`, delete the slash range on selection,
run the command, and restore editor focus. Style it with the existing
white/slate glass surface, `rounded-2xl`, indigo active state, and short
opacity/translate transition.

- [ ] **Step 4: Implement text and image bubble menus**

The text menu appears for non-empty text or cell selections and includes block
conversion, alignment, indent/outdent, bold, italic, strike, underline, inline
code, link, text color, highlight, and contextual table actions. The image menu
appears for an image `NodeSelection` and sets left, center, or right alignment
on the parent text block.

- [ ] **Step 5: Implement paste/drop image upload**

`useEditorImageUpload` reads `/backend_config.json`, posts `file`, `url`, and
`token` to `/api/picbed/upload` using the existing `siteConfig`, inserts the
returned URL, and reports failures with `useToast`. Paste and drop intercept
only image files; other data returns `false` to ProseMirror.

- [ ] **Step 6: Run menu tests**

Run: `npm test -- components/editor/rich-text/__tests__/SlashMenu.test.tsx`

Expected: keyboard, close, and accessibility tests pass.

### Task 6: Block Handle, Ordered Lists, And Full Table Controls

**Files:**
- Create: `my-blog-manager/components/editor/rich-text/hooks/use-hovered-block.ts`
- Create: `my-blog-manager/components/editor/rich-text/hooks/use-block-drag.ts`
- Create: `my-blog-manager/components/editor/rich-text/menus/BlockHandle.tsx`
- Create: `my-blog-manager/components/editor/rich-text/menus/TableControls.tsx`
- Create: `my-blog-manager/components/editor/rich-text/menus/OrderedListMenu.tsx`
- Create: `my-blog-manager/components/editor/rich-text/table/table-commands.ts`
- Create: `my-blog-manager/components/editor/rich-text/__tests__/table-commands.test.ts`

- [ ] **Step 1: Write failing table command tests**

Create an in-memory Tiptap editor with the shared extensions. Insert a 2x3
table and assert the typed table helpers can add/delete rows and columns,
toggle headers, merge/split a selected cell range, and set cell background.
Assert row and column reorder helpers preserve all cell text.

- [ ] **Step 2: Implement typed table helpers**

Wrap Tiptap table commands and `moveTableRow`/`moveTableColumn` from
`@tiptap/pm/tables`. Helpers return booleans and never throw when the selection
is outside a table.

- [ ] **Step 3: Implement the floating block handle**

Track the hovered top-level editor block, including table wrappers. Empty blocks
show a plus button; populated blocks show a grip button and conversion menu.
Drag start creates a `NodeSelection`, packages the selected slice into the data
transfer payload, and lets ProseMirror display its drop cursor. Hide the handle
during scroll, resize, drag, and editor blur.

- [ ] **Step 4: Implement table handles and reorder controls**

Render row and column selection handles around the active table. Handles select
the associated cells; plus controls insert adjacent rows/columns; drag gestures
call the tested reorder helpers. Context actions provide merge/split, header,
background, and deletion commands. Controls are positioned as overlays and do
not alter table or editor layout dimensions.

- [ ] **Step 5: Implement ordered-list number menu**

When the cursor is inside an ordered list, expose a compact marker menu with
continue numbering, start at 1, and set explicit start number. Persist the
number through the ordered-list `start` attribute.

- [ ] **Step 6: Run table tests**

Run: `npm test -- components/editor/rich-text/__tests__/table-commands.test.ts`

Expected: all table operations and reorder preservation tests pass.

### Task 7: Integrate The Port Without Restyling `RichTextEditor`

**Files:**
- Modify: `my-blog-manager/components/editor/RichTextEditor.tsx`
- Create: `my-blog-manager/components/editor/rich-text/EditorOverlays.tsx`
- Create: `my-blog-manager/components/editor/rich-text/__tests__/RichTextEditor.test.tsx`

- [ ] **Step 1: Write failing public-contract tests**

Render `RichTextEditor` and assert:

- The title input keeps its existing placeholder and locked behavior.
- The external handle exposes `insertImage` and `getContent`.
- `getContent` applies `normalizeEditorHtml`.
- An editor transaction calls `onChange`.
- Existing toolbar labels and commands remain present.

- [ ] **Step 2: Replace only the editor engine wiring**

Move extension construction to `createEditorExtensions`, register the React
NodeViews, connect image paste/drop handlers, and compose `EditorOverlays`
around the existing `EditorContent`. Keep the existing component props,
imperative handle, title JSX, toolbar JSX, inline content style rules, outer
containers, and Tailwind classes unchanged.

- [ ] **Step 3: Add only feature-required content rules**

Append selectors scoped under `.editor-content-area` for task checkboxes,
tables, selected cells, image resize handles, code line numbers, and block-drop
indicators. Do not modify existing heading, paragraph, quote, code color, image,
spacing, typography, or toolbar rules.

- [ ] **Step 4: Run the focused editor suite**

Run: `npm test -- components/editor/rich-text/__tests__`

Expected: all tests pass with no React act warnings or Tiptap duplicate-name
warnings.

### Task 8: Regression And Production Verification

**Files:**
- Modify only when a component-port defect is demonstrated by a failing test.

- [ ] **Step 1: Run static verification**

Run: `npm run lint`

Run: `npx tsc --noEmit`

Run: `npm run build`

Expected: all commands exit successfully. Pre-existing errors outside editor
files are recorded separately and are not fixed in this scope.

- [ ] **Step 2: Run the complete editor interaction suite**

Run: `npm test`

Expected: all tests pass with clean output.

- [ ] **Step 3: Start the application and perform visual checks**

Run: `npm run dev`

Open `/editor?type=post&id=new` in a desktop viewport and verify light/dark
modes, toolbar wrapping, title dimensions, editor padding, sidebar width, slash
menu, bubble menu, block handle, tables, image resize, and code blocks. Compare
the shell before and after: `app/editor/page.tsx`, `MetaMatrix.tsx`, and
`FloatingImageTool.tsx` must have no diff.

- [ ] **Step 4: Review the final diff**

Run: `git diff --check`

Run: `git diff --stat HEAD~1..HEAD`

Confirm no Vue runtime, `ohmyblog` CSS, Python API changes, public renderer
changes, automatic saving, or unrelated main-project fixes are present.
