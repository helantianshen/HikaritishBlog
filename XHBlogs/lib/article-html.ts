export interface TableOfContentsItem {
  level: number;
  text: string;
  id: string;
}

export function addHeadingIDs(html: string) {
  const toc: TableOfContentsItem[] = [];
  let index = 0;
  const contentHtml = html.replace(
    /<h([1-3])([^>]*)>([\s\S]*?)<\/h\1>/gi,
    (_match, level: string, attributes: string, innerHTML: string) => {
      const existingID = attributes.match(/\sid=(?:"([^"]+)"|'([^']+)')/i);
      const id = existingID?.[1] || existingID?.[2] || `section-${++index}`;
      const text = decodeBasicEntities(innerHTML.replace(/<[^>]*>/g, "")).trim();
      if (text) toc.push({ level: Number(level), text, id });
      const nextAttributes = existingID
        ? attributes
        : `${attributes} id="${id}"`;
      return `<h${level}${nextAttributes}>${innerHTML}</h${level}>`;
    },
  );
  return { contentHtml, toc };
}

export function htmlToText(html: string) {
  return decodeBasicEntities(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]*>/g, ""),
  )
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodeBasicEntities(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}
