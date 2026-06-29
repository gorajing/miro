export interface ChangeStats {
  avg: number;
  max: number;
  hotCells: number;
}

interface ChangeOptions {
  avgThreshold?: number;
  cellThreshold?: number;
  minHotCells?: number;
}

export function measureChange(prev: number[], next: number[], cellThreshold = 18): ChangeStats {
  const n = Math.min(prev.length, next.length);
  if (!n) return { avg: 0, max: 0, hotCells: 0 };
  let sum = 0;
  let max = 0;
  let hotCells = 0;
  for (let i = 0; i < n; i += 1) {
    const d = Math.abs(next[i] - prev[i]);
    sum += d;
    if (d > max) max = d;
    if (d >= cellThreshold) hotCells += 1;
  }
  return { avg: sum / n, max, hotCells };
}

export function isMeaningfulChange(prev: number[], next: number[], opts: ChangeOptions = {}): boolean {
  const avgThreshold = opts.avgThreshold ?? 1.8;
  const cellThreshold = opts.cellThreshold ?? 18;
  const minHotCells = opts.minHotCells ?? 3;
  const stats = measureChange(prev, next, cellThreshold);

  return stats.avg >= avgThreshold || stats.hotCells >= minHotCells;
}
