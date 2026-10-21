export async function saveWorkspace(name, data) {
  try { localStorage.setItem('apexcalc-' + name, JSON.stringify(data)); return true; }
  catch { return false; }
}
export async function loadWorkspace(name) {
  try { const d = localStorage.getItem('apexcalc-' + name); return d ? JSON.parse(d) : null; }
  catch { return null; }
}
