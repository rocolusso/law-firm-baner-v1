import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  getTheme,
  goldGradient,
  hexToHslTriplet,
  readableOn,
  themeCssVars,
  themes,
} from "./theme";

describe("theme", () => {
  it("defaults to luxury", () => {
    expect(getTheme(undefined).id).toBe("luxury");
  });

  it("contrast math matches known values", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 0);
    expect(contrastRatio("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 5);
  });

  it("ink and paper are readable in every theme", () => {
    for (const t of Object.values(themes)) {
      expect(contrastRatio(t.ink, t.paper)).toBeGreaterThanOrEqual(7);
    }
  });

  it("readableOn picks a text color with contrast >= 4.5 on navy and on paper", () => {
    for (const t of Object.values(themes)) {
      for (const bg of [t.navy, t.navyDeep, t.paper, t.goldLight]) {
        expect(contrastRatio(readableOn(bg, t), bg)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("ink on the whole gold gradient keeps contrast >= 4.5 (gold cta)", () => {
    const t = getTheme("luxury");
    for (const g of [t.goldLight, t.gold, t.goldMid, t.goldDark]) {
      expect(contrastRatio(t.ink, g)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("converts hex to hsl triplet", () => {
    expect(hexToHslTriplet("#FFFFFF")).toBe("0 0% 100%");
    expect(hexToHslTriplet("#000000")).toBe("0 0% 0%");
  });

  it("exports site-compatible css vars", () => {
    const vars = themeCssVars(getTheme("luxury"));
    expect(vars["--background"]).toBe("0 0% 100%");
    expect(vars["--radius"]).toBe("0.75rem");
  });

  it("gold gradient lists the four gold steps", () => {
    const g = goldGradient(getTheme("luxury"));
    expect(g).toContain("#FCEBB4");
    expect(g).toContain("#A67831");
  });
});
