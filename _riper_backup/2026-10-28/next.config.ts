import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Статический экспорт: на выходе чистый HTML + JS + картинки в папке out/
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
