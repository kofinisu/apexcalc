const N = value => ({ type: 'num', value });
const bin = (op, left, right) => ({ type: 'binary', op, left, right });
const neg = expr => ({ type: 'unary', op: '-', expr });
const call = (name, ...args) => ({ type: 'call', name, args });

export function diff(ast, variable = 'x') { return simplify(d(ast, variable)); }

function dependsOn(node, v) {
  switch (node.type) {
    case 'id': return node.name === v;
    case 'unary': return dependsOn(node.expr, v);
    case 'binary': return dependsOn(node.left, v) || dependsOn(node.right, v);
    case 'call': return node.args.some(a => dependsOn(a, v));
    case 'array': return node.elements.some(a => dependsOn(a, v));
    default: return false;
  }
}

function d(node, v) {
  if (!dependsOn(node, v)) return N(0);
  switch (node.type) {
    case 'id': return N(1); // dependsOn() guarantees node.name === v
    case 'unary': return node.op === '-' ? neg(d(node.expr, v)) : d(node.expr, v);
    case 'binary': {
      const { left: L, right: R, op } = node;
      if (op === '+') return bin('+', d(L, v), d(R, v));
      if (op === '-') return bin('-', d(L, v), d(R, v));
      if (op === '*') return bin('+', bin('*', d(L, v), R), bin('*', L, d(R, v)));
      if (op === '/') return bin('/', bin('-', bin('*', d(L, v), R), bin('*', L, d(R, v))), bin('^', R, N(2)));
      if (op === '^') {
        // exponent independent of v: power rule
        if (!dependsOn(R, v)) return bin('*', bin('*', R, bin('^', L, bin('-', R, N(1)))), d(L, v));
        // base independent of v: a^u -> a^u * ln(a) * u'   (e^u -> e^u * u')
        if (!dependsOn(L, v)) return L.type === 'id' && L.name === 'e' ? bin('*', node, d(R, v)) : bin('*', bin('*', node, call('ln', L)), d(R, v));
        // general case: (L^R)' = L^R * (R' ln L + R L' / L)
        return bin('*', node, bin('+', bin('*', d(R, v), call('ln', L)), bin('/', bin('*', R, d(L, v)), L)));
      }
      throw new Error('Cannot differentiate operator ' + op);
    }
    case 'call': {
      const name = node.name.toLowerCase();
      if (node.args.length !== 1) throw new Error('Cannot differentiate ' + node.name);
      const u = node.args[0]; const du = d(u, v);
      if (name === 'sin') return bin('*', call('cos', u), du);
      if (name === 'cos') return bin('*', neg(call('sin', u)), du);
      if (name === 'tan') return bin('*', bin('/', N(1), bin('^', call('cos', u), N(2))), du);
      if (name === 'exp') return bin('*', node, du);
      if (name === 'log' || name === 'ln') return bin('*', bin('/', N(1), u), du);
      if (name === 'sqrt') return bin('/', du, bin('*', N(2), node));
      throw new Error('Cannot differentiate ' + node.name);
    }
    default: throw new Error('Cannot differentiate node type ' + node.type);
  }
}

export function simplify(node) {
  if (!node || node.type === 'num' || node.type === 'id') return node;
  if (node.type === 'unary') {
    const e = simplify(node.expr);
    if (node.op === '+') return e;
    if (e.type === 'num') return N(-e.value);
    if (e.type === 'unary' && e.op === '-') return e.expr;
    return neg(e);
  }
  if (node.type === 'call') return { type: 'call', name: node.name, args: node.args.map(simplify) };
  if (node.type === 'binary') {
    const L = simplify(node.left), R = simplify(node.right); const ln = L.type === 'num', rn = R.type === 'num';
    if (ln && rn) { switch (node.op) { case '+': return N(L.value + R.value); case '-': return N(L.value - R.value); case '*': return N(L.value * R.value); case '/': return N(L.value / R.value); case '^': return N(Math.pow(L.value, R.value)); } }
    if (node.op === '+' && ln && L.value === 0) return R; if (node.op === '+' && rn && R.value === 0) return L;
    if (node.op === '-' && rn && R.value === 0) return L;
    if (node.op === '-' && ln && L.value === 0) return simplify(neg(R));
    if (node.op === '*' && ln && L.value === 0) return N(0); if (node.op === '*' && rn && R.value === 0) return N(0);
    if (node.op === '*' && ln && L.value === 1) return R; if (node.op === '*' && rn && R.value === 1) return L;
    if (node.op === '/' && ln && L.value === 0) return N(0);
    if (node.op === '/' && rn && R.value === 1) return L;
    if (node.op === '^' && rn && R.value === 0) return N(1); if (node.op === '^' && rn && R.value === 1) return L;
    return bin(node.op, L, R);
  }
  return node;
}

// Binding strength: + - (1), * / (2), unary minus and negative literals (3), ^ (4), atoms and calls (5).
const PREC = { '+': 1, '-': 1, '*': 2, '/': 2, '^': 4 };
const prec = n => n.type === 'binary' ? PREC[n.op] : (n.type === 'unary' || (n.type === 'num' && n.value < 0)) ? 3 : 5;
const wrap = (n, needParens) => needParens ? '(' + astToString(n) + ')' : astToString(n);

export function astToString(node) {
  switch (node.type) {
    case 'num': return Number(node.value.toFixed(6)).toString();
    case 'id': return node.name;
    case 'unary': return node.op + wrap(node.expr, prec(node.expr) < 2);
    case 'call': return node.name + '(' + node.args.map(astToString).join(', ') + ')';
    case 'array': return '[' + node.elements.map(astToString).join(', ') + ']';
    case 'binary': {
      const { op, left: L, right: R } = node;
      if (op === '^') return `${wrap(L, prec(L) < 5)}^${wrap(R, R.type === 'binary')}`;
      const lp = op === '*' || op === '/' ? prec(L) < 2 : false;
      const rp = op === '-' ? prec(R) <= 1 : op === '*' ? prec(R) < 2 : op === '/' ? prec(R) <= 2 : false;
      return `${wrap(L, lp)} ${op} ${wrap(R, rp)}`;
    }
    default: return '?';
  }
}
