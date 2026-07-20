import { describe, expect, it } from "vitest";
import { filterSlashGroups } from "../menus/slash/slash-model";

describe("slash command filtering", () => {
  it("finds commands by Chinese and English search terms", () => {
    expect(filterSlashGroups("biaoge").flatMap((group) => group.commands)
      .map((command) => command.id)).toEqual(["table"]);
    expect(filterSlashGroups("代码").flatMap((group) => group.commands)
      .map((command) => command.id)).toEqual(["codeBlock"]);
  });

  it("retains group order for an empty query", () => {
    expect(filterSlashGroups("").map((group) => group.id)).toEqual([
      "basic",
      "common",
      "list",
      "danger",
    ]);
  });
});
