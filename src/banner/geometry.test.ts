import { describe, expect, it } from "vitest";
import { compositionSize, coverRect, ctaWidth, getLayout, toFrame } from "./geometry";

describe("coverRect", () => {
  const focal = { x: 0.5, y: 0.5 };

  it("always covers the frame", () => {
    for (const [W, H] of [
      [1920, 1080],
      [1080, 1920],
      [1440, 480],
      [600, 600],
    ]) {
      const r = coverRect(W, H, 2000, 1334, 1, focal);
      expect(r.left).toBeLessThanOrEqual(0);
      expect(r.top).toBeLessThanOrEqual(0);
      expect(r.left + r.width).toBeGreaterThanOrEqual(W - 0.001);
      expect(r.top + r.height).toBeGreaterThanOrEqual(H - 0.001);
    }
  });

  it("keeps the focal point near the target when there is room", () => {
    const r = coverRect(1080, 1920, 2000, 1334, 1, { x: 0.515, y: 0.46 });
    const p = toFrame(r, { x: 0.515, y: 0.46 });
    expect(Math.abs(p.x - 540)).toBeLessThan(1);
  });

  it("zoom enlarges the rect", () => {
    const a = coverRect(1920, 1080, 2000, 1334, 1, focal);
    const b = coverRect(1920, 1080, 2000, 1334, 1.1, focal);
    expect(b.width).toBeGreaterThan(a.width);
  });
});

describe("compositionSize", () => {
  it("keeps the container aspect ratio", () => {
    const wide = compositionSize(1600, 800);
    expect(wide.width / wide.height).toBeCloseTo(2, 1);
    const tall = compositionSize(390, 844);
    expect(tall.height).toBe(1920);
    expect(tall.width / tall.height).toBeCloseTo(390 / 844, 1);
  });

  it("returns even dimensions", () => {
    const s = compositionSize(333, 777);
    expect(s.width % 2).toBe(0);
    expect(s.height % 2).toBe(0);
  });
});

describe("getLayout", () => {
  it("switches orientation by aspect ratio", () => {
    expect(getLayout(1920, 1080).orientation).toBe("wide");
    expect(getLayout(1080, 1920).orientation).toBe("tall");
    expect(getLayout(1000, 1000).orientation).toBe("wide");
  });

  it("keeps the headline inside the frame", () => {
    for (const [W, H] of [
      [1920, 1080],
      [1920, 640],
      [1080, 1920],
      [1080, 2300],
    ]) {
      const l = getLayout(W, H);
      expect(l.anchor.x).toBeGreaterThan(0);
      expect(l.headSize).toBeLessThan(Math.min(W, H));
    }
  });

  it("cta is 48 css px tall at any composition scale", () => {
    // 1280x800 контейнер: длинная сторона 1920, значит px = 1.5
    const [W, H] = [1920, 1200];
    const px = 1920 / 1280;
    expect(getLayout(W, H, px).cta.height / px).toBeCloseTo(48, 5);
    // 449x642: длинная сторона 1920, px = 1920 / 642
    const [w2, h2] = [1343, 1920];
    const px2 = 1920 / 642;
    expect(getLayout(w2, h2, px2).cta.height / px2).toBeCloseTo(48, 5);
  });

  it("cta width fits the label with padding", () => {
    const l = getLayout(1920, 1200, 1.5);
    const w = ctaWidth("Отримати консультацію", l.cta);
    expect(w).toBeGreaterThan(l.cta.padX * 2);
    expect(w).toBeLessThan(1920 * 0.5);
  });
});
