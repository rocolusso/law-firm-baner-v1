import { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ICON_BOUNDS, MARK_POLYS } from "../brand/clario-mark";
import { getLayout, type Rect } from "../geometry";
import { getCopy } from "../i18n/copy";
import { clamp01, easeInOut, easeOut, lerp, ramp, smooth } from "../kit/anim";
import { hash, imageData } from "../kit/image-data";
import { LightsCanvas } from "../kit/LightsCanvas";
import { Mark } from "../kit/Mark";
import { Photo, usePhotoRects } from "../kit/photo";
import type { BannerProps, StyleDef } from "../kit/props";
import {
  abstractAmount,
  scanFronts,
  scanMask,
  scanPos,
  type ScanTimes,
} from "../kit/scan";
import { ScanHead } from "../kit/ScanHead";
import { Sweep, sweepAt } from "../kit/Sweep";
import { CtaButton, Headline } from "../kit/text";
import { hexToRgb, getTheme, type Theme } from "../theme";

export const FRAMES = 360;
// Один проход скана: после него всё фото состоит из точек
const SCAN: ScanTimes = { in: [66, 132], out: [10000, 10001] };
const MORPH = [150, 238] as const;
const SOLID = [236, 264] as const;

type Particle = {
  /** Положение в долях фото. */
  hx: number;
  hy: number;
  l: number;
  w: number;
  /** Цель в долях знака (0..1 по ICON_BOUNDS), либо null: точка растворяется. */
  tx: number | null;
  ty: number | null;
  delay: number;
};

/** Точка внутри контура знака по правилу чётности: внешний контур и два отверстия. */
function insideIcon(x: number, y: number): boolean {
  let hits = 0;
  for (const name of ["icon", "iconHoleRight", "iconHoleLeft"] as const) {
    const poly = MARK_POLYS[name];
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i];
      const [xj, yj] = poly[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
        inside = !inside;
    }
    if (inside) hits++;
  }
  return hits % 2 === 1;
}

let cache: Particle[] | null = null;

/** Частицы строятся один раз: ячейки сетки яркости через одну по каждой оси и точки внутри весов. */
function getParticles(): Particle[] {
  if (cache) return cache;
  const { cols, rows, gridL, gridW } = imageData;
  const parts: Particle[] = [];
  for (let r = 0; r < rows; r += 2) {
    for (let c = 0; c < cols; c += 2) {
      parts.push({
        hx: (c + 1) / cols,
        hy: (r + 1) / rows,
        l: gridL[r][c] / 100,
        w: gridW[r][c] / 100,
        tx: null,
        ty: null,
        delay: 0,
      });
    }
  }
  // Цели: равномерная сетка внутри знака
  const b = ICON_BOUNDS;
  const step = 1.55;
  const targets: [number, number][] = [];
  for (let y = b.y0 + step / 2; y < b.y1; y += step) {
    for (let x = b.x0 + step / 2; x < b.x1; x += step) {
      if (insideIcon(x, y))
        targets.push([(x - b.x0) / (b.x1 - b.x0), (y - b.y0) / (b.y1 - b.y0)]);
    }
  }
  const byX = <T extends { 0: number; 1: number }>(a: T, c: T) =>
    a[0] - c[0] || a[1] - c[1];
  targets.sort(byX);
  const order = parts
    .map((_, i) => i)
    .sort((i, j) => parts[i].hx - parts[j].hx || parts[i].hy - parts[j].hy);
  const T = Math.min(targets.length, parts.length);
  for (let k = 0; k < T; k++) {
    const p = parts[order[Math.round((k * (parts.length - 1)) / Math.max(1, T - 1))]];
    p.tx = targets[Math.round((k * (targets.length - 1)) / Math.max(1, T - 1))][0];
    p.ty = targets[Math.round((k * (targets.length - 1)) / Math.max(1, T - 1))][1];
  }
  parts.forEach((p, i) => (p.delay = hash(i + 3)));
  cache = parts;
  return parts;
}

type Box = { left: number; top: number; w: number; h: number };

const ParticleCanvas: React.FC<{
  rect: Rect;
  box: Box;
  theme: Theme;
  scan: { p1: number; p2: number; active: boolean };
}> = ({ rect, box, theme, scan }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H, durationInFrames } = useVideoConfig();
  const ref = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    const parts = getParticles();
    const loop = (2 * Math.PI * frame) / durationInFrames;
    const cw = rect.width / imageData.cols;
    const morph = ramp(frame, MORPH[0], MORPH[1]);
    const dotsOut = 1 - smooth(ramp(frame, SOLID[0], SOLID[1]));
    const [c0, c1, c2] = [theme.navyLight, theme.goldMid, theme.brand].map(hexToRgb);
    // радиус точки цели: соседние точки почти касаются
    const unit = box.w / (ICON_BOUNDS.x1 - ICON_BOUNDS.x0);
    const rTarget = 0.6 * 1.55 * unit;

    for (const p of parts) {
      const hx = rect.left + p.hx * rect.width;
      const hy = rect.top + p.hy * rect.height;
      let x = hx;
      let y = hy;
      let radius: number;
      let alpha: number;
      const skyish = p.l > 0.58 && p.w < 0.45;
      const base = skyish
        ? 0.1 + (1 - p.l) * 0.5
        : 0.16 + 0.62 * Math.pow(clamp01(p.l / 0.55), 0.9);
      const pulse = 1 + 0.14 * Math.sin(loop * 3 + p.hx * 40 + p.hy * 25);
      const homeR = Math.max(0.5, cw * 2 * 0.5 * base * pulse);
      const homeA = scan.active
        ? abstractAmount(scanPos(hx, hy, W, H), scan.p1, scan.p2)
        : 0;
      let mix = 0;
      if (p.tx === null || p.ty === null) {
        // лишние точки гаснут по ходу сбора
        const k = smooth(
          ramp(frame, MORPH[0] + p.delay * 30, MORPH[0] + 50 + p.delay * 30),
        );
        radius = homeR * (1 - 0.6 * k);
        alpha = Math.min(1, homeA * 1.0 + 0) * (1 - k);
      } else {
        const k = easeInOut(clamp01((morph - p.delay * 0.35) / 0.65));
        const tx = box.left + p.tx * box.w;
        const ty = box.top + p.ty * box.h;
        // лёгкая дуга, чтобы путь не был прямым
        const arc = Math.sin(Math.PI * k) * (p.delay - 0.5) * 0.18 * W * 0.1;
        x = lerp(hx, tx, k) + arc;
        y = lerp(hy, ty, k) - arc * 0.6;
        radius = lerp(homeR, rTarget, k);
        alpha = Math.max(homeA, k > 0 ? 1 : 0);
        mix = k;
      }
      alpha *= dotsOut;
      if (alpha <= 0.01 || x < -20 || x > W + 20 || y < -20 || y > H + 20) continue;
      const warm = clamp01(p.w * 1.15);
      const from = [0, 1, 2].map((i) => lerp(c0[i], c1[i], warm));
      const col = from.map((v, i) => Math.round(lerp(v, c2[i], mix)));
      ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [frame, W, H, rect, box, theme, scan, durationInFrames]);

  return (
    <canvas
      ref={ref}
      width={W}
      height={H}
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, width: W, height: H }}
    />
  );
};

/** Фото рассыпается на точки, точки собираются в весы Clario, весы приходят в равновесие и держат заголовок. */
const DotsToScales: React.FC<BannerProps> = ({ lang, themeId, px }) => {
  const rects = usePhotoRects({ zoomWide: 1.04, depth: 0.04 });
  const { frame, W, H, buildings } = rects;
  const theme = getTheme(themeId);
  const copy = getCopy(lang);
  const lay = getLayout(W, H, px);
  const tall = lay.orientation === "tall";
  const lines = tall ? copy.lines.tall : copy.lines.wide;

  const scan = scanFronts(frame, SCAN);
  const mask = scan.active ? scanMask(scan.p1, scan.p2) : undefined;
  const sw = sweepAt(frame, [30, 66], [10000, 10001], easeInOut);

  // Место знака: справа по центру на широком кадре, сверху по центру на узком
  const iconH = tall ? H * 0.3 : H * 0.54;
  const iconW =
    iconH * ((ICON_BOUNDS.x1 - ICON_BOUNDS.x0) / (ICON_BOUNDS.y1 - ICON_BOUNDS.y0));
  const cx = tall ? W * 0.5 : W * 0.7;
  const cy = tall ? H * 0.27 : H * 0.42;
  const box: Box = { left: cx - iconW / 2, top: cy - iconH / 2, w: iconW, h: iconH };

  const solid = smooth(ramp(frame, SOLID[0], SOLID[1]));
  // Равновесие: затухающее покачивание после того, как знак стал сплошным
  const t = Math.max(0, frame - SOLID[1]);
  const tilt = 9 * Math.exp(-t / 34) * Math.sin(t / 7.5);
  const pad = 4;
  const bh = ICON_BOUNDS.y1 - ICON_BOUNDS.y0;
  const markH = iconH * ((bh + pad * 2) / bh);

  const whiteIn = 1 - ramp(frame, 0, 22, easeOut);
  const whiteOut = ramp(frame, 338, FRAMES - 2);

  return (
    <AbsoluteFill style={{ backgroundColor: theme.paper, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          background: `linear-gradient(135deg, ${theme.paper} 0%, ${theme.goldLight} 100%)`,
        }}
      />
      <Photo
        rects={rects}
        theme={theme}
        style={{ maskImage: mask, WebkitMaskImage: mask }}
      />
      <Sweep rect={buildings} theme={theme} x={sw.x} power={sw.power} />
      <LightsCanvas
        rect={buildings}
        theme={theme}
        lights={{ ignition: 14, fade: [100, 140], sweep: sw, gain: 1.15 }}
      />

      <ParticleCanvas rect={buildings} box={box} theme={theme} scan={scan} />

      <div
        style={{
          position: "absolute",
          left: cx,
          top: cy,
          transform: "translate(-50%, -50%)",
          opacity: solid,
        }}
      >
        <Mark variant="icon" color={theme.brand} height={markH} tilt={tilt} />
      </div>

      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        aria-hidden="true"
        style={{ position: "absolute", inset: 0 }}
      >
        {frame >= SCAN.in[0] && frame <= SCAN.in[1] && (
          <ScanHead W={W} H={H} p={scan.p1} glow={theme.goldMid} unit={px} />
        )}
      </svg>

      <div
        style={{
          position: "absolute",
          left: lay.anchor.x,
          bottom: lay.anchor.bottom,
          right: lay.pad,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
        }}
      >
        <Headline lines={lines} lay={lay} color={theme.ink} frame={frame} start={252} />
        <div style={{ height: lay.gap }} />
        <CtaButton
          label={copy.cta}
          lay={lay}
          theme={theme}
          variant="ink"
          appear={ramp(
            frame,
            252 + lines.length * 7 + 14,
            252 + lines.length * 7 + 34,
            easeOut,
          )}
        />
      </div>

      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "#fff",
          opacity: Math.max(whiteIn, whiteOut),
        }}
      />
    </AbsoluteFill>
  );
};

export const dotsToScales: StyleDef = {
  id: "dots-to-scales",
  frames: FRAMES,
  poster: 310,
  Component: DotsToScales,
};
