export function tokenize(src) {
  const tokens = []; let i = 0; const n = src.length;
  while (i < n) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9.]/.test(c)) {
      let j = i; while (j < n && /[0-9.]/.test(src[j])) j++;
      if (src[j] === 'e' || src[j] === 'E') { let k = j + 1; if (src[k] === '+' || src[k] === '-') k++; if (k < n && /[0-9]/.test(src[k])) { while (k < n && /[0-9]/.test(src[k])) k++; j = k; } }
      const raw = src.slice(i, j); const value = Number(raw);
      if (!Number.isFinite(value)) throw new Error('Invalid number: ' + raw);
      tokens.push({ type: 'num', value }); i = j; continue;
    }
    if (/[A-Za-z_]/.test(c)) { let j = i; while (j < n && /[A-Za-z0-9_]/.test(src[j])) j++; tokens.push({ type: 'id', value: src.slice(i, j) }); i = j; continue; }
    if ('+-*/^(),[]'.includes(c)) { tokens.push({ type: 'op', value: c }); i++; continue; }
    throw new Error('Unexpected character: ' + c);
  }
  tokens.push({ type: 'eof', value: '' }); return tokens;
}