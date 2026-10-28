import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { copy, image, palette } from "../banner.config";
import { coverRect, getLayout, toFrame, type Rect } from "../geometry";
import { LightsCanvas } from "./LightsCanvas";
import { SCAN_ANGLE, SCAN_SOFT, scanFronts, scanLine, smooth, sweep, T } from "./scan";

const ease = Easing.bezier(0.16, 1, 0.3, 1);
const FONT_HEAD = "'Fira Sans Extra Condensed', 'Arial Narrow', sans-serif";
const FONT_BODY = "'Onest Variable', system-ui, sans-serif";

const src = {
  sky: "/banner/sky.jpg",
  buildings: "/banner/buildings.png",
  mask: "/banner/mask-buildings.png",
};

/** Прямоугольник изображения в кадре, пересчитывается на каждом кадре (дыхание камеры). */
function useRects() {
  const frame = useCurrentFrame();
  const { width: W, height: H, durationInFrames } = useVideoConfig();
  const breath = (1 - Math.cos((2 * Math.PI * frame) / durationInFrames)) / 2; // 0 → 1 → 0
  const tall = W / H < 0.95;
  const base = tall ? 1.0 : 1.04;
  const target = { x: 0.5, y: tall ? 0.46 : 0.5 };
  // здания движутся заметнее неба: так появляется глубина
  const buildings = coverRect(
    W,
    H,
    image.width,
    image.height,
    base + 0.06 * breath,
    image.focal,
    target,
  );
  const sky = coverRect(
    W,
    H,
    image.width,
    image.height,
    base + 0.02 * breath,
    image.focal,
    target,
  );
  return { frame, W, H, buildings, sky };
}

const rectStyle = (r: Rect): React.CSSProperties => ({
  position: "absolute",
  left: r.left,
  top: r.top,
  width: r.width,
  height: r.height,
});

export const CityComposition: React.FC = () => {
  const { frame, W, H, buildings, sky } = useRects();
  const lay = getLayout(W, H);
  const { p1, p2, active } = scanFronts(frame);

  // Маска фото: в абстрактной полосе фото прозрачно и видны полутона на тёмном фоне
  const s = SCAN_SOFT * 100;
  const pa = p2 * 100;
  const pb = p1 * 100;
  const photoMask = active
    ? `linear-gradient(${SCAN_ANGLE}deg, #000 0%, #000 ${pa}%, transparent ${pa + s}%, transparent ${pb - s}%, #000 ${pb}%, #000 100%)`
    : undefined;

  const fadeOut = smooth((frame - T.fadeOut[0]) / (T.fadeOut[1] - T.fadeOut[0]));

  return (
    <AbsoluteFill style={{ backgroundColor: palette.night, overflow: "hidden" }}>
      {/* 1. Фото: небо и здания отдельными слоями */}
      <AbsoluteFill
        style={{
          maskImage: photoMask,
          WebkitMaskImage: photoMask,
          filter: "saturate(0.88) contrast(1.06)",
        }}
      >
        <Img src={src.sky} style={{ ...rectStyle(sky), maxWidth: "none" }} />
        <Img src={src.buildings} style={{ ...rectStyle(buildings), maxWidth: "none" }} />
      </AbsoluteFill>

      {/* 2. Световой проход по стеклу, ограничен маской зданий */}
      <SweepLayer rect={buildings} frame={frame} />

      {/* 3. Огни, точки фасада, полутона */}
      <LightsCanvas rect={buildings} />

      {/* 4. Трафик */}
      <Streaks rect={buildings} frame={frame} />

      {/* 5. Линии перспективы и фронты сканирования */}
      <VectorLayer rect={buildings} frame={frame} W={W} H={H} fronts={{ p1, p2 }} />

      {/* 6. Подложка под текст */}
      <Scrim orientation={lay.orientation} share={lay.scrim} />

      {/* 7. Текст */}
      <Copy frame={frame} W={W} H={H} />

      {/* 8. Занавес: открытие горизонтальными полосами и затухание в конце цикла */}
      <Curtain frame={frame} H={H} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: palette.night,
          opacity: fadeOut,
        }}
      />
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------------------------------------------- */

const SweepLayer: React.FC<{ rect: Rect; frame: number }> = ({ rect, frame }) => {
  const sw = sweep(frame);
  if (sw.power <= 0.01) return null;
  const P = sw.x * 100;
  const mask = `url(${src.mask})`;
  return (
    <div
      style={{
        ...rectStyle(rect),
        maskImage: mask,
        WebkitMaskImage: mask,
        maskSize: "100% 100%",
        WebkitMaskSize: "100% 100%",
        mixBlendMode: "screen",
        opacity: sw.power * 0.8,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(104deg, transparent ${P - 12}%, rgba(120,170,190,0.22) ${P - 4}%, rgba(236,246,250,0.62) ${P}%, rgba(255,214,150,0.22) ${P + 4}%, transparent ${P + 12}%)`,
        }}
      />
    </div>
  );
};

/* ---------------------------------------------------------------------------------------------- */

type Streak = {
  y: number;
  len: number;
  speed: number;
  phase: number;
  dir: 1 | -1;
  color: string;
  thick: number;
};

const streaks: Streak[] = [
  {
    y: 0.902,
    len: 0.16,
    speed: 2,
    phase: 0.05,
    dir: -1,
    color: palette.windowSoft,
    thick: 0.0042,
  },
  {
    y: 0.918,
    len: 0.1,
    speed: 3,
    phase: 0.42,
    dir: -1,
    color: palette.window,
    thick: 0.0032,
  },
  {
    y: 0.934,
    len: 0.2,
    speed: 2,
    phase: 0.71,
    dir: -1,
    color: palette.windowSoft,
    thick: 0.005,
  },
  {
    y: 0.948,
    len: 0.12,
    speed: 3,
    phase: 0.18,
    dir: -1,
    color: palette.window,
    thick: 0.0036,
  },
  {
    y: 0.91,
    len: 0.13,
    speed: 2,
    phase: 0.33,
    dir: 1,
    color: palette.signal,
    thick: 0.0034,
  },
  {
    y: 0.926,
    len: 0.18,
    speed: 3,
    phase: 0.8,
    dir: 1,
    color: palette.signal,
    thick: 0.0044,
  },
  {
    y: 0.94,
    len: 0.09,
    speed: 2,
    phase: 0.58,
    dir: 1,
    color: palette.window,
    thick: 0.003,
  },
  {
    y: 0.955,
    len: 0.15,
    speed: 3,
    phase: 0.26,
    dir: 1,
    color: palette.signal,
    thick: 0.004,
  },
];

const Streaks: React.FC<{ rect: Rect; frame: number }> = ({ rect, frame }) => {
  const { durationInFrames } = useVideoConfig();
  const k = smooth((frame - 56) / 24) * (1 - smooth((frame - 296) / 20));
  if (k <= 0.01) return null;
  return (
    <div
      style={{
        ...rectStyle(rect),
        mixBlendMode: "screen",
        opacity: k * 0.85,
        filter: "blur(2.5px)",
      }}
    >
      {streaks.map((s, i) => {
        // целое число проходов за цикл: движение бесшовно
        const range = 1.5;
        const travel = ((frame / durationInFrames) * s.speed + s.phase) % 1;
        const x = s.dir === 1 ? -0.25 + travel * range : 1.25 - travel * range;
        const grad =
          s.dir === 1
            ? `linear-gradient(90deg, transparent, ${s.color})`
            : `linear-gradient(270deg, transparent, ${s.color})`;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${(x - (s.dir === 1 ? s.len : 0)) * 100}%`,
              top: `${s.y * 100}%`,
              width: `${s.len * 100}%`,
              height: `${s.thick * 100 * (rect.width / rect.height)}%`,
              background: grad,
              borderRadius: 999,
            }}
          />
        );
      })}
    </div>
  );
};

/* ---------------------------------------------------------------------------------------------- */

const VectorLayer: React.FC<{
  rect: Rect;
  frame: number;
  W: number;
  H: number;
  fronts: { p1: number; p2: number };
}> = ({ rect, frame, W, H, fronts }) => {
  const v = toFrame(rect, image.vanishing);
  const targets = [-0.35, -0.15, 0.05, 0.22, 0.38, 0.5, 0.62, 0.78, 0.95, 1.15, 1.35];
  const end = interpolate(frame, [T.fadeOut[0] - 14, T.fadeOut[0] + 8], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const pulse = 0.85 + 0.15 * Math.sin((frame / 330) * Math.PI * 2 * 3);

  const head1 = frame >= T.scanIn[0] && frame <= T.scanIn[1];
  const head2 = frame >= T.scanOut[0] && frame <= T.scanOut[1];

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, mixBlendMode: "screen" }}
    >
      <defs>
        {targets.map((tx, i) => {
          const t = toFrame(rect, { x: tx, y: 1.12 });
          return (
            <linearGradient
              key={i}
              id={`vl-${i}`}
              gradientUnits="userSpaceOnUse"
              x1={v.x}
              y1={v.y}
              x2={t.x}
              y2={t.y}
            >
              <stop offset="0" stopColor={palette.windowSoft} stopOpacity="0.95" />
              <stop offset="0.35" stopColor={palette.window} stopOpacity="0.5" />
              <stop offset="1" stopColor={palette.window} stopOpacity="0" />
            </linearGradient>
          );
        })}
      </defs>
      {targets.map((tx, i) => {
        const t = toFrame(rect, { x: tx, y: 1.12 });
        const len = Math.hypot(t.x - v.x, t.y - v.y);
        const draw = interpolate(
          frame,
          [T.linesStart + i * 3, T.linesStart + i * 3 + 42],
          [0, 1],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: ease,
          },
        );
        return (
          <line
            key={i}
            x1={v.x}
            y1={v.y}
            x2={t.x}
            y2={t.y}
            stroke={`url(#vl-${i})`}
            strokeWidth={i % 3 === 0 ? 2.2 : 1.1}
            strokeDasharray={len}
            strokeDashoffset={len * (1 - draw)}
            opacity={0.46 * end * pulse}
          />
        );
      })}
      <circle
        cx={v.x}
        cy={v.y}
        r={interpolate(frame, [T.linesStart, T.linesStart + 24], [0, 5], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })}
        fill={palette.windowSoft}
        opacity={0.9 * end}
      />

      {head1 && <ScanHead W={W} H={H} p={fronts.p1} color={palette.window} />}
      {head2 && <ScanHead W={W} H={H} p={fronts.p2} color={palette.mist} />}
    </svg>
  );
};

const ScanHead: React.FC<{ W: number; H: number; p: number; color: string }> = ({
  W,
  H,
  p,
  color,
}) => {
  const l = scanLine(p, W, H);
  return (
    <g>
      <line {...l} stroke={color} strokeWidth={14} opacity={0.12} />
      <line {...l} stroke={color} strokeWidth={4} opacity={0.3} />
      <line {...l} stroke="#fff" strokeWidth={1.4} opacity={0.85} />
    </g>
  );
};

/* ---------------------------------------------------------------------------------------------- */

const Scrim: React.FC<{ orientation: "wide" | "tall"; share: number }> = ({
  orientation,
  share,
}) => {
  const n = "12,16,20";
  const bg =
    orientation === "tall"
      ? `linear-gradient(0deg, rgba(${n},0.95) 0%, rgba(${n},0.78) ${share * 55}%, rgba(${n},0) ${share * 130}%)`
      : `radial-gradient(ellipse ${share * 120}% 95% at 0% 88%, rgba(${n},0.88) 0%, rgba(${n},0.62) 42%, rgba(${n},0) 100%), linear-gradient(0deg, rgba(${n},0.55) 0%, rgba(${n},0) 30%)`;
  return <div style={{ position: "absolute", inset: 0, background: bg }} />;
};

/* ---------------------------------------------------------------------------------------------- */

const Copy: React.FC<{ frame: number; W: number; H: number }> = ({ frame, W, H }) => {
  const lay = getLayout(W, H);
  const lines = lay.orientation === "tall" ? copy.linesTall : copy.linesWide;
  const rise = (f0: number) =>
    interpolate(frame, [f0, f0 + 26], [112, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: ease,
    });
  const fade = (f0: number, d = 20) =>
    interpolate(frame, [f0, f0 + d], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

  return (
    <div
      style={{
        position: "absolute",
        left: lay.anchor.x,
        bottom: lay.anchor.bottom,
        right: lay.pad,
        color: palette.mist,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          fontFamily: FONT_HEAD,
          fontWeight: 700,
          fontSize: lay.headSize,
          lineHeight: lay.headLine,
          letterSpacing: "-0.012em",
        }}
      >
        {lines.map((line, i) => (
          <div
            key={line}
            style={{
              overflow: "hidden",
              paddingBottom: "0.24em",
              marginBottom: "-0.24em",
            }}
          >
            <div
              style={{
                translate: `0 ${rise(T.textStart + i * 7)}%`,
                whiteSpace: "nowrap",
              }}
            >
              {line}
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: lay.headSize * 0.26,
          fontFamily: FONT_BODY,
          fontWeight: 400,
          fontSize: lay.subSize,
          lineHeight: 1.35,
          maxWidth: lay.orientation === "tall" ? W * 0.74 : W * 0.34,
          color: "#c4d2d7",
          textWrap: "balance",
          opacity: fade(T.textStart + 28),
          translate: `0 ${(1 - fade(T.textStart + 28)) * 14}px`,
        }}
      >
        {copy.sub}
      </div>
      <div
        style={{
          marginTop: lay.headSize * 0.3,
          fontFamily: FONT_BODY,
          fontWeight: 600,
          fontSize: lay.ctaSize,
          background: palette.window,
          color: palette.night,
          padding: `${lay.ctaPadY}px ${lay.ctaPadX}px`,
          borderRadius: 3,
          opacity: fade(T.textStart + 40),
          translate: `0 ${(1 - fade(T.textStart + 40)) * 14}px`,
        }}
      >
        {copy.cta}
      </div>
    </div>
  );
};

/* ---------------------------------------------------------------------------------------------- */

const BANDS = 12;

const Curtain: React.FC<{ frame: number; H: number }> = ({ frame, H }) => {
  if (frame > T.curtainStart + BANDS * 2 + 26) return null;
  return (
    <>
      {Array.from({ length: BANDS }, (_, i) => {
        const open = interpolate(
          frame,
          [T.curtainStart + i * 2, T.curtainStart + i * 2 + 24],
          [1, 0],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.7, 0, 0.2, 1),
          },
        );
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: (H / BANDS) * i - 0.5,
              height: H / BANDS + 1,
              background: palette.night,
              transformOrigin: i % 2 ? "left center" : "right center",
              scale: `${open} 1`,
            }}
          />
        );
      })}
    </>
  );
};
