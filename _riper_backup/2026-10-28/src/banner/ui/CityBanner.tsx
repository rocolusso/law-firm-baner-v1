"use client";

import { Player, type PlayerRef } from "@remotion/player";
import { useEffect, useRef, useState } from "react";
import { copy, DURATION_IN_FRAMES, FPS, POSTER_FRAME } from "../banner.config";
import { CityComposition } from "../composition/CityComposition";
import { compositionSize, getLayout } from "../geometry";

type Size = { w: number; h: number };

/**
 * Адаптивный баннер: Player подстраивает логический размер композиции под контейнер,
 * поэтому в горизонтальном контейнере получается desktop-раскладка, в вертикальном mobile.
 * Родитель задаёт только размер блока (width/height или aspect-ratio).
 */
export function CityBanner() {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<PlayerRef>(null);
  const [size, setSize] = useState<Size | null>(null);
  const [reduced, setReduced] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0)
        setSize({ w: Math.round(width), h: Math.round(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Не тратим CPU, пока баннер вне экрана или вкладка скрыта
  useEffect(() => {
    const el = hostRef.current;
    if (!el || reduced) return;
    let visible = true;
    const sync = () => {
      const p = playerRef.current;
      if (!p) return;
      if (visible && !document.hidden) p.play();
      else p.pause();
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      sync();
    });
    io.observe(el);
    document.addEventListener("visibilitychange", sync);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [reduced, ready]);

  const dims = size ? compositionSize(size.w, size.h) : null;
  const mounted = dims !== null;

  // Как только Player отрисовал первый кадр, убираем статичный постер
  useEffect(() => {
    const p = playerRef.current;
    if (!mounted || !p) return;
    const on = () => setReady(true);
    p.addEventListener("frameupdate", on);
    const t = window.setTimeout(on, 700);
    return () => {
      p.removeEventListener("frameupdate", on);
      window.clearTimeout(t);
    };
  }, [mounted]);
  const cta = dims ? ctaBox(dims.width, dims.height) : null;

  return (
    <div
      ref={hostRef}
      role="region"
      aria-label={copy.ariaLabel}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background: "#0c1014",
      }}
    >
      {/* Постер: виден до запуска анимации и если JS не загрузился */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "url(/banner/city.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "51% 40%",
          opacity: ready ? 0 : 1,
          transition: "opacity 400ms",
        }}
      />

      {dims && (
        <div aria-hidden="true" style={{ position: "absolute", inset: 0 }}>
          <Player
            ref={playerRef}
            component={CityComposition}
            durationInFrames={DURATION_IN_FRAMES}
            fps={FPS}
            compositionWidth={dims.width}
            compositionHeight={dims.height}
            initialFrame={reduced ? POSTER_FRAME : 0}
            autoPlay={!reduced}
            loop
            controls={false}
            clickToPlay={false}
            doubleClickToFullscreen={false}
            spaceKeyToPlayOrPause={false}
            numberOfSharedAudioTags={0}
            initiallyMuted
            acknowledgeRemotionLicense
            style={{ width: "100%", height: "100%" }}
          />
        </div>
      )}

      {/* Настоящий текст и ссылка поверх холста: доступность и SEO */}
      <h2 className="sr-only">{copy.linesWide.join(" ")}</h2>
      <p className="sr-only">{copy.sub}</p>
      {cta && (
        <a
          href={copy.href}
          aria-label={copy.cta}
          className="banner-cta"
          style={{
            position: "absolute",
            left: `${cta.left}%`,
            bottom: `${cta.bottom}%`,
            width: `${cta.width}%`,
            height: `${cta.height}%`,
          }}
        />
      )}
    </div>
  );
}

/** Кнопка внутри композиции рисуется на canvas-слое Remotion; здесь её невидимый двойник для клика и фокуса. */
function ctaBox(W: number, H: number) {
  const l = getLayout(W, H);
  const textW = copy.cta.length * l.ctaSize * 0.56;
  const width = textW + l.ctaPadX * 2;
  const height = l.ctaSize * 1.25 + l.ctaPadY * 2;
  return {
    left: (l.anchor.x / W) * 100,
    bottom: (l.anchor.bottom / H) * 100,
    width: (width / W) * 100,
    height: (height / H) * 100,
  };
}
