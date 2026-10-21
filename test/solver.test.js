import { autoSolve } from '../js/core/solver.js';
import { test, assert } from './harness.js';

test('Linear equation', () => {
  const r = autoSolve('2x + 3 = 7');
  assert(r.answer && r.answer.includes('x = 2'), 'expected x = 2, got ' + r.answer);
});
test('Quadratic equation', () => {
  const r = autoSolve('x^2 - 5x + 6 = 0');
  assert(r.answer === 'x = 2, x = 3', 'got ' + r.answer);
});
test('Complex quadratic', () => {
  const r = autoSolve('x^2 + 1 = 0');
  assert(r.answer && r.answer.includes('i'), 'got ' + r.answer);
});
test('Linear system 2x2', () => {
  const r = autoSolve('x + y = 5\n2x - y = 1');
  assert(r.answer && r.answer.includes('x = 2') && r.answer.includes('y = 3'), 'got ' + r.answer);
});
test('Linear system 3x3', () => {
  const r = autoSolve('x + y + z = 6\n2x - y = 1\ny + 2z = 5');
  assert(r.answer === 'x = 2, y = 3, z = 1', 'got ' + r.answer);
});
test('Contradictory and underdetermined systems are reported', () => {
  assert(autoSolve('x + y = 2\nx + y = 3').answer.startsWith('No solution'));
  assert(autoSolve('x + y = 2\n2x + 2y = 4').answer.startsWith('Infinitely many'));
});
test('Inequality', () => {
  const r = autoSolve('2x + 1 > 5');
  assert(r.answer && r.answer.includes('x > 2'), 'got ' + r.answer);
});
test('Inequality: dividing by a negative flips the sign', () => assert(autoSolve('-2x + 1 > 5').answer === 'x < -2', autoSolve('-2x + 1 > 5').answer));
test('Quadratic inequality', () => assert(autoSolve('x^2 < 4').answer === '-2 < x < 2', autoSolve('x^2 < 4').answer));
test('Radical simplification', () => {
  const r = autoSolve('sqrt(72)');
  assert(r.answer === '6√2', 'got ' + r.answer);
});
test('Diamond puzzle', () => {
  const r = autoSolve('p=12, s=7');
  assert(r.answer === '3 and 4', 'got ' + r.answer);
});
test('Vertex form', () => {
  const r = autoSolve('vertex=(2,3), point=(0,7)');
  assert(r.answer === 'y = (x - 2)^2 + 3', 'got ' + r.answer);
});
test('Derivative', () => {
  const r = autoSolve('diff(x^3 + 2x)');
  assert(r.answer === 'd/dx = 3 * x^2 + 2', 'got ' + r.answer);
});
test('Numeric expressions: complex product and matrix determinant', () => {
  assert(autoSolve('(3+2i)*(1-i)').answer === '5 − i', autoSolve('(3+2i)*(1-i)').answer);
  assert(autoSolve('det([[1,2],[3,4]])').answer === '-2');
});
test('Empty input gives null; bad input gives an error object', () => {
  assert(autoSolve('') === null && autoSolve('   ') === null);
  assert(typeof autoSolve('2x +').error === 'string');
});
