"use client";

import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { CTA_HREF } from "../banner.config";
import {
  compositionSize,
  ctaBoxPct,
  lowerTier,
  pickLongSide,
  type Tier,
} from "../geometry";
import { getCopy } from "../i18n/copy";
import { DEFAULT_LANG, DEFAULT_STYLE_ID, type Lang, type StyleId } from "../types";
import { DEFAULT_THEME_ID, getTheme, type ThemeId } from "../theme";
import { BannerPoster } from "./BannerPoster";
import { chooseTier, readEnv } from "./quality";

// Живая часть грузится отдельным куском: Remotion Player и стили не входят в первый JS
const LiveBanner = lazy(() => import("./LiveBanner"));

type Size = { w: number; h: number };
type Env = { tier: Tier; dpr: number };

// Среда читается один раз на клиенте. На сервере её нет, поэтому до гидратации значение null
let cachedEnv: Env | null = null;
const noSubscribe = () => () => {};
const readOnce = (): Env =>
  (cachedEnv ??= { tier: chooseTier(readEnv()), dpr: window.devicePixelRatio || 1 });
const noEnv = (): Env | null => null;

/** Пауза после последнего изменения размера. Панель адреса на телефоне меняет высоту десятки раз. */
const RESIZE_DEBOUNCE_MS = 250;

/** Загружаем шрифт до старта анимации, чтобы текст не прыгал при подмене. */
function loadFonts(): Promise<unknown> {
  if (!("fonts" in document)) return Promise.resolve();
  const sample = "CLARIO Клаціо Консультація Отримати Получить";
  return Promise.race([
    Promise.all([
      document.fonts.load('800 40px "Inter Variable"', sample),
      document.fonts.load('600 17px "Inter Variable"', sample),
    ]),
    new Promise((r) => window.setTimeout(r, 1500)),
  ]);
}

/**
 * Адаптивный баннер. Сначала HTML с постером и текстом, потом, когда страница загружена и
 * баннер на экране, подгружается Remotion Player. Родитель задаёт только размер блока.
 * Композиция подстраивается под контейнер и под устройство: на телефоне меньше пикселей
 * и лёгкие эффекты, а если и так тормозит, качество понижается само.
 */
export function CityBanner({
  styleId = DEFAULT_STYLE_ID,
  lang = DEFAULT_LANG,
  themeId = DEFAULT_THEME_ID,
  perf = false,
  forceTier,
}: {
  styleId?: StyleId;
  lang?: Lang;
  themeId?: ThemeId;
  /** Показать в углу fps, уровень качества и размер композиции (для проверки на телефоне). */
  perf?: boolean;
  /** Зафиксировать уровень качества и отключить автопонижение: для замеров и проверки на телефоне. */
  forceTier?: Tier;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<Size | null>(null);
  const env0 = useSyncExternalStore(noSubscribe, readOnce, noEnv);
  // Уровень качества: начальный по устройству, ниже его понижает замер скорости
  const [tierOverride, setTierOverride] = useState<Tier | null>(forceTier ?? null);
  const env: Env | null = env0 && { ...env0, tier: tierOverride ?? env0.tier };
  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);
  const [armed, setArmed] = useState(false);
  const [frozen, setFrozen] = useState(false);
  // Для какого стиля Player уже показал первый кадр: при смене стиля постер возвращается сам
  const [readyFor, setReadyFor] = useState<StyleId | null>(null);
  const ready = readyFor === styleId;

  const copy = getCopy(lang);
  const theme = getTheme(themeId);

  // Среда: уровень качества и плотность пикселей, предпочтение «меньше движения»
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Размер контейнера. Первое значение сразу, дальше с паузой, мелкие колебания игнорируем
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    let timer = 0;
    let first = true;
    const commit = (w: number, h: number) =>
      setSize((s) =>
        s && Math.abs(s.w - w) < 2 && Math.abs(s.h - h) < 2 ? s : { w, h },
      );
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (!(width > 0 && height > 0)) return;
      const w = Math.round(width);
      const h = Math.round(height);
      if (first) {
        first = false;
        commit(w, h);
        return;
      }
      window.clearTimeout(timer);
      timer = window.setTimeout(() => commit(w, h), RESIZE_DEBOUNCE_MS);
    });
    ro.observe(el);
    return () => {
      window.clearTimeout(timer);
      ro.disconnect();
    };
  }, []);

  // Баннер на экране и вкладка видна: иначе не тратим процессор
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting));
    io.observe(el);
    const vis = () => setPageVisible(!document.hidden);
    vis();
    document.addEventListener("visibilitychange", vis);
    const hide = () => setPageVisible(false);
    window.addEventListener("pagehide", hide);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", vis);
      window.removeEventListener("pagehide", hide);
    };
  }, []);

  // Подгружаем живую часть после загрузки страницы, в простое, и только когда баннер виден
  const canArm = !armed && inView && size !== null && env !== null;
  useEffect(() => {
    if (!canArm) return;
    let cancelled = false;
    let idle = 0;
    const go = () => {
      loadFonts().then(() => {
        if (!cancelled) setArmed(true);
      });
    };
    // Safari без requestIdleCallback обходится таймером
    const hasIdle = typeof window.requestIdleCallback === "function";
    const afterLoad = () => {
      idle = hasIdle
        ? window.requestIdleCallback(go, { timeout: 1500 })
        : window.setTimeout(go, 200);
    };
    if (document.readyState === "complete") afterLoad();
    else window.addEventListener("load", afterLoad, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener("load", afterLoad);
      if (hasIdle) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
    };
  }, [canArm]);

  const onReady = useCallback((id: StyleId) => setReadyFor(id), []);
  const tierNow = env?.tier;
  const onSlow = useCallback(() => {
    if (forceTier) return;
    const next = tierNow ? lowerTier(tierNow) : null;
    if (next) setTierOverride(next);
    else setFrozen(true);
  }, [tierNow, forceTier]);

  const dims =
    size && env
      ? compositionSize(size.w, size.h, pickLongSide(size.w, size.h, env.tier, env.dpr))
      : null;
  const px =
    dims && size ? Math.max(dims.width, dims.height) / Math.max(size.w, size.h) : 1;
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
      {/* Постер: виден, пока не отрисован первый кадр анимации, и если JS не загрузился */}
      <BannerPoster hidden={ready} />

      {armed && dims && env && (
        <Suspense fallback={null}>
          <LiveBanner
            styleId={styleId}
            lang={lang}
            themeId={themeId}
            dims={dims}
            px={px}
            tier={env.tier}
            playing={inView && pageVisible && !frozen}
            reduced={reduced}
            frozen={frozen}
            perf={perf}
            onReady={onReady}
            onSlow={onSlow}
          />
        </Suspense>
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
