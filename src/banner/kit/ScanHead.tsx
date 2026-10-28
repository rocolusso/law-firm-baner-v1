import { scanLine } from "./scan";

/** Линия фронта сканирования: мягкое свечение и яркая тонкая кромка. Единственные линии в баннере. */
export const ScanHead: React.FC<{
  W: number;
  H: number;
  p: number;
  glow: string;
  core?: string;
  unit?: number;
}> = ({ W, H, p, glow, core = "#fff", unit = 1 }) => {
  const l = scanLine(p, W, H);
  return (
    <g>
      <line {...l} stroke={glow} strokeWidth={14 * unit} opacity={0.18} />
      <line {...l} stroke={glow} strokeWidth={4 * unit} opacity={0.5} />
      <line {...l} stroke={core} strokeWidth={1.4 * unit} opacity={0.95} />
    </g>
  );
};
