import { Complex } from './complex.js';
import { Matrix } from './matrix.js';
import { CONSTANTS, REAL_FUNCS, COMPLEX_FUNCS } from './builtins.js';

const own = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

// Convert a value to a real JS number; throws instead of silently dropping an imaginary part.
export function num(v) {
  if (typeof v === 'number') return v;
  if (v instanceof Complex) { if (Math.abs(v.im) > 1e-12 * Math.max(1, Math.abs(v.re))) throw new Error('Expected a real number but got ' + v); return v.re; }
  if (v instanceof Matrix) throw new Error('Matrix used where scalar expected');
  if (Array.isArray(v)) throw new Error('List used where scalar expected');
  return Number(v);
}
function operand(v) { if (typeof v === 'number' || v instanceof Complex || v instanceof Matrix) return v; throw new Error('Cannot use a list in arithmetic'); }

export function addVals(a, b) { operand(a); operand(b); if (a instanceof Matrix && b instanceof Matrix) return a.add(b); if (a instanceof Matrix || b instanceof Matrix) throw new Error('Cannot add a matrix and a scalar'); if (a instanceof Complex || b instanceof Complex) return Complex.from(a).add(Complex.from(b)); return a + b; }
export function subVals(a, b) { operand(a); operand(b); if (a instanceof Matrix && b instanceof Matrix) return a.sub(b); if (a instanceof Matrix || b instanceof Matrix) throw new Error('Cannot subtract a matrix and a scalar'); if (a instanceof Complex || b instanceof Complex) return Complex.from(a).sub(Complex.from(b)); return a - b; }
export function mulVals(a, b) { operand(a); operand(b); if (a instanceof Matrix && b instanceof Matrix) return a.mul(b); if (a instanceof Matrix) return a.scale(num(b)); if (b instanceof Matrix) return b.scale(num(a)); if (a instanceof Complex || b instanceof Complex) return Complex.from(a).mul(Complex.from(b)); return a * b; }
export function divVals(a, b) { operand(a); operand(b); if (b instanceof Matrix) throw new Error('Cannot divide by a matrix (use inv())'); if (a instanceof Matrix) return a.scale(1 / num(b)); if (a instanceof Complex || b instanceof Complex) return Complex.from(a).div(Complex.from(b)); return a / b; }
export function powVals(a, b) {
  operand(a); operand(b);
  if (a instanceof Matrix) {
    if (a.rowsCount !== a.colsCount) throw new Error('Matrix power requires a square matrix');
    const n = num(b); if (!Number.isInteger(n)) throw new Error('Matrix power must be an integer');
    let result = Matrix.identity(a.rowsCount); let base = n < 0 ? a.inverse() : a; let exp = Math.abs(n);
    while (exp > 0) { if (exp & 1) result = result.mul(base); base = base.mul(base); exp >>= 1; }
    return result;
  }
  if (b instanceof Matrix) throw new Error('Cannot raise to a matrix power');
  if (a instanceof Complex || b instanceof Complex) return Complex.from(a).pow(Complex.from(b));
  return Math.pow(a, b);
}

// Human-readable text for any evaluator result.
export function formatValue(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? String(Number(v.toPrecision(12))) : String(v);
  if (Array.isArray(v)) return '{ ' + v.map(formatValue).join(', ') + ' }';
  return String(v);
}

export function evalNode(node, scope, complexMode = false) {
  switch (node.type) {
    case 'num': return node.value;
    case 'id': { if (own(scope, node.name)) return scope[node.name]; if (own(CONSTANTS, node.name)) return CONSTANTS[node.name]; throw new Error('Unknown symbol: ' + node.name); }
    case 'unary': { const v = operand(evalNode(node.expr, scope, complexMode)); if (node.op === '-') { if (v instanceof Matrix) return v.scale(-1); if (v instanceof Complex) return v.neg(); return -v; } return v; }
    case 'binary': { const a = evalNode(node.left, scope, complexMode); const b = evalNode(node.right, scope, complexMode); switch (node.op) { case '+': return addVals(a, b); case '-': return subVals(a, b); case '*': return mulVals(a, b); case '/': return divVals(a, b); case '^': return powVals(a, b); default: throw new Error('Unknown operator: ' + node.op); } }
    case 'array': return Matrix.fromArray(node.elements.map(el => { const v = evalNode(el, scope, complexMode); if (v instanceof Matrix) { if (v.rowsCount === 1) return v.rows[0]; throw new Error('Nested matrix literals must be row vectors'); } return num(v); }));
    case 'call': return callFunction(node.name, node.args, scope, complexMode);
    default: throw new Error('Bad AST node');
  }
}

function argCount(name, argNodes, n) { if (argNodes.length !== n) throw new Error(`${name}() takes ${n} argument${n === 1 ? '' : 's'} but got ${argNodes.length}`); }
function rowVector(v, name) { if (!(v instanceof Matrix) || v.rowsCount !== 1) throw new Error(name + '() expects row vectors like [1, 2, 3]'); return v.rows[0]; }

export function callFunction(name, argNodes, scope, complexMode) {
  const lower = name.toLowerCase();
  const ev = n => evalNode(n, scope, complexMode);
  if (lower === 'identity') { argCount(name, argNodes, 1); return Matrix.identity(Math.max(1, Math.round(num(ev(argNodes[0]))))); }
  if (['det', 'inv', 'transpose', 'trace', 'eig'].includes(lower)) {
    argCount(name, argNodes, 1);
    const a = ev(argNodes[0]); if (!(a instanceof Matrix)) throw new Error(lower + '() expects a matrix');
    if (lower === 'det') return a.det(); if (lower === 'inv') return a.inverse(); if (lower === 'transpose') return a.transpose(); if (lower === 'trace') return a.trace(); return a.eigenvalues();
  }
  if (lower === 'cross') { argCount(name, argNodes, 2); const av = rowVector(ev(argNodes[0]), name), bv = rowVector(ev(argNodes[1]), name); if (av.length !== 3 || bv.length !== 3) throw new Error('cross() expects 3D vectors'); return Matrix.fromArray([[av[1] * bv[2] - av[2] * bv[1], av[2] * bv[0] - av[0] * bv[2], av[0] * bv[1] - av[1] * bv[0]]]); }
  if (lower === 'dot') { argCount(name, argNodes, 2); const av = rowVector(ev(argNodes[0]), name), bv = rowVector(ev(argNodes[1]), name); if (av.length !== bv.length) throw new Error('dot() expects vectors of equal length'); return av.reduce((s, v, i) => s + v * bv[i], 0); }
  if (lower === 'norm') { argCount(name, argNodes, 1); const a = ev(argNodes[0]); if (a instanceof Matrix) { let s = 0; a.rows.forEach(r => r.forEach(v => { s += v * v; })); return Math.sqrt(s); } if (a instanceof Complex) return a.abs(); return Math.abs(num(a)); }
  if (!own(REAL_FUNCS, lower)) throw new Error('Unknown function: ' + name);
  const [arity, realFn] = REAL_FUNCS[lower];
  argCount(name, argNodes, arity);
  const args = argNodes.map(ev);
  const hasComplexArg = args.some(a => a instanceof Complex);
  if (own(COMPLEX_FUNCS, lower) && (complexMode || hasComplexArg)) return COMPLEX_FUNCS[lower](...args.map(a => Complex.from(a)));
  if (hasComplexArg) throw new Error(name + '() does not support complex arguments');
  return realFn(...args.map(num));
}
