import { Suspense } from "react";
import { BannerPreview } from "@/banner/ui/BannerPreview";

export default function Home() {
  return (
    <Suspense fallback={null}>
      <BannerPreview />
    </Suspense>
  );
}
