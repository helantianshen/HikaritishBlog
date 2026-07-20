import { describe, expect, it } from "vitest";

describe("rich text test runtime", () => {
  it("runs in jsdom", () => {
    expect(document.createElement("div")).toBeInstanceOf(HTMLDivElement);
  });
});
