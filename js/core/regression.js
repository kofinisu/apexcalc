export function linearRegression(xs, ys) {
  const n = xs.length;
  if (n !== ys.length || n < 2) throw new Error('Linear regression needs at least two (x, y) pairs of equal length');
  const sx = xs.reduce((a, b) => a + b, 0); const sy = ys.reduce((a, b) => a + b, 0);
  const sxy = xs.reduce((a, x, i) => a + x * ys[i], 0); const sxx = xs.reduce((a, x) => a + x * x, 0);
  const denom = n * sxx - sx * sx;
  if (Math.abs(denom) <= 1e-12 * Math.max(1, n * sxx)) throw new Error('Cannot fit a line: all x values are identical');
  const m = (n * sxy - sx * sy) / denom; const b = (sy - m * sx) / n;
  const meanY = sy / n;
  const ssTot = ys.reduce((a, y) => a + (y - meanY) ** 2, 0);
  const ssRes = ys.reduce((a, y, i) => a + (y - (m * xs[i] + b)) ** 2, 0);
  return { model: 'linear', a: m, b, fn: x => m * x + b, r2: ssTot === 0 ? 1 : 1 - ssRes / ssTot };
}
