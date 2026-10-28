import { useEffect, useRef } from "react";

/**
 * Картинка, нарисованная один раз на canvas и растянутая CSS, как <img>.
 * Зачем не обычный <img>: слои фото подгружаются позже постера и в Chrome становились
 * новым LCP, из-за чего метрика уезжала на секунды. Canvas в LCP не участвует,
 * а по стоимости это та же текстура, которую браузер масштабирует на GPU.
 */
export const CanvasImage: React.FC<{ src: string; style?: React.CSSProperties }> = ({
  src,
  style,
}) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let off = false;
    const img = new Image();
    img.decoding = "async";
    img.src = src;
    const paint = () => {
      const c = ref.current;
      const g = c?.getContext("2d");
      if (off || !c || !g) return;
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      g.drawImage(img, 0, 0);
    };
    if (typeof img.decode === "function") img.decode().then(paint, () => {});
    else img.onload = paint;
    return () => {
      off = true;
    };
  }, [src]);

  return <canvas ref={ref} aria-hidden="true" style={style} />;
};
