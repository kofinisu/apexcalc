import { toggleHelp, closeHelp } from './topbar.js';
import { togglePalette, closePalette } from './command-palette.js';

const TAB_KEYS = { '2': '2d', '3': '3d', c: 'complex', m: 'matrix', s: 'solver' };
const PAN = { ArrowLeft: [-40, 0], ArrowRight: [40, 0], ArrowUp: [0, 40], ArrowDown: [0, -40] };

export function initKeyboard(ctx) {
  document.addEventListener('keydown', e => {
    const mod = e.ctrlKey || e.metaKey, key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (key === 'Escape') { closeHelp(); closePalette(); return; }
    if (mod && key === 'k') { e.preventDefault(); togglePalette(); return; }
    // Everything below is a bare-key shortcut: never fire while typing (otherwise "sin(x)" would jump to the Solver tab).
    const t = e.target, typing = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
    if (typing) return;
    if (mod) {
      if (key === 'z' && !e.shiftKey) { e.preventDefault(); ctx.undo(); }
      else if (key === 'y' || (key === 'z' && e.shiftKey)) { e.preventDefault(); ctx.redo(); }
      return;
    }
    if (e.altKey) return;
    if (TAB_KEYS[key]) ctx.setTab(TAB_KEYS[key]);
    else if (key === '?') toggleHelp();
    else if (key === 'r') ctx.resetView();
    else if (key === 'Delete') ctx.deleteSelected();
    else if (PAN[key] && ctx.getTab() === '2d') { e.preventDefault(); ctx.pan(...PAN[key]); }
  });
}
