/* Swarm Rebuild — một bầy con trỏ chuột:
 *  1) build(): bay vào, kéo khung chọn và "dựng" từng phần giao diện; chỉ vào bản đồ để bản đồ hiện ra
 *  2) showNodes(): bay tới các khu vực tìm được, gắn nhãn (node) và nối về vị trí của bạn
 *  3) lúc rảnh: bám theo chuột; chuột đứng yên → xếp thành vòng tròn quanh chuột
 *     điện thoại: không chạm một lúc → vòng tròn giữa màn hình; kéo ngón tay → vòng tròn đi theo
 */
(function () {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const COLORS = ['#1a73e8', '#ea4335', '#f9ab00', '#34a853', '#a142f4', '#e52592', '#12b5cb', '#fa7b17', '#5c6bc0', '#00a389'];
  const SIZE = 22;                                  // px, kích thước mũi tên
  const TIP_X = (3 * SIZE) / 24, TIP_Y = (2 * SIZE) / 24;
  const NATURAL = Math.atan2(-12, -7);              // hướng mũi tên đang chỉ (lên-trái)
  const ARROW = 'M3 2v17.2l4.4-4.2 3 6.6 3.1-1.3-2.9-6.4h6.2z';
  const MOUSE_IDLE = 1200;                          // ms chuột đứng yên → vòng tròn
  const TOUCH_IDLE = 2200;                          // ms không chạm → về giữa màn hình

  const now = () => performance.now();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const angDiff = (a, b) => {
    let d = (b - a) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return d;
  };

  class Swarm {
    constructor(root, opt) {
      this.root = root;
      this.opt = opt || {};
      this.coarse = matchMedia('(hover: none), (pointer: coarse)').matches;
      this.touch = this.coarse;
      this.n = this.opt.count || (this.coarse ? 7 : 10);
      this.enabled = this.opt.enabled !== false;
      this.cursors = [];
      this.p = { x: innerWidth / 2, y: innerHeight / 2, t: -1e9, down: false, seen: false };
      this.phase = 0;
      this.nodes = null;

      this.lines = document.createElementNS(NS, 'svg');
      this.lines.setAttribute('class', 'sw-lines');
      root.appendChild(this.lines);
      for (let i = 0; i < this.n; i++) this._spawn(i);

      this._bind();
      this.last = now();
      this._loop = this._loop.bind(this);
      requestAnimationFrame(this._loop);
      this.setEnabled(this.enabled);
    }

    /* ── khởi tạo ─────────────────────────────────────── */
    _spawn(i) {
      const el = document.createElement('div');
      el.className = 'sw-cur';
      const color = COLORS[i % COLORS.length];
      el.style.setProperty('--c', color);
      el.innerHTML =
        '<svg class="sw-arrow" viewBox="0 0 24 24" width="' + SIZE + '" height="' + SIZE + '"><path d="' + ARROW + '"/></svg>' +
        '<span class="sw-tag"></span>';
      this.root.appendChild(el);
      const a = (i / this.n) * Math.PI * 2 + Math.random() * 0.5;
      const R = Math.hypot(innerWidth, innerHeight) * 0.62;
      this.cursors.push({
        el, i, color,
        tag: el.querySelector('.sw-tag'),
        x: innerWidth / 2 + Math.cos(a) * R,
        y: innerHeight / 2 + Math.sin(a) * R,
        vx: 0, vy: 0, rot: 0,
        k: 45 + Math.random() * 80,                                   // độ "dính" khác nhau → bầy kéo thành dải
        off: { a: Math.random() * Math.PI * 2, r: 16 + Math.random() * 30, s: 0.4 + Math.random() * 0.9 },
        task: null,
      });
    }

    _bind() {
      const upd = (e) => {
        this.touch = e.pointerType === 'touch';
        this.p.x = e.clientX;
        this.p.y = e.clientY;
        this.p.t = now();
        this.p.seen = true;
      };
      const opts = { passive: true, capture: true };
      addEventListener('pointermove', (e) => { upd(e); this._maybeRelease('move'); }, opts);
      addEventListener('pointerdown', (e) => { upd(e); this.p.down = true; this._maybeRelease('down'); }, opts);
      const up = () => { this.p.down = false; this.p.t = now(); };
      addEventListener('pointerup', up, opts);
      addEventListener('pointercancel', up, opts);
    }

    _center() {
      return this.opt.center ? this.opt.center() : { x: innerWidth / 2, y: innerHeight / 2 };
    }

    /* ── API ──────────────────────────────────────────── */
    setEnabled(on) {
      this.enabled = !!on;
      this.root.classList.toggle('is-off', !this.enabled);
      if (!this.enabled) {
        this.releaseNodes(true);
        for (const c of this.cursors) {
          const k = c.task;
          c.task = null;
          if (k && k.box) k.box.remove();
          if (k && k._finish) k._finish();
        }
      }
    }

    setDim(on) { this.root.classList.toggle('is-dim', !!on); }

    /** waves: [[task, task], [task…]] — mỗi đợt chạy song song, đợt sau chờ đợt trước.
     *  task: { type:'box', el, label, clipEl?, onDone } | { type:'point', x, y, hold, onArrive, onDone } */
    async build(waves) {
      for (const wave of waves) {
        await Promise.all(wave.map((task, j) => this._runTask(task, j)));
      }
    }

    _runTask(task, j) {
      return new Promise((resolve) => {
        task._finish = () => {
          if (task._fin) return;
          task._fin = true;
          try { if (!task._arrived && task.onArrive) task.onArrive(); } catch (e) { /* bỏ qua */ }
          try { if (task.onDone) task.onDone(); } catch (e) { /* bỏ qua */ }
          resolve();
        };
        if (!this.enabled) return task._finish();
        setTimeout(() => {
          if (!this.enabled) return task._finish();
          if (task.type === 'box') {
            let r = task.el.getBoundingClientRect();
            let top = r.top, bottom = r.bottom;
            if (task.clipEl) {
              const cr = task.clipEl.getBoundingClientRect();
              top = Math.max(top, cr.top);
              bottom = Math.min(bottom, cr.bottom);
            }
            top = Math.max(top, 0);
            bottom = Math.min(bottom, innerHeight);
            if (r.width < 4 || bottom - top < 4 || r.right < 0 || r.left > innerWidth) return task._finish();
            task.a = { x: r.left + 1, y: top + 1 };
            task.b = { x: r.right - 1, y: bottom - 1 };
            task.dur = clamp(240 + (task.b.x - task.a.x + task.b.y - task.a.y) * 0.3, 320, 700);
          }
          const goal = task.type === 'box' ? task.a : { x: task.x, y: task.y };
          const c = this._pick(goal);
          if (!c) return task._finish();
          task.state = 'go';
          task.t0 = now();
          task.c = c;
          c.task = task;
        }, (task.delay || 0) + j * 120);
      });
    }

    _pick(goal) {
      let best = null, bd = Infinity;
      for (const c of this.cursors) {
        if (c.task) continue;
        const d = Math.hypot(c.x - goal.x, c.y - goal.y);
        if (d < bd) { bd = d; best = c; }
      }
      return best;
    }

    /** items: [{ label, getXY:()=>({x,y}), onArrive }]; opts: { origin:()=>({x,y}), hold } */
    showNodes(items, opts) {
      opts = opts || {};
      this.releaseNodes(true);
      const list = items.slice(0, this.n);
      if (!this.enabled || !list.length) {
        list.forEach((it, i) => setTimeout(() => it.onArrive && it.onArrive(), i * 50));
        return;
      }
      const t = now();
      const N = { tasks: [], origin: opts.origin, hold: opts.hold || 3800, arrived: 0, lastArrive: t, p0: { x: this.p.x, y: this.p.y } };
      this.nodes = N;
      list.forEach((it, i) => {
        const g = it.getXY();
        const c = this._pick(g);
        if (!c) { if (it.onArrive) it.onArrive(); return; }
        const line = document.createElementNS(NS, 'line');
        line.setAttribute('stroke', c.color);
        line.style.visibility = 'hidden';
        this.lines.appendChild(line);
        const k = { type: 'node', getXY: it.getXY, onArrive: it.onArrive, state: 'go', t0: t, startAt: t + i * 90, c, line };
        c.task = k;
        c.tag.textContent = it.label;
        N.tasks.push(k);
      });
    }

    releaseNodes(immediate) {
      const N = this.nodes;
      if (!N) return;
      this.nodes = null;
      for (const k of N.tasks) {
        if (k.state === 'go' && k.onArrive) { try { k.onArrive(); } catch (e) { /* bỏ qua */ } }
        if (k.c.task === k) k.c.task = null;
        k.c.el.classList.remove('has-tag');
        const ln = k.line;
        ln.classList.add('is-out');
        setTimeout(() => ln.remove(), immediate ? 0 : 450);
      }
    }

    _maybeRelease(kind) {
      const N = this.nodes;
      if (!N || !N.arrived) return;
      if (now() - N.lastArrive < 1500) return;      // để người dùng kịp nhìn các node
      if (kind === 'down' || Math.hypot(this.p.x - N.p0.x, this.p.y - N.p0.y) > 90) this.releaseNodes();
    }

    /* ── mục tiêu từng frame ──────────────────────────── */
    _ambient(c, t) {
      const P = this.p;
      let C, ring;
      if (this.touch) {
        const active = P.seen && (P.down || t - P.t < TOUCH_IDLE);
        C = active ? { x: P.x, y: P.y } : this._center();
        ring = true;
      } else if (!P.seen) {
        C = this._center();
        ring = true;
      } else {
        C = { x: P.x, y: P.y };
        ring = t - P.t > MOUSE_IDLE;
      }
      if (ring) {
        const ang = this.phase + (c.i * Math.PI * 2) / this.n;
        const r = (this.touch ? 62 : 46) + Math.sin(this.phase * 2.2 + c.i) * 3;
        const x = C.x + Math.cos(ang) * r;
        const y = C.y + Math.sin(ang) * r;
        return { x, y, rot: Math.atan2(C.y - y, C.x - x) - NATURAL, k: 70, z: 0.8 };
      }
      const a = c.off.a + t * 0.0011 * c.off.s;
      return { x: C.x + 12 + Math.cos(a) * c.off.r, y: C.y + 16 + Math.sin(a) * c.off.r * 0.8, rot: 0, k: c.k, z: 0.74 };
    }

    _taskGoal(c, t) {
      const k = c.task;
      if (k.type === 'box') {
        if (k.state === 'go') return { x: k.a.x, y: k.a.y, rot: 0, k: 170, z: 0.82 };
        if (k.state === 'drag') {
          const p = easeInOut(clamp((t - k.t1) / k.dur, 0, 1));
          return { x: lerp(k.a.x, k.b.x, p), y: lerp(k.a.y, k.b.y, p), rot: 0, k: 900, z: 1 };
        }
        return { x: k.b.x, y: k.b.y, rot: 0, k: 300, z: 1 };
      }
      if (k.type === 'point') return { x: k.x, y: k.y, rot: 0, k: 150, z: 0.8 };
      if (k.type === 'node') {
        if (t < k.startAt) return null;
        const p = k.getXY();
        return { x: p.x, y: p.y, rot: 0, k: 140, z: 0.8 };
      }
      return null;
    }

    _taskStep(c, t) {
      const k = c.task;
      const near = (x, y, r) => Math.hypot(c.x - x, c.y - y) < r && Math.hypot(c.vx, c.vy) < 280;
      if (k.type === 'box') {
        if (k.state === 'go' && (near(k.a.x, k.a.y, 6) || t - k.t0 > 2400)) {
          k.state = 'drag';
          k.t1 = t;
          this._ripple(c, 0.6);
          k.box = this._makeBox(c.color, k.label, k.a);
        } else if (k.state === 'drag') {
          k.box.style.width = Math.max(0, c.x - k.a.x) + 'px';
          k.box.style.height = Math.max(0, c.y - k.a.y) + 'px';
          if (t - k.t1 > k.dur + 90) {
            k.state = 'done';
            k.box.style.width = k.b.x - k.a.x + 'px';
            k.box.style.height = k.b.y - k.a.y + 'px';
            this._ripple(c);
            k._finish();
            const box = k.box;
            box.classList.add('is-done');
            setTimeout(() => box.remove(), 600);
            setTimeout(() => { if (c.task === k) c.task = null; }, 140);
          }
        }
      } else if (k.type === 'point') {
        if (k.state === 'go' && (near(k.x, k.y, 8) || t - k.t0 > 2400)) {
          k.state = 'hold';
          k.t1 = t;
          k._arrived = true;
          this._ripple(c);
          if (k.onArrive) k.onArrive();
        } else if (k.state === 'hold' && t - k.t1 > (k.hold || 300)) {
          k.state = 'done';
          c.task = null;
          k._finish();
        }
      } else if (k.type === 'node' && k.state === 'go' && t >= k.startAt) {
        const p = k.getXY();
        if (near(p.x, p.y, 10) || t - k.startAt > 2000) {
          k.state = 'hold';
          this._ripple(c);
          c.el.classList.add('has-tag');
          if (k.onArrive) k.onArrive();
          if (this.nodes) { this.nodes.arrived++; this.nodes.lastArrive = t; }
        }
      }
    }

    _drawLines(t) {
      const N = this.nodes;
      if (!N) return;
      const o = N.origin ? N.origin() : null;
      for (const k of N.tasks) {
        if (!o || t < k.startAt) continue;
        const ln = k.line;
        ln.style.visibility = '';
        ln.setAttribute('x1', o.x.toFixed(1));
        ln.setAttribute('y1', o.y.toFixed(1));
        ln.setAttribute('x2', k.c.x.toFixed(1));
        ln.setAttribute('y2', k.c.y.toFixed(1));
      }
      if (N.tasks.length && N.arrived >= N.tasks.length && t - N.lastArrive > N.hold) this.releaseNodes();
    }

    /* ── hiệu ứng phụ ─────────────────────────────────── */
    _ripple(c, s) {
      const r = document.createElement('span');
      r.className = 'sw-ripple';
      r.style.setProperty('--c', c.color);
      r.style.left = c.x + 'px';
      r.style.top = c.y + 'px';
      if (s) r.style.setProperty('--s', s);
      this.root.appendChild(r);
      setTimeout(() => r.remove(), 650);
      c.el.classList.remove('is-click');
      void c.el.offsetWidth;
      c.el.classList.add('is-click');
    }

    _makeBox(color, label, a) {
      const b = document.createElement('div');
      b.className = 'sw-box';
      b.style.setProperty('--c', color);
      b.style.left = a.x + 'px';
      b.style.top = a.y + 'px';
      const lb = document.createElement('span');
      lb.className = 'sw-box-label';
      lb.textContent = label || '';
      b.appendChild(lb);
      for (let i = 0; i < 4; i++) b.appendChild(document.createElement('i'));
      this.root.appendChild(b);
      return b;
    }

    /* ── vòng lặp vật lý (lò xo) ──────────────────────── */
    _loop() {
      requestAnimationFrame(this._loop);
      const t = now();
      const dt = Math.min(0.034, (t - this.last) / 1000);
      this.last = t;
      if (!this.enabled) return;
      this.phase += dt * 0.85;
      for (const c of this.cursors) {
        let g = c.task ? this._taskGoal(c, t) : null;
        if (!g) g = this._ambient(c, t);
        const damp = 2 * Math.sqrt(g.k) * g.z;
        const h = dt / 3;
        for (let s = 0; s < 3; s++) {
          c.vx += ((g.x - c.x) * g.k - c.vx * damp) * h;
          c.vy += ((g.y - c.y) * g.k - c.vy * damp) * h;
          c.x += c.vx * h;
          c.y += c.vy * h;
        }
        c.rot += angDiff(c.rot, g.rot) * Math.min(1, dt * 9);
        c.el.style.transform =
          'translate3d(' + (c.x - TIP_X).toFixed(1) + 'px,' + (c.y - TIP_Y).toFixed(1) + 'px,0) rotate(' + c.rot.toFixed(3) + 'rad)';
        if (c.task) this._taskStep(c, t);
      }
      this._drawLines(t);
    }
  }

  window.Swarm = Swarm;
})();
