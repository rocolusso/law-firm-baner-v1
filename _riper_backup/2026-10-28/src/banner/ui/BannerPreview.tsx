"use client";

import { useState } from "react";
import { CityBanner } from "./CityBanner";

const modes = [
  { id: "auto", label: "На весь экран" },
  { id: "wide", label: "Широкий 21:9" },
  { id: "square", label: "Квадрат" },
  { id: "tall", label: "Вертикальный" },
] as const;

type Mode = (typeof modes)[number]["id"];

/** Страница показа: баннер на весь экран и переключатель форматов для проверки адаптива. */
export function BannerPreview() {
  const [mode, setMode] = useState<Mode>("auto");
  return (
    <main>
      <div className="frame" data-mode={mode}>
        <CityBanner />
      </div>
      <div
        className="switch flex flex-wrap justify-center gap-2 p-4"
        role="group"
        aria-label="Формат баннера"
      >
        {modes.map((m) => (
          <button
            key={m.id}
            type="button"
            aria-pressed={mode === m.id}
            onClick={() => setMode(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>
    </main>
  );
}
