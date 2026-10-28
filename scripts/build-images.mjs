#!/usr/bin/env node
/**
 * Готовит картинки баннера из исходников в assets/source/ и кладёт результат в public/banner/.
 * Запуск: node scripts/build-images.mjs
 * Нужны sharp и playwright. В проект они не добавлены, чтобы не раздувать lock-файл:
 *   npm i --no-save sharp playwright
 *
 * Что получается:
 *   poster-{640,1280,2000}.{avif,webp}  постер для LCP, из city.jpg
 *   sky-{1280,2000}.webp, buildings-{1280,1600}.webp  слои для полного качества
 *   scene-day-<тема>-{1280,2000}.webp   небо, здания и синий подъём света, слитые в один кадр
 *                                       (то, что в полном качестве собирают CSS-фильтры и blend)
 *   mask-buildings.png                  маска зданий (остаётся как есть, 29 КБ)
 *
 * Фильтры и цвета подъёма света повторяют src/banner/kit/photo.tsx и src/banner/theme.ts.
 * Меняете их там, меняйте здесь и запускайте скрипт заново.
 */
import { readFileSync, mkdirSync, copyFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const { chromium } = require("playwright");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = (f) => path.join(root, "assets/source", f);
const out = (f) => path.join(root, "public/banner", f);
mkdirSync(path.join(root, "public/banner"), { recursive: true });

// day: photo.tsx filters.day; navy: theme.ts navy
const DAY = {
  sky: "brightness(1.12) saturate(1.3) contrast(1.05)",
  buildings: "brightness(1.08) contrast(1.16) saturate(1.15)",
  lift: 0.9,
};
const THEMES = { luxury: "#12214F", mono: "#18181B" };

const kb = (f) => Math.round(readFileSync(out(f)).length / 1024);
const report = [];
const save = async (img, name, opts) => {
  const fmt = name.endsWith(".avif") ? "avif" : "webp";
  await img.clone()[fmt](opts).toFile(out(name));
  report.push(`${name} ${kb(name)} KB`);
};

// Постер
for (const w of [640, 1280, 2000]) {
  const base = sharp(src("city.jpg")).resize({ width: w });
  await save(base, `poster-${w}.avif`, { quality: 52, effort: 6 });
  await save(base, `poster-${w}.webp`, { quality: 76, effort: 6 });
}

// Слои полного качества
for (const w of [1280, 2000]) {
  await save(sharp(src("sky.jpg")).resize({ width: w }), `sky-${w}.webp`, {
    quality: 80,
    effort: 6,
  });
}
for (const w of [1280, 1600]) {
  await save(sharp(src("buildings.png")).resize({ width: w }), `buildings-${w}.webp`, {
    quality: 82,
    alphaQuality: 90,
    effort: 6,
  });
}
copyFileSync(src("mask-buildings.png"), out("mask-buildings.png"));

// Слитая сцена: собираем в настоящем Chromium теми же фильтрами, что в CSS
const b64 = (f) => readFileSync(src(f)).toString("base64");
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
});
const page = await browser.newPage();
await page.setContent("<canvas id=c></canvas>");
const skyMeta = await sharp(src("sky.jpg")).metadata();
for (const [theme, navy] of Object.entries(THEMES)) {
  const dataUrl = await page.evaluate(
    async ({ sky, bld, mask, W, H, DAY, navy }) => {
      const load = (type, b) =>
        new Promise((res, rej) => {
          const i = new Image();
          i.onload = () => res(i);
          i.onerror = rej;
          i.src = `data:${type};base64,${b}`;
        });
      const [s, b, m] = await Promise.all([
        load("image/jpeg", sky),
        load("image/png", bld),
        load("image/png", mask),
      ]);
      const c = document.getElementById("c");
      c.width = W;
      c.height = H;
      const g = c.getContext("2d");
      g.filter = DAY.sky;
      g.drawImage(s, 0, 0, W, H);
      g.filter = DAY.buildings;
      g.drawImage(b, 0, 0, W, H);
      g.filter = "none";
      const o = document.createElement("canvas");
      o.width = W;
      o.height = H;
      const og = o.getContext("2d");
      og.fillStyle = navy;
      og.fillRect(0, 0, W, H);
      og.globalCompositeOperation = "destination-in";
      og.drawImage(m, 0, 0, W, H);
      g.globalCompositeOperation = "screen";
      g.globalAlpha = DAY.lift;
      g.drawImage(o, 0, 0);
      return c.toDataURL("image/png");
    },
    {
      sky: b64("sky.jpg"),
      bld: b64("buildings.png"),
      mask: b64("mask-buildings.png"),
      W: skyMeta.width,
      H: skyMeta.height,
      DAY,
      navy,
    },
  );
  const png = Buffer.from(dataUrl.split(",")[1], "base64");
  for (const w of [1280, 2000]) {
    await save(sharp(png).resize({ width: w }), `scene-day-${theme}-${w}.webp`, {
      quality: 80,
      effort: 6,
    });
  }
}
await browser.close();
console.log(report.join("\n"));
