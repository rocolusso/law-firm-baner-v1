import { CTA_CSS } from "./banner.config";

export type Point = { x: number; y: number };
export type Rect = { left: number; top: number; width: number; height: number };

/**
 * Прямоугольник, в который кладётся изображение, чтобы закрыть кадр W×H (как object-fit: cover),
 * с точкой фокуса `focal` (в долях изображения), которую стараемся держать в `target` (в долях кадра).
 * Края прижимаются к кадру, поэтому пустых полос не бывает.
 */
export function coverRect(
  W: number,
  H: number,
  iw: number,
  ih: number,
  zoom: number,
  focal: Point,
  target: Point = { x: 0.5, y: 0.5 },
): Rect {
  const scale = Math.max(W / iw, H / ih) * zoom;
  const width = iw * scale;
  const height = ih * scale;
  const left = clamp(W * target.x - focal.x * width, W - width, 0);
  const top = clamp(H * target.y - focal.y * height, H - height, 0);
  return { left, top, width, height };
}

/** Переводит координаты изображения (0..1) в пиксели кадра. */
export function toFrame(rect: Rect, p: Point): Point {
  return { x: rect.left + p.x * rect.width, y: rect.top + p.y * rect.height };
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/**
 * Логический размер композиции под реальный контейнер: длинная сторона фиксирована,
 * короткая подстраивается. Так композиция получает то же соотношение сторон, что и контейнер,
 * а Player просто масштабирует её без полос.
 */
export function compositionSize(
  containerW: number,
  containerH: number,
  longSide = 1920,
): { width: number; height: number } {
  const w = Math.max(1, containerW);
  const h = Math.max(1, containerH);
  if (w >= h) {
    return {
      width: longSide,
      height: Math.max(2, Math.round((longSide * h) / w / 2) * 2),
    };
  }
  return { width: Math.max(2, Math.round((longSide * w) / h / 2) * 2), height: longSide };
}

export type Orientation = "wide" | "tall";

export type Layout = {
  orientation: Orientation;
  pad: number;
  headSize: number;
  headLine: number;
  /** Отступ между заголовком и кнопкой. */
  gap: number;
  cta: { height: number; font: number; padX: number };
  /** Левый нижний угол текстового блока. */
  anchor: { x: number; bottom: number };
};

/**
 * Раскладка текста по размеру кадра. Одна функция на desktop и mobile.
 * `px` показывает, сколько пикселей композиции приходится на один CSS-пиксель страницы,
 * поэтому кнопка всегда имеет размер сайта (48 CSS px), как бы ни масштабировался Player.
 */
export function getLayout(W: number, H: number, px = 1, ctaCss = CTA_CSS): Layout {
  const orientation: Orientation = W / H < 0.95 ? "tall" : "wide";
  const cta = {
    height: ctaCss.height * px,
    font: ctaCss.font * px,
    padX: ctaCss.padX * px,
  };
  if (orientation === "tall") {
    const headSize = Math.min(W * 0.15, H * 0.09);
    return {
      orientation,
      pad: W * 0.07,
      headSize,
      headLine: 0.98,
      gap: headSize * 0.45,
      cta,
      anchor: { x: W * 0.07, bottom: Math.max(H * 0.05, 20 * px) },
    };
  }
  const headSize = Math.min(W * 0.046, H * 0.095);
  return {
    orientation,
    pad: W * 0.05,
    headSize,
    headLine: 0.98,
    gap: headSize * 0.55,
    cta,
    anchor: { x: W * 0.05, bottom: Math.max(H * 0.09, 24 * px) },
  };
}

/** Ширина кнопки: считается одинаково для видимой кнопки и невидимой ссылки поверх холста. */
export function ctaWidth(label: string, cta: Layout["cta"]): number {
  return label.length * cta.font * 0.6 + cta.padX * 2;
}
