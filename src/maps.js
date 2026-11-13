// ===================== MAPS & ANIMATION =====================
const MAPS = [], NS = 'http://www.w3.org/2000/svg', RM = matchMedia('(prefers-reduced-motion:reduce)').matches;
const AC_SHAPE = 'M0-9L1.6-3.5L9 1.2V3.2L1.6 1V5.6L4 7.6V9L0 8L-4 9V7.6L-1.6 5.6V1L-9 3.2V1.2L-1.6-3.5Z';
const VCOL = {TUG: '#fbbf24', BT: '#34d399', BUS: '#a78bfa', GPU: '#f472b6', FUEL: '#fb923c', CAT: '#94a3b8', FT: '#ef4444', AMB: '#f8fafc', FM: '#facc15'};
const acScale = r => ({E: 2.1, C: 1.5, B: 1.1}[AC_TYPES[r.type].code]);
function acColor(r) {return r.op == 'diversion' ? '#c084fc' : r.mx ? '#ef4444' : r.block || r.ph == 'HOLDING' || r.ph == 'AWAITING STAND' ? '#f59e0b' : r.dep && (r.onBlk != null || !r.arr) ? '#60a5fa' : '#34d399'}
// simulated aircraft position on the conceptual map at fractional time tf
function acPos(r, tf) {
  const m = r.mv;
  switch (r.ph) {
    case 'FINAL': case 'LANDING': case 'TAXI-IN': case 'PUSHBACK': case 'TAXI-OUT': case 'TAKEOFF': {if (!m) return null; const p = pAt(m.pts, (tf - m.t0) / m.dur); if (m.rev) p[2] += 180; return p}
    case 'ON STAND': case 'BOARDING': {const s = STAND[r.stand]; return [s.x, s.y, 180]}
    case 'AWAITING STAND': {const ex = AC_TYPES[r.type].code == 'E' ? 880 : 1000; return [ex, G.TWA, 270]}
    case 'HOLDING': {const i = S.R.filter(x => x.ph == 'HOLDING').indexOf(r), a = tf / 3 + i * 1.7, rad = 13 + i * 4; return [1350 + Math.cos(a) * rad * 2, 24 + Math.sin(a) * rad * .55, (a * 57.3 + 180) % 360]}
  }
  return null;
}
function vehPos(v, tf) {
  if (v.task) {const k = S.tasks.find(x => x.id == v.task); if (k && k.cont == 'push' && v.st == 'WORKING') {const r = S.rot[k.r]; if (r.ph == 'PUSHBACK') {const p = acPos(r, tf); if (p) return [p[0], p[1] - 14, p[2]]}}}
  if (v.mv && !v.sus) {const q = (tf - v.mv.t0) / v.mv.dur; if (q < 1) return pAt(v.mv.pts, q)}
  return [v.x, v.y, v.hd || 0];
}

// ---------- 2D operational map (conceptual layout) ----------
function opsSVG(id) {
  const st = STANDS.map(s => `<g class="stand hit" id="${id}-st-${s.id}" onclick="inspect('stand','${s.id}')"><rect class="hl" x="${s.x - 16}" y="${s.y - 15}" width="32" height="30" rx="3"/>${s.kind == 'contact' ? `<line x1="${s.x}" y1="${s.y + 15}" x2="${s.x}" y2="${G.ROAD + 2}" stroke="#2b4166" stroke-width="3"/>` : ''}<text x="${s.x}" y="${s.y + (s.kind == 'remote' ? -18 : s.y > 400 ? 28 : -19)}" text-anchor="middle" class="sl">${s.id}</text></g>`).join('');
  const zones = ZONES.filter(z => z.id != 'TWR').map(z => `<g class="hit zone" onclick="inspect('zone','${z.id}')"><rect class="hl" x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" rx="5" fill="${z.kind == 'terminal' ? '#14335a' : '#122239'}" stroke="${z.kind == 'terminal' ? '#2f5d93' : '#25395a'}"/>
    <text x="${z.x + z.w / 2}" y="${z.y + z.h / 2 + 4}" text-anchor="middle" class="${z.kind == 'terminal' ? 'lbl2' : ''}">${z.kind == 'terminal' ? z.id : z.name}</text></g>`).join('');
  const rw = n => {const y = runwayY(n); return `<g class="hit" onclick="inspect('rwy',${n})"><rect class="hl" id="${id}-rw${n}" x="40" y="${y - 9}" width="1320" height="18" rx="2" fill="#1d2738" stroke="#2c3a52"/>
    <line x1="60" x2="1340" y1="${y}" y2="${y}" stroke="#d6dde8" stroke-width="1" stroke-dasharray="14 12" opacity=".55"/><text x="48" y="${y + 3}" style="fill:#dbe6f5;font-weight:700">${n == 1 ? '05L' : '05R'}</text><text x="1352" y="${y + 3}" text-anchor="end" style="fill:#dbe6f5;font-weight:700">${n == 1 ? '23R' : '23L'}</text>
    <text x="700" y="${y - 12}" text-anchor="middle">RWY ${n} (conceptual) · ${n == 1 ? 'arrivals' : 'departures'}</text></g>
    <rect id="${id}-rwx${n}" x="40" y="${y - 9}" width="1320" height="18" fill="url(#hatch)" opacity="0" pointer-events="none"/>`};
  const tw = `<g stroke="#26364f" stroke-width="7" fill="none" stroke-linecap="round"><path d="M60 ${G.TWA}H1370M60 ${G.TWB}H1370M880 ${G.R1y}V${G.TWA}M1000 ${G.R1y}V${G.TWA}M1100 ${G.R1y}V${G.TWA}M1340 ${G.R2y}V${G.TWB}M50 ${G.TWA}V${G.LTL}H590M1370 ${G.TWA}V${G.LTL}H1180M80 ${G.TL}H1150"/></g>
    <g stroke="#c9a227" stroke-width="1" fill="none" opacity=".55"><path d="M60 ${G.TWA}H1370M60 ${G.TWB}H1370M80 ${G.TL}H1150M50 ${G.TWA}V${G.LTL}H590M1370 ${G.TWA}V${G.LTL}H1180"/></g>
    <text x="70" y="${G.TWA - 6}">TWY A</text><text x="70" y="${G.TWB + 13}">TWY B</text><text x="1180" y="${G.TL - 5}">Apron taxilane</text>`;
  const roads = `<g stroke="#1b2536" stroke-width="5" fill="none"><path d="${ROADS.map(([a, b]) => `M${a[0]} ${a[1]}L${b[0]} ${b[1]}`).join('')}"/></g><g stroke="#3a4a63" stroke-width=".8" stroke-dasharray="4 4" fill="none"><path d="${ROADS.map(([a, b]) => `M${a[0]} ${a[1]}L${b[0]} ${b[1]}`).join('')}"/></g>`;
  return `<svg class="mapsvg" id="${id}" viewBox="0 0 ${G.W} ${G.H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Conceptual airport operational map with simulated movements">
  <defs><pattern id="hatch" width="10" height="10" patternTransform="rotate(45)" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="#7f1d1d"/><line x1="0" y1="0" x2="0" y2="10" stroke="#ef4444" stroke-width="4"/></pattern>
  <radialGradient id="glow"><stop offset="0" stop-color="#38bdf8" stop-opacity=".35"/><stop offset="1" stop-color="#38bdf8" stop-opacity="0"/></radialGradient></defs>
  <rect width="${G.W}" height="${G.H}" fill="#07101d"/>
  <rect x="70" y="${G.TL - 18}" width="1090" height="${G.ROAD - G.TL + 20}" fill="#0b1729" rx="4"/><rect x="1175" y="182" width="160" height="150" fill="#0b1729" rx="4"/><rect x="60" y="${G.LTL - 4}" width="540" height="40" fill="#0b1729" rx="4"/><rect x="1180" y="${G.LTL - 4}" width="170" height="40" fill="#0b1729" rx="4"/>
  <text x="1255" y="345" text-anchor="middle">Remote apron</text>
  ${rw(1)}${rw(2)}${tw}${roads}<g id="${id}-zones" class="${LAYERS.zones ? '' : 'hide'}">${zones}</g>
  <g class="hit" onclick="inspect('zone','TWR')"><circle cx="705" cy="212" r="9" fill="#1e3a5f" stroke="#38bdf8"/><text x="705" y="215" text-anchor="middle" style="fill:#e0f2fe;font-size:8px;font-weight:700">TWR</text></g>
  <g id="${id}-stands">${st}</g>
  <ellipse cx="1350" cy="24" rx="40" ry="10" fill="none" stroke="#f59e0b" stroke-dasharray="3 4" opacity=".5"/><text x="1295" y="14" text-anchor="end">Holding stack</text>
  <g id="${id}-veh"></g><g id="${id}-ac"></g><g id="${id}-al"></g>
  <text x="10" y="${G.H - 8}" style="fill:#5f7598">CONCEPTUAL LAYOUT — not an official aerodrome chart · positions simulated</text></svg>`;
}
// dynamic layer renderer shared by 2D and 3D views
function mountOps(id, el, opts = {}) {
  const m = {id, el, kind: 'ops', ac: {}, veh: {}, opts};
  const svg = () => document.getElementById(id);
  m.frame = (tf) => {
    const s = svg(); if (!s) return; const gA = s.querySelector('#' + id + '-ac'), gV = s.querySelector('#' + id + '-veh');
    const seen = {};
    if (LAYERS.ac) for (const r of S.R) {const p = acPos(r, tf); if (!p) continue; seen[r.id] = 1; let e = m.ac[r.id];
      if (!e) {e = m.ac[r.id] = document.createElementNS(NS, 'g'); e.setAttribute('class', 'ac hit'); e.innerHTML = `<circle class="ring" r="0"/><path d="${AC_SHAPE}"/><text y="-12" text-anchor="middle"></text>`; e.onclick = ev2 => {ev2.stopPropagation(); inspect('rot', r.id)}; gA.appendChild(e)}
      const c = acColor(r), isSel = sel && sel.k == 'rot' && sel.id == r.id, sc = acScale(r);
      e.setAttribute('transform', `translate(${p[0].toFixed(1)},${p[1].toFixed(1)})`); e.classList.toggle('sel', isSel);
      const pth = e.childNodes[1]; pth.setAttribute('fill', c); pth.setAttribute('transform', `rotate(${p[2].toFixed(0)}) scale(${sc})`);
      const ring = e.childNodes[0], ph = RM ? 0 : ((tf * 0.7) % 1); ring.setAttribute('stroke', c); ring.setAttribute('r', isSel || r.block || r.mx || r.emerg && r.onBlk == null ? (RM ? 16 : 10 + ph * 16) : 0); ring.setAttribute('opacity', RM ? .8 : 1 - ph);
      const tx = e.childNodes[2]; tx.textContent = LAYERS.labels ? fid(r) : ''; tx.setAttribute('y', -12 * sc - 2)}
    for (const k in m.ac) if (!seen[k]) {m.ac[k].remove(); delete m.ac[k]}
    if (gV) {gV.style.display = LAYERS.veh ? '' : 'none'; if (LAYERS.veh) for (const v of S.V) {let e = m.veh[v.id]; const p = vehPos(v, tf);
      if (!e) {e = m.veh[v.id] = document.createElementNS(NS, 'g'); e.setAttribute('class', 'hit'); e.innerHTML = `<rect x="-5" y="-3" width="10" height="6" rx="1.5"/><text y="-6" text-anchor="middle" style="font-size:8px"></text>`; e.onclick = ev2 => {ev2.stopPropagation(); inspect('veh', v.id)}; gV.appendChild(e)}
      const isSel = sel && sel.k == 'veh' && sel.id == v.id;
      e.setAttribute('transform', `translate(${p[0].toFixed(1)},${p[1].toFixed(1)}) rotate(${((p[2] || 0) + 90).toFixed(0)})`);
      const rc = e.childNodes[0]; rc.setAttribute('fill', v.down || v.st == 'UNAVAILABLE' ? '#475569' : VCOL[v.type]); rc.setAttribute('stroke', isSel ? '#fff' : v.sus ? '#ef4444' : '#050a13'); rc.setAttribute('stroke-width', isSel ? 1.5 : .8);
      e.childNodes[1].textContent = isSel || (LAYERS.labels && v.st != 'IDLE' && opts.vlabels) ? v.id : ''}}
  };
  m.liveUpd = () => {
    const s = svg(); if (!s) return;
    for (const st of STANDS) {const g = s.querySelector('#' + id + '-st-' + st.id); if (!g) continue; const o = S.rot[S.stOcc[st.id]];
      g.classList.toggle('occ', !!o); g.classList.toggle('res', !!S.stRes[st.id]); g.classList.toggle('ovs', !!(o && o.dep && o.tobt && S.t > o.allowedOff + S.cfg.overstay.graceMin));
      g.classList.toggle('conf', S.R.some(r => r.ph == 'AWAITING STAND' && r.stand == st.id)); g.style.display = LAYERS.stands ? '' : 'none';
      g.querySelector('rect').setAttribute('stroke-width', sel && sel.k == 'stand' && sel.id == st.id ? 3 : '')}
    for (const n of [1, 2]) {const x = s.querySelector('#' + id + '-rwx' + n); if (x) x.setAttribute('opacity', S.rw[n].open ? 0 : .55)}
    const z = s.querySelector('#' + id + '-zones'); if (z) z.style.display = LAYERS.zones ? '' : 'none';
    const gl = s.querySelector('#' + id + '-al'); if (gl) gl.innerHTML = LAYERS.alerts ? alertPins().map(([x, y, a]) => `<g class="hot" onclick="inspect('alert','${a.id}')"><circle class="p" cx="${x}" cy="${y}" r="6" fill="none" stroke="${a.sev == 'cr' ? '#ef4444' : '#f59e0b'}" stroke-width="2"/><circle cx="${x}" cy="${y}" r="6" fill="${a.sev == 'cr' ? '#ef4444' : '#f59e0b'}"/><text x="${x}" y="${y + 3.5}" text-anchor="middle" style="fill:#000;font-weight:800;font-size:9px">!</text></g>`).join('') : '';
  };
  m.reset = () => {m.ac = {}; m.veh = {}; const s = svg(); if (s) {s.querySelector('#' + id + '-ac').innerHTML = ''; s.querySelector('#' + id + '-veh').innerHTML = ''}};
  MAPS.push(m); m.liveUpd(); return m;
}
function alertPins() { // map coordinates for open alerts that reference a located object
  const out = [], seen = {};
  for (const a of S.al) {if (a.res || a.sev == 'info' || !a.ref) continue; let p = null; const R = a.ref;
    if (R.k == 'rot') {const r = S.rot[R.id]; const q = r && acPos(r, S.t); if (q) p = [q[0] + 12, q[1] - 14]}
    else if (R.k == 'stand') {const s = STAND[R.id]; p = [s.x + 14, s.y - 16]}
    else if (R.k == 'zone') {const z = ZONE[R.id]; p = [z.x + z.w - 8, z.y + 6]}
    else if (R.k == 'rwy') p = [700, runwayY(R.id)];
    else if (R.k == 'def') {const d = S.defects.find(x => x.id == R.id), r = d && S.rot[d.r], s = r && STAND[r.stand]; if (s) p = [s.x - 14, s.y - 16]}
    else if (R.k == 'div') {const d = S.div.find(x => x.id == R.id), r = d && S.rot[d.rot]; const q = r && acPos(r, S.t); p = q ? [q[0] + 12, q[1] - 14] : [1380, 30]}
    if (p) {const k = Math.round(p[0] / 8) + ':' + Math.round(p[1] / 8); if (seen[k]) continue; seen[k] = 1; out.push([p[0], p[1], a]); if (out.length > 14) break}}
  return out;
}

// ---------- aerial image with projected simulated overlay ----------
// Homography from conceptual-map ground plane to the illustrative image (approximate, for orientation only)
function homography(src, dst) {
  const A = [], bb = [];
  for (let i = 0; i < 4; i++) {const [x, y] = src[i], [u, v] = dst[i]; A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); bb.push(u); A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); bb.push(v)}
  for (let c = 0; c < 8; c++) {let p = c; for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r; [A[c], A[p]] = [A[p], A[c]]; [bb[c], bb[p]] = [bb[p], bb[c]];
    for (let r = 0; r < 8; r++) if (r != c) {const f = A[r][c] / A[c][c]; for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k]; bb[r] -= f * bb[c]}}
  const h = bb.map((v, i) => v / A[i][i]); return ([x, y]) => {const w = h[6] * x + h[7] * y + 1; return [(h[0] * x + h[1] * y + h[2]) / w, (h[3] * x + h[4] * y + h[5]) / w, w]};
}
const HPROJ = homography([[395, 282], [1105, 282], [1105, 172], [395, 172]], [[92, 322], [1185, 598], [690, 790], [8, 352]]);
const IMG_W = 1600, IMG_H = 727;
function aerialSVG(id) {
  const hot = [[1210, 92, 'zone', 'TWR', 'ATC tower'], [1010, 330, 'zone', 'T3', 'Terminal 3 (illustrative)'], [520, 300, 'zone', 'T2', 'Concourse / T2 (illustrative)'], [300, 610, 'zone', 'BHS', 'Apron & baggage operations'], [180, 470, 'rwy', 1, 'Runways — beyond frame']];
  return `<svg class="mapsvg aerial" id="${id}" viewBox="0 0 ${IMG_W} ${IMG_H}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Illustrative airport image with simulated overlay">
  <image href="${IMG.aerial}" x="0" y="0" width="${IMG_W}" height="${IMG_H}" preserveAspectRatio="xMidYMid slice"/>
  <rect width="${IMG_W}" height="${IMG_H}" fill="#020617" opacity=".18"/>
  <g id="${id}-stands"></g><g id="${id}-veh"></g><g id="${id}-ac"></g>
  <g id="${id}-hot">${hot.map(([x, y, k, ref, n]) => `<g class="hot" onclick="inspect('${k}',${typeof ref == 'number' ? ref : `'${ref}'`})"><circle class="p" cx="${x}" cy="${y}" r="7" fill="none" stroke="#38bdf8" stroke-width="2"/><circle cx="${x}" cy="${y}" r="6" fill="#0ea5e9" stroke="#e0f2fe" stroke-width="1.5"/>
    <rect x="${x + 11}" y="${y - 11}" width="${n.length * 7.2 + 12}" height="22" rx="5" fill="#050a13d0" stroke="#38bdf866"/><text x="${x + 17}" y="${y + 4}" style="font-size:13px;fill:#e0f2fe">${n}</text></g>`).join('')}</g>
  <g id="${id}-al"></g></svg>`;
}
function mountAerial(id) {
  const m = {id, kind: 'aerial', ac: {}};
  const proj = (x, y) => {const p = HPROJ([x, y]); if (p[2] <= 0) return null; const q = HPROJ([x + 10, y]); return [p[0], p[1], Math.hypot(q[0] - p[0], q[1] - p[1]) / 10]};
  const inImg = p => p && p[0] > -40 && p[0] < IMG_W + 40 && p[1] > -40 && p[1] < IMG_H + 40;
  m.frame = tf => {
    const s = document.getElementById(id); if (!s) return; const gA = s.querySelector('#' + id + '-ac'), seen = {};
    if (LAYERS.ac) for (const r of S.R) {const p0 = acPos(r, tf); if (!p0) continue; const p = proj(p0[0], p0[1]); if (!inImg(p)) continue; seen[r.id] = 1;
      let e = m.ac[r.id]; if (!e) {e = m.ac[r.id] = document.createElementNS(NS, 'g'); e.setAttribute('class', 'acm'); e.innerHTML = `<ellipse class="ring" rx="0" ry="0"/><circle r="7"/><rect rx="5" height="20" y="-38"/><text y="-24" text-anchor="middle" style="font-size:13px;fill:#fff;font-weight:600"></text><line y1="-18" y2="-7" stroke-width="1.5"/>`; e.onclick = () => inspect('rot', r.id); gA.appendChild(e)}
      const c = acColor(r), k = clamp(p[2] * 1.5, .7, 1.8), isSel = sel && sel.k == 'rot' && sel.id == r.id, ph = RM ? 0 : (tf * .7) % 1;
      e.setAttribute('transform', `translate(${p[0].toFixed(1)},${p[1].toFixed(1)}) scale(${k.toFixed(2)})`);
      const [ring, dot, box, tx, ln] = e.childNodes; dot.setAttribute('fill', c); dot.setAttribute('stroke', isSel ? '#fff' : '#020617'); dot.setAttribute('stroke-width', 2);
      ring.setAttribute('stroke', c); ring.setAttribute('rx', 8 + ph * 18); ring.setAttribute('ry', (8 + ph * 18) * .45); ring.setAttribute('opacity', 1 - ph);
      const lab = LAYERS.labels || isSel ? fid(r) + ' · ' + r.ph : ''; tx.textContent = lab; box.setAttribute('width', lab ? lab.length * 7.3 + 12 : 0); box.setAttribute('x', -(lab.length * 7.3 + 12) / 2);
      box.setAttribute('fill', '#050a13d8'); box.setAttribute('stroke', c); ln.setAttribute('stroke', c); ln.style.display = lab ? '' : 'none'}
    for (const k in m.ac) if (!seen[k]) {m.ac[k].remove(); delete m.ac[k]}
    const gV = s.querySelector('#' + id + '-veh'); if (gV) gV.innerHTML = LAYERS.veh ? S.V.filter(v => v.st != 'IDLE').map(v => {const q = vehPos(v, tf), p = proj(q[0], q[1]); return inImg(p) ? `<circle cx="${p[0].toFixed(0)}" cy="${p[1].toFixed(0)}" r="${clamp(p[2] * 4, 3, 7).toFixed(1)}" fill="${VCOL[v.type]}" stroke="#020617" class="hit" onclick="inspect('veh','${v.id}')"/>` : ''}).join('') : '';
  };
  m.liveUpd = () => {
    const s = document.getElementById(id); if (!s) return;
    s.querySelector('#' + id + '-stands').innerHTML = LAYERS.stands ? STANDS.filter(st => st.kind == 'contact').map(st => {const p = proj(st.x, st.y + 10); if (!inImg(p)) return ''; const o = S.rot[S.stOcc[st.id]], ov = o && o.dep && o.tobt && S.t > o.allowedOff + 15;
      return `<g class="hit" onclick="inspect('stand','${st.id}')"><ellipse cx="${p[0]}" cy="${p[1]}" rx="${p[2] * 14}" ry="${p[2] * 6}" fill="${o ? (ov ? '#f59e0b33' : '#3b82f633') : '#22c55e22'}" stroke="${o ? (ov ? '#f59e0b' : '#60a5fa') : '#22c55e'}" stroke-width="1.5" stroke-dasharray="${o ? '' : '4 3'}"/><text x="${p[0]}" y="${p[1] + p[2] * 6 + 13}" text-anchor="middle" style="font-size:12px;fill:#e2e8f0;font-weight:600">${st.id}</text></g>`}).join('') : '';
    s.querySelector('#' + id + '-hot').style.display = LAYERS.zones ? '' : 'none';
    s.querySelector('#' + id + '-al').innerHTML = LAYERS.alerts ? alertPins().map(([x, y, a]) => {const p = proj(x, y); return inImg(p) ? `<g class="hot" onclick="inspect('alert','${a.id}')"><circle class="p" cx="${p[0]}" cy="${p[1]}" r="8" fill="none" stroke="#ef4444" stroke-width="2"/><circle cx="${p[0]}" cy="${p[1]}" r="9" fill="${a.sev == 'cr' ? '#ef4444' : '#f59e0b'}"/><text x="${p[0]}" y="${p[1] + 4.5}" text-anchor="middle" style="fill:#000;font-weight:800;font-size:13px">!</text></g>` : ''}).join('') : '';
  };
  m.reset = () => {m.ac = {}; const s = document.getElementById(id); if (s) s.querySelector('#' + id + '-ac').innerHTML = ''};
  MAPS.push(m); m.liveUpd(); return m;
}

// ---------- 3D digital-twin view (CSS 3D over the same simulated layer) ----------
function twin3dHTML(id) {
  const boxes = ZONES.map(z => {const h = z.id == 'TWR' ? 70 : z.kind == 'terminal' ? (z.id == 'T3' ? 30 : 24) : 14; return `<div class="box ${z.kind == 'terminal' ? 'glass' : ''}" style="left:${z.x}px;top:${z.y}px;width:${z.w}px;height:${z.h}px;--h:${h}px"><div class="tp"></div><div class="fs"></div><div class="fn"></div><div class="fe"></div><div class="fw"></div></div>`}).join('');
  return `<div class="tw3d" id="${id}-wrap"><div class="plane" id="${id}-plane">${opsSVG(id)}${boxes}</div></div>`;
}
function fit3d(id) {const w = document.getElementById(id + '-wrap'), p = document.getElementById(id + '-plane'); if (!w || !p) return; const sc = Math.min(w.clientWidth / 1520, w.clientHeight / 640) * .97;
  p.style.transform = `translate(-50%,-50%) scale(${sc.toFixed(3)}) rotateX(48deg) rotateZ(-10deg)`}

// ---------- baggage hall (conceptual BHS schematic) ----------
const BH = {ci: [[40, 70], [40, 140], [40, 210]], atr: [250, 140], eds: [[330, 70], [330, 120], [330, 170], [330, 220]], l2: [450, 255], l3: [450, 330], sorter: [620, 150, 120, 62], chutes: [...Array(8)].map((_, i) => [800 + (i % 2) * 95, 44 + Math.floor(i / 2) * 64]), dock: [975, 300], adock: [960, 380], rc: [[150, 380], [300, 380], [450, 380], [600, 380]]};
function bhsSVG(id) {
  const c = BH, belt = (d, k) => `<path d="${d}" class="belt ${k || ''}" stroke="#2b6cb0" stroke-width="7" fill="none" stroke-linecap="round"/>`;
  let s = `<svg class="mapsvg" id="${id}" viewBox="0 0 1000 420" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Conceptual baggage handling system with simulated bags"><rect width="1000" height="420" fill="#07101d"/>`;
  s += c.ci.map(([x, y], i) => `<rect x="${x - 25}" y="${y - 18}" width="70" height="36" rx="5" fill="#13294a" stroke="#2f5d93"/><text x="${x + 10}" y="${y + 4}" text-anchor="middle">Check-in ${i + 1}</text>`).join('');
  s += belt(`M${c.ci[0][0] + 45} ${c.ci[0][1]}H190V${c.ci[2][1]}H${c.ci[2][0] + 45}M${c.ci[1][0] + 45} ${c.ci[1][1]}H${c.atr[0] - 22}`, 'b-ci');
  s += `<rect x="${c.atr[0] - 22}" y="${c.atr[1] - 20}" width="44" height="40" rx="5" fill="#1e3a5f" stroke="#38bdf8"/><text x="${c.atr[0]}" y="${c.atr[1] - 26}" text-anchor="middle">ID scan (ATR)</text>`;
  s += belt(`M${c.atr[0] + 22} ${c.atr[1]}H290M290 70V220M290 70H305M290 120H305M290 170H305M290 220H305`, 'b-eds');
  s += c.eds.map(([x, y], i) => `<rect x="${x - 25}" y="${y - 18}" width="70" height="36" rx="6" fill="#1f2d4a" stroke="#64748b"/><text x="${x + 10}" y="${y + 4}" text-anchor="middle">EDS L1-${i + 1}</text>`).join('');
  s += `<rect x="${c.l2[0] - 40}" y="${c.l2[1] - 16}" width="80" height="32" rx="5" fill="#2a2147" stroke="#9085e9"/><text x="${c.l2[0]}" y="${c.l2[1] + 4}" text-anchor="middle">L2 operator review</text>
    <rect x="${c.l3[0] - 40}" y="${c.l3[1] - 18}" width="80" height="36" rx="5" fill="#3b1530" stroke="#d55181"/><text x="${c.l3[0]}" y="${c.l3[1] + 4}" text-anchor="middle">L3 inspection</text>`;
  s += belt(`M375 70H420V220H375M375 120H420M375 170H420M420 145H${c.sorter[0] - c.sorter[2]}`, 'b-in');
  s += `<ellipse cx="${c.sorter[0]}" cy="${c.sorter[1]}" rx="${c.sorter[2]}" ry="${c.sorter[3]}" class="belt b-sort" stroke="#2b6cb0" stroke-width="9" fill="none"/><text x="${c.sorter[0]}" y="${c.sorter[1] + 4}" text-anchor="middle" class="lbl2">Tilt-tray sorter</text><text id="${id}-sortst" x="${c.sorter[0]}" y="${c.sorter[1] + 20}" text-anchor="middle"></text>`;
  s += belt(`M${c.sorter[0] + c.sorter[2]} ${c.sorter[1]}H770`, 'b-sort');
  s += c.chutes.map(([x, y], i) => `<rect x="${x - 42}" y="${y - 25}" width="86" height="52" rx="6" fill="#102033" stroke="#2f5d93"/><text x="${x - 36}" y="${y - 14}" style="font-size:10px;fill:#cfe0f5" id="${id}-ch${i}">Make-up ${i + 1}</text>`).join('');
  s += `<rect x="${c.dock[0] - 20}" y="${c.dock[1] - 30}" width="36" height="60" rx="4" fill="#0f2b1f" stroke="#22c55e"/><text x="${c.dock[0] - 2}" y="${c.dock[1] + 44}" text-anchor="middle">Tractor dock</text>`;
  s += belt(`M${c.adock[0] - 20} ${c.adock[1]}H${c.rc[3][0] + 50}`, 'b-rc') + c.rc.map(([x, y], i) => `<ellipse cx="${x}" cy="${y}" rx="55" ry="20" class="belt b-rc" stroke="#2f855a" stroke-width="6" fill="none"/><text x="${x}" y="${y + 4}" text-anchor="middle">Reclaim ${[1, 3, 5, 8][i]}</text>`).join('');
  s += `<text x="${c.adock[0]}" y="${c.adock[1] + 30}" text-anchor="middle">Arrival dock</text><g id="${id}-bags"></g><text x="10" y="412" style="fill:#5f7598">CONCEPTUAL BHS SCHEMATIC — bag positions from simulated scan events</text></svg>`;
  return s;
}
function chuteOf(rid) {return hash(rid) % 8}
function bagXY(b, tf) {
  const c = BH, age = tf - b.t0, j = (b.h % 13) - 6, k = (b.h >> 4) % 9;
  switch (b.st) {
    case 'CHECK-IN': {const p = c.ci[b.h % 3]; return [p[0] + 50 + k * 3, p[1] + j * .6]}
    case 'ID SCAN': {const p = c.ci[b.h % 3], q = clamp(age, 0, 1); return [p[0] + 60 + (c.atr[0] - p[0] - 60) * q, p[1] + (c.atr[1] - p[1]) * q]}
    case 'SCREEN Q': return [270 + j, c.atr[1] + j * 4];
    case 'SCREENING L1': {const e = c.eds[b.h % 4]; return [e[0] - 18 + clamp(age, 0, 1) * 50, e[1] + j * .5]}
    case 'SCREENING L2': return [c.l2[0] - 30 + k * 7, c.l2[1] - 22];
    case 'L3 INSPECTION': return [c.l3[0] - 30 + k * 7, c.l3[1]];
    case 'SORT Q': return [430 + (k * 9) % 60, 145 + j];
    case 'SORTING': {const a = (b.h % 628) / 100 + age * 2.2; return [c.sorter[0] + Math.cos(a) * c.sorter[2], c.sorter[1] + Math.sin(a) * c.sorter[3]]}
    case 'MAKE-UP': {const p = c.chutes[chuteOf(b.r)]; return [p[0] - 34 + (b.h % 10) * 7.4, p[1] - 4 + ((b.h >> 3) % 4) * 7]}
    case 'LOADING': {const p = c.chutes[chuteOf(b.r)], q = clamp(age, 0, 1); return [p[0] + (c.dock[0] - p[0]) * q, p[1] + (c.dock[1] - p[1]) * q]}
    case 'UNLOADING': return [c.adock[0] + j, c.adock[1] + k - 4];
    case 'TO RECLAIM': {const t = c.rc[[0, 1, 2, 3][b.h % 4]], q = clamp(age / 5, 0, 1); return [c.adock[0] - 20 - (c.adock[0] - 20 - t[0]) * q, c.adock[1]]}
    case 'ON RECLAIM': {const t = c.rc[b.h % 4], a = (b.h % 628) / 100 + age * .9; return [t[0] + Math.cos(a) * 55, t[1] + Math.sin(a) * 20]}
    case 'TRANSFER': {const q = clamp(age / 8, 0, 1); return [c.adock[0] - (c.adock[0] - 270) * q, c.adock[1] - (c.adock[1] - c.atr[1]) * q]}
  }
  return null;
}
function mountBHS(id) {
  const m = {id, kind: 'bhs', pool: []};
  m.frame = tf => {
    const s = document.getElementById(id); if (!s) return; const g = s.querySelector('#' + id + '-bags'); let n = 0;
    for (const i of S.Bact) {const b = S.B[i]; if (b.st == 'PLANNED' || b.st == 'ON AIRCRAFT' || b.st == 'LOADED') continue; const p = bagXY(b, tf); if (!p) continue;
      let e = m.pool[n]; if (!e) {e = m.pool[n] = document.createElementNS(NS, 'rect'); e.setAttribute('width', 6); e.setAttribute('height', 4); e.setAttribute('rx', 1); e.setAttribute('class', 'hit'); g.appendChild(e); e.onclick = () => inspect('bag', e.dataset.b)}
      e.dataset.b = b.id; e.style.display = ''; e.setAttribute('x', (p[0] - 3).toFixed(1)); e.setAttribute('y', (p[1] - 2).toFixed(1));
      e.setAttribute('fill', b.st == 'L3 INSPECTION' || b.st == 'SECURITY HOLD' ? '#ef4444' : b.st == 'SCREENING L2' ? '#f59e0b' : b.fromR || b.st == 'TRANSFER' ? '#c084fc' : b.arr ? '#34d399' : '#60a5fa');
      e.setAttribute('stroke', sel && sel.k == 'bag' && sel.id == b.id ? '#fff' : 'none'); if (++n > 900) break}
    for (let k = n; k < m.pool.length; k++) m.pool[k].style.display = 'none';
  };
  m.liveUpd = () => {
    const s = document.getElementById(id); if (!s) return; const f = S.bhs.fault && !S.bhs.manual;
    s.querySelectorAll('.b-sort').forEach(e => e.classList.toggle('stop', !!S.bhs.fault)); s.querySelector('#' + id + '-sortst').textContent = S.bhs.fault ? (S.bhs.manual ? 'FAULT — manual sort 6 bags/min' : 'FAULT — sorter stopped') : 'running · 60 bags/min';
    s.querySelector('#' + id + '-sortst').style.fill = S.bhs.fault ? '#fca5a5' : '#86efac';
    const lab = {}; for (const r of S.R) if (r.dep && r.offBlk == null && r.dep.std - 180 < S.t && !r.dep.cancelled) {const c = chuteOf(r.id); if (!lab[c] || r.dep.std < lab[c].dep.std) lab[c] = r}
    for (let i = 0; i < 8; i++) {const t = s.querySelector('#' + id + '-ch' + i); if (t) t.textContent = lab[i] ? `${lab[i].dep.fl} · ${loc(lab[i].tobt || lab[i].dep.std)}` : 'Make-up ' + (i + 1)}
  };
  m.reset = () => {m.pool.forEach(e => e.remove()); m.pool = []};
  MAPS.push(m); m.liveUpd(); return m;
}
function frame() {const tf = S.t + frac(); for (const m of MAPS) try {m.frame(tf)} catch (e) {console.error(e)} requestAnimationFrame(frame)}
