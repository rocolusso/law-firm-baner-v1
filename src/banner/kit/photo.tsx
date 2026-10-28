import { AbsoluteFill, Img, useCurrentFrame, useVideoConfig } from "remotion";
import { image } from "../banner.config";
import { coverRect, type Rect } from "../geometry";
import type { Theme } from "../theme";

export const SRC = {
  sky: "/banner/sky.jpg",
  buildings: "/banner/buildings.png",
  mask: "/banner/mask-buildings.png",
  poster: "/banner/city.jpg",
} as const;

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
}> = ({ rects, theme, tone = "day", style, showBuildings = true }) => {
  const f = filters[tone];
  const mask = `url(${SRC.mask})`;
  return (
    <AbsoluteFill style={style}>
      <Img src={SRC.sky} style={{ ...rectStyle(rects.sky), filter: f.sky }} />
      {showBuildings && (
        <>
          <Img
            src={SRC.buildings}
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
