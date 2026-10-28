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
  subSize: number;
  ctaSize: number;
  ctaPadX: number;
  ctaPadY: number;
  /** Левый нижний угол текстового блока. */
  anchor: { x: number; bottom: number };
  /** Ширина градиентной подложки под текстом в долях кадра. */
  scrim: number;
};

/** Раскладка текста по размеру кадра. Одна функция на desktop и mobile. */
export function getLayout(W: number, H: number): Layout {
  const orientation: Orientation = W / H < 0.95 ? "tall" : "wide";
  if (orientation === "tall") {
    const headSize = Math.min(W * 0.2, H * 0.115);
    return {
      orientation,
      pad: W * 0.075,
      headSize,
      headLine: 0.92,
      subSize: Math.max(26, W * 0.04),
      ctaSize: Math.max(26, W * 0.04),
      ctaPadX: W * 0.05,
      ctaPadY: W * 0.03,
      anchor: { x: W * 0.075, bottom: H * 0.065 },
      scrim: 0.5,
    };
  }
  const headSize = Math.min(H * 0.17, W * 0.066);
  return {
    orientation,
    pad: W * 0.05,
    headSize,
    headLine: 0.92,
    subSize: Math.max(18, headSize * 0.24),
    ctaSize: Math.max(16, headSize * 0.2),
    ctaPadX: headSize * 0.3,
    ctaPadY: headSize * 0.17,
    anchor: { x: W * 0.05, bottom: H * 0.1 },
    scrim: 0.46,
  };
}
