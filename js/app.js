import { state, compileAll, doUndo, doRedo, removeExpr } from './state/store.js';
import { Graph2D } from './engines/graph-2d.js';
import { Scene3D } from './engines/webgl-3d.js';
import { initSidebar, render as renderSidebar } from './ui/sidebar.js';
import { initTopbar } from './ui/topbar.js';
import { initSolverPanel } from './ui/solver-panel.js';
import { initMatrixPanel } from './ui/matrix-panel.js';
import { initKeyboard } from './ui/keyboard.js';
import { initTheme } from './ui/theme.js';
import { initPalette } from './ui/command-palette.js';
import { registerServiceWorker } from './pwa/register.js';

let activeTab = '2d';
const canvas2d = document.getElementById('c2d');
const canvas3d = document.getElementById('c3d');
const view2d = document.getElementById('view2d');
const view3d = document.getElementById('view3d');
const viewSolver = document.getElementById('viewSolver');
const matrixPanel = document.getElementById('matrixPanel');

const graph2d = new Graph2D(canvas2d);
const scene3d = new Scene3D(canvas3d);

const TAB_LABELS = { '2d': '2D', '3d': '3D', complex: 'COMPLEX', matrix: 'MATRIX', solver: 'SOLVER' };

function setTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  view2d.classList.toggle('active', tab === '2d' || tab === 'complex');
  view3d.classList.toggle('active', tab === '3d');
  matrixPanel.classList.toggle('active', tab === 'matrix');
  viewSolver.classList.toggle('active', tab === 'solver');
  const mode = document.getElementById('statusMode'); if (mode) mode.textContent = TAB_LABELS[tab] || tab;
  if (tab === '3d') { scene3d.init(); scene3d.resize(); scene3d.rebuild(state.expressions); }
  if (tab === '2d' || tab === 'complex') graph2d.resize();
}

// opts.sidebar === false: the caller already updated the sidebar (rebuilding it while typing would steal input focus).
function refresh(opts = {}) {
  if (opts.sidebar !== false) renderSidebar();
  graph2d.expressions = state.expressions;
  graph2d.render();
  if (activeTab === '3d') scene3d.rebuild(state.expressions);
}

function undo() { if (doUndo()) refresh(); }
function redo() { if (doRedo()) refresh(); }
function deleteSelected() { if (removeExpr(state.selectedId)) refresh(); }

function boot() {
  compileAll();
  initTheme();
  initSidebar(refresh);
  initTopbar(setTab, q => {
    graph2d.quality = q; scene3d.quality = q; graph2d.resize();
    const label = document.getElementById('statusQuality'); if (label) label.textContent = q.charAt(0).toUpperCase() + q.slice(1);
  });
  initSolverPanel();
  initMatrixPanel();
  initPalette();
  initKeyboard({ setTab, undo, redo, deleteSelected, getTab: () => activeTab, resetView: () => graph2d.reset(), pan: (dx, dy) => graph2d.panBy(dx, dy) });
  const on = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
  on('undoBtn', undo); on('redoBtn', redo);
  registerServiceWorker();

  graph2d.expressions = state.expressions;
  requestAnimationFrame(() => { graph2d.resize(); refresh(); });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
