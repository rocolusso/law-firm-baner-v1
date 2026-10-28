"use client";

import { Player, type PlayerRef } from "@remotion/player";
import { useEffect, useMemo, useRef, useState } from "react";
import { CTA_HREF, FPS } from "../banner.config";
import { compositionSize } from "../geometry";
import { getCopy } from "../i18n/copy";
import type { BannerProps } from "../kit/props";
import { ctaBoxPct } from "../kit/text";
import { getStyle } from "../styles/registry";
import { DEFAULT_LANG, DEFAULT_STYLE_ID, type Lang, type StyleId } from "../types";
import { DEFAULT_THEME_ID, getTheme, type ThemeId } from "../theme";

type Size = { w: number; h: number };

/**
 * Адаптивный баннер: Player подстраивает логический размер композиции под контейнер,
 * поэтому в горизонтальном контейнере получается desktop-раскладка, в вертикальном mobile.
 * Родитель задаёт только размер блока (width/height или aspect-ratio).
 */
export function CityBanner({
  styleId = DEFAULT_STYLE_ID,
  lang = DEFAULT_LANG,
  themeId = DEFAULT_THEME_ID,
}: {
  styleId?: StyleId;
  lang?: Lang;
  themeId?: ThemeId;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<PlayerRef>(null);
  const [size, setSize] = useState<Size | null>(null);
  const [reduced, setReduced] = useState(false);
  // Для какого стиля Player уже показал первый кадр: при смене стиля постер возвращается сам
  const [readyFor, setReadyFor] = useState<StyleId | null>(null);
  const ready = readyFor === styleId;

  const def = getStyle(styleId);
  const copy = getCopy(lang);
  const theme = getTheme(themeId);

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
  }, [reduced, ready, styleId]);

  const dims = size ? compositionSize(size.w, size.h) : null;
  const px =
    dims && size ? Math.max(dims.width, dims.height) / Math.max(size.w, size.h) : 1;
  const mounted = dims !== null;

  // Как только Player отрисовал первый кадр, убираем статичный постер
  useEffect(() => {
    const p = playerRef.current;
    if (!mounted || !p) return;
    const on = () => setReadyFor(styleId);
    p.addEventListener("frameupdate", on);
    const t = window.setTimeout(on, 700);
    return () => {
      p.removeEventListener("frameupdate", on);
      window.clearTimeout(t);
    };
  }, [mounted, styleId]);

  const inputProps: BannerProps = useMemo(
    () => ({ lang, themeId, px }),
    [lang, themeId, px],
  );
  const cta = dims ? ctaBoxPct(dims.width, dims.height, px, copy.cta) : null;

  return (
    <div
      ref={hostRef}
      role="region"
      lang={copy.htmlLang}
      aria-label={copy.ariaLabel}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background: theme.paper,
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
            key={styleId}
            ref={playerRef}
            component={def.Component}
            inputProps={inputProps}
            durationInFrames={def.frames}
            fps={FPS}
            compositionWidth={dims.width}
            compositionHeight={dims.height}
            initialFrame={reduced ? def.poster : 0}
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
      <h2 className="sr-only">{copy.lines.wide.join(" ")}</h2>
      {cta && (
        <a
          href={CTA_HREF}
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
