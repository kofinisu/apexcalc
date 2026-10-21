export function encodeState(data) { return btoa(unescape(encodeURIComponent(JSON.stringify(data)))); }
export function decodeState(hash) { try { return JSON.parse(decodeURIComponent(escape(atob(hash)))); } catch { return null; } }
export function readUrlState() { const h = window.location.hash.replace(/^#state=/, ''); return h ? decodeState(h) : null; }