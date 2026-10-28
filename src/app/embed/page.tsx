import { Suspense } from "react";
import { EmbedBanner } from "@/banner/ui/EmbedBanner";

/** Для вставки через <iframe>: баннер занимает весь доступный размер окна. Стиль и язык задаются в адресе: ?style=glass&lang=ru */
export default function Embed() {
  return (
    <Suspense fallback={null}>
      <EmbedBanner />
    </Suspense>
  );
}
