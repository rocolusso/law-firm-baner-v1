import type { FormatId, Lang, StyleId } from "../types";

export type Copy = {
  htmlLang: string;
  brand: string;
  /** Заголовок строками для двух ориентаций. */
  lines: { wide: string[]; tall: string[] };
  /** Фразы для покадровых стилей. */
  beats: string[];
  /** Тексты плит для стиля poster. */
  plates: string[];
  cta: string;
  ariaLabel: string;
  ui: {
    styleGroup: string;
    langGroup: string;
    formatGroup: string;
    styles: Record<StyleId, string>;
    formats: Record<FormatId, string>;
  };
};

export const copy: Record<Lang, Copy> = {
  uk: {
    htmlLang: "uk",
    brand: "CLARIO",
    lines: {
      wide: ["CLARIO – це", "креативний підхід до справи!"],
      tall: ["CLARIO – це", "креативний", "підхід до", "справи!"],
    },
    beats: ["CLARIO – це", "креативний", "підхід", "до справи!"],
    plates: ["CLARIO", "– це креативний", "підхід до справи!"],
    cta: "Отримати консультацію",
    ariaLabel: "CLARIO – це креативний підхід до справи! Отримати консультацію",
    ui: {
      styleGroup: "Стиль банера",
      langGroup: "Мова",
      formatGroup: "Формат",
      styles: {
        "light-burst": "Світло",
        spotlight: "Прожектор",
        glass: "Скло",
        poster: "Плакат",
        "dots-to-scales": "Терези",
      },
      formats: {
        site: "Сайт (авто)",
        "site-desktop": "Сайт 16:10",
        "site-mobile": "Сайт 7:10",
        full: "На весь екран",
        wide: "Широкий 21:9",
        square: "Квадрат",
        tall: "Вертикальний",
      },
    },
  },
  ru: {
    htmlLang: "ru",
    brand: "CLARIO",
    lines: {
      wide: ["CLARIO – это", "креативный подход к делу!"],
      tall: ["CLARIO – это", "креативный", "подход к", "делу!"],
    },
    beats: ["CLARIO – это", "креативный", "подход", "к делу!"],
    plates: ["CLARIO", "– это креативный", "подход к делу!"],
    cta: "Получить консультацию",
    ariaLabel: "CLARIO – это креативный подход к делу! Получить консультацию",
    ui: {
      styleGroup: "Стиль баннера",
      langGroup: "Язык",
      formatGroup: "Формат",
      styles: {
        "light-burst": "Свет",
        spotlight: "Прожектор",
        glass: "Стекло",
        poster: "Плакат",
        "dots-to-scales": "Весы",
      },
      formats: {
        site: "Сайт (авто)",
        "site-desktop": "Сайт 16:10",
        "site-mobile": "Сайт 7:10",
        full: "На весь экран",
        wide: "Широкий 21:9",
        square: "Квадрат",
        tall: "Вертикальный",
      },
    },
  },
};

export function getCopy(lang: Lang): Copy {
  return copy[lang];
}
