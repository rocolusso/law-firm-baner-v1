import { ctaWidth, getLayout, type Layout } from "../geometry";
import { goldGradient, withAlpha, type Theme } from "../theme";
import { easeOut, ramp } from "./anim";

export const FONT =
  "'Inter Variable', Inter, system-ui, -apple-system, 'Segoe UI', sans-serif";

export type CtaVariant = "gold" | "ink" | "paper";

const ctaColors = (theme: Theme, v: CtaVariant) =>
  v === "gold"
    ? { bg: goldGradient(theme, 120), fg: theme.ink }
    : v === "ink"
      ? { bg: theme.ink, fg: theme.paper }
      : { bg: theme.paper, fg: theme.ink };

/** Видимая кнопка. Размеры из getLayout: высота 48 CSS px, шрифт 17, отступы 32. */
export const CtaButton: React.FC<{
  label: string;
  lay: Layout;
  theme: Theme;
  variant?: CtaVariant;
  /** 0..1 прогресс появления. */
  appear?: number;
  style?: React.CSSProperties;
}> = ({ label, lay, theme, variant = "gold", appear = 1, style }) => {
  const c = ctaColors(theme, variant);
  return (
    <div
      style={{
        width: ctaWidth(label, lay.cta),
        height: lay.cta.height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 9999,
        background: c.bg,
        color: c.fg,
        fontFamily: FONT,
        fontWeight: 600,
        fontSize: lay.cta.font,
        letterSpacing: "-0.005em",
        whiteSpace: "nowrap",
        boxShadow: `0 ${lay.cta.height * 0.18}px ${lay.cta.height * 0.5}px rgba(10,21,54,0.28)`,
        opacity: appear,
        translate: `0 ${(1 - appear) * lay.cta.height * 0.4}px`,
        ...style,
      }}
    >
      {label}
    </div>
  );
};

/** Заголовок построчно: каждая строка выезжает из-под маски. */
export const Headline: React.FC<{
  lines: string[];
  lay: Layout;
  color: string;
  frame: number;
  start: number;
  stagger?: number;
  duration?: number;
  weight?: number;
  style?: React.CSSProperties;
}> = ({
  lines,
  lay,
  color,
  frame,
  start,
  stagger = 7,
  duration = 26,
  weight = 800,
  style,
}) => (
  <div
    style={{
      fontFamily: FONT,
      fontWeight: weight,
      fontSize: lay.headSize,
      lineHeight: lay.headLine,
      letterSpacing: "-0.035em",
      color,
      ...style,
    }}
  >
    {lines.map((line, i) => {
      const k = ramp(frame, start + i * stagger, start + i * stagger + duration, easeOut);
      return (
        <div
          key={line}
          style={{ overflow: "hidden", paddingBottom: "0.2em", marginBottom: "-0.2em" }}
        >
          <div style={{ translate: `0 ${(1 - k) * 112}%`, whiteSpace: "nowrap" }}>
            {line}
          </div>
        </div>
      );
    })}
  </div>
);

/** Заголовок и кнопка в левом нижнем углу. Позиция кнопки совпадает с невидимой ссылкой в CityBanner. */
export const TextBlock: React.FC<{
  lines: string[];
  label: string;
  W: number;
  H: number;
  px: number;
  theme: Theme;
  frame: number;
  headColor: string;
  ctaVariant?: CtaVariant;
  start: number;
  headWeight?: number;
}> = ({
  lines,
  label,
  W,
  H,
  px,
  theme,
  frame,
  headColor,
  ctaVariant,
  start,
  headWeight,
}) => {
  const lay = getLayout(W, H, px);
  return (
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
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
        }}
      >
        {/* Мягкая тёмная плашка строго по размеру текста: белый текст держит контраст на любом фоне */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: `${-lay.headSize * 0.9}px ${-lay.headSize * 1.1}px ${-lay.headSize * 0.7}px ${-lay.headSize * 1.1}px`,
            background: withAlpha(theme.navyDeep, 0.68),
            filter: `blur(${lay.headSize * 0.42}px)`,
            opacity: ramp(frame, start - 14, start + 10),
          }}
        />
        <div style={{ position: "relative" }}>
          <Headline
            lines={lines}
            lay={lay}
            color={headColor}
            frame={frame}
            start={start}
            weight={headWeight}
          />
        </div>
        <div style={{ height: lay.gap }} />
        <div style={{ position: "relative" }}>
          <CtaButton
            label={label}
            lay={lay}
            theme={theme}
            variant={ctaVariant}
            appear={ramp(
              frame,
              start + lines.length * 7 + 14,
              start + lines.length * 7 + 34,
              easeOut,
            )}
          />
        </div>
      </div>
    </div>
  );
};

/** Подложка под текст: тёмно-синий градиент от угла, чтобы белый текст держал контраст ≥ 4.5. */
export const Scrim: React.FC<{ theme: Theme; lay: Layout; opacity?: number }> = ({
  theme,
  lay,
  opacity = 1,
}) => {
  const n = theme.navyDeep;
  const bg =
    lay.orientation === "tall"
      ? `linear-gradient(0deg, ${n}F2 0%, ${n}D9 28%, ${n}00 62%)`
      : `radial-gradient(ellipse 72% 95% at 0% 100%, ${n}EE 0%, ${n}B8 40%, ${n}00 100%), linear-gradient(0deg, ${n}E6 0%, ${n}A6 20%, ${n}00 44%)`;
  return <div style={{ position: "absolute", inset: 0, background: bg, opacity }} />;
};

/** Размеры невидимой ссылки поверх холста в процентах кадра. */
export function ctaBoxPct(W: number, H: number, px: number, label: string) {
  const lay = getLayout(W, H, px);
  return {
    left: (lay.anchor.x / W) * 100,
    bottom: (lay.anchor.bottom / H) * 100,
    width: (ctaWidth(label, lay.cta) / W) * 100,
    height: (lay.cta.height / H) * 100,
  };
}
