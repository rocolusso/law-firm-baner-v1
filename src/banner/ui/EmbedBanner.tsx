"use client";

import { useSearchParams } from "next/navigation";
import { parseTier } from "../geometry";
import { DEFAULT_LANG, DEFAULT_STYLE_ID, parseLang, parseStyleId } from "../types";
import { CityBanner } from "./CityBanner";

export function EmbedBanner() {
  const params = useSearchParams();
  return (
    <div style={{ position: "fixed", inset: 0 }}>
      <CityBanner
        styleId={parseStyleId(params.get("style")) ?? DEFAULT_STYLE_ID}
        lang={parseLang(params.get("lang")) ?? DEFAULT_LANG}
        perf={params.get("perf") === "1"}
        forceTier={parseTier(params.get("tier"))}
      />
    </div>
  );
}
