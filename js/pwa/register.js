export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const register = () => navigator.serviceWorker.register('./sw.js').catch(err => console.warn('Service worker registration failed:', err));
  // The page may already be fully loaded by the time this runs, in which case 'load' would never fire.
  if (document.readyState === 'complete') register(); else window.addEventListener('load', register, { once: true });
}
