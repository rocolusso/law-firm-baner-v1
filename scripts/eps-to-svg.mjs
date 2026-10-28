#!/usr/bin/env node
/**
 * Превращает векторный логотип Clario (EPS, только moveto/curveto/closepath) в SVG-данные.
 * Запуск: node scripts/eps-to-svg.mjs [путь к .eps]
 * Пишет:
 *   src/banner/brand/clario-mark.ts  (контуры и ломаные для выборки точек)
 *   public/brand/clario.svg          (готовый файл логотипа)
 * Система координат PostScript идёт снизу вверх, поэтому y' = height - y.
 * Белый фоновый прямоугольник (первый fill) отбрасывается.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = process.argv[2] ?? path.join(root, "src/banner/brand/Clario.eps");
const text = readFileSync(src, "latin1");

const bb = /%%BoundingBox:\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)/.exec(text);
if (!bb) throw new Error("BoundingBox not found");
const [, , , bw, bh] = bb.map(Number);

const fillMatch = /([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+setrgbcolor\s+fill/g;
const fills = [...text.matchAll(fillMatch)];
const ink = fills[fills.length - 1];
const toHex = (v) =>
  Math.round(Number(v) * 255)
    .toString(16)
    .padStart(2, "0");
const brand = `#${toHex(ink[1])}${toHex(ink[2])}${toHex(ink[3])}`.toUpperCase();

// Берём только часть после первого fill (белый фон до него)
const firstFillEnd = text.indexOf("fill", text.indexOf("setrgbcolor")) + 4;
const body = text.slice(firstFillEnd);

const tokens = body.split(/\s+/).filter(Boolean);
const subpaths = [];
let cur = null;
let stack = [];
for (const t of tokens) {
  if (/^-?[\d.]+$/.test(t)) {
    stack.push(Number(t));
    continue;
  }
  if (t === "newpath") {
    cur = null;
  } else if (t === "moveto") {
    const [x, y] = stack.slice(-2);
    cur = { segs: [], start: [x, y] };
    subpaths.push(cur);
  } else if (t === "curveto") {
    const n = stack.slice(-6);
    cur.segs.push(n);
  } else if (t === "closepath" || t === "fill" || t === "setrgbcolor") {
    // closepath закрывает контур, остальное нас не интересует
  }
  stack = [];
}

const fy = (y) => +(bh - y).toFixed(2);
const f = (v) => +v.toFixed(2);

function toD(sp) {
  let d = `M${f(sp.start[0])} ${fy(sp.start[1])}`;
  for (const [x1, y1, x2, y2, x3, y3] of sp.segs) {
    d += `C${f(x1)} ${fy(y1)} ${f(x2)} ${fy(y2)} ${f(x3)} ${fy(y3)}`;
  }
  return d + "Z";
}

function flatten(sp, steps = 10) {
  const pts = [[sp.start[0], bh - sp.start[1]]];
  let [px, py] = sp.start;
  for (const [x1, y1, x2, y2, x3, y3] of sp.segs) {
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const u = 1 - t;
      const x = u * u * u * px + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3;
      const y = u * u * u * py + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3;
      pts.push([+x.toFixed(1), +(bh - y).toFixed(1)]);
    }
    px = x3;
    py = y3;
  }
  return pts;
}

if (subpaths.length !== 12) {
  throw new Error(`Expected 12 subpaths, got ${subpaths.length}`);
}

// Порядок в файле: 1 знак (общий контур), 2 отверстие правой чаши (старт x=148.8), 3 левой (x=43.4), 4 точка i, 5.. буквы
const names = [
  "icon",
  "iconHoleRight",
  "iconHoleLeft",
  "iDot",
  "C",
  "l",
  "aOuter",
  "aCounter",
  "r",
  "iStem",
  "oOuter",
  "oCounter",
];
const paths = subpaths.map((sp, i) => ({ id: names[i], d: toD(sp) }));
const polys = Object.fromEntries(subpaths.map((sp, i) => [names[i], flatten(sp)]));

const bounds = (pts) => {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return {
    x0: Math.min(...xs),
    y0: Math.min(...ys),
    x1: Math.max(...xs),
    y1: Math.max(...ys),
  };
};
const iconB = bounds(polys.icon);
const wordPts = ["iDot", "C", "l", "aOuter", "r", "iStem", "oOuter"].flatMap(
  (n) => polys[n],
);
const wordB = bounds(wordPts);
// Стойка весов: пара пересечений контура знака в середине высоты (y=100 в координатах viewBox)
function crossings(poly, y) {
  const r = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    if (a[1] <= y !== b[1] <= y)
      r.push(a[0] + ((y - a[1]) * (b[0] - a[0])) / (b[1] - a[1]));
  }
  return r.sort((p, q) => p - q);
}
const cx = crossings(polys.icon, 100);
const stem = { x0: +cx[2].toFixed(1), x1: +cx[3].toFixed(1), pivotY: 56 };
const round = (b) =>
  Object.fromEntries(Object.entries(b).map(([k, v]) => [k, +v.toFixed(1)]));

const ts = `/* Сгенерировано scripts/eps-to-svg.mjs из Clario.eps. Не править вручную. */

export const MARK_VIEWBOX = { width: ${bw}, height: ${bh} } as const;
export const MARK_COLOR = "${brand}";

/** Контуры в системе координат viewBox (ось y вниз). Знак и буквы с внутренними отверстиями. */
export const MARK_PATHS = ${JSON.stringify(paths, null, 2)} as const;

/** Знак: внешний контур плюс два отверстия, рисуется с fill-rule evenodd. */
export const ICON_D = ${JSON.stringify(
  ["icon", "iconHoleRight", "iconHoleLeft"]
    .map((n) => paths.find((p) => p.id === n).d)
    .join(""),
)};
/** Слово CLARIO: буквы с отверстиями, fill-rule evenodd. */
export const WORD_D = ${JSON.stringify(
  ["iDot", "C", "l", "aOuter", "aCounter", "r", "iStem", "oOuter", "oCounter"]
    .map((n) => paths.find((p) => p.id === n).d)
    .join(""),
)};

/** Стойка весов и точка вращения коромысла (для наклона трёх копий знака). */
export const ICON_STEM = ${JSON.stringify(stem)} as const;

export const ICON_BOUNDS = ${JSON.stringify(round(iconB))} as const;
export const WORD_BOUNDS = ${JSON.stringify(round(wordB))} as const;

/** Ломаные контуров (шаг 10 точек на сегмент) для выборки точек стилем dots-to-scales. */
export const MARK_POLYS: Record<string, [number, number][]> = ${JSON.stringify(polys)};
`;

mkdirSync(path.join(root, "public/brand"), { recursive: true });
writeFileSync(path.join(root, "src/banner/brand/clario-mark.ts"), ts);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${bw} ${bh}" role="img" aria-label="Clario">
<title>Clario</title>
<path fill="${brand}" fill-rule="evenodd" d="${paths.map((p) => p.d).join("")}"/>
</svg>
`;
writeFileSync(path.join(root, "public/brand/clario.svg"), svg);

console.log(
  `ok: ${subpaths.length} subpaths, color ${brand}, icon ${JSON.stringify(round(iconB))}, word ${JSON.stringify(round(wordB))}`,
);
