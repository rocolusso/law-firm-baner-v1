import type { StyleDef } from "../kit/props";
import type { StyleId } from "../types";
import { dotsToScales } from "./dots-to-scales";
import { glass } from "./glass";
import { lightBurst } from "./light-burst";
import { poster } from "./poster";
import { spotlight } from "./spotlight";

/** Все стили баннера. Новый стиль добавляется файлом в этой папке и строкой здесь. */
export const styles: Record<StyleId, StyleDef> = {
  "light-burst": lightBurst,
  spotlight,
  glass,
  poster,
  "dots-to-scales": dotsToScales,
};

export function getStyle(id: StyleId): StyleDef {
  return styles[id];
}
