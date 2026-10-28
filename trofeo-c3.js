// <c3-trophy> — trofeo Ranking C³ en 3D, sigue el movimiento del mouse.
(function () {
  if (customElements.get('c3-trophy')) return;
  const THREE_URL = 'https://unpkg.com/three@0.184.0/build/three.module.js';
  const BASE = new URL('.', document.currentScript ? document.currentScript.src : location.href).href;

  class C3Trophy extends HTMLElement {
    connectedCallback() {
      if (this._init) return; this._init = true;
      Object.assign(this.style, { display: 'block', position: 'absolute', inset: '0', width: '100%', height: '100%' });
      this._build().catch(e => console.error('[c3-trophy]', e));
    }
    disconnectedCallback() {
      cancelAnimationFrame(this._raf);
      window.removeEventListener('pointermove', this._onMove);
      this._ro && this._ro.disconnect(); this._io && this._io.disconnect();
      this._io && this._io.disconnect();
      this._renderer && this._renderer.dispose();
    }
    async _build() {
      const THREE = await import(THREE_URL);
      await Promise.all(['600 80px Manrope', '700 80px Manrope'].map(f => document.fonts.load(f).catch(() => {})));

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.25;
      renderer.setClearColor(0x000000, 0);
      Object.assign(renderer.domElement.style, { width: '100%', height: '100%', display: 'block', cursor: 'grab' });
      this.appendChild(renderer.domElement);
      const cv = renderer.domElement;
      const TR = 'filter 1.6s cubic-bezier(.2,.7,.2,1), opacity 1.3s ease, transform 1.6s cubic-bezier(.2,.7,.2,1)';
      const hide = () => { cv.style.transition = 'none'; cv.style.filter = 'blur(18px)'; cv.style.opacity = '0.3'; cv.style.transform = 'scale(.94)'; };
      const reveal = () => { cv.style.transition = TR; cv.style.filter = 'blur(0px)'; cv.style.opacity = '1'; cv.style.transform = 'none'; };
      hide(); cv.style.willChange = 'filter, opacity, transform';
      let shown = false, fr = 0;
      this._checkReveal = () => {
        if (fr++ % 6) return;
        const r = this.getBoundingClientRect(), vh = window.innerHeight || document.documentElement.clientHeight;
        const vis = r.height > 0 && r.top < vh * 0.8 && r.bottom > vh * 0.2;
        if (vis && !shown) { shown = true; reveal(); }
        else if (!vis && shown && (r.bottom < 0 || r.top > vh)) { shown = false; hide(); }
      };
      this._renderer = renderer;

      const scene = new THREE.Scene();
      // Studio environment for metal reflections
      {
        const env = new THREE.Scene();
        const room = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), new THREE.MeshBasicMaterial({ color: 0x262626, side: THREE.BackSide }));
        env.add(room);
        const panel = (w, h, x, y, z, c, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m); };
        panel(4, 3, 0.8, 1, 4.4, 0x5a4626);
        panel(6, 4, 0, 1.6, -4.5, 0xffffff);
        panel(3, 1.5, 0, 3.8, -2, 0xfff1d6);
        panel(1.2, 4, -4.5, 0.8, -2.5, 0xffe7b8);
        panel(1.2, 4, 4.5, 0.8, -2.5, 0xffe7b8);
        const pm = new THREE.PMREMGenerator(renderer);
        scene.environment = pm.fromScene(env, 0.02).texture;
      }
      const key = new THREE.DirectionalLight(0xfff4e0, 0.7); key.position.set(0.3, 0.4, 1); scene.add(key);
      const fill = new THREE.DirectionalLight(0xe9dcc6, 0.25); fill.position.set(-0.4, 0.15, 1); scene.add(fill);
      const rim = new THREE.DirectionalLight(0xffe2a8, 3.6); rim.position.set(-0.6, 0.8, -1); scene.add(rim);
      const rim2 = new THREE.DirectionalLight(0xfff0d0, 3.2); rim2.position.set(0.6, 0.8, -1); scene.add(rim2);
      const top = new THREE.DirectionalLight(0xfff6e0, 2.2); top.position.set(0, 1, -0.4); scene.add(top);
      scene.add(new THREE.AmbientLight(0xffe9c4, 0.12));

      const trophy = this._trophy(THREE, await this._logos());
      const pivot = new THREE.Group(); pivot.add(trophy); scene.add(pivot);
      trophy.position.y = 0;

      const box = new THREE.Box3().setFromObject(trophy);
      const size = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
      trophy.position.sub(ctr);
      const floorY = -size.y / 2;
      const radTex = (stops) => { const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d'); const gr = g.createRadialGradient(256, 256, 0, 256, 256, 256); stops.forEach(([o, col]) => gr.addColorStop(o, col)); g.fillStyle = gr; g.fillRect(0, 0, 512, 512); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
      const ground = new THREE.Group(); scene.add(ground);
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(size.x * 4.2, size.x * 4.2), new THREE.MeshBasicMaterial({ map: radTex([[0, 'rgba(70,56,34,0.95)'], [0.35, 'rgba(40,32,20,0.7)'], [0.7, 'rgba(18,15,10,0.25)'], [1, 'rgba(0,0,0,0)']]), transparent: true, depthWrite: false }));
      floor.visible = false;
      const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: radTex([[0, 'rgba(0,0,0,0.9)'], [0.45, 'rgba(0,0,0,0.6)'], [1, 'rgba(0,0,0,0)']]), transparent: true, depthWrite: false }));
      shadow.rotation.x = -Math.PI / 2; shadow.scale.set(size.x * 1.35, size.z * 2.6, 1); shadow.position.y = floorY - 0.0002; shadow.renderOrder = -1; ground.add(shadow);
      const camera = new THREE.PerspectiveCamera(28, 1, 0.01, 10);

      const fit = () => {
        const w = this.clientWidth || 1, h = this.clientHeight || 1;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        const fov = THREE.MathUtils.degToRad(camera.fov);
        const dH = (size.y * 1.45) / 2 / Math.tan(fov / 2);
        const dW = (size.x * 1.5) / 2 / Math.tan(fov / 2) / camera.aspect;
        const d = Math.max(dH, dW) + size.z;
        camera.position.set(0, size.y * 0.32, d);
        camera.lookAt(0, -size.y * 0.06, 0);
        camera.updateProjectionMatrix();
      };
      fit();
      this._ro = new ResizeObserver(fit); this._ro.observe(this);

      // Mouse follow (whole window) + drag spin
      let tx = 0, ty = 0, rx = 0, ry = 0, spin = 0, spinV = 0, drag = null, lastMove = 0;
      this._onMove = (e) => {
        const r = this.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const nx = Math.max(-1, Math.min(1, (e.clientX - cx) / (window.innerWidth / 2)));
        const ny = Math.max(-1, Math.min(1, (e.clientY - cy) / (window.innerHeight / 2)));
        ty = nx * 0.75; tx = ny * 0.07; lastMove = performance.now();
        if (drag) { const dx = e.clientX - drag.x; drag.x = e.clientX; spinV = dx * 0.008; spin += spinV; }
      };
      window.addEventListener('pointermove', this._onMove, { passive: true });
      renderer.domElement.addEventListener('pointerdown', (e) => { drag = { x: e.clientX }; renderer.domElement.style.cursor = 'grabbing'; renderer.domElement.setPointerCapture(e.pointerId); });
      const up = () => { drag = null; renderer.domElement.style.cursor = 'grab'; };
      renderer.domElement.addEventListener('pointerup', up);
      renderer.domElement.addEventListener('pointercancel', up);

      const t0 = performance.now();
      const loop = (t) => {
        const s = (t - t0) / 1000;
        const idle = t - lastMove > 2500;
        const iy = idle ? Math.sin(s * 0.5) * 0.45 : ty;
        const ix = idle ? Math.sin(s * 0.7) * 0.03 : tx;
        ry += (iy - ry) * 0.06; rx += (ix - rx) * 0.06;
        if (!drag) { spinV *= 0.94; spin += spinV; spin *= 0.985; }
        pivot.rotation.set(rx, ry + spin, 0);
        ground.rotation.y = ry + spin;
        renderer.render(scene, camera);
        this._checkReveal();
        this._raf = this._visible ? requestAnimationFrame(loop) : 0;
      };
      this._visible = true;
      this._io = new IntersectionObserver((es) => {
        this._visible = es[0].isIntersecting;
        if (this._visible && !this._raf) this._raf = requestAnimationFrame(loop);
      }, { rootMargin: '100px' });
      this._io.observe(this);
      this._raf = requestAnimationFrame(loop);
    }

    async _logos() {
      const load = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
      const black = (img) => {
        const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
        const g = c.getContext('2d'); g.drawImage(img, 0, 0);
        const d = g.getImageData(0, 0, c.width, c.height), p = d.data;
        let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
        for (let i = 0; i < p.length; i += 4) {
          const a = p[i + 3] / 255 * (1 - Math.min(p[i], p[i + 1], p[i + 2]) / 255);
          p[i] = p[i + 1] = p[i + 2] = 20; p[i + 3] = Math.round(a * 255);
          if (a > 0.1) { const x = (i / 4) % c.width, y = (i / 4 / c.width) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        }
        g.putImageData(d, 0, 0);
        const o = document.createElement('canvas'); o.width = x1 - x0 + 1; o.height = y1 - y0 + 1;
        o.getContext('2d').drawImage(c, x0, y0, o.width, o.height, 0, 0, o.width, o.height);
        return o;
      };
      try {
        return (await Promise.all(['logo-brinca.png', 'logo-fch.png', 'logo-uai.png'].map(f => load(BASE + 'assets/trofeo/' + f)))).map(black);
      } catch (e) { return null; }
    }

    _trophy(THREE, logos) {
      const M = {
        gold: new THREE.MeshStandardMaterial({ color: 0xf0d08e, metalness: 0.9, roughness: 0.26, envMapIntensity: 2.2 }),
        engrave: new THREE.MeshStandardMaterial({ color: 0x8a6a35, metalness: 0.5, roughness: 0.6 }),
        acrylic: new THREE.MeshStandardMaterial({ color: 0x151515, metalness: 0.1, roughness: 0.18 }),
        wood: new THREE.MeshStandardMaterial({ color: 0x8a6e62, metalness: 0, roughness: 0.9, envMapIntensity: 0.35 })
      };
      const trophy = new THREE.Group();
      const W = 0.15, R = W / Math.sqrt(3), HW = W / 2, SW = 0.0375, T = 0.004;
      const YB = -R - 0.045, WOOD_H = 0.03, ACR_H = 0.008, INSET = 0.004;
      const OY = WOOD_H + ACR_H - INSET - YB;

      const s = new THREE.Shape(); const yJ = -0.75 * R;
      [[0, R], [HW, R / 2], [HW, -R / 2], [SW, yJ], [SW, YB], [-SW, YB], [-SW, yJ], [-HW, -R / 2], [-HW, R / 2]].forEach(([x, y], i) => i ? s.lineTo(x, y) : s.moveTo(x, y));
      s.closePath();
      const bev = 0.0004;
      const pg = new THREE.ExtrudeGeometry(s, { depth: T - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 2 });
      pg.translate(0, 0, -(T - 2 * bev) / 2);
      { const uv = pg.attributes.uv, pos = pg.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + HW) / W, (pos.getY(i) - YB) / (R - YB)); }
      {
        const c = document.createElement('canvas'); c.width = 1024; c.height = 1024; const g = c.getContext('2d');
        g.fillStyle = '#e8e8e8'; g.fillRect(0, 0, 1024, 1024);
        let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
        for (let i = 0; i < 9000; i++) { const v = 222 + rnd() * 33 | 0, y = rnd() * 1024; g.fillStyle = `rgba(${v},${v},${v},${0.15 + rnd() * 0.3})`; g.fillRect(rnd() * 1024 - 200, y, 80 + rnd() * 600, rnd() < 0.8 ? 1 : 2); }
        const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        const rough = new THREE.CanvasTexture(c); rough.wrapS = rough.wrapT = THREE.RepeatWrapping;
        M.gold.map = tex; M.gold.roughnessMap = rough; M.gold.bumpMap = rough; M.gold.bumpScale = 0.15; M.gold.needsUpdate = true;
      }
      const plateG = new THREE.Group(); plateG.position.y = OY;
      plateG.add(new THREE.Mesh(pg, M.gold)); trophy.add(plateG);

      // Engraved cube pattern
      const MARGIN = 0.0012;
      const tiles = [
        [[-.5, .75], [0, 1], [1, .5], [.5, .25]], [[-1, .5], [-.5, .75], [0, .5], [-.5, .25]],
        [[-.5, .25], [0, .5], [.5, .25], [.5, -.25], [0, -.5], [-.5, -.25]], [[-1, .5], [-.5, .25], [-.5, -.25], [-1, -.5]],
        [[-1, -.5], [-.5, -.25], [-.5, -.75]], [[-.5, -.25], [0, -.5], [0, -1], [-.5, -.75]],
        [[0, -.5], [.5, -.25], [1, -.5], [0, -1]], [[.5, -.25], [1, 0], [1, -.5]], [[.5, .25], [1, .5], [1, 0], [.5, -.25]]
      ].map(t => t.map(([x, y]) => [x * HW * 0.965, y * R * 0.965]));
      const inset = (poly, m) => {
        let a = 0; poly.forEach((p, i) => { const q = poly[(i + 1) % poly.length]; a += p[0] * q[1] - q[0] * p[1]; });
        const P = a < 0 ? [...poly].reverse() : poly, n = P.length;
        const L = P.map((p, i) => { const q = P[(i + 1) % n], dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy); return { p: [p[0] - dy / l * m, p[1] + dx / l * m], d: [dx, dy] }; });
        return L.map((l1, i) => { const l0 = L[(i - 1 + n) % n]; const den = l0.d[0] * l1.d[1] - l0.d[1] * l1.d[0]; const t = ((l1.p[0] - l0.p[0]) * l1.d[1] - (l1.p[1] - l0.p[1]) * l1.d[0]) / den; return [l0.p[0] + l0.d[0] * t, l0.p[1] + l0.d[1] * t]; });
      };
      tiles.forEach(t => { const q = inset(t, MARGIN); q.forEach((a, i) => { const b = q[(i + 1) % q.length]; const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy); if (len < 0.002) return;
        const m = new THREE.Mesh(new THREE.BoxGeometry(len, 0.0008, 0.0003), M.engrave); m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, T / 2 + 0.0002); m.rotation.z = Math.atan2(dy, dx); plateG.add(m); }); });

      const decal = (w, h, px, draw) => {
        const c = document.createElement('canvas'); c.width = px; c.height = Math.round(px * h / w);
        draw(c.getContext('2d'), c.width / w);
        const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
        return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.05, metalness: 0.2, roughness: 0.55 }));
      };
      const DH = R - YB, INK = '#2a2418';
      const plateText = decal(W, DH, 1600, (g, k) => {
        const X = x => (x + HW) * k, Y = y => (R - y) * k;
        g.fillStyle = INK; g.textAlign = 'center'; g.textBaseline = 'middle';
        const S = 1.35, cy = -0.1065, lines = ['RANKING C³', 'DE CREATIVIDAD', 'E INNOVACIÓN CHILE'];
        let fs = 0.0050 * S, lh = 0.0068 * S, yr = 0.0085 * S, gap = 0.0028;
        g.font = `600 ${fs * k}px Manrope, sans-serif`;
        let tw = Math.max(...lines.map(t => g.measureText(t).width)) / k;
        const maxW = SW * 2 * 0.84, f = Math.min(1, maxW / (yr * 0.78 + gap + tw));
        fs *= f; lh *= f; yr *= f; gap *= f; tw *= f;
        const yw = yr * 0.78, bx = -(yw + gap + tw) / 2;
        g.save(); g.translate(X(bx + yw / 2), Y(cy)); g.rotate(-Math.PI / 2);
        g.font = `700 ${yr * k}px Manrope, sans-serif`; g.fillText('2026', 0, 0); g.restore();
        g.textAlign = 'left'; g.font = `600 ${fs * k}px Manrope, sans-serif`;
        lines.forEach((t, i) => g.fillText(t, X(bx + yw + gap), Y(cy + lh - i * lh)));
      });
      plateText.position.set(0, (R + YB) / 2, T / 2 + 0.0004); plateG.add(plateText);

      const acr = new THREE.Mesh(new THREE.BoxGeometry(0.162, ACR_H, 0.026), M.acrylic); acr.position.y = WOOD_H + ACR_H / 2; trophy.add(acr);
      const WD = 0.05, WW = 0.178;
      {
        const c = document.createElement('canvas'); c.width = 2048; c.height = 512; const g = c.getContext('2d');
        g.fillStyle = '#d9a283'; g.fillRect(0, 0, c.width, c.height);
        let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
        for (let i = 0; i < 140; i++) { const y0 = rnd() * c.height, amp = 4 + rnd() * 14, f = 0.002 + rnd() * 0.004, ph = rnd() * 6.28, dark = rnd() < 0.35;
          g.strokeStyle = dark ? `rgba(140,80,55,${0.15 + rnd() * 0.25})` : `rgba(245,200,170,${0.1 + rnd() * 0.2})`; g.lineWidth = dark ? 1 + rnd() * 3 : 2 + rnd() * 6;
          g.beginPath(); for (let x = 0; x <= c.width; x += 16) { const y = y0 + Math.sin(x * f + ph) * amp + Math.sin(x * f * 3.1 + ph) * amp * 0.3; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
        for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(120,70,45,${rnd() * 0.12})`; g.fillRect(rnd() * c.width, rnd() * c.height, 2 + rnd() * 10, 1); }
        const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; M.wood.map = tex; M.wood.needsUpdate = true;
      }
      const wood = new THREE.Mesh(new THREE.BoxGeometry(WW, WOOD_H, WD), M.wood); wood.position.y = WOOD_H / 2; trophy.add(wood);

      const FW = 0.166, FH = 0.022;
      const front = new THREE.Mesh(new THREE.BoxGeometry(FW, FH, 0.0012), M.gold); front.position.set(0, WOOD_H / 2, WD / 2 + 0.0006); trophy.add(front);
      if (logos) {
        const [lB, lF, lU] = logos; let uaiBox;
        const lg = decal(FW, FH, 2400, (g, k) => {
          const slots = [[lB, 0.0085], [lF, 0.0085], [lU, 0.0085]], bp = 0.0022;
          const ws = slots.map(([l, h], i) => h * l.width / l.height + (i === 2 ? 2 * bp : 0)), pad = 0.008;
          const gap = (FW - 2 * pad - ws.reduce((a, b) => a + b, 0)) / (slots.length - 1);
          let x = pad;
          slots.forEach(([l, h], i) => {
            if (i === 2) { uaiBox = { x: x - FW / 2 + ws[i] / 2, w: ws[i], h: h + 2 * bp }; g.drawImage(l, (x + bp) * k, (FH - h) / 2 * k, (ws[i] - 2 * bp) * k, h * k); }
            else g.drawImage(l, x * k, (FH - h) / 2 * k, ws[i] * k, h * k);
            x += ws[i] + gap;
          });
        });
        const up = new THREE.Mesh(new THREE.BoxGeometry(uaiBox.w, uaiBox.h, 0.0012), M.gold); up.position.set(uaiBox.x, WOOD_H / 2, WD / 2 + 0.0018); trophy.add(up);
        lg.position.set(0, WOOD_H / 2, WD / 2 + 0.0025); trophy.add(lg);
      }
      return trophy;
    }
  }
  customElements.define('c3-trophy', C3Trophy);
})();
