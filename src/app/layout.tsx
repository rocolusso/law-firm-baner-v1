import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CLARIO – креативний підхід до справи",
  description: "Адаптивний анімований HTML-баннер на Next.js 16 і Remotion Player",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk">
      {/* Шрифт не предзагружаем: он нужен только анимации и конкурировал бы с постером за канал.
          CityBanner подгружает его сам перед стартом. */}
      <body>{children}</body>
    </html>
  );
}
