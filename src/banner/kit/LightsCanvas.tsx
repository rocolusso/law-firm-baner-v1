import { useLayoutEffect, useRef } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import type { Rect } from "../geometry";
import { hexToRgb, type Theme } from "../theme";
import { clamp01, smooth } from "./anim";
import { hash, imageData } from "./image-data";

type Sprites = { warm: HTMLCanvasElement; cool: HTMLCanvasElement };
const spriteCache = new Map<string, Sprites>();

function makeSprite(inner: string, mid: string): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, inner);
  grad.addColorStop(0.18, mid);
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return c;
}

const rgba = (hex: string, a: number) => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
};

function getSprites(theme: Theme): Sprites {
  let s = spriteCache.get(theme.id);
  if (!s) {
    s = {
      warm: makeSprite(rgba(theme.highlight, 1), rgba(theme.gold, 0.6)),
      cool: makeSprite("rgba(240,248,255,1)", "rgba(170,205,230,0.45)"),
    };
    spriteCache.set(theme.id, s);
  }
  return s;
}

export type DotsOptions = {
  /** Сколько абстракции в точке кадра (x, y в пикселях композиции), 0..1. */
  amount: (x: number, y: number) => number;
  /** Цвет точки по тёплоте ячейки 0..1. */
  colors: [string, string];
  /** Множитель радиуса. */
  size?: number;
  /** Сдвиг фазы пульсации, чтобы стили не повторяли друг друга. */
  phase?: number;
};

export type LightsOptions = {
  /** Кадр, с которого окна начинают загораться (сверху вниз). */
  ignition: number;
  /** Окно затухания в конце цикла. */
  fade?: [number, number];
  /** Световой проход: положение по ширине 0..1 и сила. */
  sweep?: { x: number; power: number };
  /** Общая яркость огней. */
  gain?: number;
};

/**
 * Один canvas на две вещи: полутоновая абстракция (точки по сетке яркости фото) и огни окон
 * вместе с мелкими точками стеклянного фасада. Всё привязано к прямоугольнику фото `rect`,
 * поэтому совпадает с картинкой при любом масштабе. Не больше 6000 точек за кадр.
 */
export const LightsCanvas: React.FC<{
  rect: Rect;
  theme: Theme;
  dots?: DotsOptions | null;
  lights?: LightsOptions | null;
}> = ({ rect, theme, dots, lights }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H, durationInFrames } = useVideoConfig();
  const ref = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const { warm, cool } = getSprites(theme);
    const loop = (2 * Math.PI * frame) / durationInFrames;

    ctx.clearRect(0, 0, W, H);

    if (dots) {
      const { cols, rows, gridL, gridW } = imageData;
      const cw = rect.width / cols;
      const ch = rect.height / rows;
      const BUCKETS = 6;
      const [c0, c1] = dots.colors.map(hexToRgb);
      const bucketColors = Array.from({ length: BUCKETS }, (_, i) => {
        const k = i / (BUCKETS - 1);
        const c = c0.map((v, j) => Math.round(v + (c1[j] - v) * k));
        return `rgb(${c[0]},${c[1]},${c[2]})`;
      });
      const buckets: Path2D[] = bucketColors.map(() => new Path2D());
      let count = 0;
      for (let r = 0; r < rows && count < 6000; r++) {
        const y = rect.top + (r + 0.5) * ch;
        if (y < -ch || y > H + ch) continue;
        for (let c = 0; c < cols; c++) {
          const x = rect.left + (c + 0.5) * cw;
          if (x < -cw || x > W + cw) continue;
          const a = dots.amount(x, y);
          if (a <= 0.01) continue;
          const l = gridL[r][c] / 100;
          const warmth = gridW[r][c] / 100;
          const skyish = l > 0.58 && warmth < 0.45;
          const base = skyish
            ? 0.1 + (1 - l) * 0.5
            : 0.16 + 0.62 * Math.pow(clamp01(l / 0.55), 0.9);
          const pulse =
            1 + 0.14 * Math.sin(loop * 3 + c * 0.33 + r * 0.21 + (dots.phase ?? 0));
          const radius = Math.max(
            0.4,
            cw * 0.5 * base * pulse * smooth(a) * (dots.size ?? 1),
          );
          const bi = Math.min(BUCKETS - 1, Math.round(warmth * (BUCKETS - 1) * 1.15));
          buckets[bi].moveTo(x + radius, y);
          buckets[bi].arc(x, y, radius, 0, Math.PI * 2);
          count++;
        }
      }
      if (count > 0) {
        ctx.globalCompositeOperation = "source-over";
        buckets.forEach((path, i) => {
          ctx.fillStyle = bucketColors[i];
          ctx.fill(path);
        });
      }
    }

    if (lights) {
      ctx.globalCompositeOperation = "lighter";
      const sw = lights.sweep ?? { x: -1, power: 0 };
      const gain = lights.gain ?? 1;
      const fadeOut = lights.fade
        ? 1 - smooth((frame - lights.fade[0]) / (lights.fade[1] - lights.fade[0]))
        : 1;

      for (let i = 0; i < imageData.specks.length; i++) {
        const s = imageData.specks[i];
        const on = lights.ignition + (1 - s.y) * 46 + hash(i) * 26;
        const appear = smooth((frame - on) / 10);
        if (appear <= 0) continue;
        const twinkle = 0.78 + 0.22 * Math.sin(loop * (2 + (i % 3)) + hash(i + 9) * 6.28);
        const near =
          sw.power > 0 ? Math.exp(-Math.pow((s.x - sw.x) / 0.06, 2)) * sw.power : 0;
        const k = appear * twinkle * (0.34 + near * 0.9) * fadeOut * gain;
        const size = Math.max(7, s.w * rect.width * 3.2) * (0.8 + near * 0.7);
        const x = rect.left + s.x * rect.width;
        const y = rect.top + s.y * rect.height;
        if (x < -size || x > W + size || y < -size || y > H + size) continue;
        ctx.globalAlpha = clamp01(k * (0.55 + s.a * 0.45));
        ctx.drawImage(s.t > 0.5 ? warm : cool, x - size / 2, y - size / 2, size, size);
      }

      for (let i = 0; i < imageData.lights.length; i++) {
        const l = imageData.lights[i];
        const on = lights.ignition + (1 - l.y) * 40 + hash(i + 400) * 18;
        const appear = smooth((frame - on) / 12);
        if (appear <= 0) continue;
        const breathe =
          0.82 + 0.18 * Math.sin(loop * (2 + (i % 2)) + hash(i + 77) * 6.28);
        const size =
          Math.max(26, Math.max(l.w, l.h) * rect.width * 3.4) * (0.8 + l.a * 0.5);
        const x = rect.left + l.x * rect.width;
        const y = rect.top + l.y * rect.height;
        if (x < -size || x > W + size || y < -size || y > H + size) continue;
        ctx.globalAlpha = clamp01(appear * breathe * (0.5 + l.a * 0.5) * fadeOut * gain);
        ctx.drawImage(warm, x - size / 2, y - size / 2, size, size);
      }
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }, [frame, W, H, rect, durationInFrames, theme, dots, lights]);

  return (
    <canvas
      ref={ref}
      width={W}
      height={H}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: W,
        height: H,
        background: "transparent",
      }}
    />
  );
};
