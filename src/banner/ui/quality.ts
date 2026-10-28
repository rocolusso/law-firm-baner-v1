import type { Tier } from "../geometry";

export type Env = {
  /** navigator.deviceMemory в ГБ, если браузер его отдаёт (Chrome и Android). */
  deviceMemory?: number;
  /** navigator.hardwareConcurrency. */
  cores?: number;
  saveData?: boolean;
  /** Основной указатель грубый: палец, а не мышь. */
  coarsePointer: boolean;
  /** Меньшая сторона экрана в CSS-пикселях. */
  minScreen: number;
};

/**
 * Начальный уровень качества. iPhone не отдаёт память и ядра, поэтому телефоны и планшеты
 * определяются по касанию и размеру экрана и сразу получают лёгкий режим.
 */
export function chooseTier(env: Env): Tier {
  if (env.saveData) return "min";
  const weak = (env.deviceMemory ?? 8) <= 4 || (env.cores ?? 8) <= 4;
  if (weak) return "low";
  if (env.coarsePointer && env.minScreen < 820) return "low";
  return "high";
}

export function readEnv(): Env {
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  return {
    deviceMemory: nav.deviceMemory,
    cores: nav.hardwareConcurrency,
    saveData: nav.connection?.saveData,
    coarsePointer: window.matchMedia("(pointer: coarse)").matches,
    minScreen: Math.min(window.screen.width, window.screen.height),
  };
}
