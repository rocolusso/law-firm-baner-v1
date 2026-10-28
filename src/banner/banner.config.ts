/**
 * Настройки, которые меняют без чтения кода анимации.
 * Тексты лежат в i18n/copy.ts, цвета в theme.ts, длительности стилей в styles/registry.ts.
 */

export const FPS = 30;

/** Куда ведёт кнопка консультации. */
export const CTA_HREF = "#consultation";

/** Размеры кнопки как на сайте, в CSS-пикселях. Композиция пересчитывает их под масштаб Player. */
export const CTA_CSS = { height: 48, font: 17, padX: 32 } as const;

/** Переключатели возможностей. backdrop-filter дорог на слабых устройствах, поэтому выключаемый. */
export const FLAGS = { backdropFilter: true } as const;

/** Что и как показывает кадр: точка фокуса в долях исходного изображения. */
export const image = {
  width: 2000,
  height: 1334,
  focal: { x: 0.515, y: 0.46 }, // вершина центральной башни
  apex: { x: 0.514, y: 0.082 }, // верхушка башни
} as const;
