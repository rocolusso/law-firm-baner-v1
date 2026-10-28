import { AbsoluteFill } from "remotion";
import { FLAGS, image, LITE_CANVAS_SCALE } from "../banner.config";
import { getLayout, toFrame } from "../geometry";
import { getCopy } from "../i18n/copy";
import { easeInOut, easeOut, loopSin, ramp, smooth } from "../kit/anim";
import { LightsCanvas } from "../kit/LightsCanvas";
import { Mark } from "../kit/Mark";
import { Photo, usePhotoRects } from "../kit/photo";
import type { BannerProps, StyleDef } from "../kit/props";
import { Sweep, sweepAt } from "../kit/Sweep";
import { CtaButton, Headline } from "../kit/text";
import { getTheme, withAlpha } from "../theme";

export const FRAMES = 300;

const blur = (px: number, on: boolean) =>
  on ? `blur(${px}px) saturate(1.5)` : undefined;

/** Матовое стекло в духе Apple: панели с размытием плывут над фото, на главной панели текст. */
const Glass: React.FC<BannerProps> = ({ lang, themeId, px, lite }) => {
  const rects = usePhotoRects({ zoomWide: 1.08, depth: 0.05 });
  const { frame, W, H, buildings } = rects;
  const theme = getTheme(themeId);
  const copy = getCopy(lang);
  const lay = getLayout(W, H, px);
  const lines = lay.orientation === "tall" ? copy.lines.tall : copy.lines.wide;
  // backdrop-filter заставляет браузер заново размывать всё, что под панелью, на каждом кадре
  const bd = FLAGS.backdropFilter && !lite;

  const sw = sweepAt(frame, [70, 128], [168, 226], easeInOut);
  const apex = toFrame(buildings, image.apex);

  // Главная панель: размер из содержимого, нижняя кромка кнопки остаётся на anchor.bottom
  const padP = lay.headSize * 0.5;
  const enter = ramp(frame, 8, 54, easeOut);
  const leave = ramp(frame, 270, 294, easeInOut);
  const show = enter * (1 - leave);

  // Плавающие панели: медленный дрейф с целым числом периодов за цикл
  const panes = [
    { x: 0.58, y: 0.1, w: 0.17, h: 0.6, rot: -8, cyc: 1, ph: 0 },
    { x: 0.8, y: 0.24, w: 0.12, h: 0.5, rot: 6, cyc: 2, ph: 1.6 },
    { x: 0.42, y: 0.04, w: 0.1, h: 0.42, rot: -3, cyc: 1, ph: 3.2 },
  ];

  return (
    <AbsoluteFill style={{ background: theme.soft, overflow: "hidden" }}>
      <Photo rects={rects} theme={theme} lite={lite} />

      {/* Мягкое золото у верхушки */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          mixBlendMode: lite ? undefined : "screen",
          opacity: 0.8,
          background: `radial-gradient(circle ${Math.hypot(W, H) * 0.34}px at ${apex.x}px ${apex.y}px, ${withAlpha(theme.highlight, 0.95)} 0%, ${withAlpha(theme.gold, 0.35)} 45%, ${withAlpha(theme.gold, 0)} 100%)`,
        }}
      />
      <Sweep rect={buildings} theme={theme} x={sw.x} power={sw.power} lite={lite} />
      <LightsCanvas
        rect={buildings}
        theme={theme}
        scale={lite ? LITE_CANVAS_SCALE : 1}
        lights={{ ignition: 24, sweep: sw, gain: 1.1 }}
      />

      {panes.map((p, i) => {
        const dx = loopSin(frame, FRAMES, p.cyc, p.ph) * W * 0.018;
        const dy = loopSin(frame, FRAMES, p.cyc, p.ph + 1.2) * H * 0.012;
        const appear = smooth(ramp(frame, 20 + i * 10, 56 + i * 10));
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: p.x * W,
              top: p.y * H,
              width: p.w * W,
              height: p.h * H,
              transform: `translate(${dx}px, ${dy}px) skewX(${p.rot}deg)`,
              borderRadius: 28 * px,
              opacity: appear * (1 - leave * 0.6),
              backdropFilter: blur(5 * px, bd),
              WebkitBackdropFilter: blur(5 * px, bd),
              background: `linear-gradient(120deg, ${withAlpha("#ffffff", bd ? 0.2 : 0.3)} 0%, ${withAlpha("#ffffff", 0.06)} 60%, ${withAlpha(theme.goldLight, 0.2)} 100%)`,
              boxShadow: `inset 0 0 0 ${1.5 * px}px ${withAlpha("#ffffff", 0.55)}`,
            }}
          />
        );
      })}

      <div
        style={{
          position: "absolute",
          left: lay.anchor.x - padP,
          bottom: lay.anchor.bottom - padP,
          padding: padP,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          borderRadius: 36 * px,
          opacity: show,
          transform: `translateY(${(1 - enter) * 60 * px}px) scale(${0.96 + 0.04 * enter})`,
          transformOrigin: "left bottom",
          backdropFilter: blur(26 * px, bd),
          WebkitBackdropFilter: blur(26 * px, bd),
          background: `linear-gradient(135deg, ${withAlpha("#ffffff", bd ? 0.84 : 0.92)} 0%, ${withAlpha("#ffffff", bd ? 0.7 : 0.8)} 100%)`,
          boxShadow: `0 ${30 * px}px ${80 * px}px ${withAlpha(theme.navyDeep, 0.35)}, inset 0 0 0 ${2 * px}px ${withAlpha("#ffffff", 0.9)}`,
          overflow: "hidden",
        }}
      >
        {/* Блик, пересекающий панель */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(100deg, transparent ${ramp(frame, 40, 100) * 130 - 40}%, ${withAlpha("#ffffff", 0.7)} ${ramp(frame, 40, 100) * 130 - 30}%, transparent ${ramp(frame, 40, 100) * 130 - 18}%)`,
            pointerEvents: "none",
          }}
        />
        <Mark
          variant="icon"
          color={theme.brand}
          height={lay.headSize * 0.95}
          style={{ marginBottom: lay.headSize * 0.3, opacity: ramp(frame, 40, 60) }}
        />
        <Headline
          lines={lines}
          lay={lay}
          color={theme.ink}
          frame={frame}
          start={50}
          weight={800}
        />
        <div style={{ height: lay.gap }} />
        <CtaButton
          label={copy.cta}
          lay={lay}
          theme={theme}
          variant="ink"
          appear={ramp(frame, 76, 96, easeOut)}
        />
      </div>
    </AbsoluteFill>
  );
};

export const glass: StyleDef = {
  id: "glass",
  frames: FRAMES,
  poster: 170,
  Component: Glass,
};
