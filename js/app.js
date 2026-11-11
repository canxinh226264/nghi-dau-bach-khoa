/* Nghỉ đâu Bách Khoa — logic chính.
 * Quy tắc: thời gian nghỉ >= 1/2 thời gian rảnh  ⇔  (đi + về) <= 1/2 thời gian rảnh.
 * Thời gian đi bộ ước tính = khoảng cách đường chim bay × hệ số đường vòng ÷ tốc độ đi bộ.
 * Rảnh < 10 phút: chỉ gợi ý mua nước gần nhất hoặc nghỉ ngay tại chỗ.
 */
(function () {
  'use strict';

  const D = window.HUST_DATA;
  const svg = window.ICONS.svg;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const mqMobile = matchMedia('(max-width: 760px)');
  const isMobile = () => mqMobile.matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ── tiện ích ──────────────────────────────────────── */
  const store = {
    get(k, d) { try { const v = localStorage.getItem('nghidau:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('nghidau:' + k, JSON.stringify(v)); } catch (e) { /* bỏ qua */ } },
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();
  function distM(a, b) {
    const R = 6371000, rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
  }
  const walkMin = (m) => (m < 40 ? 0 : Math.max(1, Math.ceil((m * D.walk.detour) / D.walk.speed)));
  const fmtDist = (m) => (m < 1000 ? Math.max(10, Math.round(m / 10) * 10) + ' m' : (m / 1000).toFixed(1).replace('.', ',') + ' km');
  const fmtMin = (x) => (Number.isInteger(x) ? String(x) : x.toFixed(1).replace('.', ','));
  const fmtClock = (d) => String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  const addMin = (d, m) => new Date(d.getTime() + m * 60000);

  const needById = Object.fromEntries(D.needs.map((n) => [n.id, n]));
  const placeById = new Map(D.places.map((p) => [p.id, p]));
  const dormById = new Map(D.dorms.map((d) => [d.id, d]));
  const kindOf = (p) => D.kinds[p.kind] || D.kinds.hall;

  /* ── trạng thái ────────────────────────────────────── */
  const state = {
    T: clamp(Number(store.get('T', 30)) || 30, 1, 240),
    needs: new Set((store.get('needs', []) || []).filter((n) => needById[n])),
    originId: store.get('origin', 'D3'),
    custom: null,
    inKtx: !!store.get('ktx', false),
    ktxId: store.get('ktxId', 'KTX-B6'),
    q: '',
    selected: null,
    results: [],
    needCounts: {},
    short: false,
    route: null,
  };
  if (!placeById.has(state.originId) && !dormById.has(state.originId)) state.originId = 'D3';
  if (!dormById.has(state.ktxId)) state.ktxId = 'KTX-B6';

  /* ── DOM ───────────────────────────────────────────── */
  const els = {
    map: $('#map'), panel: $('#panel'), grip: $('#grip'), head: $('#head'), brandSub: $('#brandSub'),
    scroll: $('#scroll'), viewSearch: $('#viewSearch'), viewDetail: $('#viewDetail'),
    fTime: $('#fTime'), fNeeds: $('#fNeeds'), fWhere: $('#fWhere'), fResults: $('#fResults'),
    tInput: $('#tInput'), tRange: $('#tRange'), tMinus: $('#tMinus'), tPlus: $('#tPlus'), tChips: $('#tChips'), ruleNote: $('#ruleNote'),
    needs: $('#needs'), needsClear: $('#needsClear'),
    where: $('#where'), btnPick: $('#btnPick'), ktx: $('#ktx'), ktxWrap: $('#ktxWrap'), ktxSel: $('#ktxSel'),
    resTitle: $('#resTitle'), resSub: $('#resSub'), q: $('#q'), advice: $('#advice'), list: $('#list'),
    mapCtrl: $('#mapCtrl'), zIn: $('#zIn'), zOut: $('#zOut'), cHome: $('#cHome'), cMe: $('#cMe'), cSwarm: $('#cSwarm'),
    btnMin: $('#btnMin'), fab: $('#fab'), fabCount: $('#fabCount'),
    routeChip: $('#routeChip'), routeChipMain: $('#routeChipMain'), routeChipX: $('#routeChipX'),
    pickBanner: $('#pickBanner'), pickCancel: $('#pickCancel'), toast: $('#toast'), swarm: $('#swarm'),
  };

  $$('[data-icon]').forEach((el) => { el.innerHTML = svg(el.dataset.icon); });

  /* ── Swarm ─────────────────────────────────────────── */
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const swarm = new window.Swarm(els.swarm, {
    enabled: store.get('swarm', !reduceMotion),
    center: () => visibleCenter(),
    hidden: '.is-min, .is-unbuilt',     // phần tử nằm trong vùng đang ẩn thì không dựng lại
  });
  els.cSwarm.classList.toggle('is-on', swarm.enabled);
  els.cSwarm.setAttribute('aria-pressed', String(swarm.enabled));

  /* ── Bản đồ ────────────────────────────────────────── */
  const map = L.map(els.map, { zoomControl: false, minZoom: 14, maxZoom: 19, zoomSnap: 0.5, attributionControl: true });
  map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
  map.setView([D.center.lat, D.center.lng], 17);
  map.createPane('routePane').style.zIndex = 450;

  // Nền bản đồ OpenStreetMap (chế độ tối: đảo màu bằng CSS, xem .leaflet-tile-pane trong style.css)
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
  }).addTo(map);

  const markersLayer = L.layerGroup().addTo(map);
  const routeLayer = L.layerGroup().addTo(map);
  const markers = new Map();
  let originMarker = null, radiusCircle = null, reachCircle = null;

  /* ── hình học màn hình ─────────────────────────────── */
  let panelMin = false;
  const sheet = { state: 'peek', peekH: 260 };

  function sheetHeights() {
    const vh = innerHeight;
    return { peek: clamp(sheet.peekH, 150, Math.round(vh * 0.5)), half: Math.round(vh * 0.56), full: vh - 56 };
  }
  function sheetH() {
    if (!isMobile() || panelMin) return 0;
    return sheetHeights()[sheet.state];
  }
  function insets() {
    if (isMobile()) return { l: 0, t: 0, r: 0, b: sheetH() };
    const r = panelMin ? 0 : els.panel.getBoundingClientRect().right;
    return { l: r, t: 0, r: 64, b: 0 };
  }
  function visibleCenter() {
    const i = insets();
    return { x: (i.l + innerWidth - i.r) / 2, y: (i.t + innerHeight - i.b) / 2 };
  }
  function toScreen(p) {
    const pt = map.latLngToContainerPoint([p.lat, p.lng]);
    return { x: pt.x, y: pt.y };
  }
  function isInView(ll) {
    const p = map.latLngToContainerPoint(ll), i = insets(), s = map.getSize();
    return p.x > i.l + 28 && p.x < s.x - i.r - 28 && p.y > i.t + 28 && p.y < s.y - i.b - 28;
  }
  function panToVisible(ll, zoom, animate) {
    const z = zoom == null ? map.getZoom() : zoom;
    const i = insets(), size = map.getSize();
    const vc = L.point((i.l + size.x - i.r) / 2, (i.t + size.y - i.b) / 2);
    const target = map.project(L.latLng(ll), z);
    const center = map.unproject(target.add(L.point(size.x / 2, size.y / 2).subtract(vc)), z);
    if (animate === false) map.setView(center, z, { animate: false });
    else map.flyTo(center, z, { duration: 0.6 });
  }
  function fitVisible(bounds, maxZoom) {
    const i = insets();
    map.flyToBounds(bounds, {
      paddingTopLeft: [i.l + 40, i.t + (isMobile() ? 70 : 60)],
      paddingBottomRight: [i.r + 40, i.b + 40],
      maxZoom: maxZoom || 18, duration: 0.7,
    });
  }

  /* ── Swarm rebuild: thao tác nào đổi trạng thái thì bầy con trỏ "dựng lại" phần đó ──
   * Phần bị đổi biến mất hẳn rồi được dựng lại như lúc mở trang, theo đúng các mục có data-build
   * (Tiêu đề, Thời gian rảnh, Nhu cầu, Vị trí, Kết quả, Điều khiển). */
  function labelOf(el) {
    const b = el.querySelector('b');
    const s = el.dataset.build || el.getAttribute('aria-label') || el.title || (b && b.textContent) || el.textContent;
    return String(s || '').replace(/\s+/g, ' ').trim().slice(0, 28);
  }
  /** mục (data-build) chứa phần tử; ngoài các mục đó thì là chính phần tử */
  const section = (el) => (el && el.closest('[data-build]')) || el;
  /** mục tiêu: một phần tử giao diện */
  function rbEl(el, label, o) {
    if (!el) return null;
    return Object.assign({ el, label: label || labelOf(el), delay: 60 }, o);
  }
  /** mục tiêu: vùng bản đồ đang nhìn thấy (không bị bảng/điều khiển che) */
  function rbMap(label) {
    return {
      key: 'map', label: label || 'Bản đồ', veil: 0.45, tone: 'var(--bg)', delay: 60,
      rect: () => {
        const i = insets(), m = 20;
        return { left: i.l + m, top: i.t + m, right: innerWidth - i.r - m, bottom: innerHeight - i.b - m };
      },
    };
  }
  const clip = (t) => { if (t && t.el && !t.clipEl && els.scroll.contains(t.el)) t.clipEl = els.scroll; return t; };
  function rb() {
    if (!swarm.enabled) return;
    swarm.rebuild(Array.prototype.filter.call(arguments, Boolean).map(clip));
  }
  /** dựng theo đợt — đợt sau chờ đợt trước */
  function rbWaves(waves) {
    if (!swarm.enabled) return;
    swarm.rebuildWaves(waves.map((w) => w.filter(Boolean).map(clip)));
  }
  /** cả bảng thay đổi: dựng khung bảng trước rồi tới từng mục, y như lúc mở trang */
  function rbPanelWaves() {
    const kids = state.selected
      ? [els.head, els.viewDetail]
      : [els.head, els.fTime, els.fNeeds, els.fWhere, els.fResults];
    return [
      [rbEl(els.panel, 'Bảng tìm kiếm', { delay: 0 })],
      kids.map((el) => rbEl(el, el === els.viewDetail ? 'Chi tiết' : null, { delay: 220 })),
    ];
  }
  /** các mục bị đổi theo từng loại thay đổi trạng thái.
   *  live: đang kéo thanh thời gian / gõ số phút → chưa dựng lại mục Thời gian (để không mất thứ đang thao tác) */
  function rbFor(reason, live) {
    const res = rbEl(els.fResults);
    if (reason === 'time') rb(live ? null : rbEl(els.fTime), res);
    else if (reason === 'needs') rb(rbEl(els.fNeeds), res);
    else if (reason === 'origin') rb(rbEl(els.fWhere), res, rbMap('Vị trí của bạn'));
    else if (reason === 'ktx') rb(rbEl(els.fWhere), res);
    else if (reason === 'filter') rb(rbEl(els.list, 'Kết quả'));     // không làm mất ô tìm kiếm khi đang gõ
  }

  /* ── vị trí hiện tại & KTX ─────────────────────────── */
  function getOrigin() {
    if (state.originId === 'custom' && state.custom) {
      return { id: 'custom', name: state.custom.label, short: state.custom.short, lat: state.custom.lat, lng: state.custom.lng, isCustom: true };
    }
    const p = placeById.get(state.originId) || dormById.get(state.originId) || placeById.get('D3');
    return { id: p.id, name: p.name, short: p.short || p.name, lat: p.lat, lng: p.lng };
  }

  function myDormPlace() {
    const d = dormById.get(state.ktxId) || D.dorms[0];
    return {
      id: 'my-dorm', kind: 'dorm', name: 'Phòng KTX ' + d.code + ' của bạn', short: 'Phòng ' + d.code,
      lat: d.lat, lng: d.lng, needs: ['quiet', 'work'], area: 'campus',
      desc: 'Về phòng ở ' + d.name + ' để nghỉ trưa, chợp mắt, cất đồ hoặc thay đồ. Thời gian đã tính cả đi về tòa ' + d.code + ' và quay lại.',
      tip: 'Nếu ngủ trưa, hãy đặt báo thức sớm hơn giờ phải rời phòng vài phút.',
    };
  }

  function herePlace(o) {
    return {
      id: '__here', kind: 'here',
      name: o.isCustom ? 'Nghỉ ngay tại chỗ' : 'Nghỉ ngay tại ' + o.name,
      short: 'Tại chỗ', lat: o.lat, lng: o.lng, needs: ['quiet'],
      desc: o.isCustom
        ? 'Thời gian quá ngắn để đi đâu xa. Tìm một chỗ ngồi gần nhất, uống nước, nhắm mắt thư giãn vài phút.'
        : 'Thời gian quá ngắn để đi đâu xa. Ngồi lại ở sảnh, hành lang hoặc phòng học trống của ' + o.name + ', uống nước và thả lỏng vài phút.',
      tip: 'Đứng dậy vươn vai, nhìn ra xa 20 giây để mắt đỡ mỏi.',
    };
  }

  /* ── tính kết quả ──────────────────────────────────── */
  function compute() {
    const o = getOrigin();
    const T = state.T;
    const short = T < D.shortBreak;
    const pool = D.places.concat(state.inKtx ? [myDormPlace()] : []);
    const q = norm(state.q.trim());
    const counts = Object.fromEntries(D.needs.map((n) => [n.id, 0]));
    const rows = [];

    for (const p of pool) {
      const m = distM(o, p);
      if (m > D.radius) continue;                          // giới hạn 2 km
      const walk = walkMin(m);
      const rest = T - 2 * walk;
      const minRest = p.minRest != null ? p.minRest : kindOf(p).minRest;
      if (2 * walk > T / 2 || rest < minRest) continue;      // nghỉ phải >= 1/2 thời gian rảnh
      if (short && !(p.needs.includes('drink') && ['vending', 'store', 'tea', 'cafe'].includes(p.kind))) continue;
      if (!short) for (const n of p.needs) counts[n]++;
      const match = state.needs.size ? p.needs.filter((n) => state.needs.has(n)).length : 0;
      if (!short && state.needs.size && !match) continue;
      if (q && !norm(p.name + ' ' + (p.short || '') + ' ' + kindOf(p).label).includes(q)) continue;
      rows.push({ p, m, walk, rest, match });
    }

    if (short) {
      rows.sort((a, b) => a.m - b.m);
      rows.splice(3);
      rows.unshift({ p: herePlace(o), m: 0, walk: 0, rest: T, match: 0 });
    } else {
      rows.sort((a, b) => b.match - a.match || a.walk - b.walk || a.m - b.m);
    }
    state.short = short;
    state.results = rows;
    state.needCounts = counts;
  }

  function rowFor(id) {
    const r = state.results.find((x) => x.p.id === id);
    if (r) return Object.assign({ fits: true }, r);
    const p = id === 'my-dorm' ? myDormPlace() : placeById.get(id);
    if (!p) return null;
    const m = distM(getOrigin(), p), walk = walkMin(m);
    return { p, m, walk, rest: state.T - 2 * walk, match: 0, fits: false };
  }

  /* ── render: thời gian, nhu cầu ────────────────────── */
  const TIME_CHIPS = [5, 10, 15, 20, 30, 45, 60, 90, 120];
  els.tChips.innerHTML = TIME_CHIPS.map((t) => '<button type="button" class="chip" data-t="' + t + '">' + t + '\'</button>').join('');

  els.needs.innerHTML = D.needs.map((n) =>
    '<button type="button" class="need" data-need="' + n.id + '" style="--c:' + n.color + '" aria-pressed="false">' +
      '<span class="ic">' + svg(n.icon) + '</span>' +
      '<span class="need-txt"><b>' + esc(n.label) + '</b><small>' + esc(n.hint) + '</small></span>' +
      '<span class="cnt"></span>' +
    '</button>').join('');

  function renderTime() {
    const T = state.T;
    if (document.activeElement !== els.tInput) els.tInput.value = T;
    els.tRange.value = Math.min(T, 180);
    els.tRange.style.setProperty('--p', ((Math.min(T, 180) - 1) / 179) * 100 + '%');
    $$('.chip', els.tChips).forEach((c) => c.classList.toggle('is-on', Number(c.dataset.t) === T));
    if (state.short) {
      els.ruleNote.textContent = '< ' + D.shortBreak + '\' · mua nước / nghỉ tại chỗ';
      els.ruleNote.classList.add('is-warn');
    } else {
      const half = fmtMin(T / 2);
      els.ruleNote.textContent = 'đi + về ≤ ' + half + '\' · nghỉ ≥ ' + half + '\'';
      els.ruleNote.classList.remove('is-warn');
    }
  }

  function renderNeeds() {
    $$('.need', els.needs).forEach((b) => {
      const id = b.dataset.need, on = state.needs.has(id);
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', String(on));
      b.querySelector('.cnt').textContent = state.short ? '–' : state.needCounts[id] || 0;
      b.disabled = state.short;
      b.style.opacity = state.short ? '.5' : '';
    });
    els.needsClear.hidden = !state.needs.size || state.short;
  }

  /* ── render: danh sách ─────────────────────────────── */
  function cardHTML(r) {
    const p = r.p, k = kindOf(p);
    const shown = state.needs.size && !state.short ? p.needs.filter((n) => state.needs.has(n)) : p.needs;
    const tags = shown.map((n) => '<span class="tg" style="--c:' + needById[n].color + '">' + esc(needById[n].label) + '</span>').join('');
    const walkTxt = r.walk === 0 ? 'tại chỗ' : r.walk + '\' / chiều';
    const active = p.id === state.selected ? ' is-active' : '';
    return '<li><button type="button" class="card' + active + '" data-id="' + esc(p.id) + '" style="--c:' + k.color + '">' +
      '<span class="pin">' + svg(k.icon) + '</span>' +
      '<span class="card-main">' +
        '<span class="card-title">' + esc(p.name) + '</span>' +
        '<span class="card-sub">' + esc(k.label) + (r.m ? ' · ' + fmtDist(r.m) : '') + '</span>' +
        '<span class="tgs">' + tags + '</span>' +
      '</span>' +
      '<span class="card-time"><b>' + r.rest + '\'</b><small>nghỉ</small><em>' + svg('walk') + walkTxt + '</em></span>' +
    '</button></li>';
  }

  function renderList() {
    const rows = state.results, n = rows.length, o = getOrigin();
    if (state.short) {
      const drinks = rows.length - 1;
      els.resTitle.textContent = 'Gợi ý cho ' + state.T + ' phút';
      els.resSub.textContent = 'từ ' + o.short;
      els.advice.innerHTML =
        '<div class="advice"><i>' + svg('warn') + '</i><div>' +
          '<b>Chỉ có ' + state.T + ' phút — đừng đi xa</b>' +
          '<p>' + (drinks
            ? 'Nên mua nước ở điểm gần nhất rồi quay lại, hoặc nghỉ ngay tại ' + esc(o.short) + '.'
            : 'Không có điểm mua nước nào đủ gần để đi và về kịp. Nghỉ ngay tại ' + esc(o.short) + ' là hợp lý nhất.') +
          '</p></div></div>';
    } else {
      els.advice.innerHTML = '';
      els.resTitle.textContent = n ? n + ' nơi phù hợp' : 'Chưa có nơi phù hợp';
      els.resSub.textContent = 'từ ' + o.short + ' · ≤ 2 km';
    }

    if (!n) {
      const next = TIME_CHIPS.find((t) => t > state.T);
      els.list.innerHTML =
        '<li class="empty">' + svg('search') +
          '<div>' + (state.q ? 'Không có kết quả khớp “' + esc(state.q) + '”.' :
            'Với ' + state.T + ' phút rảnh, không có nơi nào vừa nhu cầu vừa đảm bảo nghỉ ≥ ½ thời gian.') + '</div>' +
          '<div class="empty-actions">' +
            (state.q ? '<button type="button" class="btn btn-ghost btn-sm" data-act="clear-q">Xóa từ khóa</button>' : '') +
            (state.needs.size ? '<button type="button" class="btn btn-ghost btn-sm" data-act="clear-needs">Bỏ lọc nhu cầu</button>' : '') +
            (next ? '<button type="button" class="btn btn-ghost btn-sm" data-act="time" data-t="' + next + '">Thử ' + next + ' phút</button>' : '') +
          '</div>' +
        '</li>';
    } else {
      els.list.innerHTML = rows.map(cardHTML).join('');
    }

    els.brandSub.textContent = state.short
      ? 'Rảnh ' + state.T + '\' · mua nước hoặc nghỉ tại chỗ'
      : n + ' nơi nghỉ phù hợp · bán kính 2 km';
    els.fabCount.textContent = n;
  }

  /* ── render: bản đồ ────────────────────────────────── */
  function markerIcon(p, hidden) {
    const k = kindOf(p);
    return L.divIcon({
      className: 'mk-wrap',
      html: '<div class="mk' + (hidden ? ' is-hidden' : '') + '" style="--c:' + k.color + '">' + svg(k.icon) + '</div>',
      iconSize: [30, 30], iconAnchor: [15, 15], tooltipAnchor: [0, -14],
    });
  }
  const mkEl = (id) => { const m = markers.get(id); const el = m && m.getElement(); return el ? el.querySelector('.mk') : null; };

  function renderMarkers(animate) {
    const want = new Map(state.results.map((r) => [r.p.id, r]));
    for (const [id, mk] of markers) {
      if (!want.has(id)) { markersLayer.removeLayer(mk); markers.delete(id); }
    }
    const hide = animate && swarm.enabled;
    for (const r of state.results) {
      let mk = markers.get(r.p.id);
      if (!mk) {
        mk = L.marker([r.p.lat, r.p.lng], { icon: markerIcon(r.p, hide), riseOnHover: true, keyboard: true, alt: r.p.name });
        mk.bindTooltip(esc(r.p.short || r.p.name), { direction: 'top', className: 'mk-tip' });
        const id = r.p.id;
        mk.on('click', () => openDetail(id));
        markersLayer.addLayer(mk);
        markers.set(id, mk);
      } else {
        mk.setLatLng([r.p.lat, r.p.lng]);
        mk.setTooltipContent(esc(r.p.short || r.p.name));
      }
    }
    updateMarkerActive();
  }

  function revealMarker(id) {
    const el = mkEl(id);
    if (!el || !el.classList.contains('is-hidden')) return;
    el.classList.remove('is-hidden');
    el.classList.add('is-pop');
    setTimeout(() => el.classList.remove('is-pop'), 600);
  }
  function revealAllMarkers(stagger) {
    let i = 0;
    for (const id of markers.keys()) {
      if (stagger) setTimeout(() => revealMarker(id), 30 * i++);
      else revealMarker(id);
    }
  }
  function updateMarkerActive() {
    for (const [id, mk] of markers) {
      const el = mkEl(id);
      if (el) el.classList.toggle('is-active', id === state.selected);
      mk.setZIndexOffset(id === state.selected ? 1000 : 0);
    }
  }

  function renderOrigin() {
    const o = getOrigin(), ll = [o.lat, o.lng];
    if (!originMarker) {
      originMarker = L.marker(ll, {
        icon: L.divIcon({ className: 'me-wrap', html: '<div class="me"></div>', iconSize: [20, 20], iconAnchor: [10, 10] }),
        zIndexOffset: 2000, keyboard: false, interactive: false,
      }).addTo(map);
      originMarker.bindTooltip('', { permanent: true, direction: 'right', offset: [12, 0], className: 'me-tip' });
      radiusCircle = L.circle(ll, { radius: D.radius, className: 'radius-2km', weight: 1.4, dashArray: '6 8', fill: false, interactive: false }).addTo(map);
      reachCircle = L.circle(ll, { radius: 50, className: 'reach', weight: 1, interactive: false }).addTo(map);
    }
    originMarker.setLatLng(ll);
    originMarker.setTooltipContent('Bạn ở đây · ' + esc(o.short));
    radiusCircle.setLatLng(ll);
    reachCircle.setLatLng(ll);
    // vùng đi tới được: số phút đi tối đa mỗi chiều = T/4
    const maxWalk = state.short ? Math.floor(state.T / 4) : Math.floor(state.T / 4);
    reachCircle.setRadius(Math.max(40, (maxWalk * D.walk.speed) / D.walk.detour));
  }

  /* ── render tổng ───────────────────────────────────── */
  function render(animateMarkers) {
    compute();
    renderTime();
    renderNeeds();
    renderList();
    renderOrigin();
    renderMarkers(animateMarkers);
    if (state.selected) {
      const r = rowFor(state.selected);
      if (r) renderDetail(r, true); else closeDetail();
    }
  }

  let persistT = 0;
  function persist() {
    clearTimeout(persistT);
    persistT = setTimeout(() => {
      store.set('T', state.T);
      store.set('needs', Array.from(state.needs));
      if (state.originId !== 'custom') store.set('origin', state.originId);
      store.set('ktx', state.inKtx);
      store.set('ktxId', state.ktxId);
    }, 300);
  }

  /** reason: 'time' | 'needs' | 'origin' | 'ktx' | 'filter'; live: đang kéo / gõ liên tục */
  function onChange(reason, live) {
    persist();
    if (reason === 'origin') clearRoute();
    const animate = reason !== 'filter';
    render(animate);
    rbFor(reason, live);
    if (animate) scheduleNodes();
    else revealAllMarkers(false);
  }

  /* ── Swarm nodes: con trỏ bay tới các khu vực tìm được ── */
  let nodesTimer = 0, nodesTok = 0, lastSig = '';
  function scheduleNodes(delay) {
    clearTimeout(nodesTimer);
    const tok = ++nodesTok;
    // dựng lại giao diện xong rồi bầy mới bay ra bản đồ
    nodesTimer = setTimeout(() => swarm.whenIdle(1800).then(() => { if (tok === nodesTok) runNodes(false); }), delay == null ? 650 : delay);
  }
  function nodeXY(p) {
    const s = toScreen(p);
    return { x: clamp(s.x + 8, 6, innerWidth - 6), y: clamp(s.y + 9, 6, innerHeight - 6) };
  }
  function runNodes(force) {
    const rows = state.results;
    const top = rows.slice(0, swarm.n);
    const o = getOrigin();
    const sig = state.T + '|' + o.lat + ',' + o.lng + '|' + top.map((r) => r.p.id).join(',');
    if (!force && sig === lastSig) { revealAllMarkers(false); return; }
    lastSig = sig;
    if (!swarm.enabled || !top.length) { revealAllMarkers(true); return; }

    if (isMobile() && !panelMin && !state.selected && sheet.state !== 'peek') setSheet('peek');

    const go = () => {
      // ẩn các node đích để con trỏ "đặt" chúng xuống bản đồ khi bay tới
      top.forEach((r) => { const el = mkEl(r.p.id); if (el) el.classList.add('is-hidden'); });
      swarm.showNodes(top.map((r) => ({
        label: (r.p.short || r.p.name) + ' · ' + (r.walk ? r.walk + '\' đi bộ' : 'tại chỗ'),
        getXY: () => nodeXY(r.p),
        onArrive: () => revealMarker(r.p.id),
      })), { origin: () => toScreen(o) });
      rows.slice(top.length).forEach((r, i) => setTimeout(() => revealMarker(r.p.id), 400 + i * 22));
    };
    const pts = top.map((r) => L.latLng(r.p.lat, r.p.lng)).concat([L.latLng(o.lat, o.lng)]);
    if (pts.every(isInView)) { go(); return; }
    let done = false;
    const fire = () => { if (done) return; done = true; setTimeout(go, 60); };
    map.once('moveend', fire);
    setTimeout(fire, 1300);
    fitVisible(L.latLngBounds(pts), 18);
  }

  /* ── Chi tiết khu vực ──────────────────────────────── */
  function detailHTML(r) {
    const p = r.p, k = kindOf(p), o = getOrigin(), T = state.T;
    const isHere = p.id === '__here';
    const now = new Date();
    const rest = T - 2 * r.walk;
    const fits = r.fits && rest >= T / 2;
    const tags = p.needs.map((n) =>
      '<span class="tag' + (state.needs.has(n) ? ' is-on' : '') + '" style="--c:' + needById[n].color + '">' + svg(needById[n].icon) + esc(needById[n].label) + '</span>').join('');
    const segW = (v) => 'flex:' + Math.max(v, 0.0001) + ' 1 0';
    const bar = isHere || r.walk === 0
      ? '<div class="timebar"><div class="seg seg-rest" style="flex:1"><b>' + T + '\'</b>nghỉ tại chỗ</div></div>'
      : '<div class="timebar">' +
          '<div class="seg seg-walk" style="' + segW(r.walk) + '"><b>' + r.walk + '\'</b>đi</div>' +
          '<div class="seg seg-rest' + (fits ? '' : ' is-bad') + '" style="' + segW(Math.max(rest, 0)) + '"><b>' + Math.max(rest, 0) + '\'</b>nghỉ</div>' +
          '<div class="seg seg-walk" style="' + segW(r.walk) + '"><b>' + r.walk + '\'</b>về</div>' +
        '</div>';
    const timeline = isHere || r.walk === 0 ? '' :
      '<dl class="timeline">' +
        '<dt>' + fmtClock(now) + '</dt><dd>Rời ' + esc(o.short) + '</dd>' +
        '<dt>' + fmtClock(addMin(now, r.walk)) + '</dt><dd>Tới ' + esc(p.short || p.name) + '</dd>' +
        '<dt>' + fmtClock(addMin(now, T - r.walk)) + '</dt><dd>Rời đi để kịp quay lại</dd>' +
        '<dt>' + fmtClock(addMin(now, T)) + '</dt><dd>Về lại ' + esc(o.short) + ' (hết ' + T + '\')</dd>' +
      '</dl>';
    const warn = fits ? '' :
      '<div class="note is-warn block"><i>' + svg('warn') + '</i><div>Với ' + T + ' phút rảnh, nơi này không đảm bảo nghỉ ≥ ½ thời gian (đi + về ' + 2 * r.walk + '\'' +
        (!r.fits && rest >= T / 2 ? ', hoặc không hợp với thời gian ngắn' : '') + ').</div></div>';
    return '' +
      '<div class="detail-top">' +
        '<button type="button" class="back" data-act="back">' + svg('back') + 'Danh sách</button>' +
      '</div>' +
      '<div class="hero" style="--c:' + k.color + '">' +
        '<span class="pin">' + svg(k.icon) + '</span>' +
        '<div><h3>' + esc(p.name) + '</h3><p>' + esc(k.label) + (r.m ? ' · cách ' + fmtDist(r.m) + ' (≈ ' + r.walk + '\' đi bộ)' : '') + '</p></div>' +
      '</div>' +
      '<div class="tags">' + tags + '</div>' +
      warn +
      '<div class="block"><div class="block-title">Thời gian ' + T + ' phút của bạn</div>' + bar + timeline + '</div>' +
      '<div class="block"><div class="block-title">Thông tin</div><p class="desc">' + esc(p.desc || '') + '</p>' +
        (p.hours ? '<div class="kv">' + svg('clock') + 'Giờ mở cửa (OSM): ' + esc(p.hours) + '</div>' : '') +
      '</div>' +
      (p.tip ? '<div class="note block"><i>' + svg('bulb') + '</i><div>' + esc(p.tip) + '</div></div>' : '') +
      '<div id="routeBox"></div>' +
      (isHere ? '' :
        '<div class="actions">' +
          '<button type="button" class="btn btn-primary" data-act="route">' + svg('nav') + 'Chỉ đường</button>' +
          '<button type="button" class="btn btn-ghost" data-act="focus" aria-label="Xem trên bản đồ" title="Xem trên bản đồ">' + svg('pin') + '</button>' +
        '</div>');
  }

  function renderDetail(r, keepScroll) {
    const top = els.scroll.scrollTop;
    els.viewDetail.innerHTML = detailHTML(r);
    if (state.route && state.route.id === r.p.id) renderRouteBox();
    els.scroll.scrollTop = keepScroll ? top : 0;
  }

  function openDetail(id, opts) {
    opts = opts || {};
    const r = rowFor(id);
    if (!r) return;
    if (state.route && state.route.id !== id) clearRoute();
    if (picking) stopPick();
    state.selected = id;
    els.viewSearch.hidden = true;
    els.viewDetail.hidden = false;
    renderDetail(r, false);
    updateMarkerActive();
    $$('.card', els.list).forEach((c) => c.classList.toggle('is-active', c.dataset.id === id));
    revealMarker(id);
    if (isMobile()) {
      if (panelMin) restorePanel();
      if (sheet.state === 'peek') setSheet('half');
    } else if (panelMin) restorePanel();
    if (opts.fly !== false) panToVisible([r.p.lat, r.p.lng], Math.max(map.getZoom(), 17));
    const name = r.p.short || r.p.name;
    rb(rbEl(els.viewDetail, name), rbEl(mkEl(id), name));
  }

  function closeDetail() {
    state.selected = null;
    els.viewDetail.hidden = true;
    els.viewDetail.innerHTML = '';
    els.viewSearch.hidden = false;
    updateMarkerActive();
    $$('.card.is-active', els.list).forEach((c) => c.classList.remove('is-active'));
    // quay lại màn tìm kiếm: dựng lại từng mục như lúc mở trang
    rb(rbEl(els.fTime), rbEl(els.fNeeds), rbEl(els.fWhere), rbEl(els.fResults));
  }

  /* ── Chỉ đường (đi bộ, OSRM foot) ──────────────────── */
  let routeReq = 0;
  async function showRoute(id) {
    const r = rowFor(id);
    if (!r) return;
    const o = getOrigin(), p = r.p;
    const my = ++routeReq;
    state.route = { id, loading: true };
    renderRouteBox();
    const btn = $('[data-act="route"]', els.viewDetail);
    if (btn) btn.disabled = true;

    let coords, meters, secs, approx = false;
    try {
      const url = 'https://routing.openstreetmap.de/routed-foot/route/v1/foot/' +
        o.lng + ',' + o.lat + ';' + p.lng + ',' + p.lat + '?overview=full&geometries=geojson';
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 9000);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(to);
      const j = await res.json();
      if (j.code !== 'Ok' || !j.routes || !j.routes.length) throw new Error('no route');
      const rt = j.routes[0];
      coords = rt.geometry.coordinates.map((c) => [c[1], c[0]]);
      coords.unshift([o.lat, o.lng]);
      coords.push([p.lat, p.lng]);
      meters = rt.distance;
      secs = rt.duration;
    } catch (e) {
      approx = true;
      coords = [[o.lat, o.lng], [p.lat, p.lng]];
      meters = distM(o, p) * D.walk.detour;
      secs = (meters / D.walk.speed) * 60;
    }
    if (my !== routeReq) return;

    routeLayer.clearLayers();
    const base = { pane: 'routePane', interactive: false, lineCap: 'round', lineJoin: 'round' };
    L.polyline(coords, Object.assign({ className: 'route-casing', weight: 10, opacity: 1 }, base)).addTo(routeLayer);
    L.polyline(coords, Object.assign({ className: 'route-line', weight: 5.5, opacity: 1, dashArray: approx ? '8 10' : null }, base)).addTo(routeLayer);
    if (!approx) L.polyline(coords, Object.assign({ className: 'route-flow', weight: 3, opacity: 1, dashArray: '0.1 14' }, base)).addTo(routeLayer);

    const mins = Math.max(1, Math.ceil(secs / 60));
    state.route = { id, meters, mins, approx, name: p.short || p.name };
    renderRouteBox();
    if (btn) btn.disabled = false;

    els.routeChipMain.innerHTML = svg('route') + '<span><b>' + esc(state.route.name) + '</b> · ' + fmtDist(meters) + ' · ' + mins + '\' đi bộ</span>';
    els.routeChip.hidden = false;
    if (isMobile()) setSheet('peek');
    setTimeout(() => fitVisible(L.latLngBounds(coords), 18), isMobile() ? 120 : 0);
    rb(rbEl($('#routeBox', els.viewDetail), 'Tuyến đường'),
      rbEl(els.routeChip, state.route.name),
      rbMap('Tuyến đi bộ'));
  }

  function renderRouteBox() {
    const box = $('#routeBox', els.viewDetail);
    if (!box) return;
    const R = state.route;
    if (!R || (state.selected && R.id !== state.selected)) { box.innerHTML = ''; return; }
    if (R.loading) {
      box.innerHTML = '<div class="route-box"><h4>' + svg('route') + 'Đang tìm đường đi bộ…</h4><div class="skeleton" style="width:60%;margin-top:8px"></div></div>';
      return;
    }
    const T = state.T, rest = T - 2 * R.mins, ok = 2 * R.mins <= T / 2;
    box.innerHTML =
      '<div class="route-box">' +
        '<h4>' + svg('route') + (R.approx ? 'Ước tính (không tải được tuyến đường)' : 'Tuyến đi bộ thực tế') + '</h4>' +
        '<div class="route-big">' + fmtDist(R.meters) + ' <small>· ' + R.mins + ' phút mỗi chiều</small></div>' +
        '<div class="note ' + (ok ? 'is-ok' : 'is-warn') + '"><i>' + svg(ok ? 'check' : 'warn') + '</i><div>' +
          (ok ? 'Đi + về ' + 2 * R.mins + '\' — bạn vẫn nghỉ được ' + rest + '\' (≥ ½ thời gian).'
              : 'Theo tuyến thực tế, đi + về mất ' + 2 * R.mins + '\' — chỉ còn nghỉ ' + Math.max(rest, 0) + '\' (< ½ thời gian). Cân nhắc chọn nơi gần hơn.') +
        '</div></div>' +
        '<div style="margin-top:10px"><button type="button" class="btn btn-ghost btn-sm" data-act="clear-route">' + svg('x') + 'Xóa chỉ đường</button></div>' +
      '</div>';
  }

  function clearRoute() {
    routeReq++;
    routeLayer.clearLayers();
    state.route = null;
    els.routeChip.hidden = true;
    const box = $('#routeBox', els.viewDetail);
    if (box) box.innerHTML = '';
    const btn = $('[data-act="route"]', els.viewDetail);
    if (btn) btn.disabled = false;
  }

  /* ── Bottom sheet & thu gọn ────────────────────────── */
  function measurePeek() {
    if (els.viewSearch.hidden || !isMobile()) return;
    const h = els.scroll.offsetTop + els.fNeeds.offsetTop + els.fNeeds.offsetHeight + 4;
    if (h > 100) sheet.peekH = h;
  }
  function applySheet() {
    const root = document.documentElement;
    if (!isMobile()) {
      els.panel.style.height = '';
      root.style.setProperty('--sheet-h', '0px');
      return;
    }
    const h = panelMin ? 0 : sheetHeights()[sheet.state];
    if (!panelMin) els.panel.style.height = h + 'px';
    root.style.setProperty('--sheet-h', h + 'px');
  }
  function setSheet(s) {
    sheet.state = s;
    els.panel.dataset.sheet = s;
    if (s === 'peek') els.scroll.scrollTop = 0;
    applySheet();
  }
  function minimizePanel() {
    panelMin = true;
    els.panel.classList.add('is-min');
    els.fab.hidden = false;
    applySheet();
    rb(rbEl(els.fab, 'Tìm chỗ nghỉ'));
  }
  function restorePanel() {
    panelMin = false;
    els.panel.classList.remove('is-min');
    els.fab.hidden = true;
    if (isMobile() && sheet.state === 'peek' && state.selected) sheet.state = 'half';
    applySheet();
    rbWaves(rbPanelWaves());
  }
  /** người dùng tự đổi nấc bottom sheet */
  function userSetSheet(s) {
    const changed = s !== sheet.state;
    setSheet(s);
    if (changed) rbWaves(rbPanelWaves());
  }

  let drag = null;
  function dragStart(e) {
    if (!isMobile() || e.button > 0) return;
    if (e.target.closest('button:not(.sheet-grip), input, select, a')) return;
    drag = { y0: e.clientY, h0: els.panel.getBoundingClientRect().height, t0: performance.now(), moved: false };
    els.panel.classList.add('is-dragging');
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* bỏ qua */ }
  }
  function dragMove(e) {
    if (!drag) return;
    const dy = e.clientY - drag.y0;
    if (Math.abs(dy) > 5) drag.moved = true;
    const h = clamp(drag.h0 - dy, 60, innerHeight - 40);
    els.panel.style.height = h + 'px';
    document.documentElement.style.setProperty('--sheet-h', h + 'px');
  }
  function dragEnd(e) {
    if (!drag) return;
    const d = drag;
    drag = null;
    els.panel.classList.remove('is-dragging');
    const order = ['peek', 'half', 'full'];
    if (!d.moved) { userSetSheet(order[(order.indexOf(sheet.state) + 1) % 3]); return; }
    const dy = e.clientY - d.y0;
    const v = dy / Math.max(1, performance.now() - d.t0);
    const H = sheetHeights(), h = d.h0 - dy;
    const hs = order.map((s) => H[s]);
    if (h < H.peek * 0.6) { minimizePanel(); return; }
    let idx = hs.reduce((bi, hv, i) => (Math.abs(hv - h) < Math.abs(hs[bi] - h) ? i : bi), 0);
    if (v < -0.45) { const j = hs.findIndex((hv) => hv > h + 10); idx = j === -1 ? 2 : j; }
    else if (v > 0.45) { let j = -1; hs.forEach((hv, i) => { if (hv < h - 10) j = i; }); if (j === -1) { minimizePanel(); return; } idx = j; }
    userSetSheet(order[idx]);
  }
  [els.grip, els.head].forEach((el) => {
    el.addEventListener('pointerdown', dragStart);
    el.addEventListener('pointermove', dragMove);
    el.addEventListener('pointerup', dragEnd);
    el.addEventListener('pointercancel', dragEnd);
  });
  els.grip.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); userSetSheet(sheet.state === 'full' ? 'peek' : sheet.state === 'peek' ? 'half' : 'full'); }
  });

  /* ── Chọn vị trí trên bản đồ / GPS ─────────────────── */
  let picking = false;
  function startPick() {
    picking = true;
    els.pickBanner.hidden = false;
    els.map.classList.add('is-picking');
    els.btnPick.classList.add('is-on');
    if (isMobile()) setSheet('peek');
    rb(rbEl(els.pickBanner, 'Chọn vị trí'));
  }
  function stopPick() {
    picking = false;
    els.pickBanner.hidden = true;
    els.map.classList.remove('is-picking');
    els.btnPick.classList.remove('is-on');
    rb(rbEl(section(els.btnPick)));
  }
  function nearestNamed(lat, lng) {
    let best = null, bd = 70;
    const cands = D.originGroups.flatMap((g) => g.ids).map((id) => placeById.get(id) || dormById.get(id)).filter(Boolean);
    for (const p of cands) { const d = distM({ lat, lng }, p); if (d < bd) { bd = d; best = p; } }
    return best;
  }
  /** quiet: chỉ cập nhật trạng thái (dùng khi đoạn mở màn chưa xong — nó sẽ tự đặt node từ vị trí mới). */
  function setCustomOrigin(lat, lng, src, quiet) {
    const far = distM({ lat, lng }, D.center);
    if (far > 3000) {
      toast('Bạn đang cách Bách Khoa ' + fmtDist(far) + ' — ngoài phạm vi, tạm dùng ' + getOrigin().short + '.', 4500);
      return false;
    }
    const near = nearestNamed(lat, lng);
    const base = src === 'gps' ? 'Vị trí hiện tại' : 'Điểm đã chọn';
    state.custom = {
      lat, lng,
      label: near ? base + ' · gần ' + (near.short || near.name) : base,
      short: near ? 'gần ' + (near.short || near.name) : (src === 'gps' ? 'vị trí hiện tại' : 'điểm đã chọn'),
    };
    state.originId = 'custom';
    buildOriginSelect();
    if (quiet) {
      clearRoute();
      render(true);
      panToVisible([lat, lng], Math.max(map.getZoom(), 17), mapShown ? undefined : false);
    } else {
      onChange('origin');
      panToVisible([lat, lng], Math.max(map.getZoom(), 17));
    }
    return true;
  }

  /** Mở trang là hỏi vị trí luôn; không được thì dùng tòa đã chọn lần trước (mặc định D3). */
  function locateOnStart() {
    if (!navigator.geolocation) return;
    toast('Đang xác định vị trí của bạn…', 8000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (setCustomOrigin(pos.coords.latitude, pos.coords.longitude, 'gps', !introDone)) {
          toast('Đã dùng vị trí hiện tại của bạn (' + state.custom.short + ').');
        }
      },
      (err) => {
        const using = 'đang dùng ' + getOrigin().short + '. Bạn có thể chọn tòa trong danh sách hoặc chạm bản đồ.';
        toast(err.code === 1 ? 'Chưa được phép truy cập vị trí — ' + using : 'Không lấy được vị trí — ' + using, 5000);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  }

  function buildOriginSelect() {
    let html = '';
    if (state.custom) html += '<optgroup label="Vị trí tùy chọn"><option value="custom">' + esc(state.custom.label) + '</option></optgroup>';
    for (const g of D.originGroups) {
      html += '<optgroup label="' + esc(g.label) + '">' + g.ids.map((id) => {
        const p = placeById.get(id) || dormById.get(id);
        return p ? '<option value="' + esc(id) + '">' + esc(p.name) + '</option>' : '';
      }).join('') + '</optgroup>';
    }
    els.where.innerHTML = html;
    els.where.value = state.originId;
  }
  els.ktxSel.innerHTML = D.dorms.map((d) => '<option value="' + d.id + '">' + esc(d.name) + '</option>').join('');

  /* ── Sự kiện ───────────────────────────────────────── */
  // Bấm bất kỳ nút nào → con trỏ gần nhất dựng lại mục chứa nút đó (nút ngoài các mục thì dựng lại chính nó).
  // Đăng ký ở pha capture để mục này được chọn con trỏ trước các vùng mà handler dựng lại;
  // việc đo vị trí diễn ra sau khi handler chạy xong, nên phần bị ẩn đi sau khi bấm sẽ tự bỏ qua.
  document.addEventListener('click', (e) => {
    const b = e.target.closest('button, [role="button"]');
    if (!b || b.dataset.rb === 'off' || b.closest('#swarm, .leaflet-container')) return;
    rb(rbEl(section(b), null, { delay: 0 }));
  }, true);
  // Ô chọn / công tắc / thanh kéo / ô số đổi giá trị (thả tay, rời ô) → dựng lại mục chứa nó
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.type === 'search') return;
    if (t.matches('select, input')) rb(rbEl(section(t), null, { delay: 0 }));
  }, true);

  function clearNeeds() {
    state.needs.clear();
    onChange('needs');
  }
  function userClearRoute() {
    clearRoute();
    rb(rbMap('Xóa tuyến'));
  }

  /** live: đang kéo thanh / gõ số — mục Thời gian để yên tới khi thả tay hoặc rời ô */
  function setT(v, live) {
    const T = clamp(Math.round(Number(v)) || 1, 1, 240);
    if (T === state.T) return;
    state.T = T;
    onChange('time', live);
  }
  els.tMinus.addEventListener('click', () => setT(state.T - (state.T <= 10 ? 1 : 5)));
  els.tPlus.addEventListener('click', () => setT(state.T + (state.T < 10 ? 1 : 5)));
  els.tRange.addEventListener('input', () => setT(els.tRange.value, true));
  els.tInput.addEventListener('input', () => { const v = Number(els.tInput.value); if (v >= 1) setT(v, true); });
  els.tInput.addEventListener('change', () => { els.tInput.value = state.T; });
  els.tInput.addEventListener('blur', () => { els.tInput.value = state.T; });
  els.tChips.addEventListener('click', (e) => { const c = e.target.closest('.chip'); if (c) setT(c.dataset.t); });

  els.needs.addEventListener('click', (e) => {
    const b = e.target.closest('.need');
    if (!b || b.disabled) return;
    const id = b.dataset.need;
    if (state.needs.has(id)) state.needs.delete(id); else state.needs.add(id);
    onChange('needs');
  });
  els.needsClear.addEventListener('click', clearNeeds);

  els.where.addEventListener('change', () => { state.originId = els.where.value; onChange('origin'); panToVisible([getOrigin().lat, getOrigin().lng]); });
  els.ktx.checked = state.inKtx;
  els.ktxWrap.hidden = !state.inKtx;
  els.ktxSel.value = state.ktxId;
  els.ktx.addEventListener('change', () => {
    state.inKtx = els.ktx.checked;
    if (state.inKtx && dormById.has(state.originId)) state.ktxId = state.originId;
    els.ktxSel.value = state.ktxId;
    els.ktxWrap.hidden = !state.inKtx;
    onChange('ktx');
    if (state.inKtx) toast('Đã thêm lựa chọn về phòng KTX ' + dormById.get(state.ktxId).code + ' (nếu đủ thời gian).');
  });
  els.ktxSel.addEventListener('change', () => { state.ktxId = els.ktxSel.value; onChange('ktx'); });

  let qT = 0;
  els.q.addEventListener('input', () => {
    clearTimeout(qT);
    qT = setTimeout(() => { state.q = els.q.value; onChange('filter'); }, 120);
  });

  els.btnPick.addEventListener('click', () => (picking ? stopPick() : startPick()));
  els.pickCancel.addEventListener('click', stopPick);

  map.on('click', (e) => {
    if (!picking) return;
    stopPick();
    setCustomOrigin(e.latlng.lat, e.latlng.lng, 'pick');
  });
  map.on('dragstart', () => {
    if (isMobile() && !panelMin && sheet.state !== 'peek') setSheet('peek');
  });

  els.list.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]');
    if (a) {
      if (a.dataset.act === 'clear-needs') clearNeeds();
      else if (a.dataset.act === 'clear-q') {
        els.q.value = ''; state.q = '';
        onChange('filter');
      }
      else if (a.dataset.act === 'time') setT(a.dataset.t);
      return;
    }
    const c = e.target.closest('.card');
    if (c) openDetail(c.dataset.id);
  });
  els.list.addEventListener('mouseover', (e) => {
    const c = e.target.closest('.card');
    $$('.mk.is-hover').forEach((m) => m.classList.remove('is-hover'));
    if (c) { const el = mkEl(c.dataset.id); if (el) el.classList.add('is-hover'); }
  });
  els.list.addEventListener('mouseleave', () => $$('.mk.is-hover').forEach((m) => m.classList.remove('is-hover')));

  els.viewDetail.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]');
    if (!a) return;
    const act = a.dataset.act;
    if (act === 'back') closeDetail();
    else if (act === 'route') showRoute(state.selected);
    else if (act === 'clear-route') userClearRoute();
    else if (act === 'focus') {
      const r = rowFor(state.selected);
      if (r) {
        if (isMobile()) setSheet('peek');
        setTimeout(() => panToVisible([r.p.lat, r.p.lng], 18), 50);
        rb(rbMap(r.p.short || r.p.name));
      }
    }
  });

  els.routeChipMain.addEventListener('click', () => { if (state.route) openDetail(state.route.id, { fly: false }); });
  els.routeChipX.addEventListener('click', userClearRoute);

  els.btnMin.addEventListener('click', minimizePanel);
  els.fab.addEventListener('click', restorePanel);

  els.zIn.addEventListener('click', () => { map.zoomIn(); rb(rbMap('Phóng to')); });
  els.zOut.addEventListener('click', () => { map.zoomOut(); rb(rbMap('Thu nhỏ')); });
  els.cHome.addEventListener('click', () => { panToVisible([D.center.lat, D.center.lng], 17); rb(rbMap('Khuôn viên')); });
  els.cMe.addEventListener('click', () => { const o = getOrigin(); panToVisible([o.lat, o.lng], 18); rb(rbMap(o.short)); });
  els.cSwarm.addEventListener('click', () => {
    const on = !swarm.enabled;
    swarm.setEnabled(on);
    store.set('swarm', on);
    els.cSwarm.classList.toggle('is-on', on);
    els.cSwarm.setAttribute('aria-pressed', String(on));
    if (!on) { revealEverything(); revealAllMarkers(false); }
    else {
      // bật lại: bầy dựng lại toàn bộ giao diện như lúc mở trang rồi mới bay ra các node
      const waves = panelMin ? [[rbEl(els.fab, 'Tìm chỗ nghỉ', { delay: 0 })]] : rbPanelWaves();
      waves[0].push(rbEl(els.mapCtrl, null, { delay: 0 }), rbMap());
      rbWaves(waves);
      swarm.whenIdle(4000).then(() => runNodes(true));
    }
    toast(on ? 'Đã bật hiệu ứng Swarm.' : 'Đã tắt hiệu ứng Swarm.');
  });

  els.panel.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') swarm.setDim(true); });
  els.panel.addEventListener('pointerleave', () => swarm.setDim(false));

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (picking) stopPick();
    else if (state.selected) closeDetail();
  });

  let toastT = 0;
  function toast(msg, ms) {
    els.toast.textContent = msg;
    els.toast.classList.add('is-show');
    clearTimeout(toastT);
    toastT = setTimeout(() => els.toast.classList.remove('is-show'), ms || 2800);
  }

  let resizeT = 0;
  addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => { measurePeek(); applySheet(); }, 120);
  });
  mqMobile.addEventListener('change', () => { measurePeek(); if (isMobile()) setSheet('peek'); else applySheet(); });

  /* ── Mở màn: Swarm dựng lại giao diện ──────────────── */
  let mapShown = false;
  function revealMap(at) {
    if (mapShown) return;
    mapShown = true;
    const c = at || visibleCenter();
    els.map.style.setProperty('--rx', c.x + 'px');
    els.map.style.setProperty('--ry', c.y + 'px');
    requestAnimationFrame(() => els.map.classList.add('is-built'));
    setTimeout(() => {
      els.map.classList.remove('is-unbuilt', 'is-built');
      map.invalidateSize();
    }, 1250);
  }
  function built(el) { el.classList.remove('is-unbuilt'); }
  function revealEverything() {
    revealMap();
    $$('.is-unbuilt').forEach((el) => { if (el !== els.map) built(el); });
  }

  let introDone = false;
  async function intro() {
    if (!swarm.enabled) {
      introDone = true;
      revealEverything();
      revealAllMarkers(true);
      return;
    }
    const failsafe = setTimeout(revealEverything, 6500);
    const mc = visibleCenter();
    const mapTasks = [[-20, 8], [0, -16], [20, 8]].map(([dx, dy], k) => ({
      type: 'point', x: mc.x + dx, y: mc.y + dy, hold: 420, delay: k * 40, onArrive: () => revealMap(mc),
    }));
    const childTasks = [els.head, els.fTime, els.fNeeds, els.fWhere, els.fResults].map((el) => ({
      type: 'box', el, label: el.dataset.build, clipEl: els.panel, delay: 220, onDone: () => built(el),
    }));
    await swarm.build([
      mapTasks.concat([
        { type: 'box', el: els.panel, label: 'Bảng tìm kiếm', onDone: () => built(els.panel) },
        { type: 'box', el: els.mapCtrl, label: 'Điều khiển', onDone: () => built(els.mapCtrl) },
      ]),
      childTasks,
    ]);
    clearTimeout(failsafe);
    revealEverything();
    introDone = true;
    setTimeout(() => runNodes(true), 250);
  }

  // tiện cho việc gỡ lỗi trong DevTools
  window.__nghiDau = { map, state, swarm };

  /* ── Khởi động ─────────────────────────────────────── */
  buildOriginSelect();
  render(true);
  if (isMobile()) {
    // đo chiều cao "peek" khi các phần tử đã có kích thước
    measurePeek();
    setSheet('peek');
  } else {
    applySheet();
  }
  panToVisible([D.center.lat, D.center.lng], 17, false);
  requestAnimationFrame(() => setTimeout(intro, 150));
  locateOnStart();
})();
