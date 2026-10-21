// ARIA live regions for graph updates — minimal.
export function announce(msg) {
  const host = document.getElementById('toastHost');
  if (!host) return;
  const live = document.createElement('div');
  live.className = 'sr-only';
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  live.textContent = msg;
  host.appendChild(live);
  setTimeout(() => live.remove(), 1000);
}