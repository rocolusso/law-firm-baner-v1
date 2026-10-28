import type { StyleDef } from "../kit/props";
import type { StyleId } from "../types";

/**
 * Ленивая загрузка стилей. На странице нужен один стиль, поэтому код остальных четырёх
 * не попадает в загрузку. Статический реестр с готовыми определениями лежит в registry.ts.
 */
export const loaders: Record<StyleId, () => Promise<StyleDef>> = {
  "light-burst": () => import("./light-burst").then((m) => m.lightBurst),
  spotlight: () => import("./spotlight").then((m) => m.spotlight),
  glass: () => import("./glass").then((m) => m.glass),
  poster: () => import("./poster").then((m) => m.poster),
  "dots-to-scales": () => import("./dots-to-scales").then((m) => m.dotsToScales),
};

export function loadStyle(id: StyleId): Promise<StyleDef> {
  return loaders[id]();
}
