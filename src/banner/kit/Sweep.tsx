import type { Rect } from "../geometry";
import { withAlpha, type Theme } from "../theme";
import { rectStyle, SRC } from "./photo";

/** Световой проход по стеклу. Ограничен маской зданий, поэтому небо не засвечивается. */
export const Sweep: React.FC<{
  rect: Rect;
  theme: Theme;
  x: number;
  power: number;
  /** Без mix-blend-mode: на тёмных зданиях результат почти тот же, а слою не нужен отдельный проход. */
  lite?: boolean;
}> = ({ rect, theme, x, power, lite = false }) => {
  if (power <= 0.01) return null;
  const P = x * 100;
  const mask = `url(${SRC.mask})`;
  return (
    <div
      style={{
        ...rectStyle(rect),
        maskImage: mask,
        WebkitMaskImage: mask,
        maskSize: "100% 100%",
        WebkitMaskSize: "100% 100%",
        mixBlendMode: lite ? undefined : "screen",
        opacity: power * 0.9,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(104deg, transparent ${P - 12}%, ${withAlpha(theme.navyLight, 0.5)} ${P - 4}%, ${withAlpha(theme.highlight, 0.85)} ${P}%, ${withAlpha(theme.gold, 0.4)} ${P + 4}%, transparent ${P + 12}%)`,
        }}
      />
    </div>
  );
};

/** Положение прохода по ширине изображения 0..1 и его сила для двух проходов за цикл. */
export function sweepAt(
  frame: number,
  a: readonly [number, number],
  b: readonly [number, number],
  ease: (t: number) => number,
): { x: number; power: number } {
  if (frame >= a[0] && frame <= a[1]) {
    const k = (frame - a[0]) / (a[1] - a[0]);
    return { x: 0.12 + 0.78 * ease(k), power: Math.sin(Math.PI * k) };
  }
  if (frame >= b[0] && frame <= b[1]) {
    const k = (frame - b[0]) / (b[1] - b[0]);
    return { x: 0.9 - 0.78 * ease(k), power: Math.sin(Math.PI * k) * 0.8 };
  }
  return { x: -1, power: 0 };
}
