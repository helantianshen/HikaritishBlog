export function normalizeEditorHtml(html: string): string {
  return html
    .replace(/<p><\/p>/gi, "<br>&zwj;")
    .replace(/<p><br><\/p>/gi, "<br>&zwj;");
}

export function prepareInitialContent(content: string): string {
  return content.replace(/~~([\s\S]*?)~~/g, "<s>$1</s>");
}
