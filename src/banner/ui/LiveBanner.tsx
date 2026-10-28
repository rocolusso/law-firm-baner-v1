"use client";

import { Player, type PlayerRef } from "@remotion/player";
import { useEffect, useMemo, useRef, useState } from "react";
import { FPS } from "../banner.config";
import type { Tier } from "../geometry";
import { isLite } from "../geometry";
import type { BannerProps, StyleDef } from "../kit/props";
import { loadStyle } from "../styles/loaders";
import type { Lang, StyleId } from "../types";
import type { ThemeId } from "../theme";

/** Ниже этого числа кадров в секунду баннер считается тормозящим. Целевая скорость 30. */
const SLOW_FPS = 22;
const WINDOW_MS = 2000;
const WARMUP_MS = 1000;
/** Сколько окон подряд должно быть медленным, чтобы понизить качество. */
const SLOW_WINDOWS = 2;

export type LiveProps = {
  styleId: StyleId;
  lang: Lang;
  themeId: ThemeId;
  dims: { width: number; height: number };
  px: number;
  tier: Tier;
  /** Баннер на экране и вкладка видна: можно играть. */
  playing: boolean;
  reduced: boolean;
  /** Замереть на постерном кадре: слабое устройство не тянет даже самый лёгкий режим. */
  frozen: boolean;
  perf: boolean;
  onReady: (id: StyleId) => void;
  onSlow: () => void;
};

/**
 * Живая часть баннера: Remotion Player и код выбранного стиля. Подгружается лениво после LCP,
 * поэтому не входит в первый JS страницы.
 */
export default function LiveBanner({
  styleId,
  lang,
  themeId,
  dims,
  px,
  tier,
  playing,
  reduced,
  frozen,
  perf,
  onReady,
  onSlow,
}: LiveProps) {
  const playerRef = useRef<PlayerRef>(null);
  const perfRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState<StyleDef | null>(null);

  useEffect(() => {
    let off = false;
    loadStyle(styleId).then((d) => {
      if (!off) setLoaded(d);
    });
    return () => {
      off = true;
    };
  }, [styleId]);
  const def = loaded && loaded.id === styleId ? loaded : null;

  const inputProps: BannerProps = useMemo(
    () => ({ lang, themeId, px, lite: isLite(tier) }),
    [lang, themeId, px, tier],
  );

  // Первый кадр отрисован: страница убирает постер
  useEffect(() => {
    const p = playerRef.current;
    if (!def || !p) return;
    const on = () => onReady(def.id);
    p.addEventListener("frameupdate", on);
    const t = window.setTimeout(on, 700);
    return () => {
      p.removeEventListener("frameupdate", on);
      window.clearTimeout(t);
    };
  }, [def, onReady]);

  // Играть или стоять
  useEffect(() => {
    const p = playerRef.current;
    if (!def || !p) return;
    if (frozen) {
      p.pause();
      p.seekTo(def.poster);
    } else if (playing && !reduced) p.play();
    else p.pause();
  }, [def, playing, reduced, frozen]);

  // Следим за скоростью: два медленных окна подряд понижают качество
  const playingRef = useRef(playing);
  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);
  useEffect(() => {
    const p = playerRef.current;
    if (!def || !p || reduced || frozen) return;
    let frames = 0;
    let windowStart = performance.now() + WARMUP_MS;
    let slow = 0;
    const on = () => {
      frames++;
    };
    p.addEventListener("frameupdate", on);
    const id = window.setInterval(() => {
      const now = performance.now();
      if (!playingRef.current || document.hidden) {
        windowStart = now + WARMUP_MS;
        frames = 0;
        slow = 0;
        return;
      }
      if (now < windowStart) {
        frames = 0;
        return;
      }
      if (now - windowStart < WINDOW_MS) return;
      const fps = (frames * 1000) / (now - windowStart);
      if (perfRef.current)
        perfRef.current.textContent = `${fps.toFixed(0)} fps · ${tier} · ${dims.width}×${dims.height}`;
      slow = fps < SLOW_FPS ? slow + 1 : 0;
      frames = 0;
      windowStart = now;
      if (slow >= SLOW_WINDOWS) {
        slow = 0;
        windowStart = now + WARMUP_MS;
        onSlow();
      }
    }, 500);
    return () => {
      p.removeEventListener("frameupdate", on);
      window.clearInterval(id);
    };
  }, [def, reduced, frozen, tier, dims.width, dims.height, onSlow]);

  return (
    <>
      {def && (
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
            initialFrame={reduced || frozen ? def.poster : 0}
            autoPlay={playing && !reduced && !frozen}
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
      {perf && (
        <div
          ref={perfRef}
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 6,
            top: 6,
            zIndex: 5,
            padding: "2px 6px",
            font: "11px/1.4 ui-monospace, monospace",
            color: "#7CFC9A",
            background: "rgba(0,0,0,.65)",
            pointerEvents: "none",
          }}
        >
          … fps · {tier} · {dims.width}×{dims.height}
        </div>
      )}
    </>
  );
}
