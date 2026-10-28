import { describe, expect, it } from "vitest";
import { FPS } from "../banner.config";
import { STYLE_IDS } from "../types";
import { getStyle, styles } from "./registry";

describe("style registry", () => {
  it("registers every style id exactly once", () => {
    expect(Object.keys(styles).sort()).toEqual([...STYLE_IDS].sort());
    for (const id of STYLE_IDS) expect(getStyle(id).id).toBe(id);
  });

  it("each style has a sane loop length and a poster frame inside it", () => {
    for (const id of STYLE_IDS) {
      const s = getStyle(id);
      expect(s.frames).toBeGreaterThanOrEqual(FPS * 8);
      expect(s.frames).toBeLessThanOrEqual(FPS * 14);
      expect(s.poster).toBeGreaterThan(0);
      expect(s.poster).toBeLessThan(s.frames);
    }
  });
});
