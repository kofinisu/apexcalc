import { Complex } from './complex.js';
export const CONSTANTS = { pi: Math.PI, tau: Math.PI * 2, e: Math.E, i: new Complex(0, 1), Infinity: Infinity };
export const REAL_FUNCS = {
  sin: [1, Math.sin], cos: [1, Math.cos], tan: [1, Math.tan], asin: [1, Math.asin], acos: [1, Math.acos], atan: [1, Math.atan],
  sinh: [1, Math.sinh], cosh: [1, Math.cosh], tanh: [1, Math.tanh], exp: [1, Math.exp], log: [1, Math.log], ln: [1, Math.log],
  sqrt: [1, Math.sqrt], abs: [1, Math.abs], floor: [1, Math.floor], ceil: [1, Math.ceil], round: [1, Math.round],
  sign: [1, Math.sign], re: [1, x => x], im: [1, () => 0], arg: [1, x => Math.atan2(0, x)], conj: [1, x => x],
  min: [2, Math.min], max: [2, Math.max], atan2: [2, Math.atan2], pow: [2, Math.pow]
};
export const COMPLEX_FUNCS = {
  sin: z => z.sin(), cos: z => z.cos(), tan: z => z.tan(), sinh: z => z.sinh(), cosh: z => z.cosh(), tanh: z => z.tanh(),
  exp: z => z.exp(), log: z => z.log(), ln: z => z.log(), sqrt: z => z.sqrt(), abs: z => new Complex(z.abs(), 0),
  re: z => new Complex(z.re, 0), im: z => new Complex(z.im, 0), arg: z => new Complex(z.arg(), 0),
  conj: z => z.conj(), floor: z => new Complex(Math.floor(z.re), Math.floor(z.im)), ceil: z => new Complex(Math.ceil(z.re), Math.ceil(z.im)),
  round: z => new Complex(Math.round(z.re), Math.round(z.im)),
  pow: (z, w) => z.pow(w)
};