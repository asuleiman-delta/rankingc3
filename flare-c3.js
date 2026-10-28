// <c3-flare> — destello anamórfico interactivo detrás del trofeo.
// Atributos/props: intensity, rays, raylength (rayLength), streakwidth (streakWidth), mousestrength (mouseStrength), smoothing
// Paleta: editar PALETTE (rampa de energía del núcleo hacia afuera + color de rayos/franja).
(function () {
  if (customElements.get('c3-flare')) return;
  const DEF = { intensity: 1, rays: 6, rayLength: 1, streakWidth: 1, mouseStrength: 1, smoothing: 0.05 };
  const PALETTE = { c0: '#000000', c1: '#1A1004', c2: '#6B4410', c3: '#E8B85A', c4: '#FFF6E0', ray: '#FFF3DE' };
  const hex = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
  const MAP = { mode: 'mode', intensity: 'intensity', rays: 'rays', raylength: 'rayLength', 'ray-length': 'rayLength', streakwidth: 'streakWidth', 'streak-width': 'streakWidth', mousestrength: 'mouseStrength', 'mouse-strength': 'mouseStrength', smoothing: 'smoothing' };

  const FRAG = `
precision highp float;
uniform vec2 uRes; uniform vec2 uPool; uniform float uPoolW; uniform vec2 uCore; uniform vec2 uMouse; uniform float uTime; uniform float uDpr;
uniform float uW; uniform float uInt; uniform float uRays; uniform float uRayLen; uniform float uStreakW;
uniform float uMode; uniform float uRot; uniform float uTilt; uniform vec2 uShift; uniform float uLeft; uniform float uBottom; uniform float uFadeH;
uniform vec3 c0; uniform vec3 c1; uniform vec3 c2; uniform vec3 c3; uniform vec3 c4; uniform vec3 cRay;
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
vec3 ramp(float e){
  e = clamp(e, 0.0, 1.0);
  if (e < 0.12) return mix(c0, c1, e / 0.12);
  if (e < 0.35) return mix(c1, c2, (e - 0.12) / 0.23);
  if (e < 0.7) return mix(c2, c3, (e - 0.35) / 0.35);
  return mix(c3, c4, (e - 0.7) / 0.3);
}
vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
void main(){
  vec2 p = gl_FragCoord.xy / uDpr;           // css px, y up
  vec2 d = p - uCore;
  float rp = length(d);                       // css px
  float r = rp / uW;                          // fraction of section width
  // 1+2 ambient glow + core -> single energy, mapped through the ramp (desaturates outward)
  float e = 0.0;
  e += 0.3 * exp(-pow(r / 0.1, 2.0));               // ambient, ~0 beyond 0.3W
  e += 0.18 * exp(-r / 0.045) * step(r, 0.35);        // exponential tail
  e += 0.28 * exp(-pow(rp / 150.0, 2.0));              // bloom
  e += 0.38 * exp(-pow(rp / 50.0, 2.0));               // hot core
  // blurred floor surface under the base
  vec2 pq = (p - uPool) / vec2(uPoolW, uPoolW * 0.3);
  float fl = dot(pq, pq);
  e += 0.24 * exp(-fl * 1.3) + 0.09 * exp(-fl * 0.3);
  vec3 col = ramp(e * uInt) * (0.35 + 0.65 * min(1.0, e * uInt * 1.4));
  // 3 rays: 1-2px, base 0.35 -> tip 0
  float a = atan(d.y, d.x) - uRot;
  float rays = 0.0;
  for (int i = 0; i < 12; i++) {
    float fi = float(i);
    if (fi >= uRays) break;
    float ang = fi * 6.28318 / uRays + 0.38 * sin(fi * 2.37 + 0.6);
    float len = uW * 0.4 * uRayLen * (0.35 + 0.65 * fract(sin(fi * 91.7 + 3.1) * 437.1));
    float da = abs(mod(a - ang + 3.14159, 6.28318) - 3.14159);
    if (da > 1.4) continue;
    float dist = rp * sin(da);
    float sig = 5.0 + rp * 0.025;
    float line = exp(-pow(dist / sig, 2.0)) * 0.4 + exp(-pow(dist / (sig * 4.0), 2.0)) * 0.3;
    float fade = pow(clamp(1.0 - rp / len, 0.0, 1.0), 1.8) * smoothstep(6.0, 26.0, rp);
    rays += line * fade * (0.7 + 0.3 * fract(fi * 0.618 + 0.2));
  }
  col += cRay * rays * 0.16;
  // 4 anamorphic streak: 2-3px core + ~20px halo, max 0.6, fades before uLeft
  vec2 s = d - uShift * uW;
  float ct = cos(uTilt), st = sin(uTilt);
  vec2 sr = vec2(ct * s.x + st * s.y, -st * s.x + ct * s.y);
  float horiz = exp(-abs(sr.x) / (uW * 0.16));
  float leftFade = smoothstep(uLeft, uLeft + uW * 0.1, p.x);
  float rightFade = smoothstep(uRes.x / uDpr, uRes.x / uDpr - uW * 0.06, p.x);
  float sw = uStreakW;
  float streak = 0.2 * exp(-pow(sr.y / (9.0 * sw), 2.0)) + 0.18 * exp(-pow(sr.y / (36.0 * sw), 2.0));
  float spots = 0.0;
  for (int k = 0; k < 3; k++) {
    float fk = float(k);
    float bx = uW * (fk == 0.0 ? -0.11 : (fk == 1.0 ? 0.13 : 0.24));
    vec2 q = sr - vec2(bx + uShift.x * uW * 1.5 * (fk - 0.5), 0.0);
    spots += exp(-(pow(q.x / (uW * 0.04), 2.0) + pow(q.y / (9.0 * sw), 2.0))) * 0.16;
  }
  col += cRay * (streak * horiz + spots) * leftFade * rightFade;
  // 5 ghosts on core -> cursor axis, max 0.12
  vec2 m = uMouse - uCore;
  vec3 gcol = vec3(0.0);
  for (int g = 0; g < 3; g++) {
    float fg = float(g);
    float t = fg == 0.0 ? -0.35 : (fg == 1.0 ? 0.55 : 0.95);
    float gr = 26.0 + 22.0 * fg;
    float gd = length(d - m * t);
    gcol += mix(c3, cRay, 0.5) * exp(-pow(gd / gr, 2.0)) * 0.16 * leftFade;
  }
  if (uMode > 0.5) col = gcol * uInt; else col *= 0.55;
  col = aces(col * 1.1);
  // vignette + bottom fade before the divider
  vec2 uv = gl_FragCoord.xy / uRes;
  col *= smoothstep(1.25, 0.45, length((uv - 0.5) * vec2(1.0, 1.1)));
  col *= smoothstep(uBottom, uBottom + uFadeH, p.y);
  // grain only where there is light (keeps black black)
  float lum = dot(col, vec3(0.333));
  col += (hash(floor(gl_FragCoord.xy) + fract(uTime * 0.37) * 113.0) - 0.5) * 0.04 * smoothstep(0.01, 0.25, lum);
  gl_FragColor = vec4(max(col, 0.0), 1.0);
}`;
  const VERT = 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }';

  class C3Flare extends HTMLElement {
    static get observedAttributes() { return Object.keys(MAP); }
    constructor() { super(); this.p = { ...DEF }; this.palette = { ...PALETTE }; }
    attributeChangedCallback(n, o, v) { if (n === 'mode') { this.mode = v === 'ghosts' ? 1 : 0; return; } const k = MAP[n]; if (k && v != null && v !== '' && !isNaN(+v)) this.p[k] = +v; }
    connectedCallback() {
      if (this._init) return; this._init = true;
      Object.assign(this.style, { position: 'absolute', inset: '0', display: 'block', pointerEvents: 'none', overflow: 'hidden' });
      const c = document.createElement('canvas');
      Object.assign(c.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block' });
      this.appendChild(c); this.canvas = c;
      this.section = this.closest('section') || this.parentElement;
      this.reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.touch = window.matchMedia && matchMedia('(hover: none)').matches;
      this.gl = c.getContext('webgl', { premultipliedAlpha: false, antialias: false });
      if (this.gl && !this._setupGL()) this.gl = null;
      if (!this.gl) { if (this.getAttribute('mode') === 'ghosts') { this.style.display = 'none'; return; } this.ctx = c.getContext('2d'); }
      this.s = { mx: 0, my: 0, rot: 0, tilt: 0, sx: 0, sy: 0, boost: 0, init: false };
      this.t = { mx: 0, my: 0, has: false, last: 0 };
      this._onMove = (e) => { this.t.has = true; this.t.mx = e.clientX; this.t.my = e.clientY; this.t.last = performance.now(); };
      this._onLeave = () => { this.t.has = false; };
      this._onTilt = (e) => { if (e.gamma == null) return; this.t.tiltX = Math.max(-1, Math.min(1, e.gamma / 35)); this.t.tiltY = Math.max(-1, Math.min(1, (e.beta - 45) / 35)); };
      if (!this.reduce) {
        this.section.addEventListener('pointermove', this._onMove, { passive: true });
        this.section.addEventListener('pointerleave', this._onLeave);
        window.addEventListener('deviceorientation', this._onTilt, { passive: true });
      }
      this._ro = new ResizeObserver(() => { this._resize(); if (this.reduce) this._frame(performance.now()); });
      this._ro.observe(this);
      this.visible = true;
      this._io = new IntersectionObserver((es) => { this.visible = es[0].isIntersecting; if (this.visible && !this.reduce) this._loop(); }, { threshold: 0 });
      this._io.observe(this.section);
      this._resize();
      this.t0 = performance.now();
      if (this.reduce) setTimeout(() => this._frame(performance.now()), 300); else this._loop();
    }
    disconnectedCallback() {
      cancelAnimationFrame(this._raf); this._raf = 0;
      this._ro && this._ro.disconnect(); this._io && this._io.disconnect();
      if (this.section) { this.section.removeEventListener('pointermove', this._onMove); this.section.removeEventListener('pointerleave', this._onLeave); }
      window.removeEventListener('deviceorientation', this._onTilt);
    }
    _setupGL() {
      const gl = this.gl;
      const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn('[c3-flare]', gl.getShaderInfoLog(s)); return null; } return s; };
      const v = sh(gl.VERTEX_SHADER, VERT), f = sh(gl.FRAGMENT_SHADER, FRAG); if (!v || !f) return false;
      const pr = gl.createProgram(); gl.attachShader(pr, v); gl.attachShader(pr, f); gl.linkProgram(pr);
      if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return false;
      gl.useProgram(pr);
      const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      this.u = {};
      ['uRes', 'uMode', 'uPool', 'uPoolW', 'uCore', 'uMouse', 'uTime', 'uDpr', 'uW', 'uInt', 'uRays', 'uRayLen', 'uStreakW', 'uRot', 'uTilt', 'uShift', 'uLeft', 'uBottom', 'uFadeH', 'c0', 'c1', 'c2', 'c3', 'c4', 'cRay'].forEach(n => this.u[n] = gl.getUniformLocation(pr, n));
      return true;
    }
    _resize() {
      // soft glow: render at reduced resolution and let the browser upscale (≈4–6× fewer pixels)
      this.dpr = Math.min(1.5, window.devicePixelRatio || 1) * 0.5;
      const w = Math.max(1, this.clientWidth), h = Math.max(1, this.clientHeight);
      this.canvas.width = Math.round(w * this.dpr); this.canvas.height = Math.round(h * this.dpr);
      if (this.gl) this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }
    _loop() {
      if (this._raf) return;
      const step = (t) => { this._raf = 0; if (!this.visible || !this.isConnected) return; this._frame(t); this._raf = requestAnimationFrame(step); };
      this._raf = requestAnimationFrame(step);
    }
    _geom() {
      const c = this.canvas.getBoundingClientRect();
      const q = (s) => this.section.querySelector(s);
      const a = q('[data-flare-anchor]'), tx = q('[data-flare-text]'), bt = q('[data-flare-bottom]');
      let core = { x: c.width * 0.72, y: c.height * 0.25 }, over = null, pool = null;
      if (a) { const r = a.getBoundingClientRect(); core = { x: r.left - c.left + r.width / 2, y: r.top - c.top + r.height * 0.2 }; over = r; pool = { x: core.x, y: r.top - c.top + r.height * 0.74, w: Math.min(r.width * 0.6, 460) }; }
      let left = 0;
      if (tx && a) { const t = tx.getBoundingClientRect(), r = a.getBoundingClientRect(); if (r.left >= t.right - 10) left = Math.max(t.right - c.left, c.width * 0.5); }
      let bottom = c.height;
      if (bt) bottom = bt.getBoundingClientRect().top - c.top;
      return { c, core, over, left, bottom, pool: pool || { x: core.x, y: core.y + 320, w: 320 } };
    }
    _frame(now) {
      const P = this.p, S = this.s, T = this.t, time = (now - this.t0) / 1000;
      const { c, core, over, left, bottom, pool } = this._geom();
      const W = c.width, H = c.height;
      let mx, my;
      const idle = !T.has || now - T.last > 4000;
      if (this.reduce) { mx = core.x - W * 0.15; my = core.y + H * 0.06; }
      else if (T.has && !idle) { mx = T.mx - c.left; my = T.my - c.top; }
      else if (T.tiltX != null && this.touch) { mx = core.x + T.tiltX * W * 0.3; my = core.y + T.tiltY * H * 0.2; }
      else { mx = core.x + Math.cos(time * 0.2) * W * 0.25; my = core.y + Math.sin(time * 0.28) * H * 0.15; }
      const ms = P.mouseStrength, deg = Math.PI / 180;
      const nx = Math.max(-1, Math.min(1, (mx - core.x) / (W * 0.5))), ny = Math.max(-1, Math.min(1, (my - core.y) / (H * 0.5)));
      const tgt = { mx: core.x + (mx - core.x) * ms, my: core.y + (my - core.y) * ms, rot: nx * 8 * deg * ms, tilt: -ny * 3 * deg * ms, sx: nx * 0.02 * ms, sy: -ny * 0.01 * ms,
        boost: (!this.reduce && over && T.has && T.mx >= over.left && T.mx <= over.right && T.my >= over.top && T.my <= over.bottom) ? 0.18 : 0 };
      const k = this.reduce || !S.init ? 1 : Math.max(0.005, Math.min(1, P.smoothing));
      for (const key in tgt) S[key] += (tgt[key] - S[key]) * (key === 'boost' ? 0.05 : k);
      S.init = true;
      const breathe = this.reduce ? 1 : 1 + Math.sin(time * 0.9) * 0.05;
      const autoRot = this.reduce ? 0 : time * 0.01;
      const I = P.intensity * breathe * (1 + S.boost);
      const fadeH = Math.max(40, bottom * 0.15);
      if (this.gl) {
        const gl = this.gl, u = this.u, pal = this.palette, dpr = this.dpr;
        gl.uniform2f(u.uRes, this.canvas.width, this.canvas.height);
        gl.uniform1f(u.uDpr, dpr); gl.uniform1f(u.uW, W); gl.uniform1f(u.uTime, time);
        gl.uniform1f(u.uMode, this.mode || 0); gl.uniform2f(u.uCore, core.x, H - core.y); gl.uniform2f(u.uPool, pool.x, H - pool.y); gl.uniform1f(u.uPoolW, pool.w);
        gl.uniform2f(u.uMouse, S.mx, H - S.my);
        gl.uniform1f(u.uInt, I); gl.uniform1f(u.uRays, Math.max(0, Math.min(12, Math.round(P.rays))));
        gl.uniform1f(u.uRayLen, P.rayLength); gl.uniform1f(u.uStreakW, P.streakWidth);
        gl.uniform1f(u.uRot, S.rot + autoRot); gl.uniform1f(u.uTilt, S.tilt); gl.uniform2f(u.uShift, S.sx, S.sy);
        gl.uniform1f(u.uLeft, left); gl.uniform1f(u.uBottom, H - bottom); gl.uniform1f(u.uFadeH, fadeH);
        ['c0', 'c1', 'c2', 'c3', 'c4'].forEach(n => gl.uniform3fv(u[n], hex(pal[n]))); gl.uniform3fv(u.cRay, hex(pal.ray));
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      } else if (this.ctx) this._draw2d(W, H, core, S, I, autoRot, bottom, fadeH);
    }
    _draw2d(W, H, core, S, I, autoRot, bottom, fadeH) {
      const g = this.ctx, d = this.dpr, pal = this.palette, P = this.p;
      g.setTransform(d, 0, 0, d, 0, 0); g.globalCompositeOperation = 'source-over'; g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.min(1, I);
      const gr = g.createRadialGradient(core.x, core.y, 0, core.x, core.y, W * 0.3);
      [[0, pal.c4], [0.04, pal.c3], [0.18, pal.c2], [0.5, pal.c1], [1, '#000000']].forEach(([o, c]) => gr.addColorStop(o, c));
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      const n = Math.round(P.rays);
      for (let i = 0; i < n; i++) {
        const ang = i * Math.PI * 2 / n + 0.38 * Math.sin(i * 2.37 + 0.6) + S.rot + autoRot;
        const len = W * 0.4 * P.rayLength * (0.35 + 0.65 * (((Math.sin(i * 91.7 + 3.1) * 437.1) % 1 + 1) % 1));
        const x2 = core.x + Math.cos(ang) * len, y2 = core.y - Math.sin(ang) * len;
        const lg = g.createLinearGradient(core.x, core.y, x2, y2); lg.addColorStop(0, 'rgba(255,243,222,.35)'); lg.addColorStop(1, 'rgba(0,0,0,0)');
        g.strokeStyle = lg; g.lineWidth = 1.2; g.beginPath(); g.moveTo(core.x, core.y); g.lineTo(x2, y2); g.stroke();
      }
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
      const fg = g.createLinearGradient(0, bottom - fadeH, 0, bottom); fg.addColorStop(0, 'rgba(0,0,0,0)'); fg.addColorStop(1, '#000');
      g.fillStyle = fg; g.fillRect(0, bottom - fadeH, W, H - bottom + fadeH);
    }
  }
  customElements.define('c3-flare', C3Flare);
})();
