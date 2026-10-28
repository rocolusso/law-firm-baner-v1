import raw from "../image-data.json";

export type Light = { x: number; y: number; w: number; h: number; a: number; t: number };

export type ImageData = {
  imageW: number;
  imageH: number;
  cols: number;
  rows: number;
  /** Крупные тёплые источники света: окна, фонари, светофоры. */
  lights: Light[];
  /** Мелкие яркие точки на стеклянной башне. */
  specks: Light[];
  /** Яркость ячеек 0..100 в сетке cols × rows. */
  gridL: number[][];
  /** Тёплость ячеек 0..100 (0 синий, 100 янтарный). */
  gridW: number[][];
};

export const imageData = raw as ImageData;

/** Детерминированный «шум» 0..1 по индексу, чтобы анимация не зависела от Math.random. */
export function hash(i: number): number {
  const h = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return h - Math.floor(h);
}
