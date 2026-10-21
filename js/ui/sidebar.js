import { state, TYPES, findExpr, compileExpr, uid, commitChange, removeExpr } from '../state/store.js';
import { escapeHtml } from '../state/helpers.js';

let exprList, onChanged = () => {}, burstTimer = null;
export function initSidebar(onChangeCb) { exprList = document.getElementById('exprList'); onChanged = onChangeCb || (() => {}); render(); bind(); }

// One undo step per burst of typing / colour dragging instead of one per keystroke.
function commitBurst() { if (burstTimer === null) commitChange(); clearTimeout(burstTimer); burstTimer = setTimeout(() => { burstTimer = null; }, 800); }

function select(id) {
  state.selectedId = id;
  exprList.querySelectorAll('.expr-card').forEach(c => c.classList.toggle('selected', c.dataset.id === id));
}

export function render() {
  if (!exprList) return;
  clearTimeout(burstTimer); burstTimer = null;
  exprList.innerHTML = '';
  for (const expr of state.expressions) {
    const card = document.createElement('div');
    card.className = 'expr-card' + (expr.id === state.selectedId ? ' selected' : '');
    card.dataset.id = expr.id;
    const options = Object.entries(TYPES).map(([key, t]) => `<option value="${escapeHtml(key)}"${key === expr.type ? ' selected' : ''}>${escapeHtml(t.label)}</option>`).join('');
    card.innerHTML = `
      <div class="expr-top">
        <select class="expr-type" aria-label="Expression type">${options}</select>
        <input class="color-input" type="color" value="${escapeHtml(expr.color)}" aria-label="Colour">
        <button class="ghost-btn del-btn" title="Delete" aria-label="Delete expression">×</button>
      </div>
      <input class="expr-input" value="${escapeHtml(expr.input)}" spellcheck="false" aria-label="Expression">
      <div class="expr-err">${escapeHtml(expr.error || '')}</div>
    `;
    exprList.appendChild(card);
  }
}

function bind() {
  document.getElementById('addExprBtn').addEventListener('click', () => {
    commitChange();
    const expr = { id: uid(), type: '2d', input: 'x^2', color: '#22d3ee', visible: true, compiled: null, error: null };
    compileExpr(expr); state.expressions.push(expr); state.selectedId = expr.id; render(); onChanged({ sidebar: false });
  });
  // Typing must NOT rebuild the list (that would steal focus from the input after every character).
  exprList.addEventListener('input', e => {
    const card = e.target.closest('.expr-card'); const expr = card && findExpr(card.dataset.id); if (!expr) return;
    if (e.target.classList.contains('expr-input')) {
      commitBurst(); expr.input = e.target.value; compileExpr(expr);
      card.querySelector('.expr-err').textContent = expr.error || '';
      onChanged({ sidebar: false });
    } else if (e.target.classList.contains('color-input')) {
      commitBurst(); expr.color = e.target.value; onChanged({ sidebar: false });
    }
  });
  exprList.addEventListener('change', e => {
    if (!e.target.classList.contains('expr-type')) return;
    const card = e.target.closest('.expr-card'); const expr = card && findExpr(card.dataset.id); if (!expr) return;
    commitChange(); expr.type = e.target.value; compileExpr(expr); render(); onChanged({ sidebar: false });
  });
  exprList.addEventListener('click', e => {
    const card = e.target.closest('.expr-card'); if (!card) return;
    if (e.target.closest('.del-btn')) { if (removeExpr(card.dataset.id)) { render(); onChanged({ sidebar: false }); } return; }
    select(card.dataset.id);
  });
  exprList.addEventListener('focusin', e => { const card = e.target.closest('.expr-card'); if (card) select(card.dataset.id); });
}
