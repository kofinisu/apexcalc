export class Complex {
  constructor(re = 0, im = 0) { this.re = +re; this.im = +im; }
  static from(v) {
    if (v instanceof Complex) return v;
    if (typeof v === 'number') return new Complex(v, 0);
    if (v && typeof v === 'object' && 're' in v) return new Complex(v.re, v.im || 0);
    throw new Error('Cannot convert to complex: ' + v);
  }
  add(o) { o = Complex.from(o); return new Complex(this.re + o.re, this.im + o.im); }
  sub(o) { o = Complex.from(o); return new Complex(this.re - o.re, this.im - o.im); }
  mul(o) { o = Complex.from(o); return new Complex(this.re * o.re - this.im * o.im, this.re * o.im + this.im * o.re); }
  div(o) { o = Complex.from(o); const d = o.re * o.re + o.im * o.im; if (d === 0) return new Complex(NaN, NaN); return new Complex((this.re * o.re + this.im * o.im) / d, (this.im * o.re - this.re * o.im) / d); }
  neg() { return new Complex(-this.re, -this.im); }
  conj() { return new Complex(this.re, -this.im); }
  abs() { return Math.hypot(this.re, this.im); }
  arg() { return Math.atan2(this.im, this.re); }
  exp() { const e = Math.exp(this.re); return new Complex(e * Math.cos(this.im), e * Math.sin(this.im)); }
  log() { const m = this.abs(); return new Complex(Math.log(m), this.arg()); }
  sqrt() {
    const m = this.abs(); if (m === 0) return new Complex(0, 0);
    const re = Math.sqrt((m + this.re) / 2), im = Math.sqrt((m - this.re) / 2);
    return new Complex(re, this.im < 0 ? -im : im);
  }
  sin() { return new Complex(Math.sin(this.re) * Math.cosh(this.im), Math.cos(this.re) * Math.sinh(this.im)); }
  cos() { return new Complex(Math.cos(this.re) * Math.cosh(this.im), -Math.sin(this.re) * Math.sinh(this.im)); }
  tan() { return this.sin().div(this.cos()); }
  sinh() { return new Complex(Math.sinh(this.re) * Math.cos(this.im), Math.cosh(this.re) * Math.sin(this.im)); }
  cosh() { return new Complex(Math.cosh(this.re) * Math.cos(this.im), Math.sinh(this.re) * Math.sin(this.im)); }
  tanh() { return this.sinh().div(this.cosh()); }
  pow(o) {
    const b = Complex.from(o);
    if (Math.abs(b.im) < 1e-13 && Math.abs(b.re - Math.round(b.re)) < 1e-13 && Math.abs(b.re) < 200) {
      const n = Math.round(b.re); if (n === 0) return new Complex(1, 0);
      let base = n < 0 ? new Complex(1, 0).div(this) : this; let exp = Math.abs(n); let result = new Complex(1, 0);
      while (exp > 0) { if (exp & 1) result = result.mul(base); base = base.mul(base); exp >>= 1; }
      return result;
    }
    if (this.re === 0 && this.im === 0) return new Complex(0, 0);
    const r = this.abs(), th = this.arg(), lnr = Math.log(r);
    return new Complex(Math.exp(b.re * lnr - b.im * th) * Math.cos(b.im * lnr + b.re * th), Math.exp(b.re * lnr - b.im * th) * Math.sin(b.im * lnr + b.re * th));
  }
  toString() {
    const f = n => Number(n.toFixed(6)).toString();
    const imag = n => { const s = f(Math.abs(n)); return (s === '1' ? '' : s) + 'i'; };
    if (Math.abs(this.im) < 1e-12) return f(this.re);
    if (Math.abs(this.re) < 1e-12) return (this.im < 0 ? '-' : '') + imag(this.im);
    return `${f(this.re)} ${this.im >= 0 ? '+' : '−'} ${imag(this.im)}`;
  }
}
