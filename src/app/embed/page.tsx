import { Suspense } from "react";
import { BannerSkeleton } from "@/banner/ui/BannerPoster";
import { EmbedBanner } from "@/banner/ui/EmbedBanner";

/** Для вставки через <iframe>: баннер занимает весь доступный размер окна. Стиль и язык задаются в адресе: ?style=glass&lang=ru */
// useSearchParams отдаёт страницу клиенту, поэтому пока нет JS, в HTML остаётся постер из fallback
export default function Embed() {
  return (
    <Suspense fallback={<BannerSkeleton />}>
      <EmbedBanner />
    </Suspense>
  );
}
