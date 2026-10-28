import { Easing, interpolate } from "remotion";

/** Угол «считывающей головки», которая превращает фото в абстракцию. CSS-градусы. */
export const SCAN_ANGLE = 100;
export const SCAN_SOFT = 0.07;

export const T = {
  curtainStart: 4,
  linesStart: 14,
  ignitionStart: 30,
  textStart: 62,
  sweepA: [92, 150] as const,
  scanIn: [150, 208] as const,
  scanOut: [232, 290] as const,
  sweepB: [236, 296] as const,
  fadeOut: [302, 328] as const,
};

const inOut = Easing.inOut(Easing.cubic);

/** Положения фронтов 0..1 вдоль направления сканирования. */
export function scanFronts(frame: number): { p1: number; p2: number; active: boolean } {
  const p1 = interpolate(frame, [...T.scanIn], [-0.12, 1.12], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: inOut,
  });
  const p2 = interpolate(frame, [...T.scanOut], [-0.12, 1.12], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: inOut,
  });
  return { p1, p2, active: frame >= T.scanIn[0] - 2 && frame <= T.scanOut[1] + 2 };
}

/** Доля 0..1, насколько точка с координатой p внутри абстрактной полосы. */
export function abstractAmount(p: number, p1: number, p2: number): number {
  const a = clamp01((p1 - p) / SCAN_SOFT);
  const b = clamp01((p - p2) / SCAN_SOFT);
  return smooth(a) * smooth(b);
}

/** Положение светового прохода по ширине изображения 0..1 и его сила. */
export function sweep(frame: number): { x: number; power: number } {
  const [a0, a1] = T.sweepA;
  const [b0, b1] = T.sweepB;
  if (frame >= a0 && frame <= a1) {
    const k = (frame - a0) / (a1 - a0);
    return { x: 0.12 + 0.78 * inOut(k), power: Math.sin(Math.PI * k) };
  }
  if (frame >= b0 && frame <= b1) {
    const k = (frame - b0) / (b1 - b0);
    return { x: 0.9 - 0.78 * inOut(k), power: Math.sin(Math.PI * k) * 0.8 };
  }
  return { x: -1, power: 0 };
}

export function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

export function smooth(v: number): number {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
}

/** Единичный вектор направления сканирования и длина градиентной линии для кадра W×H. */
export function scanGeometry(W: number, H: number) {
  const rad = (SCAN_ANGLE * Math.PI) / 180;
  const dx = Math.sin(rad);
  const dy = -Math.cos(rad);
  const L = Math.abs(W * dx) + Math.abs(H * dy);
  return { dx, dy, L };
}

/** Проекция точки кадра на линию сканирования: 0 в начале градиента, 1 в конце. */
export function scanPos(x: number, y: number, W: number, H: number): number {
  const { dx, dy, L } = scanGeometry(W, H);
  return ((x - W / 2) * dx + (y - H / 2) * dy) / L + 0.5;
}

/** Отрезок линии фронта для SVG. */
export function scanLine(p: number, W: number, H: number) {
  const { dx, dy, L } = scanGeometry(W, H);
  const cx = W / 2 + dx * (p - 0.5) * L;
  const cy = H / 2 + dy * (p - 0.5) * L;
  const ext = W + H;
  return { x1: cx + dy * ext, y1: cy - dx * ext, x2: cx - dy * ext, y2: cy + dx * ext };
}
