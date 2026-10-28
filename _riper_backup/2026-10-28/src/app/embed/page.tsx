import { CityBanner } from "@/banner/ui/CityBanner";

/** Для вставки через <iframe>: баннер занимает весь доступный размер окна. */
export default function Embed() {
  return (
    <div style={{ position: "fixed", inset: 0 }}>
      <CityBanner />
    </div>
  );
}
