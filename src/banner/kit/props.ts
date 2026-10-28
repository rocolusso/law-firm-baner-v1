import type { Lang, StyleId } from "../types";
import type { ThemeId } from "../theme";

/** Что получает любая композиция. Это inputProps Remotion Player, поэтому только простые значения. */
export type BannerProps = {
  lang: Lang;
  themeId: ThemeId;
  /** Пикселей композиции на один CSS-пиксель страницы. */
  px: number;
};

export type StyleDef = {
  id: StyleId;
  /** Длительность цикла в кадрах (30 fps). */
  frames: number;
  /** Кадр, который показывается при prefers-reduced-motion и как постер. */
  poster: number;
  Component: React.FC<BannerProps>;
};
