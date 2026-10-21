import { Complex } from './complex.js';
import { polyRoots } from './polynomial.js';

export class Matrix {
  constructor(rows) { this.rows = rows.map(r => r.slice()); }
  static fromArray(arr) {
    if (!Array.isArray(arr) || arr.length === 0) throw new Error('Matrix must be a non-empty array');
    if (!Array.isArray(arr[0])) { if (arr.some(Array.isArray)) throw new Error('Matrix rows must all have the same length'); return new Matrix([arr.map(Number)]); }
    if (arr[0].length === 0 || arr.some(r => !Array.isArray(r) || r.length !== arr[0].length)) throw new Error('Matrix rows must all have the same length');
    return new Matrix(arr.map(r => r.map(Number)));
  }
  static identity(n) { return new Matrix(Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => i === j ? 1 : 0))); }
  get rowsCount() { return this.rows.length; }
  get colsCount() { return this.rows[0] ? this.rows[0].length : 0; }
  _requireSquare(what) { if (this.rowsCount !== this.colsCount) throw new Error(`${what} requires a square matrix (got ${this.rowsCount}×${this.colsCount})`); }
  add(o) {
    if (this.rowsCount !== o.rowsCount || this.colsCount !== o.colsCount) throw new Error(`Cannot add ${this.rowsCount}×${this.colsCount} and ${o.rowsCount}×${o.colsCount} matrices`);
    return new Matrix(this.rows.map((r, i) => r.map((v, j) => v + o.rows[i][j])));
  }
  sub(o) { return this.add(o.scale(-1)); }
  scale(s) { return new Matrix(this.rows.map(r => r.map(v => v * s))); }
  mul(o) {
    if (o instanceof Matrix) {
      if (this.colsCount !== o.rowsCount) throw new Error(`Cannot multiply ${this.rowsCount}×${this.colsCount} by ${o.rowsCount}×${o.colsCount}`);
      return new Matrix(this.rows.map(row => Array.from({ length: o.colsCount }, (_, j) => row.reduce((sum, v, k) => sum + v * o.rows[k][j], 0))));
    }
    return this.scale(Number(o));
  }
  transpose() { return new Matrix(Array.from({ length: this.colsCount }, (_, j) => this.rows.map(r => r[j]))); }
  trace() { this._requireSquare('trace()'); return this.rows.reduce((s, r, i) => s + r[i], 0); }
  det() {
    this._requireSquare('det()');
    const n = this.rowsCount; if (n === 1) return this.rows[0][0]; if (n === 2) return this.rows[0][0] * this.rows[1][1] - this.rows[0][1] * this.rows[1][0];
    let sum = 0; for (let c = 0; c < n; c++) { const minor = new Matrix(this.rows.slice(1).map(r => r.filter((_, j) => j !== c))); sum += ((c % 2 === 0) ? 1 : -1) * this.rows[0][c] * minor.det(); } return sum;
  }
  inverse() {
    this._requireSquare('inv()');
    const n = this.rowsCount; const a = this.rows.map((r, i) => [...r, ...Matrix.identity(n).rows[i]]);
    for (let col = 0; col < n; col++) { let pivot = col; for (let r = col + 1; r < n; r++) if (Math.abs(a[r][col]) > Math.abs(a[pivot][col])) pivot = r; if (Math.abs(a[pivot][col]) < 1e-12) throw new Error('Matrix is singular'); [a[col], a[pivot]] = [a[pivot], a[col]]; const pv = a[col][col]; for (let j = 0; j < 2 * n; j++) a[col][j] /= pv; for (let r = 0; r < n; r++) { if (r === col) continue; const f = a[r][col]; if (Math.abs(f) < 1e-15) continue; for (let j = 0; j < 2 * n; j++) a[r][j] -= f * a[col][j]; } }
    return new Matrix(a.map(r => r.slice(n)));
  }
  // Coefficients [c0..cn] of det(λI − A), via the Faddeev–LeVerrier recurrence.
  charPoly() {
    this._requireSquare('eig()');
    const n = this.rowsCount, I = Matrix.identity(n), c = new Array(n + 1).fill(0); c[n] = 1;
    let M = new Matrix(Array.from({ length: n }, () => new Array(n).fill(0)));
    for (let k = 1; k <= n; k++) { M = this.mul(M).add(I.scale(c[n - k + 1])); c[n - k] = -this.mul(M).trace() / k; }
    return c;
  }
  // Eigenvalues as an array of Complex, sorted by real then imaginary part.
  eigenvalues() {
    this._requireSquare('eig()');
    const n = this.rowsCount; let vals;
    if (n === 1) vals = [new Complex(this.rows[0][0], 0)];
    else if (n === 2) {
      const [[a, b], [c, d]] = this.rows, half = (a + d) / 2, disc = half * half - (a * d - b * c);
      vals = disc >= 0 ? [new Complex(half - Math.sqrt(disc), 0), new Complex(half + Math.sqrt(disc), 0)] : [new Complex(half, -Math.sqrt(-disc)), new Complex(half, Math.sqrt(-disc))];
    } else vals = polyRoots(this.charPoly());
    return vals.sort((p, q) => Math.abs(p.re - q.re) > 1e-9 * (1 + Math.abs(p.re)) ? p.re - q.re : p.im - q.im);
  }
  toString() { const f = n => Number(n.toFixed(4)).toString(); return this.rows.map(r => '[ ' + r.map(f).join('  ') + ' ]').join('\n'); }
}
