import { Complex } from './complex.js';
import { Parser } from './parser.js';
import { tokenize } from './tokenizer.js';
import { evalNode, num, formatValue } from './evaluator.js';
import { CONSTANTS } from './builtins.js';
import { diff, astToString } from './symbolic.js';
import { polyRoots } from './polynomial.js';

export function safeParse(src) { return new Parser(tokenize(src)).parse(); }

// ---------------------------------------------------------------- scanning helpers

function splitTop(str, seps) {
  const out = []; let depth = 0, start = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) depth--;
    else if (depth === 0 && seps.includes(c)) { out.push(str.slice(start, i)); start = i + 1; }
  }
  out.push(str.slice(start)); return out;
}

// First top-level relation (=, <, >, <=, >=) in a string, or null.
function findRelation(str) {
  let depth = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) depth--;
    else if (depth === 0 && (c === '<' || c === '>' || c === '=')) {
      if (c === '=' && '<>=!'.includes(str[i - 1] || '')) continue;
      let op = c, j = i + 1;
      if (str[j] === '=') { op += '='; j++; }
      const rel = { op: op === '==' ? '=' : op, left: str.slice(0, i), right: str.slice(j) };
      if (findRelation(rel.right)) throw new Error('Only one comparison per line is supported');
      return rel;
    }
  }
  return null;
}

export function eqSplitTop(str) { const r = findRelation(str); return r && r.op === '=' ? [r.left, r.right] : null; }

// ---------------------------------------------------------------- number formatting

function toFraction(x, maxDen = 1000) {
  let h1 = 1, h0 = 0, k1 = 0, k0 = 1, b = Math.abs(x);
  for (let i = 0; i < 32; i++) {
    const a = Math.floor(b);
    [h1, h0] = [a * h1 + h0, h1]; [k1, k0] = [a * k1 + k0, k1];
    if (k1 > maxDen) return null;
    if (Math.abs(Math.abs(x) - h1 / k1) < 1e-10 * Math.max(1, Math.abs(x))) return [Math.sign(x) * h1, k1];
    const frac = b - a; if (frac < 1e-12) break; b = 1 / frac;
  }
  return null;
}
function fmtNum(v) {
  if (!Number.isFinite(v)) return String(v);
  const r = Math.round(v); if (Math.abs(v - r) < 1e-9 * Math.max(1, Math.abs(v))) return String(r === 0 ? 0 : r);
  const fr = toFraction(v); if (fr && fr[1] > 1) return `${fr[0]}/${fr[1]}`;
  return String(Number(v.toPrecision(10)));
}
const approx = v => Number(v.toFixed(6)).toString();
const fmtRoot = z => z instanceof Complex ? (Math.abs(z.im) < 1e-12 ? fmtNum(z.re) : z.toString()) : fmtNum(z);

function polyString(co, v = 'x') {
  const terms = [];
  for (let d = co.length - 1; d >= 0; d--) {
    const c = co[d]; if (Math.abs(c) < 1e-12) continue;
    const mag = fmtNum(Math.abs(c)), shown = mag.includes('/') ? `(${mag})` : mag;
    const body = d === 0 ? mag : (Math.abs(Math.abs(c) - 1) < 1e-12 ? '' : shown) + v + (d > 1 ? '^' + d : '');
    terms.push({ neg: c < 0, body });
  }
  if (!terms.length) return '0';
  return terms.map((t, i) => i === 0 ? (t.neg ? '-' : '') + t.body : (t.neg ? ' - ' : ' + ') + t.body).join('');
}

// ---------------------------------------------------------------- multivariate polynomials
// A polynomial is a Map from a monomial key ('' = constant, 'x:2,y:1' = x^2*y) to its coefficient.

const keyToObj = k => { const o = {}; if (k) for (const part of k.split(',')) { const [v, e] = part.split(':'); o[v] = +e; } return o; };
const objToKey = o => Object.keys(o).sort().map(v => `${v}:${o[v]}`).join(',');
const pClean = m => { for (const [k, c] of m) if (Math.abs(c) < 1e-12) m.delete(k); return m; };
const pConst = c => pClean(new Map([['', c]]));
const pAdd = (a, b, s = 1) => { const r = new Map(a); for (const [k, c] of b) r.set(k, (r.get(k) || 0) + s * c); return pClean(r); };
const pScale = (a, s) => pClean(new Map([...a].map(([k, c]) => [k, c * s])));
const pMul = (a, b) => {
  const r = new Map();
  for (const [ka, ca] of a) for (const [kb, cb] of b) { const o = keyToObj(ka), ob = keyToObj(kb); for (const v in ob) o[v] = (o[v] || 0) + ob[v]; const k = objToKey(o); r.set(k, (r.get(k) || 0) + ca * cb); }
  return pClean(r);
};
const pPow = (a, n) => { let r = pConst(1); for (let i = 0; i < n; i++) r = pMul(r, a); return r; };
const isConst = p => p.size === 0 || (p.size === 1 && p.has(''));
const constVal = p => p.get('') || 0;
const isConstName = name => Object.hasOwn(CONSTANTS, name);
const hasUnknown = n => n.type === 'id' ? !isConstName(n.name) : n.type === 'unary' ? hasUnknown(n.expr) : n.type === 'binary' ? hasUnknown(n.left) || hasUnknown(n.right) : n.type === 'call' ? n.args.some(hasUnknown) : false;

function toPoly(n) {
  switch (n.type) {
    case 'num': return pConst(n.value);
    case 'id': {
      if (n.name === 'i') throw new Error('Complex coefficients are not supported in equations');
      if (isConstName(n.name)) { const v = CONSTANTS[n.name]; if (!Number.isFinite(v)) throw new Error('Infinity is not supported in equations'); return pConst(v); }
      return new Map([[`${n.name}:1`, 1]]);
    }
    case 'unary': { const p = toPoly(n.expr); return n.op === '-' ? pScale(p, -1) : p; }
    case 'binary': {
      const a = toPoly(n.left), b = toPoly(n.right);
      if (n.op === '+') return pAdd(a, b);
      if (n.op === '-') return pAdd(a, b, -1);
      if (n.op === '*') return pMul(a, b);
      if (n.op === '/') { if (!isConst(b) || constVal(b) === 0) throw new Error('Cannot divide by zero or by an expression containing the unknown'); return pScale(a, 1 / constVal(b)); }
      if (n.op === '^') {
        if (!isConst(b)) throw new Error('Exponents must be constants');
        const e = constVal(b);
        if (isConst(a)) { const r = Math.pow(constVal(a), e); if (!Number.isFinite(r)) throw new Error('Result is not a real number'); return pConst(r); }
        if (!Number.isInteger(e) || e < 0 || e > 32) throw new Error('Only whole-number powers from 0 to 32 of the unknown are supported');
        return pPow(a, e);
      }
      throw new Error('Unknown operator: ' + n.op);
    }
    case 'call': {
      if (hasUnknown(n)) throw new Error(`${n.name}() of an unknown is not supported in equations`);
      return pConst(num(evalNode(n, {})));
    }
    default: throw new Error('Unsupported expression in equation');
  }
}

function varsOf(polys) {
  const seen = [];
  for (const p of polys) for (const k of p.keys()) if (k) for (const part of k.split(',')) { const v = part.split(':')[0]; if (!seen.includes(v)) seen.push(v); }
  return seen;
}
function coeffsOf(p, v) {
  const degs = [...p.keys()].map(k => k ? keyToObj(k)[v] : 0);
  const c = new Array(Math.max(0, ...degs) + 1).fill(0);
  for (const [k, val] of p) c[k ? keyToObj(k)[v] : 0] = val;
  return c;
}
const evalCoeffs = (c, x) => c.reduceRight((acc, co) => acc * x + co, 0);
const sideToPoly = (left, right) => pAdd(toPoly(safeParse(left)), toPoly(safeParse(right)), -1);

// ---------------------------------------------------------------- equation solvers

function realRoots(c) {
  const deg = c.length - 1;
  if (deg === 1) return [-c[0] / c[1]];
  if (deg === 2) {
    const [c0, b, a] = c, disc = b * b - 4 * a * c0;
    if (Math.abs(disc) < 1e-12 * Math.max(b * b, Math.abs(4 * a * c0), 1)) return [-b / (2 * a)];
    if (disc < 0) return [];
    const q = -0.5 * (b + (b >= 0 ? 1 : -1) * Math.sqrt(disc));
    return [q / a, c0 / q].sort((x, y) => x - y);
  }
  return polyRoots(c).filter(z => z.im === 0).map(z => z.re).sort((x, y) => x - y)
    .filter((r, i, arr) => i === 0 || Math.abs(r - arr[i - 1]) > 1e-9 * Math.max(1, Math.abs(r)));
}

function solveUnivariate(P, v) {
  if (P.size === 0) return { type: 'Identity', answer: 'All real numbers (the equation is always true)', sections: [] };
  const c = coeffsOf(P, v), deg = c.length - 1;
  if (deg === 0) return { type: 'No Solution', answer: 'No solution (the equation is never true)', sections: [] };
  const standard = { title: 'Standard form', body: `${polyString(c, v)} = 0` };
  if (deg === 1) {
    const root = -c[0] / c[1], sections = [standard, { title: 'Solve', body: `${v} = ${fmtNum(-c[0])} / ${fmtNum(c[1])}` }];
    if (!Number.isInteger(root)) sections.push({ title: 'Decimal', body: `${v} ≈ ${approx(root)}` });
    return { type: 'Linear Equation', answer: `${v} = ${fmtNum(root)}`, sections };
  }
  if (deg === 2) {
    const [c0, b, a] = c, disc = b * b - 4 * a * c0;
    const sections = [standard, { title: 'Discriminant', body: `Δ = b² − 4ac = ${fmtNum(b)}² − 4·${fmtNum(a)}·${fmtNum(c0)} = ${fmtNum(disc)}` }];
    let roots;
    if (Math.abs(disc) < 1e-12 * Math.max(b * b, Math.abs(4 * a * c0), 1)) { roots = [-b / (2 * a)]; sections.push({ title: 'Roots', body: 'Δ = 0, so there is one repeated real root.' }); }
    else if (disc > 0) { roots = realRoots(c); sections.push({ title: 'Roots', body: 'Δ > 0, so there are two real roots.' }); }
    else { const re = -b / (2 * a), im = Math.sqrt(-disc) / (2 * Math.abs(a)); roots = [new Complex(re, -im), new Complex(re, im)]; sections.push({ title: 'Roots', body: 'Δ < 0, so there are two complex conjugate roots.' }); }
    return { type: 'Quadratic Equation', answer: roots.map(r => `${v} = ${fmtRoot(r)}`).join(', '), sections };
  }
  const roots = polyRoots(c).sort((p, q) => Math.abs(p.re - q.re) > 1e-9 ? p.re - q.re : p.im - q.im);
  const shown = roots.filter((r, i) => i === 0 || r.sub(roots[i - 1]).abs() > 1e-9);
  return { type: 'Polynomial Equation', answer: shown.map(r => `${v} = ${fmtRoot(r)}`).join(', '), sections: [standard, { title: 'Method', body: `Degree ${deg}: roots found numerically.` }] };
}

function solveLinearSystem(polys, vars) {
  const n = vars.length, m = polys.length;
  const A = polys.map(p => {
    const row = new Array(n + 1).fill(0);
    for (const [k, c] of p) {
      if (!k) { row[n] = -c; continue; }
      const o = keyToObj(k), names = Object.keys(o);
      if (names.length !== 1 || o[names[0]] !== 1) throw new Error('Systems must be linear in the unknowns');
      row[vars.indexOf(names[0])] = c;
    }
    return row;
  });
  let r = 0; const pivots = [];
  for (let col = 0; col < n && r < m; col++) {
    let piv = r; for (let i = r + 1; i < m; i++) if (Math.abs(A[i][col]) > Math.abs(A[piv][col])) piv = i;
    if (Math.abs(A[piv][col]) < 1e-10) continue;
    [A[r], A[piv]] = [A[piv], A[r]];
    const pv = A[r][col]; for (let j = 0; j <= n; j++) A[r][j] /= pv;
    for (let i = 0; i < m; i++) { if (i === r) continue; const f = A[i][col]; if (f) for (let j = 0; j <= n; j++) A[i][j] -= f * A[r][j]; }
    pivots.push(col); r++;
  }
  const method = { title: 'Method', body: `Gaussian elimination on ${m} equation${m === 1 ? '' : 's'} in ${n} unknown${n === 1 ? '' : 's'} (rank ${r}).` };
  for (let i = r; i < m; i++) if (Math.abs(A[i][n]) > 1e-9) return { type: 'Linear System', answer: 'No solution (the equations contradict each other)', sections: [method] };
  if (pivots.length < n) return { type: 'Linear System', answer: `Infinitely many solutions (free: ${vars.filter((_, j) => !pivots.includes(j)).join(', ')})`, sections: [method] };
  const sol = vars.map((name, j) => `${name} = ${fmtNum(A[pivots.indexOf(j)][n])}`);
  return { type: 'Linear System', answer: sol.join(', '), sections: [method] };
}

// ---------------------------------------------------------------- inequalities

const compare = (val, op) => op === '>' || op === '>=' ? val > 0 : val < 0;

function solveInequality(rel) {
  const P = sideToPoly(rel.left, rel.right), vars = varsOf([P]), inclusive = rel.op.includes('=');
  if (vars.length > 1) throw new Error('Inequalities with more than one variable are not supported');
  const truth = holds => ({ type: 'Inequality', answer: holds ? 'All real numbers' : 'No solution', sections: [] });
  if (!vars.length) { const val = constVal(P); return { type: 'Inequality', answer: (compare(val, rel.op) || (inclusive && val === 0)) ? 'True' : 'False', sections: [] }; }
  const v = vars[0], c = coeffsOf(P, v), roots = realRoots(c), k = roots.length;
  // Pieces alternate: open interval, root, open interval, ..., open interval (2k + 1 pieces).
  const ok = [];
  for (let i = 0; i <= k; i++) {
    const test = k === 0 ? 0 : i === 0 ? roots[0] - 1 : i === k ? roots[k - 1] + 1 : (roots[i - 1] + roots[i]) / 2;
    ok.push(compare(evalCoeffs(c, test), rel.op));
    if (i < k) ok.push(inclusive);
  }
  if (ok.every(Boolean)) return truth(true);
  if (!ok.some(Boolean)) return truth(false);
  const runs = [];
  for (let s = 0; s < ok.length; s++) { if (!ok[s]) continue; let e = s; while (e + 1 < ok.length && ok[e + 1]) e++; runs.push([s, e]); s = e; }
  const last = 2 * k;
  const text = runs.map(([s, e]) => {
    const lo = s === 0 ? null : roots[s % 2 ? (s - 1) / 2 : s / 2 - 1], loInc = s % 2 === 1;
    const hi = e === last ? null : roots[e % 2 ? (e - 1) / 2 : e / 2], hiInc = e % 2 === 1;
    if (lo === null) return `${v} ${hiInc ? '≤' : '<'} ${fmtNum(hi)}`;
    if (hi === null) return `${v} ${loInc ? '≥' : '>'} ${fmtNum(lo)}`;
    if (lo === hi) return `${v} = ${fmtNum(lo)}`;
    return `${fmtNum(lo)} ${loInc ? '≤' : '<'} ${v} ${hiInc ? '≤' : '<'} ${fmtNum(hi)}`;
  });
  const sections = [{ title: 'Boundary', body: `${polyString(c, v)} = 0` + (k ? `  →  ${roots.map(r => `${v} = ${fmtNum(r)}`).join(', ')}` : '  →  no real boundary points') }];
  return { type: 'Inequality', answer: text.join('  or  '), sections };
}

// ---------------------------------------------------------------- special problem types

function solveDerivative(input) {
  const m = input.match(/^(?:diff|derivative|d\/dx)\s*\(\s*([\s\S]+?)\s*\)$/i);
  if (!m) return null;
  const args = splitTop(m[1], ','); const twoArgs = args.length === 2 && /^\s*[A-Za-z_]\w*\s*$/.test(args[1]);
  const variable = twoArgs ? args[1].trim() : 'x';
  const d = diff(safeParse(twoArgs ? args[0] : m[1]), variable);
  return { type: 'Symbolic Derivative', answer: `d/d${variable} = ${astToString(d)}`, sections: [] };
}

function solveRadical(input) {
  const m = input.match(/^(?:sqrt\(\s*(-?\d+)\s*\)|√\s*(-?\d+))$/i);
  if (!m) return null;
  const n = parseInt(m[1] ?? m[2], 10), abs = Math.abs(n), negative = n < 0;
  let outer = 1, inner = abs;
  for (let f = Math.floor(Math.sqrt(abs)); f >= 2; f--) if (abs % (f * f) === 0) { outer = f; inner = abs / (f * f); break; }
  const radical = inner > 1 ? '√' + inner : '';
  const text = n === 0 ? '0' : `${outer > 1 ? outer : ''}${radical}${negative ? (radical ? ' i' : 'i') : ''}` || '1';
  return { type: 'Radical Simplification', answer: text, sections: [{ title: 'Decimal', body: negative ? `≈ ${approx(Math.sqrt(abs))}i` : `≈ ${approx(Math.sqrt(abs))}` }] };
}

function parseAssignments(input) {
  const map = new Map();
  for (const part of splitTop(input, ',;\n').map(s => s.trim()).filter(Boolean)) {
    const m = part.match(/^([A-Za-z_]\w*)\s*=\s*([\s\S]+)$/);
    if (!m) return null;
    map.set(m[1].toLowerCase(), m[2]);
  }
  return map;
}
const evalNum = text => num(evalNode(safeParse(text), {}));
function parsePair(text) {
  const inner = text.trim().replace(/^\(([\s\S]*)\)$/, '$1'), parts = splitTop(inner, ',');
  if (parts.length !== 2) throw new Error('Expected a point like (2, 3)');
  return parts.map(evalNum);
}

function solveDiamond(input) {
  const kv = parseAssignments(input);
  if (!kv || kv.size !== 2 || !kv.has('p') || !kv.has('s')) return null;
  const p = evalNum(kv.get('p')), s = evalNum(kv.get('s')), disc = s * s - 4 * p;
  if (disc < -1e-12) throw new Error(`No real pair of numbers has product ${fmtNum(p)} and sum ${fmtNum(s)}`);
  const root = Math.sqrt(Math.max(disc, 0)), lo = (s - root) / 2, hi = (s + root) / 2;
  return { type: 'Diamond Puzzle', answer: `${fmtNum(lo)} and ${fmtNum(hi)}`, sections: [{ title: 'Method', body: `Find two numbers with product ${fmtNum(p)} and sum ${fmtNum(s)}: solve t² − ${fmtNum(s)}t + ${fmtNum(p)} = 0.` }] };
}

function solveVertex(input) {
  const kv = parseAssignments(input);
  if (!kv || kv.size !== 2 || !kv.has('vertex') || !kv.has('point')) return null;
  const [h, k] = parsePair(kv.get('vertex')), [px, py] = parsePair(kv.get('point'));
  if (Math.abs(px - h) < 1e-12) throw new Error('The point must have a different x-value than the vertex');
  const a = (py - k) / ((px - h) ** 2);
  const coef = a === 1 ? '' : a === -1 ? '-' : (fmtNum(a).includes('/') ? `(${fmtNum(a)})` : fmtNum(a));
  const square = Math.abs(h) < 1e-12 ? 'x^2' : `(x ${h > 0 ? '-' : '+'} ${fmtNum(Math.abs(h))})^2`;
  const kPart = Math.abs(k) < 1e-12 ? '' : ` ${k > 0 ? '+' : '-'} ${fmtNum(Math.abs(k))}`;
  return {
    type: 'Vertex Form', answer: `y = ${coef}${square}${kPart}`,
    sections: [{ title: 'Find a', body: `a = (${fmtNum(py)} − ${fmtNum(k)}) / (${fmtNum(px)} − ${fmtNum(h)})² = ${fmtNum(a)}` }, { title: 'Standard form', body: `y = ${polyString([a * h * h + k, -2 * a * h, a])}` }]
  };
}

function solveRelations(input) {
  const lines = splitTop(input, '\n;').flatMap(line => { const parts = splitTop(line, ','); return parts.length > 1 && parts.every(findRelation) ? parts : [line]; }).map(s => s.trim()).filter(Boolean);
  const rels = lines.map(findRelation);
  if (rels.every(r => !r)) return null;
  if (rels.some(r => !r)) throw new Error('Every line must be an equation or an inequality');
  if (rels.some(r => r.op !== '=')) { if (rels.length > 1) throw new Error('Solve one inequality at a time'); return solveInequality(rels[0]); }
  const polys = rels.map(r => sideToPoly(r.left, r.right)), vars = varsOf(polys);
  if (!vars.length) return { type: 'Equation', answer: polys.every(p => p.size === 0) ? 'True' : 'False', sections: [] };
  if (polys.length === 1) {
    if (vars.length > 1) throw new Error(`One equation can't determine ${vars.length} unknowns; enter a system with one equation per line`);
    return solveUnivariate(polys[0], vars[0]);
  }
  return solveLinearSystem(polys, vars);
}

// ---------------------------------------------------------------- entry point

export function autoSolve(rawInput) {
  const input = String(rawInput || '').replace(/≤/g, '<=').replace(/≥/g, '>=').replace(/−/g, '-').replace(/×/g, '*').replace(/÷/g, '/').trim();
  if (!input) return null;
  try {
    return solveDerivative(input) || solveRadical(input) || solveDiamond(input) || solveVertex(input) || solveRelations(input)
      || { type: 'Numeric Expression', answer: formatValue(evalNode(safeParse(input), {})), sections: [] };
  } catch (e) {
    return { error: e.message || String(e) };
  }
}
