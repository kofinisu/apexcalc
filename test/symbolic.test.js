import { diff, astToString } from '../js/core/symbolic.js';
import { Parser } from '../js/core/parser.js';
import { tokenize } from '../js/core/tokenizer.js';
import { evalNode } from '../js/core/evaluator.js';
import { test, assert, assertClose } from './harness.js';

const parse = src => new Parser(tokenize(src)).parse();
const deriv = src => astToString(diff(parse(src), 'x'));

test('Derivative of x^2', () => { const s = deriv('x^2'); assert(s === '2 * x', 'Got: ' + s); });
test('Derivative of sin(x)', () => { const s = deriv('sin(x)'); assert(s.includes('cos'), 'Got: ' + s); });
test('Derivative of unary plus keeps its sign', () => assert(deriv('+x') === '1', 'Got: ' + deriv('+x')));
test('Derivatives agree with finite differences (incl. e^x, 2^x, x^(1/2), tan, quotients)', () => {
  for (const src of ['e^x', 'e^(2x)', '2^x', 'x^x', 'x^(1/2)', 'sqrt(x)', 'tan(x)', 'ln(x)', '1/x', 'x/(x+1)', 'x*sin(x)', 'x^-2']) {
    const f = x => evalNode(parse(src), { x }), h = 1e-6, x0 = 1.3;
    assertClose(evalNode(diff(parse(src), 'x'), { x: x0 }), (f(x0 + h) - f(x0 - h)) / (2 * h), 1e-5, 'd/dx ' + src);
  }
});
test('Printing keeps parentheses where precedence needs them', () => {
  for (const src of ['(-x)^2', '2-(3-x)', '2/(3*x)', '(x+1)^(1/2)', 'a-(b+c)', 'x/(y/z)']) {
    const scope = { x: 1.7, y: 2.1, z: 0.6, a: 3, b: 1.5, c: 0.25 };
    assertClose(evalNode(parse(astToString(parse(src))), scope), evalNode(parse(src), scope), 1e-12, 'round-trip of ' + src);
  }
});
