import { linearRegression } from '../js/core/regression.js';
import { test, assert, assertClose, assertThrows } from './harness.js';

test('Linear regression y=2x+1', () => {
  const reg = linearRegression([0, 1, 2], [1, 3, 5]);
  assertClose(reg.a, 2, 1e-9, 'slope'); assertClose(reg.b, 1, 1e-9, 'intercept'); assertClose(reg.r2, 1, 1e-9, 'R²');
});
test('R² is below 1 for noisy data', () => assertClose(linearRegression([0, 1, 2, 3], [0, 2, 1, 3]).r2, 0.64, 1e-9, 'R²'));
test('identical x values are rejected instead of returning NaN', () => assertThrows(() => linearRegression([1, 1, 1], [1, 2, 3]), /identical/));
