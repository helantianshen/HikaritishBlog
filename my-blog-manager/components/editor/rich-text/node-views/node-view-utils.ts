export function clampImageWidth(width: number, maxWidth: number): number {
  return Math.min(Math.max(Math.round(width), 80), Math.max(80, maxWidth));
}

export function countCodeLines(content: string): number {
  const normalized = content.endsWith("\n") ? content.slice(0, -1) : content;
  return normalized.split("\n").length;
}

export function filterCodeLanguages(
  languages: readonly string[],
  query: string,
): string[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [...languages];

  const prefix: string[] = [];
  const contains: string[] = [];
  for (const language of languages) {
    const candidate = language.toLowerCase();
    if (candidate.startsWith(normalized)) prefix.push(language);
    else if (candidate.includes(normalized)) contains.push(language);
  }
  return [...prefix, ...contains];
}
