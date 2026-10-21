import { Parser } from '../core/parser.js';
import { tokenize } from '../core/tokenizer.js';
import { evalNode } from '../core/evaluator.js';
import { splitTopLevel } from './helpers.js';

export const TYPES = {
  '2d': { label: 'y = f(x)', default: 'sin(x)', color: '#22d3ee' },
  polar: { label: 'r = f(θ)', default: '1 + 0.6*cos(5*theta)', color: '#f472b6' },
  surface3d: { label: '3D surface z=f(x,y)', default: 'sin(x)*cos(y)', color: '#f472b6' },
  complex: { label: 'Complex f(z)', default: 'z^3 - 1', color: '#a78bfa' }
};

let uidCounter = 0;
export const uid = () => 'e' + (++uidCounter) + '_' + Math.random().toString(36).slice(2, 7);

export const state = {
  expressions: [
    { id: uid(), type: '2d', input: 'sin(x)', color: '#22d3ee', visible: true, compiled: null, error: null },
    { id: uid(), type: 'surface3d', input: 'sin(x)*cos(y)', color: '#f472b6', visible: true, compiled: null, error: null },
    { id: uid(), type: 'complex', input: 'z^3 - 1', color: '#a78bfa', visible: true, compiled: null, error: null }
  ],
  selectedId: null, undoStack: [], redoStack: []
};
state.selectedId = state.expressions[0].id;

export function compileExpr(expr) {
  try {
    let src = expr.input.trim();
    if (expr.type === '2d') src = src.replace(/^\s*y\s*=/i, '');
    if (!src.trim()) { expr.compiled = null; expr.error = null; return; } // blank input is not an error
    expr.compiled = { ast: new Parser(tokenize(src)).parse() }; expr.error = null;
  } catch (e) { expr.compiled = null; expr.error = e.message; }
}
export function compileAll() { state.expressions.forEach(compileExpr); }
export function evalComp(comp, vars, complexMode = false) {
  if (!comp) throw new Error('Not compiled');
  return evalNode(comp.ast, vars, complexMode);
}
export function fmt(v, digits = 6) {
  if (v === null || v === undefined || Number.isNaN(v)) return 'NaN';
  if (typeof v !== 'number') return String(v);
  return Number(v.toFixed(digits)).toString();
}
export function findExpr(id) { return state.expressions.find(e => e.id === id); }

// ---- history (undo / redo) -------------------------------------------------
const MAX_HISTORY = 100;
export function snapshot() {
  return JSON.stringify({ expressions: state.expressions.map(({ compiled, error, ...rest }) => rest), selectedId: state.selectedId });
}
export function restoreSnapshot(snap) {
  const data = JSON.parse(snap);
  state.expressions = data.expressions.map(e => ({ ...e, compiled: null, error: null }));
  state.selectedId = state.expressions.some(e => e.id === data.selectedId) ? data.selectedId : (state.expressions[0] ? state.expressions[0].id : null);
  compileAll();
}
// Call *before* mutating state so the previous state can be restored.
export function commitChange() {
  state.undoStack.push(snapshot());
  if (state.undoStack.length > MAX_HISTORY) state.undoStack.shift();
  state.redoStack.length = 0;
}
export function doUndo() {
  if (!state.undoStack.length) return false;
  state.redoStack.push(snapshot()); restoreSnapshot(state.undoStack.pop()); return true;
}
export function doRedo() {
  if (!state.redoStack.length) return false;
  state.undoStack.push(snapshot()); restoreSnapshot(state.redoStack.pop()); return true;
}
export function removeExpr(id) {
  const i = state.expressions.findIndex(e => e.id === id);
  if (i < 0) return false;
  commitChange(); state.expressions.splice(i, 1);
  if (state.selectedId === id) { const next = state.expressions[i] || state.expressions[i - 1]; state.selectedId = next ? next.id : null; }
  return true;
}
