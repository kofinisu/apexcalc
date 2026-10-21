import { Complex } from '../js/core/complex.js';
import { Matrix } from '../js/core/matrix.js';
import { Parser } from '../js/core/parser.js';
import { tokenize } from '../js/core/tokenizer.js';
import { evalNode, formatValue } from '../js/core/evaluator.js';
import { escapeHtml } from '../js/state/helpers.js';
import * as store from '../js/state/store.js';
import { test, assert, assertClose, assertThrows } from './harness.js';

const ev = src => evalNode(new Parser(tokenize(src)).parse(), {});
const show = src => formatValue(ev(src));

test('Complex add', () => { const z = new Complex(1, 2).add(new Complex(3, 4)); assert(z.re === 4 && z.im === 6); });
test('Complex neg / conj / sqrt', () => {
  const n = new Complex(3, 2).neg(); assert(n.re === -3 && n.im === -2);
  const c = new Complex(3, 2).conj(); assert(c.re === 3 && c.im === -2);
  const r = new Complex(-4, 0).sqrt(); assertClose(r.re, 0, 1e-12); assertClose(r.im, 2, 1e-12);
});
test('Complex sin/cos satisfy sin²+cos²=1', () => {
  const z = new Complex(0.7, -1.3), s = z.sin(), c = z.cos(), sum = s.mul(s).add(c.mul(c));
  assertClose(sum.re, 1, 1e-12); assertClose(sum.im, 0, 1e-12);
});
test('unary minus on a complex number', () => assert(show('-i') === '-i', show('-i')));
test('complex functions: sin(i), sqrt(i), conj, pow(i,2)', () => {
  assertClose(ev('sin(i)').im, Math.sinh(1), 1e-12);
  assertClose(ev('sqrt(i)').re, Math.SQRT1_2, 1e-12);
  assert(show('conj(3+2i)') === '3 − 2i', show('conj(3+2i)'));
  assertClose(ev('pow(i,2)').re, -1, 1e-12);
});
test('"2e" is 2·e, "2exp(0)" is 2, "2e3" is 2000', () => {
  assertClose(ev('2e'), 2 * Math.E, 1e-12); assert(ev('2exp(0)') === 2); assert(ev('2e3') === 2000); assertClose(ev('2e-1'), 0.2, 1e-12);
});
test('matrix transpose / trace', () => {
  assert(show('transpose([[1,2,3],[4,5,6]])') === '[ 1  4 ]\n[ 2  5 ]\n[ 3  6 ]');
  assert(ev('trace([[1,2],[3,4]])') === 5);
});
test('eigenvalues: symmetric, rotation, triangular, repeated', () => {
  assert(show('eig([[2,1],[1,2]])') === '{ 1, 3 }', show('eig([[2,1],[1,2]])'));
  assert(show('eig([[0,-1],[1,0]])') === '{ -i, i }', show('eig([[0,-1],[1,0]])'));
  assert(show('eig([[1,2,3],[0,4,5],[0,0,6]])') === '{ 1, 4, 6 }', show('eig([[1,2,3],[0,4,5],[0,0,6]])'));
  assert(show('eig([[2,1,0],[0,2,1],[0,0,2]])') === '{ 2, 2, 2 }', show('eig([[2,1,0],[0,2,1],[0,0,2]])'));
});
test('matrix shape errors instead of garbage', () => {
  assertThrows(() => ev('[[1,2],[3,4]] + 1'), /matrix and a scalar/);
  assertThrows(() => ev('[[1,2]] * [[1,2]]'), /Cannot multiply/);
  assertThrows(() => ev('[[1,2],[3]]'), /same length/);
  assertThrows(() => ev('det([[1,2,3],[4,5,6]])'), /square/);
  assertThrows(() => ev('1 / [[1,2],[3,4]]'), /divide by a matrix/);
  assert(Matrix.fromArray([[1, 2], [3, 4]]).det() === -2);
});
test('function calls validate arity and complex support', () => {
  assertThrows(() => ev('sin(1,2)'), /takes 1 argument/);
  assertThrows(() => ev('min(1)'), /takes 2 arguments/);
  assertThrows(() => ev('asin(i)'), /does not support complex/);
  assertThrows(() => ev('constructor(1)'), /Unknown function/);
  assertThrows(() => ev('identity()'), /takes 1 argument/);
});
test('complex value used where a real is required is an error, not a silent drop', () => assertThrows(() => ev('[[1,2]] * i'), /real number/));
test('precedence: -2^2, 2^3^2, 2^-1', () => { assert(ev('-2^2') === -4); assert(ev('2^3^2') === 512); assert(ev('2^-1') === 0.5); });
test('escapeHtml escapes double quotes', () => assert(escapeHtml('a"b') === 'a&quot;b', escapeHtml('a"b')));
test('undo / redo restore expressions', () => {
  store.compileAll();
  const first = store.state.expressions[0], original = first.input, count = store.state.expressions.length;
  store.commitChange(); first.input = 'x^2';
  store.removeExpr(store.state.expressions[1].id);
  assert(store.doUndo() && store.state.expressions.length === count, 'undo of delete');
  assert(store.doUndo() && store.state.expressions[0].input === original, 'undo of edit');
  assert(!store.doUndo(), 'nothing left to undo');
  assert(store.doRedo() && store.state.expressions[0].input === 'x^2', 'redo of edit');
});
