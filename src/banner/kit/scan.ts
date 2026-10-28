import { clamp01, easeInOut, ramp, smooth } from "./anim";

/** Угол «считывающей головки», которая превращает фото в абстракцию. CSS-градусы. */
export const SCAN_ANGLE = 100;
export const SCAN_SOFT = 0.07;

export type ScanTimes = {
  /** Первый фронт: начало абстрактной полосы. */
  in: readonly [number, number];
  /** Второй фронт: конец абстрактной полосы. */
  out: readonly [number, number];
};

/** Положения фронтов 0..1 вдоль направления сканирования. */
export function scanFronts(
  frame: number,
  t: ScanTimes,
): { p1: number; p2: number; active: boolean } {
  const p1 = -0.12 + 1.24 * ramp(frame, t.in[0], t.in[1], easeInOut);
  const p2 = -0.12 + 1.24 * ramp(frame, t.out[0], t.out[1], easeInOut);
  return { p1, p2, active: frame >= t.in[0] - 2 && frame <= t.out[1] + 2 };
}

/** Доля 0..1, насколько точка с координатой p внутри абстрактной полосы. */
export function abstractAmount(p: number, p1: number, p2: number): number {
  const a = clamp01((p1 - p) / SCAN_SOFT);
  const b = clamp01((p - p2) / SCAN_SOFT);
  return smooth(a) * smooth(b);
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

/** CSS-маска: внутри полосы между фронтами фото прозрачно. */
export function scanMask(p1: number, p2: number): string {
  const s = SCAN_SOFT * 100;
  const pa = p2 * 100;
  const pb = p1 * 100;
  return `linear-gradient(${SCAN_ANGLE}deg, #000 0%, #000 ${pa}%, transparent ${pa + s}%, transparent ${pb - s}%, #000 ${pb}%, #000 100%)`;
}
