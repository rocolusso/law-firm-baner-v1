import { describe, expect, it } from "vitest";
import {
  FORMAT_IDS,
  LANGS,
  STYLE_IDS,
  parseFormatId,
  parseLang,
  parseStyleId,
} from "../types";
import { copy, getCopy } from "./copy";

describe("copy", () => {
  it("has exact headline text in both languages", () => {
    expect(getCopy("uk").lines.wide.join(" ")).toBe(
      "CLARIO – це креативний підхід до справи!",
    );
    expect(getCopy("ru").lines.wide.join(" ")).toBe(
      "CLARIO – это креативный подход к делу!",
    );
  });

  it("tall lines and beats rebuild the same sentence", () => {
    for (const lang of LANGS) {
      const c = copy[lang];
      const wide = c.lines.wide.join(" ");
      expect(c.lines.tall.join(" ")).toBe(wide);
      expect(c.beats.join(" ")).toBe(wide);
      expect(c.plates[0]).toBe("CLARIO");
    }
  });

  it("cta text matches the brief", () => {
    expect(copy.uk.cta).toBe("Отримати консультацію");
    expect(copy.ru.cta).toBe("Получить консультацию");
  });

  it("labels exist for every style and format", () => {
    for (const lang of LANGS) {
      for (const s of STYLE_IDS) expect(copy[lang].ui.styles[s]).toBeTruthy();
      for (const f of FORMAT_IDS) expect(copy[lang].ui.formats[f]).toBeTruthy();
    }
  });

  it("aria label contains headline and cta", () => {
    for (const lang of LANGS) {
      const c = copy[lang];
      expect(c.ariaLabel).toContain(c.cta);
      expect(c.ariaLabel).toContain(c.lines.wide[0]);
    }
  });
});

describe("parse helpers", () => {
  it("accepts known ids and rejects the rest", () => {
    expect(parseStyleId("glass")).toBe("glass");
    expect(parseStyleId("nope")).toBeNull();
    expect(parseStyleId(null)).toBeNull();
    expect(parseLang("ru")).toBe("ru");
    expect(parseLang("en")).toBeNull();
    expect(parseFormatId("tall")).toBe("tall");
    expect(parseFormatId("x")).toBeNull();
  });
});
