let wrap, input;
export function togglePalette(force) {
  if (!wrap) return;
  const open = force === undefined ? !wrap.classList.contains('open') : force;
  wrap.classList.toggle('open', open);
  if (open && input) { input.value = ''; input.focus(); }
}
export function closePalette() { togglePalette(false); }
export function initPalette() {
  wrap = document.getElementById('commandPalette'); input = document.getElementById('paletteInput');
  document.getElementById('paletteBtn').addEventListener('click', () => togglePalette(true));
  wrap.addEventListener('click', e => { if (e.target === wrap) closePalette(); });
}
