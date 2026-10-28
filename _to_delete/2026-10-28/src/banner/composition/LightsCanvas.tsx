import { useLayoutEffect, useRef } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import type { Rect } from "../geometry";
import { hash, imageData } from "./image-data";
import { abstractAmount, clamp01, scanFronts, scanPos, smooth, sweep, T } from "./scan";

type Sprites = { warm: HTMLCanvasElement; cool: HTMLCanvasElement };
let sprites: Sprites | null = null;

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

function getSprites(): Sprites {
  if (!sprites) {
    sprites = {
      warm: makeSprite("rgba(255,238,205,1)", "rgba(255,179,71,0.55)"),
      cool: makeSprite("rgba(235,247,255,1)", "rgba(150,196,214,0.4)"),
    };
  }
  return sprites;
}

const BUCKETS = 6;
const bucketColors = Array.from({ length: BUCKETS }, (_, i) => {
  const k = i / (BUCKETS - 1);
  // от холодного стекла к тёплому свету окон
  const from = [105, 135, 145];
  const to = [255, 179, 71];
  const c = from.map((v, j) => Math.round(v + (to[j] - v) * k));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
});

/**
 * Один canvas на три вещи: полутоновая абстракция, огни окон и мелкие точки стеклянного фасада.
 * Всё привязано к прямоугольнику фото `rect`, поэтому совпадает с картинкой при любом масштабе.
 */
export const LightsCanvas: React.FC<{ rect: Rect }> = ({ rect }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H, durationInFrames } = useVideoConfig();
  const ref = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const { warm, cool } = getSprites();
    const loop = (2 * Math.PI * frame) / durationInFrames;

    ctx.clearRect(0, 0, W, H);

    // 1. Полутона
    const { p1, p2, active } = scanFronts(frame);
    if (active) {
      const { cols, rows, gridL, gridW } = imageData;
      const cw = rect.width / cols;
      const ch = rect.height / rows;
      const buckets: Path2D[] = bucketColors.map(() => new Path2D());
      let any = false;
      for (let r = 0; r < rows; r++) {
        const y = rect.top + (r + 0.5) * ch;
        if (y < -ch || y > H + ch) continue;
        for (let c = 0; c < cols; c++) {
          const x = rect.left + (c + 0.5) * cw;
          if (x < -cw || x > W + cw) continue;
          const a = abstractAmount(scanPos(x, y, W, H), p1, p2);
          if (a <= 0.01) continue;
          const l = gridL[r][c] / 100;
          const warmth = gridW[r][c] / 100;
          const skyish = l > 0.58 && warmth < 0.45;
          const base = skyish
            ? 0.1 + (1 - l) * 0.5
            : 0.16 + 0.62 * Math.pow(clamp01(l / 0.55), 0.9);
          const pulse = 1 + 0.14 * Math.sin(loop * 3 + c * 0.33 + r * 0.21);
          const radius = Math.max(0.4, cw * 0.5 * base * pulse * smooth(a));
          const bi = Math.min(BUCKETS - 1, Math.round(warmth * (BUCKETS - 1) * 1.15));
          buckets[bi].moveTo(x + radius, y);
          buckets[bi].arc(x, y, radius, 0, Math.PI * 2);
          any = true;
        }
      }
      if (any) {
        ctx.globalCompositeOperation = "source-over";
        buckets.forEach((path, i) => {
          ctx.fillStyle = bucketColors[i];
          ctx.fill(path);
        });
      }
    }

    // 2. Огни и точки: аддитивное смешивание
    ctx.globalCompositeOperation = "lighter";
    const sw = sweep(frame);
    const fadeOut = 1 - smooth((frame - T.fadeOut[0]) / (T.fadeOut[1] - T.fadeOut[0]));

    for (let i = 0; i < imageData.specks.length; i++) {
      const s = imageData.specks[i];
      const on = T.ignitionStart + (1 - s.y) * 46 + hash(i) * 26;
      const appear = smooth((frame - on) / 10);
      if (appear <= 0) continue;
      const twinkle = 0.78 + 0.22 * Math.sin(loop * (2 + (i % 3)) + hash(i + 9) * 6.28);
      const near =
        sw.power > 0 ? Math.exp(-Math.pow((s.x - sw.x) / 0.06, 2)) * sw.power : 0;
      const k = appear * twinkle * (0.34 + near * 0.9) * fadeOut;
      const size = Math.max(7, s.w * rect.width * 3.2) * (0.8 + near * 0.7);
      const x = rect.left + s.x * rect.width;
      const y = rect.top + s.y * rect.height;
      if (x < -size || x > W + size || y < -size || y > H + size) continue;
      ctx.globalAlpha = clamp01(k * (0.55 + s.a * 0.45));
      ctx.drawImage(s.t > 0.5 ? warm : cool, x - size / 2, y - size / 2, size, size);
    }

    for (let i = 0; i < imageData.lights.length; i++) {
      const l = imageData.lights[i];
      const on = T.ignitionStart + (1 - l.y) * 40 + hash(i + 400) * 18;
      const appear = smooth((frame - on) / 12);
      if (appear <= 0) continue;
      const breathe = 0.82 + 0.18 * Math.sin(loop * (2 + (i % 2)) + hash(i + 77) * 6.28);
      const size =
        Math.max(26, Math.max(l.w, l.h) * rect.width * 3.4) * (0.8 + l.a * 0.5);
      const x = rect.left + l.x * rect.width;
      const y = rect.top + l.y * rect.height;
      if (x < -size || x > W + size || y < -size || y > H + size) continue;
      ctx.globalAlpha = clamp01(appear * breathe * (0.5 + l.a * 0.5) * fadeOut);
      ctx.drawImage(warm, x - size / 2, y - size / 2, size, size);
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }, [frame, W, H, rect, durationInFrames]);

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
