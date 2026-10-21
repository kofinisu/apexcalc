import { Parser } from '../core/parser.js';
import { tokenize } from '../core/tokenizer.js';
import { evalNode, formatValue } from '../core/evaluator.js';

export function initMatrixPanel() {
  const input = document.getElementById('matrixInput'), out = document.getElementById('matrixOutput');
  if (!input) return;
  const run = () => {
    try { out.textContent = formatValue(evalNode(new Parser(tokenize(input.value)).parse(), {})); }
    catch (e) { out.textContent = 'Error: ' + e.message; }
  };
  document.getElementById('matrixEvalBtn').addEventListener('click', run);
  input.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run(); } });
  document.querySelectorAll('[data-matrix-template]').forEach(b => b.addEventListener('click', () => { input.value = b.dataset.matrixTemplate; run(); }));
  run();
}
