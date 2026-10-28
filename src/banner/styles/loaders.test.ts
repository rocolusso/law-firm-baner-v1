import { describe, expect, it } from "vitest";
import { STYLE_IDS } from "../types";
import { loaders, loadStyle } from "./loaders";

describe("style loaders", () => {
  it("has a loader for every style id and nothing else", () => {
    expect(Object.keys(loaders).sort()).toEqual([...STYLE_IDS].sort());
  });

  it("each loader resolves the style with the same id", async () => {
    for (const id of STYLE_IDS) {
      const def = await loadStyle(id);
      expect(def.id).toBe(id);
      expect(typeof def.Component).toBe("function");
    }
  });
});
