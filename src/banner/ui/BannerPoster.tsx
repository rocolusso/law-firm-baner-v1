import { getCopy } from "../i18n/copy";
import { DEFAULT_LANG, type Lang } from "../types";

/**
 * Статичный первый кадр. Это настоящий <img> с высоким приоритетом: он и есть LCP страницы,
 * а анимация подгружается после него. Компонент без состояния, поэтому попадает прямо в HTML.
 */
export function BannerPoster({ hidden = false }: { hidden?: boolean }) {
  return (
    <picture>
      <source
        type="image/avif"
        srcSet="/banner/poster-640.avif 640w, /banner/poster-1280.avif 1280w, /banner/poster-2000.avif 2000w"
        sizes="(max-width: 700px) 70vw, 100vw"
      />
      <source
        type="image/webp"
        srcSet="/banner/poster-640.webp 640w, /banner/poster-1280.webp 1280w, /banner/poster-2000.webp 2000w"
        sizes="(max-width: 700px) 70vw, 100vw"
      />
      <img
        src="/banner/poster-1280.webp"
        width={2000}
        height={1334}
        alt=""
        aria-hidden="true"
        fetchPriority="high"
        decoding="async"
        style={{
          position: "absolute",
          // На 2 px больше контейнера, который обрезает лишнее: картинка ровно во весь экран
          // Chrome не учитывает как LCP (считает фоном), а чуть большая учитывается
          left: -1,
          top: -1,
          width: "calc(100% + 2px)",
          height: "calc(100% + 2px)",
          objectFit: "cover",
          objectPosition: "51% 40%",
          opacity: hidden ? 0 : 1,
          transition: "opacity 400ms",
        }}
      />
    </picture>
  );
}

/** То, что видно до гидратации: постер и заголовок для поисковиков и скринридеров. */
export function BannerSkeleton({ lang = DEFAULT_LANG }: { lang?: Lang }) {
  const copy = getCopy(lang);
  return (
    <div
      role="region"
      lang={copy.htmlLang}
      aria-label={copy.ariaLabel}
      style={{ position: "fixed", inset: 0, overflow: "hidden", background: "#fff" }}
    >
      <BannerPoster />
      <h2 className="sr-only">{copy.lines.wide.join(" ")}</h2>
    </div>
  );
}
