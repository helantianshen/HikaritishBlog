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
