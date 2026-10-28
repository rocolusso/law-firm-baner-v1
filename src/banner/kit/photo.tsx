import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { image } from "../banner.config";
import { coverRect, type Rect } from "../geometry";
import type { Theme } from "../theme";
import { CanvasImage } from "./CanvasImage";

export const SRC = {
  mask: "/banner/mask-buildings.png",
} as const;

/** Темы, для которых scripts/build-images.mjs собрал слитую сцену. */
const BAKED_THEMES: readonly string[] = ["luxury", "mono"];

/** Файл подходящей ширины: слой не должен быть крупнее, чем нужно рамке, иначе зря занимает память. */
export function layerSrc(
  kind: "sky" | "buildings" | "scene",
  rectWidth: number,
  themeId = "luxury",
): string {
  const big = kind === "buildings" ? 1600 : 2000;
  const small = 1280;
  const w = rectWidth <= small * 1.05 ? small : big;
  return kind === "scene"
    ? `/banner/scene-day-${themeId}-${w}.webp`
    : `/banner/${kind}-${w}.webp`;
}

export const rectStyle = (r: Rect): React.CSSProperties => ({
  position: "absolute",
  left: r.left,
  top: r.top,
  width: r.width,
  height: r.height,
  maxWidth: "none",
});

export type PhotoRects = {
  frame: number;
  W: number;
  H: number;
  tall: boolean;
  buildings: Rect;
  sky: Rect;
  /** 0 → 1 → 0 за цикл: «дыхание» камеры. */
  breath: number;
};

/**
 * Прямоугольники слоёв фото. Здания двигаются заметнее неба, так появляется глубина.
 * Пересчитывается на каждом кадре.
 */
export function usePhotoRects(
  opts: { zoomWide?: number; zoomTall?: number; depth?: number } = {},
): PhotoRects {
  const frame = useCurrentFrame();
  const { width: W, height: H, durationInFrames } = useVideoConfig();
  const { zoomWide = 1.04, zoomTall = 1.0, depth = 0.06 } = opts;
  const breath = (1 - Math.cos((2 * Math.PI * frame) / durationInFrames)) / 2;
  const tall = W / H < 0.95;
  const base = tall ? zoomTall : zoomWide;
  const target = { x: 0.5, y: tall ? 0.46 : 0.5 };
  const buildings = coverRect(
    W,
    H,
    image.width,
    image.height,
    base + depth * breath,
    image.focal,
    target,
  );
  const sky = coverRect(
    W,
    H,
    image.width,
    image.height,
    base + depth * 0.33 * breath,
    image.focal,
    target,
  );
  return { frame, W, H, tall, buildings, sky, breath };
}

export type PhotoTone = "day" | "dusk";

const filters: Record<PhotoTone, { sky: string; buildings: string; lift: number }> = {
  // яркое небо, здания глубокого синего; окна остаются светлыми
  day: {
    sky: "brightness(1.12) saturate(1.3) contrast(1.05)",
    buildings: "brightness(1.08) contrast(1.16) saturate(1.15)",
    lift: 0.9,
  },
  dusk: {
    sky: "brightness(0.82) saturate(1.2) contrast(1.1)",
    buildings: "brightness(1.12) contrast(1.12) saturate(1.1)",
    lift: 0.7,
  },
};

/**
 * Небо и здания отдельными слоями. Поверх зданий лежит синий слой в маске зданий (screen):
 * чёрное становится тёмно-синим, светлые окна остаются светлыми.
 */
export const Photo: React.FC<{
  rects: PhotoRects;
  theme: Theme;
  tone?: PhotoTone;
  style?: React.CSSProperties;
  showBuildings?: boolean;
  /** Один готовый кадр вместо трёх слоёв с фильтрами и blend. Параллакс неба и зданий пропадает. */
  lite?: boolean;
}> = ({ rects, theme, tone = "day", style, showBuildings = true, lite = false }) => {
  const f = filters[tone];
  const mask = `url(${SRC.mask})`;
  if (lite && showBuildings && tone === "day" && BAKED_THEMES.includes(theme.id)) {
    return (
      <AbsoluteFill style={style}>
        <CanvasImage
          src={layerSrc("scene", rects.buildings.width, theme.id)}
          style={rectStyle(rects.buildings)}
        />
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={style}>
      <CanvasImage
        src={layerSrc("sky", rects.sky.width)}
        style={{ ...rectStyle(rects.sky), filter: f.sky }}
      />
      {showBuildings && (
        <>
          <CanvasImage
            src={layerSrc("buildings", rects.buildings.width)}
            style={{ ...rectStyle(rects.buildings), filter: f.buildings }}
          />
          <div
            style={{
              ...rectStyle(rects.buildings),
              maskImage: mask,
              WebkitMaskImage: mask,
              maskSize: "100% 100%",
              WebkitMaskSize: "100% 100%",
              background: theme.navy,
              mixBlendMode: "screen",
              opacity: f.lift,
            }}
          />
        </>
      )}
    </AbsoluteFill>
  );
};
