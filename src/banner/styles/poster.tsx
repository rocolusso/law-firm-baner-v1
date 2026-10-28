import { AbsoluteFill } from "remotion";
import { getLayout } from "../geometry";
import { getCopy } from "../i18n/copy";
import { easeInOut, easeOut, easeSnap, ramp } from "../kit/anim";
import { LightsCanvas } from "../kit/LightsCanvas";
import { Photo, usePhotoRects } from "../kit/photo";
import type { BannerProps, StyleDef } from "../kit/props";
import { CtaButton, FONT } from "../kit/text";
import { getTheme, goldGradient, withAlpha } from "../theme";

export const FRAMES = 270;

/**
 * Плакат: золотой фон с растром, фото в наклонном окне, слова заголовка на цветных плашках,
 * которые по очереди выезжают слева. Смена плашек не чаще двух раз в секунду.
 */
const Poster: React.FC<BannerProps> = ({ lang, themeId, px }) => {
  const rects = usePhotoRects({ zoomWide: 1.1, zoomTall: 1.12, depth: 0.08 });
  const { frame, W, H, buildings } = rects;
  const theme = getTheme(themeId);
  const copy = getCopy(lang);
  const lay = getLayout(W, H, px);
  const tall = lay.orientation === "tall";

  const plates = copy.plates;
  const maxChars = Math.max(...plates.map((p) => p.length));
  const size = tall
    ? Math.min(lay.headSize, (W * 0.86) / (maxChars * 0.56))
    : Math.min(H * 0.1, W * 0.052);
  const plateH = size * 1.14;
  const scheme = [
    { bg: theme.navy, fg: "#FFFFFF" },
    { bg: theme.paper, fg: theme.ink },
    { bg: theme.ink, fg: theme.goldLight },
  ];

  // Окно с фото: наклонный срез
  const open = ramp(frame, 0, 30, easeSnap);
  const close = ramp(frame, 246, 268, easeSnap);
  const win = open * (1 - close);
  const clip = tall
    ? `polygon(0 0, 100% 0, 100% ${win * 62}%, 0 ${win * 80}%)`
    : `polygon(${100 - win * 78}% 0, 100% 0, 100% 100%, ${100 - win * 62}% 100%)`;

  const exit = ramp(frame, 244, 266, easeInOut);
  const raster = 15 * px;

  return (
    <AbsoluteFill style={{ background: goldGradient(theme, 150), overflow: "hidden" }}>
      {/* Растр */}
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(circle, ${withAlpha(theme.navy, 0.16)} ${1.6 * px}px, transparent ${1.9 * px}px)`,
          backgroundSize: `${raster}px ${raster}px`,
        }}
      />

      {/* Фото в окне */}
      <AbsoluteFill style={{ clipPath: clip }}>
        <Photo rects={rects} theme={theme} />
        <LightsCanvas
          rect={buildings}
          theme={theme}
          lights={{ ignition: 20, fade: [250, 266], gain: 1.2 }}
        />
      </AbsoluteFill>

      {/* Плашки со словами */}
      <div
        style={{
          position: "absolute",
          left: 0,
          bottom: lay.anchor.bottom + lay.cta.height + lay.gap,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: size * 0.1,
        }}
      >
        {plates.map((text, i) => {
          const k = ramp(frame, 34 + i * 12, 34 + i * 12 + 22, easeOut);
          const out = ramp(frame, 244 + i * 3, 244 + i * 3 + 18, easeInOut);
          const x = -(1 - k) * 110 - out * 110;
          return (
            <div
              key={text}
              style={{
                translate: `${x}% 0`,
                height: plateH,
                display: "flex",
                alignItems: "center",
                padding: `0 ${size * 0.34}px 0 ${lay.anchor.x}px`,
                background: scheme[i % scheme.length].bg,
                color: scheme[i % scheme.length].fg,
                fontFamily: FONT,
                fontWeight: 800,
                fontSize: size,
                letterSpacing: "-0.035em",
                whiteSpace: "nowrap",
                boxShadow: `${size * 0.06}px ${size * 0.08}px 0 ${withAlpha(theme.navyDeep, 0.25)}`,
              }}
            >
              {text}
            </div>
          );
        })}
      </div>

      <div
        style={{ position: "absolute", left: lay.anchor.x, bottom: lay.anchor.bottom }}
      >
        <CtaButton
          label={copy.cta}
          lay={lay}
          theme={theme}
          variant="ink"
          appear={ramp(frame, 76, 98, easeOut) * (1 - exit)}
        />
      </div>
    </AbsoluteFill>
  );
};

export const poster: StyleDef = {
  id: "poster",
  frames: FRAMES,
  poster: 150,
  Component: Poster,
};
