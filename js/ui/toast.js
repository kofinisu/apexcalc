export function showToast(msg) {
  const host = document.getElementById('toastHost'); const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg; host.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}