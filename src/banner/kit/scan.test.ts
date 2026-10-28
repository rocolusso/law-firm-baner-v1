import { describe, expect, it } from "vitest";
import { abstractAmount, scanFronts, scanLine, scanMask, scanPos } from "./scan";

const T = { in: [10, 50], out: [60, 100] } as const;

describe("scan", () => {
  it("fronts move monotonically and stay inactive outside the window", () => {
    expect(scanFronts(0, T).active).toBe(false);
    expect(scanFronts(30, T).active).toBe(true);
    expect(scanFronts(200, T).active).toBe(false);
    expect(scanFronts(40, T).p1).toBeGreaterThan(scanFronts(20, T).p1);
  });

  it("abstract amount is 1 between fronts and 0 outside", () => {
    expect(abstractAmount(0.5, 0.9, 0.1)).toBe(1);
    expect(abstractAmount(0.95, 0.9, 0.1)).toBe(0);
    expect(abstractAmount(0.05, 0.9, 0.1)).toBe(0);
  });

  it("scanPos maps the frame centre to 0.5", () => {
    expect(scanPos(960, 540, 1920, 1080)).toBeCloseTo(0.5, 5);
  });

  it("scan line passes through the front position", () => {
    const l = scanLine(0.5, 1920, 1080);
    expect((l.x1 + l.x2) / 2).toBeCloseTo(960, 3);
    expect((l.y1 + l.y2) / 2).toBeCloseTo(540, 3);
  });

  it("mask is a css gradient", () => {
    expect(scanMask(0.6, 0.2)).toContain("linear-gradient");
  });
});
