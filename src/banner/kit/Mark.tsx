import { useId } from "react";
import {
  ICON_BOUNDS,
  ICON_D,
  ICON_STEM,
  MARK_COLOR,
  MARK_VIEWBOX,
  WORD_BOUNDS,
  WORD_D,
} from "../brand/clario-mark";

export type MarkVariant = "full" | "icon" | "word";

const PAD = 4;
/** Выше этой линии (в координатах viewBox) знак качается, ниже стоит основание. */
const BASE_Y = 142;
/** Зазор у стойки: кромка стойки не попадает в качающиеся части, иначе остаются тонкие полоски. */
const SEAM = 1.6;

function viewBoxFor(variant: MarkVariant): {
  x: number;
  y: number;
  w: number;
  h: number;
} {
  if (variant === "icon") {
    const b = ICON_BOUNDS;
    return {
      x: b.x0 - PAD,
      y: b.y0 - PAD,
      w: b.x1 - b.x0 + PAD * 2,
      h: b.y1 - b.y0 + PAD * 2,
    };
  }
  if (variant === "word") {
    const b = WORD_BOUNDS;
    return {
      x: b.x0 - PAD,
      y: b.y0 - PAD,
      w: b.x1 - b.x0 + PAD * 2,
      h: b.y1 - b.y0 + PAD * 2,
    };
  }
  const x0 = ICON_BOUNDS.x0;
  const y0 = Math.min(ICON_BOUNDS.y0, WORD_BOUNDS.y0);
  const x1 = WORD_BOUNDS.x1;
  const y1 = Math.max(ICON_BOUNDS.y1, WORD_BOUNDS.y1);
  return { x: x0 - PAD, y: y0 - PAD, w: x1 - x0 + PAD * 2, h: y1 - y0 + PAD * 2 };
}

/** Соотношение сторон области вывода знака, ширина / высота. */
export function markAspect(variant: MarkVariant): number {
  const v = viewBoxFor(variant);
  return v.w / v.h;
}

export type MarkProps = {
  variant?: MarkVariant;
  /** Цвет заливки. По умолчанию цвет логотипа из EPS. */
  color?: string;
  height?: number | string;
  width?: number | string;
  /** Наклон коромысла весов в градусах. Работает у знака и у полной версии. */
  tilt?: number;
  title?: string;
  style?: React.CSSProperties;
  className?: string;
};

/**
 * Логотип Clario из векторных данных EPS. Белый фон EPS отброшен, цвет задаётся пропсом.
 * Наклон весов: левая и правая части знака вращаются вместе вокруг точки коромысла,
 * средняя полоса со стойкой остаётся на месте (три копии контура через clipPath).
 */
export const Mark: React.FC<MarkProps> = ({
  variant = "full",
  color = MARK_COLOR,
  height,
  width,
  tilt = 0,
  title,
  style,
  className,
}) => {
  const uid = useId().replace(/:/g, "");
  const vb = viewBoxFor(variant);
  const showIcon = variant !== "word";
  const showWord = variant !== "icon";
  const { x0, x1, pivotY } = ICON_STEM;
  const cx = (x0 + x1) / 2;
  const tilted = showIcon && Math.abs(tilt) > 0.01;
  const big = 400;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={className}
      style={{
        display: "block",
        overflow: "visible",
        height,
        width: width ?? "auto",
        aspectRatio: `${vb.w} / ${vb.h}`,
        ...style,
      }}
    >
      {title && <title>{title}</title>}
      {showWord && <path d={WORD_D} fill={color} fillRule="evenodd" />}
      {showIcon && !tilted && <path d={ICON_D} fill={color} fillRule="evenodd" />}
      {tilted && (
        <>
          <defs>
            {/* Качаются коромысло и чаши: выше линии основания, слева и справа от стойки */}
            <clipPath id={`${uid}-l`}>
              <rect x={-big} y={-big} width={big + x0 - SEAM} height={big + BASE_Y} />
            </clipPath>
            <clipPath id={`${uid}-r`}>
              <rect x={x1 + SEAM} y={-big} width={big} height={big + BASE_Y} />
            </clipPath>
            {/* Неподвижны стойка и основание: объединение двух прямоугольников */}
            <clipPath id={`${uid}-c`}>
              <rect x={x0 - SEAM} y={-big} width={x1 - x0 + SEAM * 2} height={big * 2} />
              <rect x={-big} y={BASE_Y} width={big * 3} height={big} />
            </clipPath>
          </defs>
          <g clipPath={`url(#${uid}-c)`}>
            <path d={ICON_D} fill={color} fillRule="evenodd" />
          </g>
          <g transform={`rotate(${tilt} ${cx} ${pivotY})`}>
            <g clipPath={`url(#${uid}-l)`}>
              <path d={ICON_D} fill={color} fillRule="evenodd" />
            </g>
            <g clipPath={`url(#${uid}-r)`}>
              <path d={ICON_D} fill={color} fillRule="evenodd" />
            </g>
          </g>
        </>
      )}
    </svg>
  );
};

export { MARK_VIEWBOX };
