# Rich Text Editor React Port Design

## Goal

Replace the article body editing implementation in `my-blog-manager` with a
React port of the full `ohmyblog` editor feature set while preserving the
existing XinghuisamaBlogs editor page, toolbar, styling, public component API,
and HTML save boundary.

## Scope

The port includes:

- Slash command menu.
- Selection bubble menu.
- Block insertion, transformation, and drag handle.
- Table insertion, selection, row and column operations, reordering, cell
  merging, headers, alignment, and cell background controls.
- Paste and drop image upload, image alignment, and image resizing.
- Code blocks with syntax highlighting, language selection, line numbers, and
  copy feedback.
- Markdown paste transformation.
- Smart select-all behavior, trailing paragraph behavior, custom mark input
  rules, list behavior, ordered-list number controls, and character counts.

The following are explicitly outside this change:

- Main-project draft ID handling.
- Operation queue type inconsistencies.
- `ohmyblog` slug, pinned, archive, article-status, or settings-panel behavior.
- Changes to the Python draft and publish APIs.
- Changes to the public `XHBlogs` renderer.
- Automatic draft saving.

## Design Principle

Existing style is the source of truth. The current page layout, title area,
top toolbar, color pickers, editor padding, glass surfaces, dark mode, rounded
corners, typography, and content styles remain unchanged. No `ohmyblog` CSS,
Vue component markup, theme token, or base component is imported.

New menus and node controls use the existing indigo, slate, white-alpha, and
dark-mode classes already present in `RichTextEditor.tsx`. They are compact
editor controls rather than a replacement visual system. Motion is limited to
short opacity and transform transitions and respects reduced-motion settings.

## Architecture

`components/editor/RichTextEditor.tsx` remains the public component and visual
composition surface. Its existing props and imperative handle remain stable:

```ts
interface RichTextEditorHandle {
  insertImage: (url: string) => void;
  getContent: () => string;
}

interface EditorProps {
  title: string;
  setTitle: (value: string) => void;
  initialContent?: string;
  onOpenImageTool: () => void;
  isTitleLocked?: boolean;
  onChange?: () => void;
}
```

The implementation is split into focused units under
`components/editor/rich-text/`:

- `extensions/`: schema and behavior extensions that do not render React UI.
- `menus/`: slash, bubble, block handle, ordered-list, and table controls.
- `node-views/`: React image and code-block node views.
- `hooks/`: anchored positioning, block hover/drag, image upload, and editor
  selection helpers.
- `commands/`: the shared block-command registry used by all menus.

`RichTextEditor.tsx` owns editor creation, the existing title and toolbar, the
imperative adapter, and composition of the new controls. Feature modules
receive the Tiptap `Editor` instance and expose no page-level state.

## Extension Model

The React editor uses one shared extension factory. It retains all existing
XinghuisamaBlogs capabilities, including font size, superscript, subscript,
text color, multicolor highlight, links, headings, lists, task lists, text
alignment, images, and lowlight code blocks.

It adds React ports of the relevant `ohmyblog` behavior:

- TableKit and cell background attributes.
- Custom list item and ordered-list behavior.
- Markdown-style mark input rules.
- Paragraph and heading indentation.
- Smart select-all and trailing paragraph extensions.
- CharacterCount and Placeholder.
- Markdown pasted-text transformation.
- Slash suggestion and ordered-list number interaction extensions.

All Tiptap packages are kept on one compatible version when dependencies are
installed. Vue-only packages and `VueNodeViewRenderer` are not introduced.

## Menus And Node Views

The slash menu and block handle consume a shared command registry for
paragraphs, H1-H3, bullet lists, ordered lists, task lists, code blocks,
quotes, horizontal rules, tables, images, and clear formatting.

The selection bubble menu provides block conversion, alignment, indentation,
bold, italic, strike, underline, inline code, links, text color, highlight,
and contextual table actions. Selecting an image opens an image-only bubble
menu for alignment.

The image React NodeView stores width in the image node attributes. Dragging
updates only local visual width and commits one transaction on pointer release,
so a complete resize is one undo step.

The code-block React NodeView renders a compact language selector, line-number
column, highlighted editable content, and copy button. The controls use the
current editor's code colors and radii rather than the `ohmyblog` appearance.

The block handle finds the hovered top-level block, exposes insertion and
conversion commands, and packages block dragging through ProseMirror slices.
Table controls use table geometry to expose row and column handles without
changing the editor container dimensions.

## Data Flow

The page continues to load HTML into `initialContent`. Tiptap parses that HTML
with the expanded schema. Editor updates invoke the existing `onChange`
callback.

The imperative `getContent()` method continues to return HTML and retains the
existing empty-paragraph normalization. The page, Python draft API, operation
queue, and publish pipeline therefore require no contract changes.

The existing external `insertImage(url)` method remains available to
`FloatingImageTool`. Paste and file-drop uploads call the existing
`/api/picbed/upload` endpoint through an editor-local upload helper and then
insert the returned URL at the current selection.

## Error Handling

- Failed paste or drop uploads keep the editor selection valid and report the
  failure through the existing toast provider.
- Invalid or empty links remove the link or leave content unchanged.
- Menus close on Escape, outside pointer interaction, editor blur, container
  scroll, and window resize.
- Unsupported pasted files fall through to ProseMirror's default behavior.
- Missing editor instances render no editor body, matching the current
  component, and do not call imperative commands.
- Node-view document listeners are removed on unmount.

## Accessibility And Interaction

- Icon buttons retain tooltips or accessible labels.
- Menus support Arrow Up, Arrow Down, Enter, and Escape.
- Focus returns to the editor after commands.
- Image resize uses pointer events and has a minimum width.
- New animations use opacity and transform with 100-250 ms durations.
- Reduced-motion users receive near-instant transitions.

## Testing

Tests are added before production code and cover:

- Shared command registration and command execution.
- Extension registration and schema compatibility.
- HTML input and output, including existing empty-paragraph normalization.
- Markdown paste transformation.
- Slash filtering and keyboard selection.
- Image width serialization and single-transaction resize behavior.
- Table insertion and contextual commands.
- Code-block language attributes and line counting.
- Existing public `RichTextEditorHandle` behavior.

Verification consists of the focused test suite, ESLint, a production Next.js
build, and manual desktop checks of the existing editor layout in light and
dark modes. The editor page shell and sidebar are compared before and after to
confirm that their dimensions and classes did not change.

## Acceptance Criteria

- All listed `ohmyblog` body-editor features work in the React editor.
- Existing title, toolbar, sidebar, image tool, page layout, and theme styling
  remain visually unchanged.
- Existing articles supplied as HTML load without content loss.
- `getContent()` still returns HTML accepted by the current draft API.
- Existing toolbar commands and external image insertion continue to work.
- No Vue runtime or `ohmyblog` CSS is added to the main project.
- No out-of-scope main-project issue is changed.
