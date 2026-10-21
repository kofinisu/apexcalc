export function toggleHelp(force) { const o = document.getElementById('helpOverlay'); if (o) o.classList.toggle('open', force); }
export function closeHelp() { toggleHelp(false); }

export function initTopbar(onTabChange, onQualityChange) {
  document.querySelectorAll('.tab').forEach(btn => btn.addEventListener('click', () => onTabChange(btn.dataset.tab)));
  const q = document.getElementById('qualitySelect'); if (q) q.addEventListener('change', () => onQualityChange(q.value));
  const help = document.getElementById('helpBtn'); if (help) help.addEventListener('click', () => toggleHelp());
  const overlay = document.getElementById('helpOverlay'); if (overlay) overlay.addEventListener('click', e => { if (e.target === overlay) closeHelp(); });
  // On narrow screens the sidebar is off-canvas; this button is the only way to reach the expression list.
  const mobile = document.getElementById('mobileSidebarBtn'), sidebar = document.getElementById('sidebar');
  if (mobile && sidebar) mobile.addEventListener('click', () => sidebar.classList.toggle('mobile-open'));
}
