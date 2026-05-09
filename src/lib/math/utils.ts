export function makeMatrix(rows: number, cols: number, seed = 42): number[][] {
  const mat: number[][] = [];
  let s = seed;
  for (let r = 0; r < rows; r++) {
    const row: number[] = [];
    for (let c = 0; c < cols; c++) {
      s = (s * 1664525 + 1013904223) & 0xffffffff;
      row.push(((s >>> 0) / 0xffffffff) * 2 - 1);
    }
    mat.push(row);
  }
  return mat;
}

export function normalize(val: number, min = -1, max = 1): number {
  return Math.max(0, Math.min(1, (val - min) / (max - min)));
}

export function heatColor(val: number): string {
  const t = normalize(Math.abs(val), 0, 1);
  const r = Math.round(99 + (249 - 99) * t);
  const g = Math.round(102 * (1 - t));
  const b = Math.round(241 * (1 - t) + 115 * t);
  return `rgb(${r},${g},${b})`;
}

export function softmax(arr: number[]): number[] {
  const max = Math.max(...arr);
  const exps = arr.map(x => Math.exp(x - max));
  const sum  = exps.reduce((a, b) => a + b, 0);
  return exps.map(x => x / sum);
}