import { AbsoluteFill } from "remotion";
import { getLayout } from "../geometry";
import { getCopy } from "../i18n/copy";
import { clamp01, easeInOut, keyframes, ramp, smooth } from "../kit/anim";
import { LightsCanvas } from "../kit/LightsCanvas";
import { Photo, usePhotoRects } from "../kit/photo";
import type { BannerProps, StyleDef } from "../kit/props";
import { Scrim, TextBlock } from "../kit/text";
import { getTheme, withAlpha } from "../theme";

export const FRAMES = 330;

/**
 * Сцена в темноте. Прожектор обходит здания, за его краем фото рассыпается на тусклые точки,
 * потом свет заливает кадр целиком.
 */
const Spotlight: React.FC<BannerProps> = ({ lang, themeId, px }) => {
  const rects = usePhotoRects({ zoomWide: 1.06 });
  const { frame, W, H } = rects;
  const theme = getTheme(themeId);
  const copy = getCopy(lang);
  const lay = getLayout(W, H, px);
  const lines = lay.orientation === "tall" ? copy.lines.tall : copy.lines.wide;
  const D = Math.hypot(W, H);

  // Путь пятна: слева по фасадам, затем к верхушке башни
  const sx = keyframes(frame, [
    [0, 0.1],
    [40, 0.14],
    [92, 0.4],
    [140, 0.64],
    [188, 0.5],
  ]);
  const sy = keyframes(frame, [
    [0, 0.72],
    [40, 0.66],
    [92, 0.52],
    [140, 0.4],
    [188, 0.28],
  ]);
  const X = sx * W;
  const Y = sy * H;

  const flood = ramp(frame, 168, 236, easeInOut);
  const R = D * (0.16 + 0.04 * Math.sin(frame / 9)) + D * 1.5 * flood;
  const enter = smooth(ramp(frame, 4, 26));
  const leave = 1 - ramp(frame, 298, 326);
  const dark = (0.94 - 0.9 * flood) * enter + (1 - enter) * 0.98;
  const darkOut = dark + (0.94 - dark) * (1 - leave);

  const night = theme.navyDeep;
  const veil = `radial-gradient(circle ${R}px at ${X}px ${Y}px, ${withAlpha(night, 0)} 0%, ${withAlpha(night, 0)} 52%, ${withAlpha(night, darkOut)} 100%)`;

  // Конус света сверху до пятна
  const coneW = R * 0.18;
  const cone = `polygon(${X - coneW * 0.35}px -5%, ${X + coneW * 0.35}px -5%, ${X + R * 0.8}px ${Y + R * 0.15}px, ${X - R * 0.8}px ${Y + R * 0.15}px)`;
  const coneOpacity = enter * (1 - flood) * leave;

  const dots = {
    amount: (x: number, y: number) =>
      clamp01((Math.hypot(x - X, y - Y) - R * 0.86) / (R * 0.3)) * (1 - flood),
    colors: [theme.navyLight, theme.goldMid] as [string, string],
    size: 0.9,
    phase: 2,
  };

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(160deg, ${theme.navy} 0%, ${theme.navyDeep} 100%)`,
        overflow: "hidden",
      }}
    >
      <Photo rects={rects} theme={theme} />
      <div style={{ position: "absolute", inset: 0, background: veil }} />

      <LightsCanvas
        rect={rects.buildings}
        theme={theme}
        dots={flood < 0.98 ? dots : null}
        lights={{ ignition: 60, fade: [298, 326], gain: 1.2 * (0.35 + 0.65 * flood) }}
      />

      {/* Пятно и конус: аддитивный свет. Размытие на внешнем слое, чтобы края конуса были мягкими */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          mixBlendMode: "screen",
          filter: `blur(${22 * px}px)`,
          opacity: coneOpacity * 0.6,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            clipPath: cone,
            background: `linear-gradient(180deg, ${withAlpha(theme.highlight, 0.9)} 0%, ${withAlpha(theme.gold, 0.2)} 100%)`,
          }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          mixBlendMode: "screen",
          opacity: coneOpacity * 0.8,
          background: `radial-gradient(circle ${R * 0.62}px at ${X}px ${Y}px, ${withAlpha(theme.highlight, 0.85)} 0%, ${withAlpha(theme.gold, 0.32)} 45%, ${withAlpha(theme.gold, 0)} 100%)`,
        }}
      />

      <Scrim theme={theme} lay={lay} opacity={ramp(frame, 110, 150) * leave * 0.45} />
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
        start={126}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: night,
          opacity: 1 - leave,
        }}
      />
    </AbsoluteFill>
  );
};

export const spotlight: StyleDef = {
  id: "spotlight",
  frames: FRAMES,
  poster: 250,
  Component: Spotlight,
};
