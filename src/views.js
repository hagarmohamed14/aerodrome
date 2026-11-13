// ===================== MODULE VIEWS (part 1: overview, operations, baggage & ground) =====================
const VIEWS = {};
const kpiTile = (l, v, s, click, cls) => `<div class="k ${click ? 'cl' : ''}" ${click ? `onclick="${click}"` : ''}><span>${l}</span><b class="${cls || ''}">${v}</b>${s ? `<i>${s}</i>` : ''}</div>`;
const sevB = a => bd(a.sev == 'cr' ? 'CRITICAL' : a.sev == 'wn' ? 'CAUTION' : 'INFO', a.sev == 'info' ? 'in' : a.sev);
const onGround = r => r.onBlk != null && r.offBlk == null && r.ph != 'DIVERTED';
const projOff = r => r.offBlk ?? (r.tobt != null ? Math.max(S.t, r.tobt) + (r.mx ? Math.max(0, (S.defects.find(d => d.id == r.mx) || {}).estReady - S.t || 0) : 0) + (r.hold ? Math.max(0, r.hold.until - Math.max(S.t, r.tobt)) : 0) : null);
let ovBig = true; // overview map fills the page by default; summary panels on demand
function toggleBig() {ovBig = !ovBig; renderPage()}
addEventListener('keydown', e => {if (e.key == 'Escape' && !ovBig && grp == 'ov') toggleBig()});
function setLayer(k, v) {LAYERS[k] = v; for (const m of MAPS) {m.liveUpd && m.liveUpd(); m.reset && m.kind != 'bhs' && m.reset()}}

// ---------- OVERVIEW ----------
VIEWS.ov = {
  html: () => `<div class="ov${ovBig ? ' big' : ''}">
  <div class="card vis"><div class="vh"><b style="font-size:13px">Cairo International (CAI) — live simulation</b>
    <div class="seg" role="tablist">${[['aerial', 'Aerial image'], ['ops', '2D operational map'], ['3d', '3D digital twin']].map(([k, n]) => `<button class="${mapMode == k ? 'on' : ''}" onclick="mapMode='${k}';savePrefs();renderPage()">${n}</button>`).join('')}</div>
    <div class="lay">${[['ac', 'Aircraft'], ['veh', 'Vehicles'], ['stands', 'Stands'], ['zones', 'Zones'], ['alerts', 'Alerts'], ['labels', 'Labels']].map(([k, n]) => `<label><input type="checkbox" ${LAYERS[k] ? 'checked' : ''} onchange="setLayer('${k}',this.checked)">${n}</label>`).join('')}</div>
    <span class="sp"></span><span data-live="wxChip"></span><button class="btn" onclick="toggleBig()" title="${ovBig ? 'Show operational & business summaries, alerts and timeline' : 'Map full screen (Esc)'}">${ovBig ? '▦ Panels' : '⤢ Full screen'}</button></div>
    <div class="stage" id="stage"></div></div>
  <div class="side"><div class="card"><div class="ch">Operational summary<span class="sp"></span><span class="tag">simulated</span></div><div data-live="opsSum"></div></div>
    <div class="card"><div class="ch">Business summary<span class="sp"></span>${curSeg()}</div><div data-live="bizSum"></div></div>
    <div class="card" style="flex:1;min-height:120px"><div class="ch">Weather, restrictions & resources</div><div data-live="restr"></div></div></div>
  <div class="bot"><div class="card"><div class="ch">Alerts<span class="sp"></span><span data-live="alCount"></span></div><div data-live="alertList"></div></div>
    <div class="card"><div class="ch">Global event timeline<span class="sp"></span><button class="btn" onclick="go('saf','reports')">Full log</button></div><div data-live="timeline"></div><div data-live="evlog"></div></div></div></div>`,
  mount: () => {
    const st = $('#stage');
    const leg = `<div class="legend"><span><i style="background:#60a5fa"></i>Departure</span><span><i style="background:#34d399"></i>Arrival</span><span><i style="background:#f59e0b"></i>Constrained</span><span><i style="background:#ef4444"></i>Tech restriction</span><span><i style="background:#c084fc"></i>Diversion</span></div>`;
    if (mapMode == 'aerial') {st.innerHTML = aerialSVG('m1') + `<div class="disc"><b>Illustrative image</b> — not a live camera feed or verified aerial photograph. Markers are projected from the <b>simulated</b> state (approximate positions).</div>${leg}
      <div style="position:absolute;top:10px;right:10px;width:min(420px,42%);border:1px solid var(--ln2);border-radius:8px;overflow:hidden;background:var(--stage,#07101d);box-shadow:0 10px 30px var(--shadow)"><div class="sm" style="padding:3px 8px;border-bottom:1px solid var(--ln);display:flex"><span>Airfield ops map (simulated)</span><span class="sp"></span><a href="#" style="color:var(--ac)" onclick="mapMode='ops';renderPage();return false">expand</a></div><div style="position:relative;aspect-ratio:1400/530">${opsSVG('mini')}</div></div>`;
      mountAerial('m1'); mountOps('mini')}
    else if (mapMode == 'ops') {st.innerHTML = opsSVG('m1') + `<div class="disc"><b>Conceptual operational map</b> — not an official aerodrome chart. All aircraft & vehicle positions are simulated.</div>` + leg; mountOps('m1', {vlabels: 1})}
    else {st.innerHTML = twin3dHTML('m1') + `<div class="disc"><b>3D digital-twin view</b> (2.5D perspective of the conceptual layout) — simulated positions only.</div>` + leg; mountOps('m1'); requestAnimationFrame(() => fit3d('m1')); window.onresize = () => fit3d('m1')}
  }
};
LIVE.wxChip = () => `<span class="pill" title="Synthetic weather">${S.wx.c} · ${S.wx.vis} km · ${S.wx.wind} kt · ${S.wx.temp.toFixed(0)}°C${S.wx.light ? ' · ⚡ ramp stop' : ''}</span>`;
LIVE.opsSum = () => {
  const arr = S.R.filter(r => r.arr), dep = S.R.filter(r => r.dep), landed = arr.filter(r => r.onBlk != null && r.onBlk >= 0).length, gone = dep.filter(r => r.offBlk != null && r.offBlk >= 0).length;
  const nextA = arr.filter(r => r.onBlk == null && !r.diverted && r.eta < S.t + 60).length, nextD = dep.filter(r => r.offBlk == null && !r.dep.cancelled && (r.tobt ?? r.dep.std) < S.t + 60).length;
  const late = dep.filter(r => r.offBlk == null && r.tobt != null && S.t > r.tobt + 15).length + dep.filter(r => r.offBlk != null && r.offBlk - r.dep.std > 15).length;
  const cont = STANDS.filter(s => s.kind == 'contact'), rem = STANDS.filter(s => s.kind != 'contact'), occ = l => l.filter(s => S.stOcc[s.id]).length;
  const inSys = S.Bact.filter(i => !['PLANNED', 'ON AIRCRAFT', 'LOADED'].includes(S.B[i].st)).length, q = S.Bact.filter(i => S.B[i].st == 'SORT Q').length;
  const veh = S.V.filter(v => v.st != 'IDLE' && !v.down).length, dn = S.V.filter(v => v.down || v.st == 'UNAVAILABLE').length;
  const divP = S.div.filter(d => d.status == 'REQUESTED').length, divA = S.R.filter(r => r.op == 'diversion' && r.offBlk == null).length, divOut = S.R.filter(r => r.diverted).length;
  const cap = [1, 2].map(n => S.rw[n].open ? bd('RWY ' + n + ' open', 'ok') : bd('RWY ' + n + ' closed', 'cr')).join(' ');
  return `<div class="kp">${kpiTile('Arrivals', landed + '/' + arr.length, nextA + ' due in 60 min', "go('ops','flights')")}${kpiTile('Departures', gone + '/' + dep.length, nextD + ' due in 60 min', "go('ops','flights')")}
  ${kpiTile('Avg dep. delay', avgDelay(S).toFixed(1) + ' min', late + ' flights >15 min', "go('ops','flights')", late > 3 ? 'neg' : '')}${kpiTile('Diversions', divP + divA, `${divP} pending · ${divOut} diverted away`, "go('saf','emerg')", divP ? 'neg' : '')}
  ${kpiTile('Contact stands', occ(cont) + '/' + cont.length, `remote/other ${occ(rem)}/${rem.length}`, "go('ops','stands')")}${kpiTile('Baggage in BHS', inSys, q ? q + ' queued at sorter' : 'flowing', "go('bag','flow')", q > 30 ? 'neg' : '')}
  ${kpiTile('Ground vehicles', veh + ' active', dn ? dn + ' unavailable' : S.V.length + ' in fleet', "go('bag','fleet')", dn ? 'neg' : '')}${kpiTile('Pax in terminals', kfmt(Object.values(S.occ).reduce((a, b) => a + b, 0)), 'all terminals', "go('pax','services')")}</div>
  <div class="row" style="margin-top:8px">${cap}<span class="mu sm">arr spacing ${arrSpacing(S)} min · dep ${depSpacing(S)} min${mixed(S) ? ' · mixed-mode' : ''}</span></div>`;
};
LIVE.bizSum = () => {
  const p = pnl(S), f = energyFinal(S), park = S.L.filter(e => e.payee == 'Airport' && (e.cat == 'Aircraft parking' || e.cat == 'Overstay / stand blocking') && e.status != 'waived').reduce((a, e) => a + e.usd, 0);
  const prov = S.R.filter(onGround).reduce((a, r) => a + parkingCalc(S, r).usd, 0), base = BASE.snap.filter(x => x.t <= S.t).pop() || {op: 0}, d = p.op - base.op;
  return `<div class="kp">${kpiTile('Modeled revenue', mk(p.net), 'recognised (net of provision)', "go('biz','pnl')")}${kpiTile('Operating expenses', mk(p.costTot), 'airport-borne', "go('biz','pnl')")}
  ${kpiTile('Est. operating profit', mk(p.op), `${d >= 0 ? '+' : ''}${mk(d)} vs forecast`, "go('biz','pnl')", p.op >= 0 ? 'pos' : 'neg')}${kpiTile('Parking & overstay', mk(park), '+' + mk(prov) + ' accruing on stand', "go('biz','parking')")}
  ${kpiTile('Energy now', kfmt(S.en.kwTot) + ' kW', 'peak ' + kfmt(S.en.peakKw) + ' kW', "go('biz','energy')")}${kpiTile('Utilities cost', mk(egp2usd(S, f.totalEgp)), kfmt(f.kwh) + ' kWh today', "go('biz','energy')")}</div>
  <p class="note">All amounts are model estimates from illustrative tariffs — see Energy & Finance › Tariffs & Assumptions.</p>`;
};
LIVE.restr = () => {
  const L = [];
  if (S.wx.c != 'CAVOK') L.push(['wn', 'Weather: ' + S.wx.c, `vis ${S.wx.vis} km · wind ${S.wx.wind} kt`]);
  if (S.wx.light) L.push(['cr', 'Lightning ramp suspension', 'pushback, fuelling, loading stopped']);
  for (const n of [1, 2]) if (!S.rw[n].open) L.push(['cr', 'RWY ' + n + ' closed', 'mixed-mode on remaining runway']);
  if (S.bhs.fault) L.push(['cr', 'BHS sorter failure', S.bhs.manual ? 'manual sort 6 bags/min' : 'sortation stopped']);
  if (S.tugDown) L.push(['wn', 'Pushback tugs unavailable', 'departures cannot push']);
  if (S.spike) L.push(['wn', 'T3 HVAC energy spike', '×' + S.spike.mult + ' chiller fault']);
  for (const d of S.defects.filter(d => !/RELEASED/.test(d.status))) L.push(['cr', 'Maintenance: ' + fid(S.rot[d.r]) + ' ' + d.ata, d.status, `inspect('def','${d.id}')`]);
  for (const r of S.R.filter(r => r.hold && S.t < r.hold.until)) L.push(['wn', 'Operator hold ' + fid(r), r.hold.reason, `inspect('rot','${r.id}')`]);
  for (const d of S.div.filter(d => d.status == 'REQUESTED')) L.push(['cr', 'Diversion request ' + d.fl, 'awaiting authorised decision', "go('saf','emerg')"]);
  return L.length ? L.map(([c, t, s, a]) => `<div class="al ${c}" ${a ? `onclick="${a}"` : ''} style="${a ? '' : 'cursor:default'}"><b>${t}</b><div class="mu sm">${s}</div></div>`).join('') : '<div class="empty">No active restrictions — CAVOK, both runways open, BHS & fleet normal.</div>';
};
LIVE.alCount = () => {const n = S.al.filter(a => !a.res && a.sev != 'info').length; return n ? bd(n + ' open', 'wn') : bd('none', 'ok')};
LIVE.alertList = () => {const l = S.al.filter(a => !a.res).slice(0, 10); return l.length ? l.map(alHtml).join('') : '<div class="empty">No open alerts. Inject a scenario from the top bar.</div>'};
LIVE.timeline = () => {
  const X = t => (t / DAY_END * 100).toFixed(2) + '%', pts = S.al.filter(a => a.sev != 'info').slice(0, 120);
  return `<div class="timeline"><div class="ax"></div>${[0, 180, 360, 540, 720, 900, 1080].map(t => `<span class="hr" style="left:${X(t)}">${loc(t)}</span>`).join('')}
  ${pts.map(a => `<span class="dot" title="${esc(loc(a.t) + ' ' + a.msg)}" onclick="inspect('alert','${a.id}')" style="left:${X(a.t)};background:${a.sev == 'cr' ? 'var(--cr)' : 'var(--wn)'}"></span>`).join('')}<span class="now" style="left:${X(S.t)}"></span></div>`;
};
LIVE.evlog = () => `<div class="tw" style="max-height:110px"><table>${S.ev.slice(0, 8).map(e => `<tr><td class="mu">${loc(e.t)}</td><td>${e.type}</td><td>${esc(e.f)}</td><td class="mu">${esc(e.msg)}</td></tr>`).join('')}</table></div>`;

// ---------- AIRPORT OPERATIONS ----------
let flQ = '', flF = 'all';
VIEWS['ops.flights'] = {sub: 'Arrivals, departures and flight plans — schedule is illustrative; states are simulated.',
  html: () => `<div class="card" style="margin-bottom:12px"><div class="row"><input placeholder="Filter flight / airline / reg / airport" value="${esc(flQ)}" oninput="flQ=this.value;live(true)" style="width:280px">
    <div class="seg">${[['all', 'All'], ['act', 'Active'], ['dly', 'Delayed'], ['sched', 'Scheduled'], ['charter', 'Charter'], ['private', 'Private'], ['diversion', 'Diversions']].map(([k, n]) => `<button class="${flF == k ? 'on' : ''}" onclick="flF='${k}';renderPage()">${n}</button>`).join('')}</div></div></div>
    <div class="g g2"><div class="card"><div class="ch">Arrivals</div><div data-live="arrTab" class="tw" style="max-height:62vh"></div></div><div class="card"><div class="ch">Departures</div><div data-live="depTab" class="tw" style="max-height:62vh"></div></div></div>`};
function flFilter(r) {
  const q = flQ.toLowerCase(); if (q && ![r.arr && r.arr.fl, r.dep && r.dep.fl, r.al, r.reg, r.arr && r.arr.apt, r.dep && r.dep.apt].join(' ').toLowerCase().includes(q)) return false;
  if (flF == 'act') return !['SCHEDULED', 'COMPLETED'].includes(r.ph); if (flF == 'dly') return totDelay(r) > 0 || r.block; if (['sched', 'charter', 'private', 'diversion'].includes(flF)) return r.op == flF; return true;
}
LIVE.arrTab = () => {const l = S.R.filter(r => r.arr && flFilter(r)).sort((a, b) => a.arr.sta - b.arr.sta);
  return `<table><tr><th>Flight</th><th>From</th><th>Type</th><th>STA</th><th>ETA / on-block</th><th>Stand</th><th>Status</th></tr>${l.map(r => `<tr class="r ${sel && sel.id == r.id ? 'sel' : ''}" onclick="inspect('rot','${r.id}')"><td><b>${r.arr.fl}</b> <span class="mu sm">${r.al}</span></td><td>${r.arr.apt}</td><td>${r.type}</td><td>${loc(r.arr.sta)}</td>
  <td>${r.onBlk != null ? loc(r.onBlk) : r.diverted ? '—' : loc(r.eta + 7)}${r.onBlk != null && r.onBlk - r.arr.sta > 5 ? ` <span class="neg sm">+${r.onBlk - r.arr.sta}</span>` : ''}</td><td>${r.stand}${r.stand != r.planStand ? ' <span class="tag">was ' + r.planStand + '</span>' : ''}</td><td>${bd(r.onBlk != null ? 'ON BLOCK' : r.ph, r.onBlk != null ? 'ok' : phCls(r))}</td></tr>`).join('')}</table>`};
LIVE.depTab = () => {const l = S.R.filter(r => r.dep && flFilter(r)).sort((a, b) => a.dep.std - b.dep.std);
  return `<table><tr><th>Flight</th><th>To</th><th>Type</th><th>STD</th><th>TOBT / off-block</th><th>Stand</th><th>Status</th><th>Constraint</th></tr>${l.map(r => {const dl = r.offBlk != null ? r.offBlk - r.dep.std : r.tobt != null && S.t > r.tobt ? S.t - r.dep.std : 0;
  return `<tr class="r ${sel && sel.id == r.id ? 'sel' : ''}" onclick="inspect('rot','${r.id}')"><td><b>${r.dep.fl}</b> <span class="mu sm">${r.al}</span></td><td>${r.dep.apt}</td><td>${r.type}</td><td>${r.dep.std >= DAY_END ? 'next day' : loc(r.dep.std)}</td>
  <td>${r.offBlk != null ? loc(r.offBlk) : r.tobt != null ? (r.tobt >= DAY_END ? '—' : loc(r.tobt)) : '—'}${dl > 0 ? ` <span class="neg sm">+${dl}</span>` : ''}</td><td>${r.stand}</td><td>${bd(r.dep.cancelled ? 'CANCELLED' : r.offBlk != null && r.ph != 'COMPLETED' ? r.ph : r.offBlk != null ? 'DEPARTED' : r.ph == 'BOARDING' ? 'BOARDING' : r.onBlk != null || !r.arr ? 'ON STAND' : 'INBOUND', r.dep.cancelled ? 'cr' : phCls(r))}</td><td class="mu sm">${esc(r.block || '')}</td></tr>`}).join('')}</table>`};

VIEWS['ops.stands'] = {sub: 'Stand occupancy, allocation conflicts and overstay — linked to parking charges.',
  html: () => `<div class="g g2"><div class="card" style="padding:0;overflow:hidden"><div class="vh"><b>Apron (simulated)</b><span class="sp"></span><span class="mu sm">click a stand or aircraft</span></div><div class="stage" style="aspect-ratio:1400/530">${opsSVG('m2')}</div></div>
    <div class="card"><div class="ch">Stand timeline — planned (outline) vs actual (fill)</div><div data-live="gantt"></div></div></div>
    <div class="card" style="margin-top:12px"><div class="ch">Stand status</div><div data-live="standTab" class="tw"></div></div>`,
  mount: () => mountOps('m2', {vlabels: 0})};
LIVE.gantt = () => {
  const list = STANDS.filter(s => s.kind != 'mro' || S.R.some(r => r.stand == s.id)), t0 = Math.max(0, S.t - 180), t1 = t0 + 420, W = 620, rh = 13, H = list.length * rh + 18, X = t => 50 + (clamp(t, t0, t1) - t0) / (t1 - t0) * (W - 56);
  let s = `<svg viewBox="0 0 ${W} ${H}" style="width:100%">`;
  for (let t = Math.ceil(t0 / 60) * 60; t <= t1; t += 60) s += `<line x1="${X(t)}" x2="${X(t)}" y1="0" y2="${H - 14}" style="stroke:var(--grid)"/><text x="${X(t)}" y="${H - 3}" text-anchor="middle">${loc(t)}</text>`;
  list.forEach((st, i) => {const y = i * rh + 2; s += `<text x="4" y="${y + 9}">${st.id}</text>`;
    for (const r of S.R.filter(r => r.planStand == st.id || r.stand == st.id)) {
      if (r.planStand == st.id && r.planOn < t1 && Math.min(r.planOff, DAY_END + 60) > t0) s += `<rect x="${X(r.planOn)}" y="${y}" width="${Math.max(1, X(Math.min(r.planOff, t1)) - X(r.planOn))}" height="${rh - 3}" fill="none" stroke="#3b5276" rx="2"><title>${fid(r)} planned ${loc(r.planOn)}–${loc(r.planOff)}</title></rect>`;
      if (r.stand == st.id && r.onBlk != null) {const e = r.offBlk ?? S.t, ov = r.dep && r.allowedOff != null && e > r.allowedOff + S.cfg.overstay.graceMin;
        s += `<g class="hit" onclick="inspect('rot','${r.id}')"><rect x="${X(r.onBlk)}" y="${y + 2}" width="${Math.max(1, X(e) - X(r.onBlk))}" height="${rh - 7}" rx="2" fill="${r.op == 'diversion' ? '#9085e9' : '#3987e5'}"/>${ov ? `<rect x="${X(r.allowedOff)}" y="${y + 2}" width="${Math.max(0, X(e) - X(r.allowedOff))}" height="${rh - 7}" fill="#c98500"/>` : ''}<title>${fid(r)} on-block ${loc(r.onBlk)}${r.offBlk != null ? ' off ' + loc(r.offBlk) : ' (on stand)'}${ov ? ' — overstay' : ''}</title></g>`}}});
  s += `<line x1="${X(S.t)}" x2="${X(S.t)}" y1="0" y2="${H - 14}" stroke="#38bdf8" stroke-width="1.5"/></svg>`;
  return s + `<div class="row sm mu"><span><i style="display:inline-block;width:12px;height:8px;border:1px solid #3b5276;margin-right:4px"></i>planned</span><span><i style="display:inline-block;width:12px;height:8px;background:#3987e5;margin-right:4px"></i>actual</span><span><i style="display:inline-block;width:12px;height:8px;background:#c98500;margin-right:4px"></i>overstay beyond allowed + grace</span></div>`;
};
LIVE.standTab = () => `<table><tr><th>Stand</th><th>Type</th><th>Max</th><th>Occupant</th><th>On-block</th><th>Allowed off</th><th>Projected off</th><th>Overstay</th><th>Next planned</th><th>Status</th></tr>${STANDS.map(st => {
  const o = S.rot[S.stOcc[st.id]], nx = S.R.filter(r => r.stand == st.id && r.onBlk == null && r.arr && !r.diverted).sort((a, b) => a.eta - b.eta)[0], po = o && projOff(o), ov = o && o.allowedOff != null ? Math.max(0, (po ?? S.t) - o.allowedOff - S.cfg.overstay.graceMin) : 0;
  const conf = o && nx && po != null && po > nx.eta + 7 - 10;
  return `<tr class="r" onclick="inspect('stand','${st.id}')"><td><b>${st.id}</b></td><td>${st.kind} · ${st.term}</td><td>${st.max}</td><td>${o ? fid(o) + ' ' + o.type : S.stRes[st.id] ? bd('RESERVED ' + fid(S.rot[S.stRes[st.id]]), 'vi') : '<span class="mu">free</span>'}</td><td>${o ? loc(Math.max(o.onBlk, -360)) : ''}</td><td>${o && o.allowedOff != null && o.allowedOff < DAY_END ? loc(o.allowedOff) : o ? 'night stop' : ''}</td>
  <td>${po != null && po < DAY_END ? loc(po) : ''}</td><td>${ov ? `<span class="neg">${Math.round(ov)} min</span>` : ''}</td><td>${nx ? fid(nx) + ' ' + loc(nx.eta + 7) : ''}</td><td>${conf ? bd('CONFLICT RISK', 'cr') : ov ? bd('OVERSTAY', 'wn') : o ? bd('OCCUPIED', 'in') : bd('AVAILABLE', 'ok')}</td></tr>`}).join('')}</table>`;

let cmpRes = null, cmpK = 'ts6';
VIEWS['ops.airfield'] = {sub: 'Runway status, capacity, taxiways and synthetic weather. Every action changes the shared state and is audited.',
  html: () => `<div class="g g3" data-live="rwyCards"></div>
  <div class="g g2" style="margin-top:12px"><div class="card"><div class="ch">Weather (synthetic — no METAR/TAF is generated)</div><div data-live="wxCard"></div>
    <div class="row" style="margin-top:8px">${['fog', 'wind', 'storm', 'sand', 'clear'].map(k => `<button class="btn" onclick="act('${k}')">${SCN[k]}</button>`).join('')}</div>
    <p class="note">Decision support lists options, not instructions: hold aircraft (delay ↑, fuel ↑) · reduce throughput · delay departures · reassign stands · suspend ramp tasks · divert. The authorised decision-maker chooses under approved procedures.</p></div>
  <div class="card"><div class="ch">Compare two runs (headless, same seed, full day)</div><div class="row"><select onchange="cmpK=this.value">${Object.entries(PRESETS).map(([k, p]) => `<option value="${k}" ${k == cmpK ? 'selected' : ''}>${p.name}</option>`).join('')}</select><button class="btn pri" onclick="runCompare()">Run baseline vs scenario</button></div><div id="cmpOut">${cmpHTML()}</div></div></div>
  <div class="card" style="margin-top:12px"><div class="ch">Taxiways & movement area (conceptual)</div><div data-live="twyTab"></div></div>`};
function act(k, c) {if (!can()) return; if (c && !confirm(c + '\n\nSensitive action — written to the audit log.')) return; scn(S, k, role); toast('Applied: ' + (SCN[k] || k)); live(true)}
function runCompare() {const a = kpi(run(SEED, null)), b = kpi(run(SEED, cmpK)); cmpRes = [a, b, cmpK]; $('#cmpOut').innerHTML = cmpHTML()}
function cmpHTML() {if (!cmpRes) return '<p class="mu">Runs both scenarios from 06:00 to 24:00 with identical seed and compares KPIs and the financial model.</p>'; const [a, b, k] = cmpRes;
  const rows = [['Departures completed', 'dep'], ['Arrivals on block', 'arr'], ['Avg departure delay (min)', 'avg'], ['On-time departures % (≤15 min)', 'ot'], ['Missed approaches', 'mad'], ['Mishandled bags', 'bagsMiss'], ['Alerts raised', 'al'],
    ['Recognised revenue', 'net', 1], ['Airport operating costs', 'cost', 1], ['Est. operating profit', 'op', 1], ['Energy & utilities cost', 'energyUsd', 1], ['Stand opportunity cost (memo)', 'opp', 1]];
  return `<table><tr><th>KPI</th><th class="n">Baseline</th><th class="n">${PRESETS[k].name}</th><th class="n">Δ</th></tr>${rows.map(([n, f, m]) => {const d = b[f] - a[f]; return `<tr><td>${n}</td><td class="n">${m ? money(a[f]) : a[f]}</td><td class="n">${m ? money(b[f]) : b[f]}</td><td class="n ${d > 0 == (f == 'net' || f == 'op' || f == 'dep' || f == 'arr' || f == 'ot') ? 'pos' : d ? 'neg' : ''}">${m ? money(d) : +d.toFixed(1)}</td></tr>`}).join('')}</table>`}
LIVE.rwyCards = () => [1, 2].map(n => {const w = S.rw[n], use = S.R.filter(r => r.rw == n && ['FINAL', 'LANDING', 'TAKEOFF'].includes(r.ph)).map(fid);
  return `<div class="card"><div class="ch">RWY ${n} ${n == 1 ? '05L/23R' : '05R/23L'} <span class="tag">conceptual</span><span class="sp"></span>${w.open ? bd('OPEN', 'ok') : bd('CLOSED', 'cr')}</div>
  <div class="kv"><span>Primary use</span><b>${n == 1 ? 'Arrivals' : 'Departures'}${mixed(S) && w.open ? ' + mixed-mode' : ''}</b><span>Capacity</span><b>${w.open ? Math.round(60 / arrSpacing(S)) + ' arr/h · ' + Math.round(60 / depSpacing(S)) + ' dep/h' : '0'}</b><span>Next slot</span><b>arr ${loc(Math.max(S.t, w.nextArr))} · dep ${loc(Math.max(S.t, w.nextDep))}</b><span>Occupied by</span><b>${use.join(', ') || '—'}</b></div>
  <div class="row" style="margin-top:8px">${w.open ? `<button class="btn dg" onclick="act('rwy${n}','Close RWY ${n} for inspection (simulated)?')">Close runway</button>` : `<button class="btn" onclick="act('rwyok','Reopen runways after authorised inspection release?')">Reopen (authorised release)</button>`}</div></div>`}).join('') +
  `<div class="card"><div class="ch">Arrival sequence (next 60 min)</div>${S.R.filter(r => r.arr && r.onBlk == null && !r.diverted && r.eta < S.t + 60 && r.ph != 'SCHEDULED').sort((a, b) => a.eta - b.eta).slice(0, 8).map(r => `<div class="row"><b>${fid(r)}</b>${bd(r.ph, phCls(r))}<span class="mu sm">ETA ${loc(r.eta)}${r.emerg ? ' · PRIORITY' : ''}</span></div>`).join('') || '<div class="empty">No inbound traffic</div>'}</div>`;
LIVE.wxCard = () => `<div class="kv"><span>Condition</span><b>${S.wx.c}</b><span>Visibility</span><b>${S.wx.vis} km${S.wx.vis < 1.5 ? ' — LVP active' : ''}</b><span>Wind</span><b>${S.wx.wind} kt</b><span>Temperature</span><b>${S.wx.temp.toFixed(1)} °C (drives HVAC load)</b><span>Lightning</span><b>${S.wx.light ? 'ACTIVE — ramp suspended' : 'none'}</b><span>Effect</span><b>arr spacing ${arrSpacing(S)} min, dep ${depSpacing(S)} min${S.wx.vis < 1.5 ? ', taxi −35%, vehicles −40%' : ''}</b></div>`;
LIVE.twyTab = () => `<table><tr><th>Element</th><th>Status</th><th>Aircraft now</th><th>Notes</th></tr>${[['TWY A', 'Parallel to RWY 1; arrival flow', ['TAXI-IN']], ['TWY B', 'Parallel to RWY 2; departure flow', ['TAXI-OUT']], ['Apron taxilane', 'Contact-stand access & pushback', ['PUSHBACK']], ['West link', 'Seasonal / GA aprons', []], ['East link', 'MRO apron', []]].map(([n, d, ph]) =>
  `<tr><td>${n}</td><td>${S.wx.sand ? bd('FOD sweep due', 'wn') : bd('Available', 'ok')}</td><td>${S.R.filter(r => ph.includes(r.ph)).map(fid).join(', ') || '—'}</td><td class="mu">${d}</td></tr>`).join('')}</table>`;

VIEWS['ops.atc'] = {sub: 'Training simulation only — no separation minima or real clearances are generated.',
  html: () => `<div class="g g3" data-live="atcCols"></div><div class="card" style="margin-top:12px"><div class="ch">Handoffs<span class="sp"></span><button class="btn" onclick="act(S.hof?'hofok':'hof')">${'Toggle handoff-failure training'}</button></div><div data-live="hoTab" class="tw" style="max-height:44vh"></div></div>`};
LIVE.atcCols = () => {const col = (n, fn) => {const l = S.R.filter(fn); return `<div class="card"><div class="ch">${n}<span class="sp"></span>${bd('workload ' + l.length, l.length > 5 ? 'cr' : l.length > 3 ? 'wn' : 'ok')}</div>${l.map(r => `<div class="row" style="cursor:pointer" onclick="inspect('rot','${r.id}')"><b>${fid(r)}</b>${bd(r.ph, phCls(r))}<span class="mu sm">${esc(r.block || '')}</span></div>`).join('') || '<div class="empty">No traffic</div>'}</div>`};
  return col('Tower / Ground (TWR)', r => ['FINAL', 'LANDING', 'TAXI-IN', 'AWAITING STAND', 'PUSHBACK', 'TAXI-OUT', 'TAKEOFF'].includes(r.ph)) + col('Approach (APP)', r => ['APPROACH', 'HOLDING', 'DEPARTED'].includes(r.ph)) + col('Area control (ACC)', r => ['EN ROUTE', 'EN ROUTE OUT'].includes(r.ph))};
LIVE.hoTab = () => `<table><tr><th>ID</th><th>Flight</th><th>From</th><th>To</th><th>Requested</th><th>Ack</th><th></th></tr>${S.ho.slice().reverse().slice(0, 30).map(h => `<tr><td>${h.id}</td><td>${h.f}</td><td>${h.from}</td><td>${h.to}</td><td>${loc(h.t)}</td><td>${h.ack ? bd('ACK ' + loc(h.ack), 'ok') : bd('PENDING', 'wn')}</td><td>${h.ack ? '' : `<button class="btn" onclick="if(can()){const h=S.ho.find(x=>x.id=='${h.id}');h.ack=S.t;ev(S,'ATCHandoffAcknowledged',h.f,'manual retry');live(true)}">Retry</button>`}</td></tr>`).join('')}</table>`;

VIEWS['ops.terms'] = {sub: 'Terminal load, gates and services. Images are illustrative.',
  html: () => `<div class="g g2" data-live="termCards"></div>`};
const TIMG = {T1: 't1', T2: 't2', T3: 't3', STC: 't4'};
LIVE.termCards = () => TERMS.map(T => {const st = STANDS.filter(s => s.term == T || (T == 'STC' && s.kind == 'stc')), occ = st.filter(s => S.stOcc[s.id]).length, pax = Math.round(S.occ[T] || 0), kw = Object.values((S.en.kwhT[T] || {})).reduce((a, b) => a + b, 0);
  const nd = S.R.filter(r => r.dep && r.offBlk == null && (STAND[r.stand].term == T) && (r.tobt ?? r.dep.std) < S.t + 60).map(r => r.dep.fl), q = queueMin(T);
  return `<div class="card tcard" role="button" tabindex="0" title="Open ${ZONE[T].name} details" onclick="openTerm('${T}')" onkeydown="if(event.key=='Enter')openTerm('${T}')" style="padding:0;overflow:hidden"><div style="height:140px;background:url(${IMG[TIMG[T]]}) center/cover;position:relative"><span class="tag" style="position:absolute;left:8px;bottom:8px;background:#000a;color:#fff">illustrative image</span></div><div style="padding:12px">
  <div class="ch">${ZONE[T].name}<span class="sp"></span><span class="btn">Open terminal ›</span></div><div class="kp">${kpiTile('Pax in terminal', pax)}${kpiTile('Stands occupied', occ + '/' + st.length)}${kpiTile('Security queue', q + ' min', '', '', q > 20 ? 'neg' : '')}${kpiTile('Energy today', kfmt(kw) + ' kWh')}</div>
  <p class="mu sm" style="margin:8px 0 0">Departures next 60 min: ${nd.join(', ') || 'none'}</p></div></div>`}).join('');
function queueMin(T) {const lanes = {T1: 6, T2: 10, T3: 16, STC: 4}[T], rate = lanes * 150 / 60, inflow = S.R.filter(r => r.dep && r.offBlk == null && STAND[r.stand].term == T).reduce((a, r) => {const d = r.dep.std - S.t; return a + (d > 40 && d < 180 ? r.paxOut / 140 : 0)}, 0); return inflow ? Math.round(3 + 30 * inflow / rate) : 0} // fluid-queue approximation (illustrative)

// ---------- BAGGAGE & GROUND HANDLING ----------
VIEWS['bag.flow'] = {sub: 'Each bag is an individual simulated item linked to a pseudonymous passenger reference and flight.',
  html: () => `<div class="g" style="grid-template-columns:minmax(0,1fr) 320px"><div class="card" style="padding:0;overflow:hidden"><div class="vh"><b>Baggage handling system</b><span class="sp"></span><span class="mu sm">● departure ● arrival ● transfer ● L2 alarm ● hold — click a bag</span></div><div class="stage" style="aspect-ratio:1000/420">${bhsSVG('bh')}</div></div>
  <div class="g"><div class="card"><div class="ch">Sorter control</div><div class="row"><button class="btn dg" onclick="act('belt','Inject BHS sorter failure?')">Sorter failure</button><button class="btn" onclick="act('manual')">Manual sort</button><button class="btn" onclick="act('beltok')">Restore</button></div><div data-live="bhsStats" style="margin-top:8px"></div></div></div></div>
  <div class="card" style="margin-top:12px"><div class="ch">Flight readiness — baggage</div><div data-live="bagReady" class="tw"></div></div>`,
  mount: () => mountBHS('bh')};
LIVE.bhsStats = () => {const c = {}; for (const i of S.Bact) {const s = S.B[i].st; c[s] = (c[s] || 0) + 1}
  const rows = ['CHECK-IN', 'ID SCAN', 'SCREEN Q', 'SCREENING L1', 'SCREENING L2', 'L3 INSPECTION', 'SORT Q', 'SORTING', 'MAKE-UP', 'LOADING', 'UNLOADING', 'TO RECLAIM', 'ON RECLAIM', 'TRANSFER'];
  return `<div class="kv">${rows.map(r => `<span>${r}</span><b class="${r == 'SORT Q' && c[r] > 30 ? 'neg' : ''}">${c[r] || 0}</b>`).join('')}<span>Security holds</span><b>${S.B.filter(b => b.st == 'SECURITY HOLD').length}</b><span>Mishandled today</span><b class="${S.claims.length ? 'neg' : ''}">${S.claims.length}</b></div>`};
LIVE.bagReady = () => {const l = S.R.filter(r => r.dep && r.offBlk == null && r.op != 'private' && !r.dep.cancelled && (r.tobt ?? r.dep.std) < S.t + 120).sort((a, b) => (a.tobt ?? a.dep.std) - (b.tobt ?? b.dep.std));
  return `<table><tr><th>Flight</th><th>TOBT</th><th>Make-up</th><th class="n">Checked</th><th class="n">In screening</th><th class="n">Sort queue</th><th class="n">Make-up</th><th class="n">Loaded</th><th class="n">Transfer inbound</th><th>Status</th></tr>${l.map(r => {const b = rbags(S, r.id).filter(x => x.r == r.id && !x.arr), n = s => b.filter(x => s.includes(x.st)).length;
  const ready = r.tobt != null && bagsReady(S, r), risk = r.tobt != null && !ready && r.tobt - S.t < 20;
  return `<tr class="r" onclick="inspect('rot','${r.id}')"><td><b>${r.dep.fl}</b></td><td>${loc(r.tobt ?? r.dep.std)}</td><td>${chuteOf(r.id) + 1}</td><td class="n">${b.filter(x => x.st != 'PLANNED').length}/${b.length}</td><td class="n">${n(['SCREEN Q', 'SCREENING L1', 'SCREENING L2', 'L3 INSPECTION'])}</td><td class="n">${n(['SORT Q', 'SORTING'])}</td><td class="n">${n(['MAKE-UP', 'LOADING'])}</td><td class="n">${n(['LOADED'])}</td>
  <td class="n">${S.B.filter(x => x.tr == r.id && x.arr && x.st != 'MISSED FLIGHT').length}</td><td>${ready ? bd('READY', 'ok') : risk ? bd('AT RISK', 'cr') : bd('IN PROGRESS', 'in')}</td></tr>`}).join('')}</table>`};

let bagFl = null;
VIEWS['bag.track'] = {sub: 'QR tracking: open any bag to see its scan history. QR images are mock-ups, not standards-compliant codes.',
  html: () => `<div class="card" style="margin-bottom:12px"><div class="row"><input id="bagq" placeholder="Bag ID or passenger ref (PX-…)" style="width:280px" onkeydown="if(event.key=='Enter')bagFind()"><button class="btn pri" onclick="bagFind()">Track</button><span class="mu sm">or pick a flight below</span></div></div>
  <div class="g g2"><div class="card"><div class="ch">Flights</div><div data-live="bagFlights" class="tw" style="max-height:60vh"></div></div><div class="card"><div class="ch">Bags ${bagFl ? '— ' + fid(S.rot[bagFl]) : ''}</div><div data-live="bagList" class="tw" style="max-height:60vh"></div></div></div>`};
function bagFind() {const q = $('#bagq').value.trim().toUpperCase(); const b = S.B.find(x => x.id == q || x.px == q || x.id.includes(q)); b ? inspect('bag', b.id) : toast('No bag found')}
LIVE.bagFlights = () => `<table><tr><th>Flight</th><th>Dir</th><th class="n">Bags</th><th class="n">Done</th></tr>${S.R.filter(r => (S.rb[r.id] || []).length).sort((a, b) => (a.tobt ?? a.planOn) - (b.tobt ?? b.planOn)).map(r => {const b = rbags(S, r.id); return `<tr class="r ${bagFl == r.id ? 'sel' : ''}" onclick="bagFl='${r.id}';renderPage()"><td>${r.dep ? r.dep.fl : r.arr.fl}${r.arr && r.dep ? ' / ' + r.arr.fl : ''}</td><td>${r.arr && r.dep ? 'turn' : r.dep ? 'dep' : 'arr'}</td><td class="n">${b.length}</td><td class="n">${b.filter(x => ['LOADED', 'IN FLIGHT', 'COLLECTED'].includes(x.st)).length}</td></tr>`}).join('')}</table>`;
LIVE.bagList = () => bagFl ? `<table><tr><th>Bag</th><th>Passenger</th><th>Flight</th><th>Stage</th><th>Last scan</th></tr>${rbags(S, bagFl).slice(0, 300).map(b => `<tr class="r" onclick="inspect('bag','${b.id}')"><td>${b.id}</td><td>${b.px}</td><td>${b.fl}</td><td>${bd(b.st, /HOLD|MISSED/.test(b.st) ? 'cr' : /L2|L3|Q$/.test(b.st) ? 'wn' : '')}</td><td class="mu">${b.sc.length ? loc(b.sc[b.sc.length - 1][0]) : '—'}</td></tr>`).join('')}</table>` : '<div class="empty">Select a flight</div>';
function qr(tok) {const n = 21, h = hash(tok); let r = rng(h), s = ''; for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {const fin = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13); let on = fin ? (x % 6 == 0 || y % 6 == 0 || (x % 6 > 1 && x % 6 < 5 && y % 6 > 1 && y % 6 < 5) || x == 14 || x == 20) && !(x > 6 && x < 14 && y < 7) : r() > .5; if (on) s += `<rect x="${x}" y="${y}" width="1" height="1"/>`}
  return `<svg viewBox="-1 -1 23 23" width="120" style="background:#fff;border-radius:6px"><g fill="#000">${s}</g></svg>`}

VIEWS['bag.screen'] = {sub: 'Educational screening workflow — compliance and escalation only.',
  html: () => `<div class="g g2"><div class="card"><div class="ch">Hold-baggage screening workflow</div><div class="flow"><span>Check-in reconciliation</span>→<span>EDS L1 automatic</span>→<span>L2 operator review</span>→<span>L3 manual / ETD inspection</span>→<span>Clear or offload</span></div>
  <p class="note">An X-ray image cannot reliably identify every material, species or biological product. Suspected wildlife derivatives require documentary verification and examination by authorised specialists — escalate; never rely on the image alone. No bypass or evasion content, and no validated threat-detection model is implied.</p></div>
  <div class="card"><div class="ch">Live screening load</div><div data-live="scrStats"></div></div></div><div class="card" style="margin-top:12px"><div class="ch">Current escalations & holds</div><div data-live="scrList" class="tw"></div></div>`};
LIVE.scrStats = () => {const n = s => S.Bact.filter(i => S.B[i].st == s).length; return `<div class="kp">${kpiTile('Queue', n('SCREEN Q'))}${kpiTile('EDS L1', n('SCREENING L1'))}${kpiTile('L2 review', n('SCREENING L2'))}${kpiTile('L3 inspection', n('L3 INSPECTION'))}${kpiTile('Security holds', S.B.filter(b => b.st == 'SECURITY HOLD').length)}</div><p class="note">EDS capacity 45 bags/min (4 machines, illustrative). ~4% alarm to L2, ~0.7% to L3.</p>`};
LIVE.scrList = () => {const l = S.B.filter(b => ['SCREENING L2', 'L3 INSPECTION', 'SECURITY HOLD'].includes(b.st)).slice(0, 60); return l.length ? `<table><tr><th>Bag</th><th>Flight</th><th>Stage</th><th>Since</th><th>Action owner</th></tr>${l.map(b => `<tr class="r" onclick="inspect('bag','${b.id}')"><td>${b.id}</td><td>${b.fl}</td><td>${bd(b.st, b.st == 'SECURITY HOLD' ? 'cr' : 'wn')}</td><td>${loc(b.t0)}</td><td class="mu">${b.st == 'SECURITY HOLD' ? 'Security supervisor + airline (offload)' : 'Screening operator (authorised)'}</td></tr>`).join('')}</table>` : '<div class="empty">No escalations right now</div>'};

VIEWS['bag.ground'] = {sub: 'Turnaround tasks generated from flight events and served by the shared ground-vehicle fleet.',
  html: () => `<div class="card"><div class="ch">Turnaround board — aircraft on stand</div><div data-live="taBoard" class="tw"></div></div><div class="card" style="margin-top:12px"><div class="ch">Tasks waiting for a vehicle</div><div data-live="taWait"></div></div>`};
const TCOL = {PLANNED: '#26395a', WAITING: '#c98500', ENROUTE: '#3987e5', WORKING: '#199e70', DONE: '#2f4a6b'};
LIVE.taBoard = () => {const l = S.R.filter(r => onGround(r) && r.dep).sort((a, b) => a.tobt - b.tobt);
  return `<table><tr><th>Flight</th><th>Stand</th><th>TOBT</th><th>Tasks (planned · waiting · en route · working · done)</th><th>Constraint</th></tr>${l.map(r => {const ks = S.tasks.filter(k => k.r == r.id);
  return `<tr class="r" onclick="inspect('rot','${r.id}')"><td><b>${r.dep.fl}</b></td><td>${r.stand}</td><td>${r.tobt < DAY_END ? loc(r.tobt) : '—'}</td><td><div class="row" style="gap:3px">${ks.map(k => `<span class="b" style="background:${TCOL[k.st]};color:#fff" title="${k.kind}: ${k.st}${k.v ? ' · ' + k.v : ''}">${k.kind}${k.v ? ' · ' + k.v : ''}</span>`).join('')}</div></td><td class="mu sm">${esc(r.block || '')}</td></tr>`}).join('')}</table>`};
LIVE.taWait = () => {const l = S.tasks.filter(k => k.st == 'WAITING' && k.veh); return l.length ? l.map(k => `<div class="al wn" onclick="inspect('rot','${k.r}')"><b>${k.kind}</b> for ${fid(S.rot[k.r])} — ${S.wx.light && !k.emerg ? 'suspended — lightning ramp stop' : 'no ' + VNAME[k.veh] + ' available (' + (k.waitMin || 0) + ' min)'}</div>`).join('') : '<div class="empty">All tasks have vehicles assigned</div>'};

VIEWS['bag.fleet'] = {sub: 'Simulated ground support equipment — positions, tasks, routes and energy.',
  html: () => `<div class="card" style="padding:0;overflow:hidden"><div class="vh"><b>GSE map</b><span class="sp"></span>${Object.entries(VNAME).map(([k, n]) => `<span class="sm mu"><i style="display:inline-block;width:9px;height:6px;background:${VCOL[k]};margin-right:3px"></i>${n}</span>`).join(' ')}</div><div class="stage" style="aspect-ratio:1400/530">${opsSVG('m3')}</div></div>
  <div class="row" style="margin:12px 0"><button class="btn dg" onclick="act('tug')">All tugs unavailable</button><button class="btn" onclick="act('tugok')">Restore tugs</button></div><div class="card"><div class="ch">Fleet</div><div data-live="vehTab" class="tw"></div></div>`,
  mount: () => mountOps('m3', {vlabels: 1})};
LIVE.vehTab = () => `<table><tr><th>Unit</th><th>Type</th><th>Power</th><th>Owner</th><th>Status</th><th>Task</th><th>ETA</th><th class="n">km</th><th class="n">Energy</th><th>Restriction</th><th></th></tr>${S.V.map(v => {const k = v.task && S.tasks.find(x => x.id == v.task), eta = v.mv && !mvDone(S, v.mv) ? loc(v.mv.t0 + v.mv.dur) : '';
  return `<tr class="r" onclick="inspect('veh','${v.id}')"><td><b>${v.id}</b></td><td>${VNAME[v.type]}</td><td>${v.ev ? bd('electric', 'ok') : 'diesel'}</td><td>${v.owner == 'GH' ? 'Ground handler' : v.owner}</td><td>${bd(v.down ? 'OUT OF SERVICE' : v.st, v.down || v.st == 'UNAVAILABLE' ? 'cr' : v.st == 'WORKING' ? 'ok' : v.st == 'IDLE' ? '' : 'in')}</td>
  <td>${k ? k.kind + ' · ' + fid(S.rot[k.r]) : ''}</td><td>${eta}</td><td class="n">${v.km.toFixed(1)}</td><td class="n">${v.ev ? v.kwh.toFixed(1) + ' kWh' : v.L.toFixed(1) + ' L'}</td><td class="mu sm">${v.sus ? 'lightning stop' : S.wx.vis < 1.5 ? 'LVP speed limit' : ''}</td>
  <td><button class="btn" onclick="event.stopPropagation();vehToggle('${v.id}')">${v.down ? 'Return' : 'Take out'}</button></td></tr>`}).join('')}</table>`;
function vehToggle(id) {if (!can()) return; const v = S.V.find(x => x.id == id); if (!v.down && v.task) return toast('Unit is on a task — wait until it is released'); v.down = !v.down; if (!v.down) v.st = 'IDLE'; audit((v.down ? 'Out of service: ' : 'Returned: ') + id); ev(S, v.down ? 'GroundVehicleBreakdown' : 'GroundVehicleRestored', id, VNAME[v.type]); live(true)}
