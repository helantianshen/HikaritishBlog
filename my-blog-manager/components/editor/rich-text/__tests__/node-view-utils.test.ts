import { describe, expect, it } from "vitest";
import {
  clampImageWidth,
  countCodeLines,
  filterCodeLanguages,
} from "../node-views/node-view-utils";

describe("node view utilities", () => {
  it("keeps image widths inside the editor", () => {
    expect(clampImageWidth(20, 640)).toBe(80);
    expect(clampImageWidth(900, 640)).toBe(640);
    expect(clampImageWidth(320, 640)).toBe(320);
  });

  it("does not count the ProseMirror trailing newline", () => {
    expect(countCodeLines("a\nb\n")).toBe(2);
    expect(countCodeLines("")).toBe(1);
  });

  it("ranks language prefix matches before contains matches", () => {
    expect(filterCodeLanguages(["typescript", "javascript", "text"], "script"))
      .toEqual(["typescript", "javascript"]);
    expect(filterCodeLanguages(["typescript", "text"], "t"))
      .toEqual(["typescript", "text"]);
  });
});
