import { describe, expect, it } from "vitest";
import { clampMenuPosition } from "../hooks/use-anchored-menu";

describe("clampMenuPosition", () => {
  it("keeps menus inside the viewport gutter", () => {
    expect(clampMenuPosition(
      { left: -20, top: -30 },
      { width: 240, height: 80 },
      { width: 800, height: 600 },
    )).toEqual({ left: 8, top: 8 });

    expect(clampMenuPosition(
      { left: 760, top: 580 },
      { width: 240, height: 80 },
      { width: 800, height: 600 },
    )).toEqual({ left: 552, top: 512 });
  });
});
