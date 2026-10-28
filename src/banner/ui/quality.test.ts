import { describe, expect, it } from "vitest";
import { chooseTier } from "./quality";

const desktop = { coarsePointer: false, minScreen: 1080, deviceMemory: 8, cores: 8 };

describe("chooseTier", () => {
  it("gives a desktop the full effects", () => {
    expect(chooseTier(desktop)).toBe("high");
  });

  it("gives a phone without deviceMemory (iPhone) the light mode", () => {
    expect(chooseTier({ coarsePointer: true, minScreen: 390 })).toBe("low");
  });

  it("gives a weak machine the light mode", () => {
    expect(chooseTier({ ...desktop, cores: 4 })).toBe("low");
    expect(chooseTier({ ...desktop, deviceMemory: 2 })).toBe("low");
  });

  it("keeps a big touch screen at full quality", () => {
    expect(chooseTier({ ...desktop, coarsePointer: true, minScreen: 1024 })).toBe("high");
  });

  it("Save-Data forces the lowest tier", () => {
    expect(chooseTier({ ...desktop, saveData: true })).toBe("min");
  });
});
