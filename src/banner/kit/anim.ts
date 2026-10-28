import { Easing, interpolate } from "remotion";

export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
export const easeInOut = Easing.inOut(Easing.cubic);
export const easeSnap = Easing.bezier(0.7, 0, 0.2, 1);

export function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

export function smooth(v: number): number {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
}

/** Линейный прогресс 0..1 между кадрами a и b с зажимом по краям и необязательным сглаживанием. */
export function ramp(
  frame: number,
  a: number,
  b: number,
  easing: (t: number) => number = (t) => t,
): number {
  return interpolate(frame, [a, b], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });
}

/** Нарастает с a до b, держится, затухает с c до d. */
export function window4(
  frame: number,
  a: number,
  b: number,
  c: number,
  d: number,
): number {
  return smooth(ramp(frame, a, b)) * (1 - smooth(ramp(frame, c, d)));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Синус с целым числом периодов за цикл, чтобы зацикливание было бесшовным. */
export function loopSin(frame: number, total: number, cycles = 1, phase = 0): number {
  return Math.sin((2 * Math.PI * frame * cycles) / total + phase);
}

export { hash } from "./image-data";

/** Значение по ключевым кадрам [кадр, значение] с общим сглаживанием между соседними ключами. */
export function keyframes(
  frame: number,
  keys: ReadonlyArray<readonly [number, number]>,
  easing: (t: number) => number = easeInOut,
): number {
  if (frame <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (frame <= keys[i][0]) {
      const [f0, v0] = keys[i - 1];
      const [f1, v1] = keys[i];
      return lerp(v0, v1, easing((frame - f0) / (f1 - f0)));
    }
  }
  return keys[keys.length - 1][1];
}
