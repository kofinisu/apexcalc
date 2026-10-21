import { tokenize } from './tokenizer.js';
export class Parser {
  constructor(tokens) { this.tokens = tokens; this.pos = 0; }
  peek() { return this.tokens[this.pos]; }
  next() { return this.tokens[this.pos++]; }
  expect(v) { const t = this.next(); if (t.value !== v) throw new Error(`Expected "${v}" but got "${t.value || 'end'}"`); return t; }
  parse() { const node = this.parseAdd(); if (this.peek().type !== 'eof') throw new Error('Unexpected token: ' + this.peek().value); return node; }
  parseAdd() { let node = this.parseMul(); while (this.peek().value === '+' || this.peek().value === '-') { const op = this.next().value; node = { type: 'binary', op, left: node, right: this.parseMul() }; } return node; }
  parseMul() { let node = this.parseUnary(); while (true) { const t = this.peek(); if (t.value === '*' || t.value === '/') { const op = this.next().value; node = { type: 'binary', op, left: node, right: this.parseUnary() }; } else if (t.type === 'num' || t.type === 'id' || t.value === '(') { node = { type: 'binary', op: '*', left: node, right: this.parseUnary() }; } else break; } return node; }
  parseUnary() { const t = this.peek(); if (t.value === '+' || t.value === '-') { this.next(); return { type: 'unary', op: t.value, expr: this.parseUnary() }; } return this.parsePower(); }
  parsePower() { let node = this.parsePrimary(); if (this.peek().value === '^') { this.next(); node = { type: 'binary', op: '^', left: node, right: this.parseUnary() }; } return node; }
  parsePrimary() {
    const t = this.next();
    if (t.type === 'num') return { type: 'num', value: t.value };
    if (t.type === 'id') {
      if (this.peek().value === '(') { this.next(); const args = []; if (this.peek().value !== ')') { args.push(this.parseAdd()); while (this.peek().value === ',') { this.next(); args.push(this.parseAdd()); } } this.expect(')'); return { type: 'call', name: t.value, args }; }
      return { type: 'id', name: t.value };
    }
    if (t.value === '(') { const node = this.parseAdd(); this.expect(')'); return node; }
    if (t.value === '[') { const elements = []; if (this.peek().value !== ']') { elements.push(this.parseAdd()); while (this.peek().value === ',') { this.next(); elements.push(this.parseAdd()); } } this.expect(']'); return { type: 'array', elements }; }
    throw new Error('Unexpected token: ' + (t.value || 'end'));
  }
}
export function parse(src) { return new Parser(tokenize(src)).parse(); }