import { autoSolve } from '../core/solver.js';
import { escapeHtml } from '../state/helpers.js';

export function initSolverPanel() {
  const input = document.getElementById('solverInput'), out = document.getElementById('solverOutput'), status = document.getElementById('solverStatus');
  if (!input) return;
  const placeholder = out.innerHTML; let timer = null;
  const run = () => {
    clearTimeout(timer);
    const result = autoSolve(input.value);
    if (!result) { out.innerHTML = placeholder; if (status) status.textContent = 'idle'; return; } // empty input
    if (result.error) { out.innerHTML = `<div class="solver-error">${escapeHtml(result.error)}</div>`; if (status) status.textContent = 'error'; return; }
    const sections = (result.sections || []).map(s => `<div class="solver-section"><h4>${escapeHtml(s.title)}</h4><pre>${escapeHtml(s.body)}</pre></div>`).join('');
    out.innerHTML = `<div class="solver-badge">${escapeHtml(result.type)}</div><div class="solver-answer"><small>Answer</small>${escapeHtml(result.answer)}</div>${sections}`;
    if (status) status.textContent = 'solved';
  };
  input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(run, 400); }); // debounced
  input.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run(); } });
  const on = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
  on('solveBtn', run);
  on('solverClearBtn', () => { input.value = ''; run(); input.focus(); });
  document.querySelectorAll('[data-solve-template]').forEach(b => b.addEventListener('click', () => { input.value = b.dataset.solveTemplate; run(); }));
}
