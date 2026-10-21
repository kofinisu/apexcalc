import { Complex } from './complex.js';

const deriv = c => c.slice(1).map((v, k) => v * (k + 1));
const horner = (c, x) => { let r = new Complex(0, 0); for (let k = c.length - 1; k >= 0; k--) r = r.mul(x).add(c[k]); return r; };
// A root of multiplicity m is a *simple* root of the (m-1)th derivative, so Newton there is accurate to ~eps.
function refineMultiple(a, m, start) {
  let q = a; for (let t = 1; t < m; t++) q = deriv(q);
  const dq = deriv(q); let x = start;
  for (let i = 0; i < 50; i++) { const d = horner(dq, x); if (d.abs() === 0) break; const step = horner(q, x).div(d); x = x.sub(step); if (step.abs() < 1e-16 * Math.max(1, x.abs())) break; }
  return x.sub(start).abs() < 1e-3 * Math.max(1, start.abs()) ? x : start;
}

// Numeric roots of a real polynomial given as ascending coefficients [c0, c1, ..., cn].
// Durand–Kerner iteration; roots that are (numerically) real are returned with im === 0,
// and clusters produced by repeated roots are averaged so e.g. (x-1)^3 gives exactly 1.
export function polyRoots(coeffs) {
  const c = coeffs.slice();
  while (c.length > 1 && c[c.length - 1] === 0) c.pop();
  const n = c.length - 1;
  if (n < 1) return [];
  const a = c.map(v => v / c[n]);
  const R = 1 + Math.max(...a.slice(0, n).map(Math.abs));
  const z = Array.from({ length: n }, (_, k) => new Complex(R * Math.cos(2 * Math.PI * k / n + 0.4), R * Math.sin(2 * Math.PI * k / n + 0.4)));
  const p = x => { let r = new Complex(1, 0); for (let k = n - 1; k >= 0; k--) r = r.mul(x).add(a[k]); return r; };
  for (let iter = 0; iter < 1000; iter++) {
    let delta = 0;
    for (let k = 0; k < n; k++) {
      let denom = new Complex(1, 0);
      for (let j = 0; j < n; j++) if (j !== k) denom = denom.mul(z[k].sub(z[j]));
      if (denom.abs() === 0) continue;
      const corr = p(z[k]).div(denom);
      z[k] = z[k].sub(corr);
      delta = Math.max(delta, corr.abs());
    }
    if (delta < 1e-15 * R) break;
  }
  // Average clusters of (near-)identical roots: repeated roots converge slowly and only to ~eps^(1/m).
  const used = new Array(n).fill(false), out = [];
  for (let i = 0; i < n; i++) {
    if (used[i]) continue;
    const group = [z[i]]; used[i] = true;
    for (let j = i + 1; j < n; j++) if (!used[j] && z[i].sub(z[j]).abs() < 2e-4 * Math.max(1, z[i].abs())) { group.push(z[j]); used[j] = true; }
    let root = group.reduce((s, v) => s.add(v), new Complex(0, 0)).div(new Complex(group.length, 0));
    if (group.length > 1) root = refineMultiple(a, group.length, root);
    for (let k = 0; k < group.length; k++) out.push(root);
  }
  return out.map(r => (Math.abs(r.im) < 1e-8 * Math.max(1, Math.abs(r.re)) ? new Complex(r.re, 0) : r));
}
