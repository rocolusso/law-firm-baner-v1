export const STYLE_IDS = [
  "light-burst",
  "spotlight",
  "glass",
  "poster",
  "dots-to-scales",
] as const;
export type StyleId = (typeof STYLE_IDS)[number];
export const DEFAULT_STYLE_ID: StyleId = "light-burst";

export const FORMAT_IDS = [
  "site",
  "site-desktop",
  "site-mobile",
  "full",
  "wide",
  "square",
  "tall",
] as const;
export type FormatId = (typeof FORMAT_IDS)[number];
export const DEFAULT_FORMAT_ID: FormatId = "site";

export const LANGS = ["uk", "ru"] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = "uk";

export function parseStyleId(v: string | null | undefined): StyleId | null {
  return (STYLE_IDS as readonly string[]).includes(v ?? "") ? (v as StyleId) : null;
}
export function parseLang(v: string | null | undefined): Lang | null {
  return (LANGS as readonly string[]).includes(v ?? "") ? (v as Lang) : null;
}
export function parseFormatId(v: string | null | undefined): FormatId | null {
  return (FORMAT_IDS as readonly string[]).includes(v ?? "") ? (v as FormatId) : null;
}
