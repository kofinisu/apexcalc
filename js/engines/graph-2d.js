import { evalComp } from '../state/store.js';
import { num } from '../core/evaluator.js';

const TAU = Math.PI * 2;
export class Graph2D {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d', { alpha: false });
    this.cx = 0; this.cy = 0; this.scale = 80; this.cssW = 1; this.cssH = 1; this.dpr = 1;
    this.drag = null; this.quality = 'balanced'; this._queued = false; this.expressions = [];
    this._bind();
  }
  panBy(dxPx, dyPx) { this.cx += dxPx / this.scale; this.cy += dyPx / this.scale; this.request(); }
  qualityCap() { return this.quality === 'high' ? 2 : this.quality === 'performance' ? 1 : 1.5; }
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    const dpr = Math.min(window.devicePixelRatio || 1, this.qualityCap());
    this.cssW = rect.width; this.cssH = rect.height; this.dpr = dpr;
    this.canvas.width = Math.round(rect.width * dpr); this.canvas.height = Math.round(rect.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0); this.render();
  }
  worldToScreen(x, y) { return [(x - this.cx) * this.scale + this.cssW / 2, this.cssH / 2 - (y - this.cy) * this.scale]; }
  screenToWorld(px, py) { return [(px - this.cssW / 2) / this.scale + this.cx, (this.cssH / 2 - py) / this.scale + this.cy]; }
  request() { if (this._queued) return; this._queued = true; requestAnimationFrame(() => { this._queued = false; this.render(); }); }
  reset() { this.cx = 0; this.cy = 0; this.scale = 80; this.render(); }
  _bind() {
    const c = this.canvas;
    c.addEventListener('pointerdown', e => { const r = c.getBoundingClientRect(); const px = e.clientX - r.left, py = e.clientY - r.top; this.drag = { mode: 'pan', startX: px, startY: py, cx: this.cx, cy: this.cy, id: e.pointerId }; c.setPointerCapture(e.pointerId); c.style.cursor = 'grabbing'; });
    c.addEventListener('pointermove', e => { if (!this.drag || this.drag.id !== e.pointerId) return; const r = c.getBoundingClientRect(); const px = e.clientX - r.left, py = e.clientY - r.top; this.cx = this.drag.cx - (px - this.drag.startX) / this.scale; this.cy = this.drag.cy + (py - this.drag.startY) / this.scale; this.request(); });
    const end = e => { if (!this.drag) return; this.drag = null; c.style.cursor = 'crosshair'; this.request(); };
    c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
    c.addEventListener('wheel', e => {
      e.preventDefault(); const r = c.getBoundingClientRect(); const px = e.clientX - r.left, py = e.clientY - r.top;
      const [bx, by] = this.screenToWorld(px, py); const factor = Math.exp(-e.deltaY * 0.0014);
      this.scale = Math.max(2, Math.min(this.scale * factor, 1e6)); const [ax, ay] = this.screenToWorld(px, py);
      this.cx += bx - ax; this.cy += by - ay; this.request();
    }, { passive: false });
    // The canvas bitmap must follow its CSS box (window resize, sidebar toggle, tab switch), otherwise it is stretched.
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => this.resize()).observe(c);
  }
  render() {
    const { ctx, cssW: W, cssH: H } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); ctx.fillStyle = '#080d18'; ctx.fillRect(0, 0, W, H);
    this._grid();
    for (const expr of this.expressions) {
      if (!expr.visible || !expr.compiled) continue;
      try { if (expr.type === '2d') this._explicit(expr); } catch {}
    }
  }
  _grid() {
    const ctx = this.ctx, W = this.cssW, H = this.cssH;
    const [ox, oy] = this.worldToScreen(0, 0);
    ctx.strokeStyle = '#1c2d4a'; ctx.lineWidth = 1; ctx.beginPath();
    ctx.moveTo(0, oy); ctx.lineTo(W, oy); ctx.moveTo(ox, 0); ctx.lineTo(ox, H); ctx.stroke();
  }
  _explicit(expr) {
    const ctx = this.ctx, W = this.cssW, H = this.cssH;
    ctx.strokeStyle = expr.color; ctx.lineWidth = 2; ctx.beginPath();
    let pen = false, prevSy = 0;
    for (let px = 0; px <= W; px++) {
      const x = this.screenToWorld(px, 0)[0]; let y;
      try { y = num(evalComp(expr.compiled, { x })); } catch { y = NaN; }
      if (!Number.isFinite(y)) { pen = false; continue; }
      const sy = this.worldToScreen(0, y)[1];
      // A huge jump between neighbouring pixels is an asymptote (tan x, 1/x): lift the pen instead of drawing a vertical line across it.
      if (pen && Math.abs(sy - prevSy) > 4 * H) pen = false;
      if (!pen) { ctx.moveTo(px, sy); pen = true; } else ctx.lineTo(px, sy);
      prevSy = sy;
    }
    ctx.stroke();
  }
}