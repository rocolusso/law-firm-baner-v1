import { describe, expect, it } from "vitest";
import { ICON_BOUNDS, MARK_POLYS } from "../brand/clario-mark";
import { FPS } from "../banner.config";
import { dotsToScales, iconTargets } from "./dots-to-scales";

/** Эталон: каждая точка против каждого ребра, правило чётности. */
function inside(x: number, y: number): boolean {
  let hits = 0;
  for (const name of ["icon", "iconHoleRight", "iconHoleLeft"] as const) {
    const poly = MARK_POLYS[name];
    let ins = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i];
      const [xj, yj] = poly[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins;
    }
    if (ins) hits++;
  }
  return hits % 2 === 1;
}

describe("iconTargets", () => {
  const step = 1.55;
  const fast = iconTargets(step);

  it("every target lies inside the icon", () => {
    for (const [x, y] of fast) expect(inside(x, y)).toBe(true);
  });

  it("finds the same grid nodes as the brute-force check", () => {
    const b = ICON_BOUNDS;
    let brute = 0;
    for (let y = b.y0 + step / 2; y < b.y1; y += step)
      for (let x = b.x0 + step / 2; x < b.x1; x += step) if (inside(x, y)) brute++;
    expect(Math.abs(fast.length - brute)).toBeLessThanOrEqual(Math.ceil(brute * 0.005));
  });
});

describe("dots-to-scales timing", () => {
  it("keeps the headline and button on screen for at least 4 seconds before the white fade", () => {
    // Кнопка полностью видна примерно с кадра 314, белое затухание начинается на кадре 450
    const ctaFullyVisible = 252 + 3 * 7 + 34;
    const whiteOutFrom = 450;
    expect((whiteOutFrom - ctaFullyVisible) / FPS).toBeGreaterThanOrEqual(4);
    expect(dotsToScales.frames).toBe(480);
    expect(dotsToScales.poster).toBeGreaterThan(whiteOutFrom - 60);
    expect(dotsToScales.poster).toBeLessThan(whiteOutFrom);
  });
});
