"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { getCopy } from "../i18n/copy";
import {
  DEFAULT_FORMAT_ID,
  DEFAULT_LANG,
  DEFAULT_STYLE_ID,
  FORMAT_IDS,
  LANGS,
  STYLE_IDS,
  parseFormatId,
  parseLang,
  parseStyleId,
  type FormatId,
  type Lang,
  type StyleId,
} from "../types";
import { CityBanner } from "./CityBanner";

const LANG_LABEL: Record<Lang, string> = { uk: "UA", ru: "RU" };

/** Меняет параметр адресной строки без перезагрузки, чтобы выбор можно было переслать ссылкой. */
function syncUrl(key: string, value: string) {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set(key, value);
    window.history.replaceState(null, "", url);
  } catch {
    /* адресная строка недоступна, выбор остаётся только в состоянии */
  }
}

/** Страница показа: баннер, переключатели стиля, языка и формата для проверки адаптива. */
export function BannerPreview() {
  const params = useSearchParams();
  const [styleId, setStyleId] = useState<StyleId>(
    () => parseStyleId(params.get("style")) ?? DEFAULT_STYLE_ID,
  );
  const [lang, setLang] = useState<Lang>(
    () => parseLang(params.get("lang")) ?? DEFAULT_LANG,
  );
  const [format, setFormat] = useState<FormatId>(
    () => parseFormatId(params.get("format")) ?? DEFAULT_FORMAT_ID,
  );
  const copy = getCopy(lang);

  const pick = useCallback(<T extends string>(key: string, set: (v: T) => void, v: T) => {
    set(v);
    syncUrl(key, v);
  }, []);

  return (
    <main lang={copy.htmlLang}>
      <div className="frame" data-format={format}>
        <CityBanner styleId={styleId} lang={lang} />
      </div>
      <div className="panel">
        <fieldset className="switch">
          <legend>{copy.ui.styleGroup}</legend>
          {STYLE_IDS.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={styleId === id}
              onClick={() => pick("style", setStyleId, id)}
            >
              {copy.ui.styles[id]}
            </button>
          ))}
        </fieldset>
        <fieldset className="switch">
          <legend>{copy.ui.langGroup}</legend>
          {LANGS.map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={lang === l}
              onClick={() => pick("lang", setLang, l)}
            >
              {LANG_LABEL[l]}
            </button>
          ))}
        </fieldset>
        <fieldset className="switch">
          <legend>{copy.ui.formatGroup}</legend>
          {FORMAT_IDS.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={format === f}
              onClick={() => pick("format", setFormat, f)}
            >
              {copy.ui.formats[f]}
            </button>
          ))}
        </fieldset>
      </div>
    </main>
  );
}
