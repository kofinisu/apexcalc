const results = document.getElementById('results');
export function test(name, fn) {
  const el = document.createElement('div');
  try { fn(); el.className = 'pass'; el.textContent = '✓ ' + name; }
  catch (e) { el.className = 'fail'; el.textContent = '✗ ' + name + ' — ' + e.message; }
  results.appendChild(el);
}
export function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
export function assertClose(actual, expected, tol = 1e-9, label = 'value') { if (!(Math.abs(actual - expected) <= tol)) throw new Error(`${label}: expected ${expected}, got ${actual}`); }
export function assertThrows(fn, pattern) {
  try { fn(); } catch (e) { if (pattern && !pattern.test(e.message)) throw new Error('threw the wrong error: ' + e.message); return; }
  throw new Error('expected an error, but nothing was thrown');
}
