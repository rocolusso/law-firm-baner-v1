import { describe, expect, it } from "vitest";
import {
  ICON_BOUNDS,
  ICON_D,
  ICON_STEM,
  MARK_COLOR,
  MARK_PATHS,
  MARK_POLYS,
  MARK_VIEWBOX,
  WORD_BOUNDS,
  WORD_D,
} from "./clario-mark";

describe("clario mark", () => {
  it("keeps all 12 subpaths from the EPS", () => {
    expect(MARK_PATHS).toHaveLength(12);
    expect(Object.keys(MARK_POLYS)).toHaveLength(12);
  });

  it("every path is closed and starts with a moveto", () => {
    for (const p of MARK_PATHS) {
      expect(p.d.startsWith("M")).toBe(true);
      expect(p.d.endsWith("Z")).toBe(true);
    }
  });

  it("flips the y axis into viewBox space", () => {
    expect(MARK_VIEWBOX).toEqual({ width: 612, height: 210 });
    for (const poly of Object.values(MARK_POLYS)) {
      for (const [x, y] of poly) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(612);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(210);
      }
    }
    // знак слева от слова, верхушка знака выше нижней границы слова
    expect(ICON_BOUNDS.x1).toBeLessThan(WORD_BOUNDS.x0);
    expect(ICON_BOUNDS.y0).toBeLessThan(WORD_BOUNDS.y0);
  });

  it("uses the logo ink color, not the white background", () => {
    expect(MARK_COLOR).toBe("#18181B");
  });

  it("icon has the outline plus two pan holes", () => {
    expect((ICON_D.match(/M/g) ?? []).length).toBe(3);
    expect((WORD_D.match(/M/g) ?? []).length).toBe(9);
  });

  it("stem sits in the middle of the icon", () => {
    const mid = (ICON_BOUNDS.x0 + ICON_BOUNDS.x1) / 2;
    expect(ICON_STEM.x0).toBeLessThan(mid);
    expect(ICON_STEM.x1).toBeGreaterThan(mid);
  });
});
