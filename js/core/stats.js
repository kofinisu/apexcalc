export function mean(xs) { return xs.reduce((a, b) => a + b, 0) / xs.length; }
export function median(xs) { const s = [...xs].sort((a, b) => a - b); const n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; }
export function stdev(xs) { const m = mean(xs); return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / xs.length); }