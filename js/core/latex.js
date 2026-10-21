const GREEK = { pi: '\\pi', tau: '\\tau', theta: '\\theta', phi: '\\varphi', alpha: '\\alpha', beta: '\\beta', gamma: '\\gamma', lambda: '\\lambda', mu: '\\mu', omega: '\\omega' };
const OPERATORS = new Set(['sin', 'cos', 'tan', 'sinh', 'cosh', 'tanh', 'log', 'ln', 'exp', 'arg', 'min', 'max']);
const INVERSE = { asin: '\\arcsin', acos: '\\arccos', atan: '\\arctan' };
const PREC = { '+': 1, '-': 1, '*': 2, '/': 2, '^': 4 };
const prec = n => n.type === 'binary' ? PREC[n.op] : (n.type === 'unary' || (n.type === 'num' && n.value < 0)) ? 3 : 5;
const paren = (n, needed) => needed ? `\\left(${toLatex(n)}\\right)` : toLatex(n);

export function toLatex(node) {
  switch (node.type) {
    case 'num': return Number(node.value.toFixed(6)).toString();
    case 'id': return GREEK[node.name] || node.name;
    case 'unary': return node.op + paren(node.expr, prec(node.expr) < 2);
    case 'array': return '\\begin{bmatrix}' + node.elements.map(e => e.type === 'array' ? e.elements.map(toLatex).join(' & ') : toLatex(e)).join(' \\\\ ') + '\\end{bmatrix}';
    case 'call': {
      const args = node.args.map(toLatex).join(', '); const name = node.name.toLowerCase();
      if (name === 'sqrt') return `\\sqrt{${args}}`;
      if (name === 'abs') return `\\left|${args}\\right|`;
      if (OPERATORS.has(name)) return `\\${name}\\left(${args}\\right)`;
      if (INVERSE[name]) return `${INVERSE[name]}\\left(${args}\\right)`;
      return `\\operatorname{${node.name}}\\left(${args}\\right)`;
    }
    case 'binary': {
      const { op, left: L, right: R } = node;
      if (op === '/') return `\\frac{${toLatex(L)}}{${toLatex(R)}}`;
      if (op === '^') return `${paren(L, prec(L) < 5)}^{${toLatex(R)}}`;
      if (op === '*') return `${paren(L, prec(L) < 2)} \\cdot ${paren(R, prec(R) < 2)}`;
      return `${toLatex(L)} ${op} ${paren(R, op === '-' && prec(R) <= 1)}`;
    }
    default: return '?';
  }
}
