import type { Metadata, Viewport } from "next";
import "@fontsource/fira-sans-extra-condensed/700.css";
import "@fontsource-variable/onest/index.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Офис в центре города",
  description: "Адаптивный анимированный HTML-баннер на Next.js 16 и Remotion Player",
};

export const viewport: Viewport = {
  themeColor: "#0c1014",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
