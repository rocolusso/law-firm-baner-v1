import { AbsoluteFill } from "remotion";
import { image } from "../banner.config";
import { getLayout, toFrame } from "../geometry";
import { getCopy } from "../i18n/copy";
import { easeInOut, easeOut, loopSin, ramp, window4 } from "../kit/anim";
import { LightsCanvas } from "../kit/LightsCanvas";
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
import { Scrim, TextBlock } from "../kit/text";
import { getTheme, withAlpha } from "../theme";

export const FRAMES = 330;
const SCAN: ScanTimes = { in: [150, 208], out: [232, 290] };
const SWEEP_A = [92, 150] as const;
const SWEEP_B = [236, 296] as const;

/** Свет из верхушки башни заливает кадр, окна загораются сверху вниз, потом фото на миг становится точками. */
const LightBurst: React.FC<BannerProps> = ({ lang, themeId, px }) => {
  const rects = usePhotoRects();
  const { frame, W, H, buildings } = rects;
  const theme = getTheme(themeId);
  const copy = getCopy(lang);
  const lay = getLayout(W, H, px);
  const lines = lay.orientation === "tall" ? copy.lines.tall : copy.lines.wide;

  const apex = toFrame(buildings, image.apex);
  const { p1, p2, active } = scanFronts(frame, SCAN);
  const mask = active ? scanMask(p1, p2) : undefined;
  const sw = sweepAt(frame, SWEEP_A, SWEEP_B, easeInOut);

  // Свет: быстро раскрывается, держится, на выходе уходит в белое
  // вспышка: быстро раскрывается до максимума, потом оседает в тёплое свечение у верхушки
  const burst = ramp(frame, 6, 36, easeOut);
  const settle = ramp(frame, 36, 120, easeInOut);
  const bloomR =
    Math.hypot(W, H) *
    (0.1 + 0.8 * burst - 0.3 * settle) *
    (1 + 0.025 * loopSin(frame, FRAMES, 2));
  const bloomOpacity = (0.95 - 0.25 * settle) * (1 - ramp(frame, 296, 326));
  const whiteIn = 1 - ramp(frame, 0, 24, easeOut);
  const whiteOut = ramp(frame, 304, FRAMES - 2);

  const dots = {
    amount: (x: number, y: number) =>
      active ? abstractAmount(scanPos(x, y, W, H), p1, p2) : 0,
    colors: [theme.navyLight, theme.goldMid] as [string, string],
  };
  const lightsOn = window4(frame, 20, 40, 296, 326);

  return (
    <AbsoluteFill style={{ backgroundColor: theme.paper, overflow: "hidden" }}>
      {/* Бумага под абстрактной полосой */}
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

      <div
        style={{
          position: "absolute",
          inset: 0,
          mixBlendMode: "screen",
          opacity: bloomOpacity,
          background: `radial-gradient(circle ${bloomR}px at ${apex.x}px ${apex.y}px, ${withAlpha(theme.highlight, 1)} 0%, ${withAlpha(theme.goldLight, 0.85)} 16%, ${withAlpha(theme.gold, 0.45)} 40%, ${withAlpha(theme.gold, 0)} 72%)`,
        }}
      />

      <Sweep rect={buildings} theme={theme} x={sw.x} power={sw.power} />
      <LightsCanvas
        rect={buildings}
        theme={theme}
        dots={active ? dots : null}
        lights={{
          ignition: 30,
          fade: [296, 326],
          sweep: sw,
          gain: 1.25 * lightsOn + 0.001,
        }}
      />

      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        aria-hidden="true"
        style={{ position: "absolute", inset: 0 }}
      >
        {frame >= SCAN.in[0] && frame <= SCAN.in[1] && (
          <ScanHead W={W} H={H} p={p1} glow={theme.goldMid} unit={px} />
        )}
        {frame >= SCAN.out[0] && frame <= SCAN.out[1] && (
          <ScanHead W={W} H={H} p={p2} glow={theme.navyLight} unit={px} />
        )}
      </svg>

      <Scrim theme={theme} lay={lay} opacity={ramp(frame, 40, 70) * 0.45} />
      <TextBlock
        lines={lines}
        label={copy.cta}
        W={W}
        H={H}
        px={px}
        theme={theme}
        frame={frame}
        headColor="#FFFFFF"
        ctaVariant="gold"
        start={62}
      />

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

export const lightBurst: StyleDef = {
  id: "light-burst",
  frames: FRAMES,
  poster: 125,
  Component: LightBurst,
};
