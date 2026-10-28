/**
 * Палитра баннера задаётся ролями. Сцены берут цвета только отсюда, поэтому смена бренда
 * сводится к подмене набора. Набор luxury взят из иконок сайта (синий и золото),
 * набор mono повторяет чёрно-белые токены сайта.
 */

export type ThemeId = "luxury" | "mono";

export type Theme = {
  id: ThemeId;
  paper: string;
  /** Цвет текста на бумаге. */
  ink: string;
  navy: string;
  navyLight: string;
  navyDeep: string;
  goldLight: string;
  gold: string;
  goldMid: string;
  goldDark: string;
  highlight: string;
  muted: string;
  border: string;
  soft: string;
  /** Цвет знака Clario, не перекрашивается палитрой. */
  brand: string;
};

export const themes: Record<ThemeId, Theme> = {
  luxury: {
    id: "luxury",
    paper: "#FFFFFF",
    ink: "#0A1536",
    navy: "#12214F",
    navyLight: "#24397F",
    navyDeep: "#0A1536",
    goldLight: "#FCEBB4",
    gold: "#E6C072",
    goldMid: "#C99A42",
    goldDark: "#A67831",
    highlight: "#FFF6D8",
    muted: "#71717A",
    border: "#E5E7EB",
    soft: "#F1F5F9",
    brand: "#18181B",
  },
  mono: {
    id: "mono",
    paper: "#FFFFFF",
    ink: "#18181B",
    navy: "#18181B",
    navyLight: "#3F3F46",
    navyDeep: "#18181B",
    goldLight: "#F4F4F5",
    gold: "#D4D4D8",
    goldMid: "#A1A1AA",
    goldDark: "#71717A",
    highlight: "#FFFFFF",
    muted: "#71717A",
    border: "#E5E7EB",
    soft: "#F1F5F9",
    brand: "#18181B",
  },
};

export const DEFAULT_THEME_ID: ThemeId = "luxury";

export function getTheme(id: ThemeId | undefined): Theme {
  return themes[id ?? DEFAULT_THEME_ID] ?? themes[DEFAULT_THEME_ID];
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Выбирает читаемый цвет текста на фоне. Золото для текста не рассматривается. */
export function readableOn(bg: string, theme: Theme): string {
  const candidates = [theme.ink, theme.paper];
  return candidates.reduce((best, c) =>
    contrastRatio(c, bg) > contrastRatio(best, bg) ? c : best,
  );
}

/** Цвет hex с альфой 0..1 в виде rgba(). */
export function withAlpha(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a))})`;
}

export function goldGradient(theme: Theme, angle = 135): string {
  return `linear-gradient(${angle}deg, ${theme.goldLight} 0%, ${theme.gold} 42%, ${theme.goldMid} 78%, ${theme.goldDark} 100%)`;
}

export function hexToHslTriplet(hex: string): string {
  const [r8, g8, b8] = hexToRgb(hex);
  const r = r8 / 255;
  const g = g8 / 255;
  const b = b8 / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/** Переменные в том же формате, что токены сайта (HSL-тройки без hsl()). */
export function themeCssVars(theme: Theme): Record<string, string> {
  return {
    "--background": hexToHslTriplet(theme.paper),
    "--foreground": hexToHslTriplet(theme.ink),
    "--primary": hexToHslTriplet(theme.ink),
    "--primary-foreground": hexToHslTriplet(theme.paper),
    "--muted-foreground": hexToHslTriplet(theme.muted),
    "--border": hexToHslTriplet(theme.border),
    "--secondary": hexToHslTriplet(theme.soft),
    "--radius": "0.75rem",
    "--banner-navy": theme.navy,
    "--banner-gold": theme.gold,
  };
}
