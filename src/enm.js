// ===================== ENERGY MANAGEMENT (dedicated main tab) =====================
// Every number comes from the simulated meters in the shared engine (S.en). Energy costs reach Finance through the same
// S.cc accruals (elecReprice / syncUtilityCosts) — one source of truth, nothing is posted twice. Tariffs are ILLUSTRATIVE.
const AREAS = ['T1', 'T2', 'T3', 'STC', 'BHS', 'Airfield', 'Apron', 'Depot'];
const AREA_N = {T1: 'Terminal 1', T2: 'Terminal 2', T3: 'Terminal 3', STC: 'Seasonal terminal', BHS: 'Baggage hall (BHS)', Airfield: 'Runway & taxiway lighting', Apron: 'Apron 400 Hz', Depot: 'EV / e-GSE depot'};
const kwhOf = o => Object.values(o || {}).reduce((a, b) => a + b, 0);
const rateB = b => b == 'p' ? S.cfg.elec.peakEgp : S.cfg.elec.offpeakEgp;
const dayF = () => 1440 / Math.max(60, S.t);
const EN_BTN = `<button class="btn dg" onclick="act('spike')">Chiller fault (T3 spike)</button><button class="btn" onclick="act('spikeok')">Restore chiller</button><button class="btn dg" onclick="act('convx')">Conveyor over-consumption</button><button class="btn" onclick="act('convok')">Conveyor normal</button><button class="btn pri" onclick="act('eco')">Start energy-saving intervention</button><button class="btn" onclick="act('ecooff')">End intervention</button>`;
const depPaxT = T => S.R.filter(r => r.dep && r.offBlk != null && r.offBlk >= 0 && STAND[r.stand] && STAND[r.stand].term == T).reduce((a, r) => a + (r.paxOut || 0), 0);
const areaSt = a => {const n = S.en.nowT[a] || 0, e = S.en.expT[a] || 0, sw = Object.keys(S.sw).some(k => k.startsWith(a + ':'));
  return e > 0 && n > e * 1.15 && n - e > 30 ? bd('ABNORMAL', 'cr') : sw ? bd('SWITCHED', 'wn') : n < 1 ? bd('OFF / STANDBY') : bd('NORMAL', 'ok')};

// ---------- 1 · Energy Overview ----------
VIEWS['en.overview'] = {sub: 'Electricity, water, fuel and emissions for the whole airport — simulated meters driven by traffic, occupancy, weather and equipment state.',
  html: () => `<div class="row" style="margin-bottom:12px">${EN_BTN}</div><div data-live="eoKpi"></div>
  <div class="g g2" style="margin-top:12px"><div class="card"><div class="ch">Electricity today by hour & system (kWh)</div><div data-live="enHourly"></div></div><div class="card"><div class="ch">Site demand — last 3 h (kW)</div><div data-live="enLine"></div></div></div>
  <div class="g g3" style="margin-top:12px"><div class="card"><div class="ch">By terminal / area (kWh today)</div><div data-live="enTerm"></div></div><div class="card"><div class="ch">By system (kWh today)</div><div data-live="enCat"></div></div><div class="card"><div class="ch">Active findings<span class="sp"></span><button class="btn" onclick="go('en','alerts')">All →</button></div><div data-live="eoFind"></div></div></div>`};
LIVE.eoKpi = () => {const f = energyFinal(S), E = S.en, b = BASE.snap.filter(x => x.t <= S.t).pop(), dsl = E.dieselAirportL + E.dieselOtherL, lim = S.cfg.elec.peakLimitKw;
  return `<div class="kp">${kpiTile('Electricity today', kfmt(f.kwh) + ' kWh', mk(egp2usd(S, f.elecEgp)) + ' + demand ' + mk(egp2usd(S, f.demandEgp)), "go('en','costs')")}${kpiTile('Water today', kfmt(E.waterM3) + ' m³', mk(egp2usd(S, f.waterEgp)), "go('en','costs')")}
  ${kpiTile('Fuel (ground vehicles)', kfmt(dsl) + ' L diesel', kfmt(E.dieselAirportL) + ' L airport-borne · ' + mk(egp2usd(S, f.dieselEgp)), "go('en','systems')")}${kpiTile('Estimated emissions', (f.co2 / 1000).toFixed(1) + ' tCO₂e', `grid ${(f.kwh * S.cfg.gridKgKwh / 1000).toFixed(1)} t · diesel ${(dsl * S.cfg.dieselKgL / 1000).toFixed(1)} t`, "go('en','reports')")}
  ${kpiTile('Demand now', kfmt(E.kwTot) + ' kW', b ? 'baseline ' + kfmt(b.kw) + ' kW' : '', "go('en','live')", b && E.kwTot > b.kw * 1.1 ? 'neg' : '')}${kpiTile('Peak 15-min today', kfmt(E.peakKw) + ' kW', `${Math.round(100 * E.peakKw / lim)}% of ${kfmt(lim)} kW contracted`, "go('en','alerts')", E.peakKw > lim ? 'neg' : '')}
  ${kpiTile('Utility cost today', mk(egp2usd(S, f.totalEgp)), 'flows to Finance › Operating Expenses', "go('fin','opex')")}${kpiTile('Tariff now', 'EGP ' + elecRate(S, S.t) + '/kWh', hourOf(S.t) >= S.cfg.elec.peakFrom && hourOf(S.t) < S.cfg.elec.peakTo ? 'PEAK period' : 'off-peak')}</div>`};
LIVE.eoFind = () => {const F = enFindings(S); return F.length ? F.slice(0, 6).map(f => `<div class="row sm" style="margin-bottom:6px">${bd(f.type == 'abnormal' ? 'ABNORMAL' : f.type == 'peak' ? 'PEAK' : 'WASTE', f.type == 'waste' ? 'in' : f.sev)}<span>${esc(f.msg)}</span></div>`).join('') : '<div class="empty">No abnormal consumption, waste or peak warnings right now</div>'};

// ---------- 2 · Terminal Consumption ----------
VIEWS['en.terms'] = {sub: 'Terminal 1, Terminal 2, Terminal 3 and the seasonal terminal metered separately: live load, today\'s consumption, cost and intensity.',
  html: () => `<div class="g g4" data-live="etCards"></div><div class="card" style="margin-top:12px"><div class="ch">Terminal load through the day (kW, 5-min samples)</div><div data-live="etChart"></div></div>
  <div class="card" style="margin-top:12px"><div class="ch">Terminal comparison</div><div data-live="etTab" class="tw"></div></div>`};
const termKwh = T => kwhOf(S.en.kwhT[T]), termUsd = T => egp2usd(S, bandEgp(S, S.en.kwhBT[T]));
LIVE.etCards = () => TERMS.map(T => {const r = S.en.kwhT[T] || {}, tot = kwhOf(r), pax = depPaxT(T);
  return `<div class="card"><div class="ch">${AREA_N[T]}<span class="sp"></span>${areaSt(T)}</div><div class="kp" style="grid-template-columns:1fr 1fr">${kpiTile('Load now', kfmt(S.en.nowT[T] || 0) + ' kW', 'expected ' + kfmt(S.en.expT[T] || 0) + ' kW')}${kpiTile('Today', kfmt(tot) + ' kWh', mk(termUsd(T)))}${kpiTile('Occupancy now', Math.round(S.occ[T] || 0), 'people in terminal')}${kpiTile('Intensity', pax ? (tot / pax).toFixed(1) + ' kWh' : '—', 'per departing passenger')}</div>
  <div style="margin-top:8px">${hbars(['hvac', 'light', 'vert', 'base'].map(c => [ENCATS[c], r[c] || 0, ENC[c]]), {f: v => kfmt(v) + ' kWh'})}</div></div>`}).join('');
LIVE.etChart = () => {const cols = {T1: 'var(--s1)', T2: 'var(--s2)', T3: 'var(--s3)', STC: 'var(--s4)'}, n = (S.en.serT.T1 || []).length, t0 = S.t - n + 1;
  return lineChart('c-et', TERMS.map(T => ({name: AREA_N[T], color: cols[T], pts: (S.en.serT[T] || []).map((v, i) => [t0 + i, v]).filter((p, i) => i % 5 == 0 || i == n - 1)})), {fx: loc, fy: v => kfmt(v) + ' kW'})};
LIVE.etTab = () => {const rows = TERMS.map(T => {const r = S.en.kwhT[T] || {}, tot = kwhOf(r), pax = depPaxT(T), pk = Math.max(0, ...(S.en.serT[T] || [0]));
    return `<tr><td><b>${AREA_N[T]}</b></td><td class="n">${kfmt(S.en.nowT[T] || 0)}</td><td class="n">${kfmt(pk)}</td><td class="n">${kfmt(tot)}</td><td class="n">${Math.round(100 * (r.hvac || 0) / (tot || 1))}%</td><td class="n">${money(termUsd(T))}</td><td class="n">${pax}</td><td class="n">${pax ? (tot / pax).toFixed(1) : '—'}</td><td class="n">${pax ? money(termUsd(T) / pax, 2) : '—'}</td><td>${areaSt(T)}</td></tr>`});
  return `<table><tr><th>Terminal</th><th class="n">kW now</th><th class="n">Peak kW today</th><th class="n">kWh today</th><th class="n">HVAC share</th><th class="n">Electricity cost</th><th class="n">Departed pax</th><th class="n">kWh / pax</th><th class="n">Cost / pax</th><th>Status</th></tr>${rows.join('')}</table>
  <p class="note">Cost = metered peak-band kWh × peak tariff + off-peak kWh × off-peak tariff (current tariffs). Terminal intensity uses departing passengers from the simulated schedule.</p>`};

// ---------- 3 · Systems Monitoring ----------
const SYS = [['hvac', 'HVAC & cooling', () => `${TERMS.filter(T => S.sw[T + ':hvac']).length ? TERMS.filter(T => S.sw[T + ':hvac']).join(', ') + ' in setback · ' : ''}${S.spike ? S.spike.term + ' chiller fault' : 'chillers normal'} · outdoor ${S.wx.temp.toFixed(1)} °C`],
  ['light', 'Terminal lighting', () => (hourOf(S.t) >= 7 && hourOf(S.t) < 17 ? 'daylight dimming' : 'full (darkness)') + (S.meas.led ? ' · LED dimming active' : '')],
  ['vert', 'Escalators & elevators (combined circuit)', () => TERMS.filter(T => S.sw[T + ':vert'] === 0).length ? 'stopped in ' + TERMS.filter(T => S.sw[T + ':vert'] === 0).join(', ') : 'load follows occupancy'],
  ['conv', 'Baggage conveyor belts', () => Object.keys(SEGN).filter(k => S.en.pv && S.en.pv.seg[k]).map(k => SEGN[k][0]).join(', ') || 'all idle'],
  ['agl', 'Runway & taxiway lighting (AGL)', () => `${hourOf(S.t) >= 17 || hourOf(S.t) < 7 ? 'darkness' : S.wx.vis < 3 ? 'low visibility' : 'daylight standby'} · RWY 1 ${S.rw[1].open ? 'open' : 'closed'} · RWY 2 ${S.rw[2].open ? 'open' : 'closed'}`],
  ['gpu', 'Aircraft ground power (400 Hz)', () => S.gpuOn + ' aircraft connected'],
  ['ev', 'EV / e-GSE charging', () => S.V.filter(v => v.chg).length + ' units charging · ' + S.V.filter(v => v.ev).length + ' electric units'],
  ['base', 'Terminal base load', () => 'IT, security screening, retail, plant']];
VIEWS['en.systems'] = {sub: 'HVAC, lighting, escalators & elevators, baggage conveyors, runway lighting, ground power, EV charging and ground support equipment — load now vs expected.',
  html: () => `<div class="row" style="margin-bottom:12px">${EN_BTN}</div><div class="card"><div class="ch">Systems — live status<span class="sp"></span><span class="tag">expected = same conditions without equipment faults</span></div><div data-live="esTab" class="tw"></div></div>
  <div class="g g2" style="margin-top:12px"><div class="card"><div class="ch">System load — last 3 h (kW)</div><div data-live="esChart"></div></div><div class="card"><div class="ch">Baggage conveyor segments</div><div data-live="esConv" class="tw"></div></div></div>
  <div class="card" style="margin-top:12px"><div class="ch">Ground support equipment & electric vehicles</div><div data-live="esGse" class="tw"></div></div>`};
LIVE.esTab = () => {const tot = kwhOf(S.en.kwh) || 1;
  const rows = SYS.map(([k, n, st]) => {const a = S.en.now[k] || 0, e = S.en.exp[k] || 0, kwh = S.en.kwh[k] || 0, ab = e > 0 && a > e * 1.15 && a - e > 30, sw = Object.keys(S.sw).some(x => x.endsWith(':' + k));
    return `<tr><td><b>${n}</b><div class="mu sm">${esc(st())}</div></td><td>${ab ? bd('ABNORMAL', 'cr') : sw ? bd('SWITCHED', 'wn') : a < 1 ? bd('OFF / STANDBY') : bd('NORMAL', 'ok')}</td><td class="n">${kfmt(a)}</td><td class="n mu">${kfmt(e)}</td><td class="n ${ab ? 'neg' : ''}">${e ? (a >= e ? '+' : '') + Math.round(100 * (a / e - 1)) + '%' : '—'}</td><td class="n">${kfmt(kwh)}</td><td class="n">${Math.round(100 * kwh / tot)}%</td><td class="n">${money(enUsd(S, k))}</td></tr>`});
  const d = S.V.filter(v => !v.ev), dl = d.reduce((a, v) => a + v.L, 0);
  rows.push(`<tr><td><b>Ground support equipment — diesel</b><div class="mu sm">${d.filter(v => v.st != 'IDLE').length} of ${d.length} units working</div></td><td>${bd('NORMAL', 'ok')}</td><td class="n" colspan="3">fuel, not electricity</td><td class="n">${kfmt(dl)} L</td><td></td><td class="n">${money(egp2usd(S, S.en.dieselAirportL * S.cfg.dieselEgpL))}<div class="mu sm">airport-borne only</div></td></tr>`);
  return `<table><tr><th>System</th><th>Status</th><th class="n">kW now</th><th class="n">Expected kW</th><th class="n">Deviation</th><th class="n">Today</th><th class="n">Share</th><th class="n">Cost today</th></tr>${rows.join('')}</table>`};
LIVE.esChart = () => {const n = (S.en.serC.hvac || []).length, st = Math.max(0, n - 180);
  return lineChart('c-es', Object.keys(ENCATS).map(k => ({name: ENCATS[k], color: ENC[k], pts: (S.en.serC[k] || []).slice(st).map((v, i) => [S.t - (n - st) + i + 1, v]).filter((p, i) => i % 3 == 0)})), {fx: loc, fy: v => kfmt(v) + ' kW'})};
LIVE.esConv = () => {const C = S.cfg.conveyorKw, sortOn = !(S.bhs.fault && !S.bhs.manual), idle = S.meas.bhs ? .1 : S.cfg.convIdleFactor, cm = S.convX ? S.convX.mult : 1;
  return `<table><tr><th>Segment</th><th class="n">Rated kW</th><th>State</th><th class="n">kW now</th></tr>${Object.entries(SEGN).map(([k, [n, ck]]) => {const on = S.bagAct[k] && (k != 'sort' || sortOn), off = k == 'sort' && !sortOn;
    return `<tr><td>${n}</td><td class="n">${C[ck]}</td><td>${off ? bd('STOPPED — fault', 'cr') : on ? bd('RUNNING', 'ok') : bd('IDLE (' + Math.round(idle * 100) + '%)', 'in')}</td><td class="n">${kfmt(off ? 0 : C[ck] * (on ? 1 : idle) * cm)}</td></tr>`}).join('')}</table>${S.convX ? '<p class="note neg">Anomaly: drives drawing ' + Math.round((cm - 1) * 100) + '% above normal.</p>' : ''}`};
LIVE.esGse = () => {const types = [...new Set(S.V.map(v => v.type))];
  return `<table><tr><th>Type</th><th class="n">Units</th><th class="n">Electric</th><th class="n">Working now</th><th class="n">Charging</th><th class="n">Out of service</th><th class="n">Diesel today</th><th class="n">Electricity today</th></tr>${types.map(t => {const l = S.V.filter(v => v.type == t);
    return `<tr><td>${VNAME[t] || t}</td><td class="n">${l.length}</td><td class="n">${l.filter(v => v.ev).length}</td><td class="n">${l.filter(v => v.st != 'IDLE' && !v.down).length}</td><td class="n">${l.filter(v => v.chg).length}</td><td class="n ${l.some(v => v.down) ? 'neg' : ''}">${l.filter(v => v.down).length}</td><td class="n">${kfmt(l.reduce((a, v) => a + v.L, 0))} L</td><td class="n">${kfmt(l.reduce((a, v) => a + v.kwh, 0))} kWh</td></tr>`}).join('')}</table>
  <p class="note">Fuel bowsers and catering trucks belong to their operators: their diesel counts toward site emissions but not airport costs.</p>`};

// ---------- 4 · Live Simulation ----------
VIEWS['en.live'] = {sub: 'Power flowing from the grid intake to each feeder, animated from the live simulation. Arrivals, baggage waves, ground power and equipment switching move the load in real time.',
  html: () => `<div class="g" style="grid-template-columns:minmax(0,1fr) 380px"><div class="card"><div class="ch">Live power flow (simulated)<span class="sp"></span><span data-live="lvClock" class="sm mu"></span></div><canvas id="pf" width="1000" height="500" style="width:100%;height:auto;display:block"></canvas>
    <p class="note">Line width and particle speed follow each feeder's kW. A red pulse means the load is above expected for the current conditions. The last change on each feeder is shown beside it.</p></div>
    <div class="g" style="align-content:start"><div class="card"><div class="ch">Equipment switching (demo control)</div><div data-live="lvSw"></div></div><div class="card"><div class="ch">What changed the load</div><div data-live="lvLog" style="max-height:340px;overflow:auto"></div></div></div></div>
  <div class="card" style="margin-top:12px"><div class="ch">Feeder load — last 2 h (kW)</div><div data-live="lvChart"></div></div>`,
  mount: () => {if (!pfRun) {pfRun = 1; requestAnimationFrame(pfLoop)}}};
LIVE.lvClock = () => `${loc(S.t)} · ${play ? 'running ×' + spd : 'paused'} · ${kfmt(S.en.kwTot)} kW site`;
LIVE.lvSw = () => {const btn = (T, c) => {const on = (S.sw[T + ':' + c] ?? 1) == 1, o = SW_OPT[c]; return `<button class="btn ${on ? '' : 'pri'}" style="padding:3px 7px;font-size:11px" onclick="swToggle('${T}','${c}')" title="${o[2]}: ${on ? o[3] : o[4]} — click to switch">${o[2].split(' ')[0]} ${on ? o[3] : o[4].split(' (')[0]}</button>`};
  return `<table>${TERMS.map(T => `<tr><td><b>${T}</b></td><td>${['light', 'vert', 'hvac'].map(c => btn(T, c)).join(' ')}</td></tr>`).join('')}<tr><td><b>AGL</b></td><td><button class="btn" style="padding:3px 7px;font-size:11px" onclick="aglOff()">Request airfield lighting off</button> <span class="sm mu">${kfmt(S.en.nowT.Airfield || 0)} kW · automatic</span></td></tr></table>
  <p class="note">Switching changes the simulated meters, costs and Finance immediately and is written to the audit log. Requires Airport Operations Manager, Energy Manager or Terminal Operations Officer.</p>`};
function swToggle(T, c) {if (!can()) return; if (!['Airport Operations Manager', 'Energy Manager', 'Terminal Operations Officer'].includes(role)) return toast('Switching requires an operations or energy role');
  const on = (S.sw[T + ':' + c] ?? 1) != 1, e = swSet(S, T, c, on, role); if (e) return toast(e); audit(`${T} ${SW_OPT[c][2]} → ${on ? SW_OPT[c][3] : SW_OPT[c][4]}`); toast(`${T} ${SW_OPT[c][2]}: ${on ? SW_OPT[c][3] : SW_OPT[c][4]}`); live(true)}
function aglOff() {if (!can()) return; const h = hourOf(S.t), dark = h >= 17 || h < 7, open = S.rw[1].open || S.rw[2].open;
  if ((dark || S.wx.vis < 3) && open) {audit('Refused: airfield lighting off while runway open (' + (dark ? 'darkness' : 'low visibility') + ')'); return toast('Refused — airfield lighting cannot be switched off while a runway is open in darkness or low visibility')}
  toast('Airfield lighting is already at standby (daylight, good visibility) — only signs & stop bars are powered')}
LIVE.lvLog = () => S.en.log.length ? S.en.log.slice(0, 60).map(x => `<div class="row sm" style="margin-bottom:5px;flex-wrap:nowrap;align-items:flex-start"><span class="mu" style="min-width:38px">${loc(x.t)}</span>${bd(x.area)}<span style="flex:1">${esc(x.msg)}</span>${x.kw ? `<b class="${x.kw > 0 ? 'neg' : 'pos'}">${x.kw > 0 ? '+' : ''}${x.kw} kW</b>` : ''}</div>`).join('') : '<div class="empty">Waiting for load changes…</div>';
LIVE.lvChart = () => {const cols = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--s5)', 'var(--s6)', 'var(--s7)', 'var(--s8)'];
  return lineChart('c-lv', AREAS.map((a, i) => {const s = S.en.serT[a] || [], n = s.length, st = Math.max(0, n - 120); return {name: a, color: cols[i], pts: s.slice(st).map((v, j) => [S.t - (n - st) + j + 1, v]).filter((p, j) => j % 2 == 0)}}), {fx: loc, fy: v => kfmt(v) + ' kW'})};
let pfRun = 0; const PF = {disp: {}, last: {}, flash: {}};
function pfLoop() {const cv = document.getElementById('pf'); if (!cv) {pfRun = 0; return} try {drawPF(cv)} catch (e) {} requestAnimationFrame(pfLoop)}
function drawPF(cv) {
  const g = cv.getContext('2d'), W = cv.width, H = cv.height, cs = getComputedStyle(document.documentElement), V = n => cs.getPropertyValue(n).trim() || '#888', E = S.en, now = performance.now() / 1000;
  const tx = V('--tx'), mu = V('--mu'), ln = V('--grid'), cr = V('--cr') || '#ef4444', cols = ['--s1', '--s2', '--s3', '--s4', '--s2', '--s8', '--s5', '--s6'].map(V);
  g.clearRect(0, 0, W, H); g.font = '600 13px system-ui'; g.textBaseline = 'middle';
  const tot = E.kwTot || 1, grid = {x: 80, y: H / 2}, sub = {x: 300, y: H / 2}, bx = 610, bw = 370, bh = 50, gap = (H - 20) / AREAS.length;
  // latest change per area (flash for 3 s of wall time)
  for (const l of E.log.slice(0, 12)) if (!PF.last[l.area] || PF.last[l.area].t < l.t || (PF.last[l.area].t == l.t && PF.last[l.area].msg != l.msg)) {PF.last[l.area] = l; PF.flash[l.area] = now}
  const pipe = (a, b, w, col, sp, nP, abn) => {g.strokeStyle = ln; g.lineWidth = w + 4; g.beginPath(); g.moveTo(a.x, a.y); g.bezierCurveTo((a.x + b.x) / 2, a.y, (a.x + b.x) / 2, b.y, b.x, b.y); g.stroke();
    g.strokeStyle = col; g.globalAlpha = .35; g.lineWidth = w; g.stroke(); g.globalAlpha = 1;
    for (let i = 0; i < nP; i++) {const u = (now * sp + i / nP) % 1, m = 1 - u, cx = (a.x + b.x) / 2, P = [a.x, cx, cx, b.x], Q = [a.y, a.y, b.y, b.y], bz = A => m * m * m * A[0] + 3 * m * m * u * A[1] + 3 * m * u * u * A[2] + u * u * u * A[3];
      g.fillStyle = abn ? cr : col; g.beginPath(); g.arc(bz(P), bz(Q), Math.max(2, w / 2.2), 0, 7); g.fill()}};
  // grid → substation
  const band = hourOf(S.t) >= S.cfg.elec.peakFrom && hourOf(S.t) < S.cfg.elec.peakTo;
  pipe(grid, sub, 4 + 14 * Math.min(1, tot / 16000), V('--s1'), .25 + tot / 40000, 10, false);
  AREAS.forEach((a, i) => {const kw = E.nowT[a] || 0, d0 = PF.disp[a] ?? kw; PF.disp[a] = d0 + (kw - d0) * .15; const y = 10 + gap * i + gap / 2, e = E.expT[a] || 0, abn = e > 0 && kw > e * 1.15 && kw - e > 30, share = kw / tot;
    pipe({x: sub.x + 30, y: sub.y}, {x: bx, y}, 1.5 + 12 * Math.sqrt(share), cols[i], .15 + share * 1.6, Math.max(1, Math.round(2 + share * 22)), abn);
    const fl = now - (PF.flash[a] || -9) < 3, pulse = abn ? .5 + .5 * Math.sin(now * 6) : 0;
    g.fillStyle = V('--p'); g.strokeStyle = abn ? cr : fl ? V('--s1') : ln; g.lineWidth = abn ? 2 + 2 * pulse : fl ? 2 : 1; g.beginPath(); g.roundRect ? g.roundRect(bx, y - bh / 2, bw, bh, 8) : g.rect(bx, y - bh / 2, bw, bh); g.fill(); g.stroke();
    g.fillStyle = cols[i]; g.fillRect(bx, y - bh / 2 + 6, 4, bh - 12);
    g.fillStyle = tx; g.font = '600 13px system-ui'; g.textAlign = 'left'; g.fillText(AREA_N[a], bx + 14, y - 10);
    g.font = '700 16px system-ui'; g.textAlign = 'right'; g.fillText(kfmt(PF.disp[a]) + ' kW', bx + bw - 12, y - 9);
    const L = PF.last[a]; g.font = '11.5px system-ui'; g.textAlign = 'left'; g.fillStyle = abn ? cr : fl ? tx : mu;
    const msg = abn ? `ABOVE EXPECTED +${Math.round(100 * (kw / e - 1))}% (expected ${kfmt(e)} kW)` : L ? `${loc(L.t)} ${L.msg}` : Object.keys(S.sw).some(k => k.startsWith(a + ':')) ? 'operator switching active' : 'steady';
    g.fillText(msg.length > 58 ? msg.slice(0, 57) + '…' : msg, bx + 14, y + 11)});
  // nodes
  const node = (p, r, t1, t2, t3) => {g.fillStyle = V('--p'); g.strokeStyle = V('--s1'); g.lineWidth = 2; g.beginPath(); g.arc(p.x, p.y, r, 0, 7); g.fill(); g.stroke(); g.textAlign = 'center'; g.fillStyle = tx; g.font = '700 14px system-ui'; g.fillText(t1, p.x, p.y - 6); g.font = '11px system-ui'; g.fillStyle = mu; g.fillText(t2, p.x, p.y + 10); if (t3) {g.fillText(t3, p.x, p.y + r + 14)}};
  node(grid, 52, kfmt(tot) + ' kW', 'grid intake', `${band ? 'PEAK' : 'off-peak'} · EGP ${elecRate(S, S.t)}/kWh · ${mk(egp2usd(S, tot * elecRate(S, S.t)))}/h`);
  const lim = S.cfg.elec.peakLimitKw, pct = E.kw15 / lim; node(sub, 46, Math.round(pct * 100) + '%', 'of capacity', `15-min ${kfmt(E.kw15)} / ${kfmt(lim)} kW`);
  g.strokeStyle = pct > 1 ? cr : pct > S.cfg.elec.peakWarnPct / 100 ? V('--wn') || '#f59e0b' : V('--ok') || '#22c55e'; g.lineWidth = 5; g.beginPath(); g.arc(sub.x, sub.y, 52, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * Math.min(1, pct)); g.stroke();
  g.textAlign = 'left'; g.fillStyle = mu; g.font = '11px system-ui'; g.fillText('SIMULATED — not live airport metering', 12, H - 10);
}

// ---------- 5 · Cost per Resource ----------
const EN_EDIT = [['elec.offpeakEgp', 'Electricity off-peak', 'EGP/kWh'], ['elec.peakEgp', 'Electricity peak', 'EGP/kWh'], ['elec.peakFrom', 'Peak period from', 'hour'], ['elec.peakTo', 'Peak period to', 'hour'], ['elec.demandEgpKwMonth', 'Demand charge', 'EGP/kW·month'], ['elec.peakLimitKw', 'Contracted capacity', 'kW'],
  ['waterEgpM3', 'Water', 'EGP/m³'], ['dieselEgpL', 'Diesel', 'EGP/L'], ['wasteEgpT', 'Waste', 'EGP/t'], ['gridKgKwh', 'Grid emission factor', 'kgCO₂/kWh'], ['dieselKgL', 'Diesel emission factor', 'kgCO₂/L'], ['fx', 'FX rate', 'EGP/USD']];
const cfgForm = (list, note) => `<table>${list.map(([p, n, u]) => `<tr><td>${n}</td><td><input type="number" step="any" data-p="${p}" value="${getP(S.cfg, p)}" ${cfgDis(p)}></td><td class="mu sm">${u}</td></tr>`).join('')}</table><p class="note">${note}</p>`;
VIEWS['en.costs'] = {sub: 'Electricity, demand charge, water and fuel costed from metered quantities × configurable tariffs. The same amounts appear in Finance › Operating Expenses.',
  html: () => `<div data-live="ecKpi"></div><div class="g" style="grid-template-columns:minmax(0,1fr) 340px;margin-top:12px"><div class="card"><div class="ch">Cost per resource — quantity × tariff</div><div data-live="ecTab" class="tw"></div></div>
    <div class="card cfg"><div class="ch">Tariffs (illustrative)<span class="sp"></span><button class="btn pri" onclick="applyCfg()">Apply</button></div>${cfgForm(EN_EDIT, 'Tariffs re-price everything already metered today; the Finance P&L updates at once. Editable by Airport Operations Manager, Finance Controller and Energy Manager.')}</div></div>
  <div class="card" style="margin-top:12px"><div class="ch">Hourly utility cost by resource (current tariffs)</div><div data-live="ecHourly"></div></div>`};
LIVE.ecKpi = () => {const f = energyFinal(S), tot = egp2usd(S, f.totalEgp), mv = movements(S), pax = TERMS.reduce((a, T) => a + depPaxT(T), 0);
  return `<div class="kp">${kpiTile('Utility cost today', mk(tot), 'electricity + demand + water + waste + fuel')}${kpiTile('Electricity', mk(egp2usd(S, f.elecEgp)), kfmt(f.kwh) + ' kWh · avg EGP ' + (f.elecEgp / (f.kwh || 1)).toFixed(2) + '/kWh')}${kpiTile('Water', mk(egp2usd(S, f.waterEgp)), kfmt(S.en.waterM3) + ' m³')}${kpiTile('Fuel', mk(egp2usd(S, f.dieselEgp)), kfmt(S.en.dieselAirportL) + ' L airport-borne')}
  ${kpiTile('Per departing passenger', pax ? money(tot / pax, 2) : '—', pax + ' pax')}${kpiTile('Per flight movement', mv ? money(tot / mv) : '—', mv + ' movements')}${kpiTile('Per operating hour', mk(tot / Math.max(1, S.t / 60)))}${kpiTile('Annualised run-rate', mk(tot * dayF() * 365), 'today × 365 — projection')}</div>`};
function enCostRows() {const c = S.cfg, f = energyFinal(S), B = Object.values(S.en.kwhB).reduce((a, b) => ({p: a.p + b.p, o: a.o + b.o}), {p: 0, o: 0}), ev = S.en.kwhB.ev || {p: 0, o: 0};
  return [['Electricity — peak band', `${kfmt(B.p)} kWh`, `EGP ${c.elec.peakEgp}/kWh`, B.p * c.elec.peakEgp, `${kfmt(B.p)} kWh × EGP ${c.elec.peakEgp} (${pad(c.elec.peakFrom)}:00–${pad(c.elec.peakTo)}:00)`, 1],
    ['Electricity — off-peak band', `${kfmt(B.o)} kWh`, `EGP ${c.elec.offpeakEgp}/kWh`, B.o * c.elec.offpeakEgp, `${kfmt(B.o)} kWh × EGP ${c.elec.offpeakEgp}`, 1],
    ['Demand charge (pro-rata)', `${kfmt(S.en.peakKw)} kW`, `EGP ${c.elec.demandEgpKwMonth}/kW·mo`, f.demandEgp, `${kfmt(S.en.peakKw)} kW × EGP ${c.elec.demandEgpKwMonth} ÷ 30 × ${(S.t / 1440).toFixed(3)} day`, 1],
    ['Water', `${kfmt(S.en.waterM3)} m³`, `EGP ${c.waterEgpM3}/m³`, f.waterEgp, `${kfmt(S.en.waterM3)} m³ × EGP ${c.waterEgpM3}`, 1],
    ['Diesel — airport-borne GSE', `${kfmt(S.en.dieselAirportL)} L`, `EGP ${c.dieselEgpL}/L`, f.dieselEgp, `${kfmt(S.en.dieselAirportL)} L × EGP ${c.dieselEgpL}`, 1],
    ['Waste', `${(S.en.wasteKg / 1000).toFixed(2)} t`, `EGP ${c.wasteEgpT}/t`, f.wasteEgp, `${(S.en.wasteKg / 1000).toFixed(2)} t × EGP ${c.wasteEgpT}`, 1],
    ['memo: EV / e-GSE charging (inside electricity)', `${kfmt(ev.p + ev.o)} kWh`, 'band tariffs', bandEgp(S, ev), 'already counted in the electricity bands above', 0],
    ['memo: third-party diesel (not airport cost)', `${kfmt(S.en.dieselOtherL)} L`, `EGP ${c.dieselEgpL}/L`, S.en.dieselOtherL * c.dieselEgpL, 'fuel bowsers, caterers — borne by their operators', 0]]}
LIVE.ecTab = () => {const R = enCostRows(), tot = R.filter(r => r[5]).reduce((a, r) => a + r[3], 0); syncUtilityCosts(S); const fin = ['Electricity', 'Electricity demand charge', 'Water', 'Waste management', 'Ground vehicle fuel'].reduce((a, k) => a + ((S.cc[k] || {}).usd || 0), 0);
  return `<table><tr><th>Resource</th><th class="n">Quantity</th><th class="n">Tariff</th><th class="n">EGP</th><th class="n">${cur}</th><th>Formula</th></tr>${R.map(r => `<tr class="${r[5] ? '' : 'mu'}"><td>${r[0]}</td><td class="n">${r[1]}</td><td class="n">${r[2]}</td><td class="n">${kfmt(r[3])}</td><td class="n">${money(egp2usd(S, r[3]))}</td><td class="formula">${esc(r[4])}</td></tr>`).join('')}
  <tr><td><b>Total utility cost</b></td><td colspan="2"></td><td class="n"><b>${kfmt(tot)}</b></td><td class="n"><b>${money(egp2usd(S, tot))}</b></td><td class="sm ${Math.abs(egp2usd(S, tot) - fin) < 1 ? 'pos' : 'neg'}">${Math.abs(egp2usd(S, tot) - fin) < 1 ? '✔ equals' : '✘ differs from'} Finance utility costs ${money(fin)} (same source, counted once)</td></tr></table>
  <p class="note">Memo rows are shown for transparency and are not added to the total. Converted at ${S.cfg.fx} EGP/USD (assumption).</p>`};
LIVE.ecHourly = () => {const c = S.cfg, rows = []; for (let t = 0; t < Math.min(S.t, DAY_END); t += 60) {const h = hourOf(t), H = S.en.hourly[h]; if (!H) continue;
    rows.push({x: pad(h), label: pad(h) + ':00', v: {e: egp2usd(S, H.kwh * rateB(H.band)), w: egp2usd(S, H.water * c.waterEgpM3), d: egp2usd(S, H.dieselA * c.dieselEgpL)}})}
  return stackBars('c-ech', rows, ['e', 'w', 'd'], ['var(--s1)', 'var(--s3)', 'var(--s5)'], {names: ['Electricity', 'Water', 'Diesel (airport)'], fy: v => mk(v)}) + '<p class="note">Electricity per hour = that hour\'s metered kWh × the current tariff of its band (peak / off-peak).</p>'};

// ---------- 6 · Efficiency & Alerts ----------
VIEWS['en.alerts'] = {sub: 'Rule-based checks on the simulated meters: abnormal consumption, equipment waste, peak demand and potential savings. No AI — every rule is listed with its threshold.',
  html: () => `<div class="row" style="margin-bottom:12px">${EN_BTN}</div><div data-live="eaKpi"></div>
  <div class="card" style="margin-top:12px"><div class="ch">Current findings</div><div data-live="eaTab" class="tw"></div></div>
  <div class="g g2" style="margin-top:12px"><div class="card"><div class="ch">Peak demand vs contracted capacity (15-min rolling, kW)</div><div data-live="eaPeak"></div></div><div class="card"><div class="ch">Waste measured today</div><div data-live="eaWaste" class="tw"></div></div></div>
  <div class="g g2" style="margin-top:12px"><div class="card"><div class="ch">Energy alert history</div><div data-live="eaHist" style="max-height:300px;overflow:auto"></div></div><div class="card"><div class="ch">Rules & thresholds</div>
  <table class="sm"><tr><td>Abnormal consumption</td><td>system kW &gt; 115% of expected and &gt; 30 kW above (expected = same weather, occupancy and schedule without equipment faults)</td></tr><tr><td>Peak demand</td><td>15-min rolling demand &gt; ${S.cfg.elec.peakWarnPct}% of contracted capacity (${kfmt(S.cfg.elec.peakLimitKw)} kW) → caution; &gt; 100% → critical</td></tr>
  <tr><td>Empty-terminal waste</td><td>occupancy &lt; ${S.cfg.waste.occMin} people: HVAC above ${S.cfg.waste.hvacStandby * 100}% rated and lighting above ${S.cfg.waste.lightMin * 100}% counted as waste</td></tr><tr><td>Conveyor idling</td><td>segments running with no bags (idle factor ${S.cfg.convIdleFactor})</td></tr><tr><td>Savings</td><td>waste kW × 8,760 h × off-peak tariff (if the condition persisted all year) — screening estimate</td></tr></table></div></div>`};
const WASTE = [['wHvac', 'HVAC conditioning near-empty terminals', 'Occupancy-based HVAC setback'], ['wLight', 'Lighting near-empty terminals', 'Zone switching / presence detection'], ['wIdle', 'Conveyors running without bags', 'Conveyor idle-stop (sleep mode)']];
LIVE.eaKpi = () => {const F = enFindings(S), wk = WASTE.reduce((a, w) => a + xKwh(S, w[0]), 0), wu = WASTE.reduce((a, w) => a + xUsd(S, w[0]), 0), lim = S.cfg.elec.peakLimitKw;
  return `<div class="kp">${kpiTile('Abnormal now', F.filter(f => f.type == 'abnormal').length, 'systems above expected', '', F.some(f => f.type == 'abnormal') ? 'neg' : 'pos')}${kpiTile('Waste now', kfmt(F.filter(f => f.type == 'waste').reduce((a, f) => a + f.kw, 0)) + ' kW', F.filter(f => f.type == 'waste').length + ' findings')}${kpiTile('Waste today', kfmt(wk) + ' kWh', mk(wu) + ' at current tariff')}${kpiTile('Potential saving', mk(wu * dayF() * 365), 'per year if eliminated (run-rate)', '', 'pos')}
  ${kpiTile('15-min demand now', kfmt(S.en.kw15) + ' kW', Math.round(100 * S.en.kw15 / lim) + '% of capacity', '', S.en.kw15 > lim ? 'neg' : '')}${kpiTile('Peak today', kfmt(S.en.peakKw) + ' kW', 'at ' + loc(S.en.peakT), '', S.en.peakKw > lim ? 'neg' : '')}</div>`};
LIVE.eaTab = () => {const F = enFindings(S); return F.length ? `<table><tr><th>Type</th><th>System / area</th><th>Finding</th><th class="n">Excess kW</th><th class="n">If persisted: cost / yr</th><th>Recommended action</th></tr>${F.map(f => `<tr><td>${bd(f.type == 'abnormal' ? 'ABNORMAL' : f.type == 'peak' ? 'PEAK DEMAND' : 'WASTE', f.type == 'waste' ? 'in' : f.sev)}</td><td>${esc(f.sys)}</td><td class="sm">${esc(f.msg)}</td><td class="n">${kfmt(f.kw)}</td><td class="n">${money(f.usdYr)}</td><td class="sm">${esc(f.fix)}</td></tr>`).join('')}</table>` : '<div class="empty">All systems within expected range</div>'};
LIVE.eaPeak = () => {const s = S.en.series, n = s.length, st = Math.max(0, n - 360), pts = []; for (let i = st; i < n; i += 3) {const w = s.slice(Math.max(0, i - 14), i + 1); pts.push([S.t - n + i + 1, w.reduce((a, b) => a + b, 0) / w.length])}
  const lim = S.cfg.elec.peakLimitKw, x0 = pts.length ? pts[0][0] : 0;
  return lineChart('c-ea', [{name: '15-min demand', color: 'var(--s1)', pts}, {name: 'Contracted capacity', color: 'var(--cr)', pts: [[x0, lim], [S.t, lim]], dash: 1}, {name: 'Warning (' + S.cfg.elec.peakWarnPct + '%)', color: 'var(--wn)', pts: [[x0, lim * S.cfg.elec.peakWarnPct / 100], [S.t, lim * S.cfg.elec.peakWarnPct / 100]], dash: 1}], {fx: loc, fy: v => kfmt(v)})};
LIVE.eaWaste = () => `<table><tr><th>Waste</th><th class="n">kWh today</th><th class="n">Cost today</th><th class="n">Annualised</th><th>Fix</th></tr>${WASTE.map(([k, n, f]) => `<tr><td>${n}</td><td class="n">${kfmt(xKwh(S, k))}</td><td class="n">${money(xUsd(S, k))}</td><td class="n pos">${money(xUsd(S, k) * dayF() * 365)}</td><td class="sm mu">${f}</td></tr>`).join('')}</table><p class="note">Measured minute by minute by the simulated meters and priced per tariff band.</p>`;
LIVE.eaHist = () => {const l = S.al.filter(a => a.sys == 'Energy'); return l.length ? l.slice(0, 40).map(alHtml).join('') : '<div class="empty">No energy alerts yet — try “Chiller fault”</div>'};

// ---------- 7 · Charts & Reports ----------
let rptM = 'kwh', rptP = 'hourly', rptB = 'system';
const RPT_M = {kwh: ['Electricity', 'kWh'], cost: ['Utility cost', cur], co2: ['Emissions', 'kgCO₂e'], water: ['Water', 'm³'], diesel: ['Diesel', 'L']};
function rptData() {const c = S.cfg, cats = Object.keys(ENCATS), out = {keys: [], names: [], rows: [], note: '', proj: rptP != 'hourly'};
  const hourly = []; for (let t = 0; t < Math.min(S.t, DAY_END); t += 60) {const h = hourOf(t), H = S.en.hourly[h]; if (H) hourly.push([h, H])}
  const val = (H, k) => {const r = rateB(H.band);
    if (rptM == 'kwh') return k ? H.cat[k] || 0 : H.kwh;
    if (rptM == 'cost') return k ? egp2usd(S, (H.cat[k] || 0) * r) : egp2usd(S, H.kwh * r + H.water * c.waterEgpM3 + H.dieselA * c.dieselEgpL);
    if (rptM == 'co2') return k ? (H.cat[k] || 0) * c.gridKgKwh : H.kwh * c.gridKgKwh + H.diesel * c.dieselKgL;
    return rptM == 'water' ? H.water : H.diesel};
  const split = rptB != 'total' && ['kwh', 'cost', 'co2'].includes(rptM), keys = split ? (rptB == 'system' ? cats : AREAS) : ['t'];
  const vk = (H, k) => k == 't' ? val(H) : rptB == 'system' ? val(H, k) : (rptM == 'kwh' ? H.term[k] || 0 : rptM == 'cost' ? egp2usd(S, (H.term[k] || 0) * rateB(H.band)) : (H.term[k] || 0) * c.gridKgKwh);
  out.keys = keys; out.names = keys.map(k => k == 't' ? RPT_M[rptM][0] : rptB == 'system' ? ENCATS[k] : AREA_N[k]); out.colors = keys.map((k, i) => k == 't' ? 'var(--s1)' : rptB == 'system' ? ENC[k] : `var(--s${i % 8 + 1})`);
  const day = hourly.map(([h, H]) => ({x: pad(h), label: pad(h) + ':00', v: Object.fromEntries(keys.map(k => [k, vk(H, k)]))}));
  if (rptP == 'hourly') {out.rows = day; out.note = 'Simulated meter readings for today, per hour.' + (split && rptM != 'kwh' && rptB != 'total' ? ' Split shows electricity only; water and diesel are site-level.' : ''); return out}
  const tot = Object.fromEntries(keys.map(k => [k, day.reduce((a, r) => a + r.v[k], 0) * dayF()]));
  if (rptP == 'daily') {out.rows = WK_F.map(([n, f]) => ({x: n, label: n, v: Object.fromEntries(keys.map(k => [k, tot[k] * (.7 + .3 * f)]))})); out.note = 'Modeled projection: today\'s simulated run-rate × (70% fixed + 30% traffic-driven × illustrative weekday factor). Not metered history.'; return out}
  const dm = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31], hvS = rptM == 'water' || rptM == 'diesel' ? 0 : (S.en.kwh.hvac || 0) / (kwhOf(S.en.kwh) || 1), ref = hvF(27);
  out.rows = CAI_TM.map((T, i) => ({x: 'JFMAMJJASOND'[i], label: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i], v: Object.fromEntries(keys.map(k => {const s = k == 'hvac' ? 1 : k == 't' || rptB == 'area' ? hvS : 0; return [k, tot[k] * dm[i] * (1 - s + s * hvF(T) / ref)]}))}));
  out.note = 'Modeled projection: HVAC share scaled by approximate Cairo monthly mean temperatures; other loads at today\'s run-rate. Not metered history.'; return out}
VIEWS['en.reports'] = {sub: 'Hourly (simulated actual), daily and monthly (modelled projections) consumption, cost and emissions — with export.',
  html: () => `<div class="card"><div class="row"><label class="sm mu">Metric</label><select onchange="rptM=this.value;live(true)">${Object.entries(RPT_M).map(([k, [n]]) => `<option value="${k}" ${k == rptM ? 'selected' : ''}>${n}</option>`).join('')}</select>
    <label class="sm mu">Period</label><div class="seg">${[['hourly', 'Hourly (today)'], ['daily', 'Daily (week)'], ['monthly', 'Monthly (year)']].map(([k, n]) => `<button class="${rptP == k ? 'on' : ''}" onclick="rptP='${k}';renderPage()">${n}</button>`).join('')}</div>
    <label class="sm mu">Breakdown</label><select onchange="rptB=this.value;live(true)">${[['system', 'By system'], ['area', 'By terminal / area'], ['total', 'Total only']].map(([k, n]) => `<option value="${k}" ${k == rptB ? 'selected' : ''}>${n}</option>`).join('')}</select><span class="sp"></span><button class="btn" onclick="rptCsv()">Export this report (CSV)</button><button class="btn" onclick="rptFull()">Full energy report (CSV)</button></div></div>
  <div class="card" style="margin-top:12px"><div class="ch" data-live="rptTitle"></div><div data-live="rptChart"></div></div><div class="card" style="margin-top:12px"><div data-live="rptTab" class="tw"></div></div>`};
const rptFmt = v => rptM == 'cost' ? money(v) : kfmt(v);
LIVE.rptTitle = () => `${RPT_M[rptM][0]} — ${rptP == 'hourly' ? 'hourly, today (simulated)' : rptP == 'daily' ? 'daily, typical week (projection)' : 'monthly, year (projection)'} · ${rptM == 'cost' ? cur : RPT_M[rptM][1]}`;
LIVE.rptChart = () => {const d = rptData(); return stackBars('c-rpt', d.rows, d.keys, d.colors, {names: d.names, fy: rptFmt}) + `<p class="note">${d.note}</p>`};
LIVE.rptTab = () => {const d = rptData(), tot = k => d.rows.reduce((a, r) => a + (r.v[k] || 0), 0);
  return `<table><tr><th>${rptP == 'hourly' ? 'Hour' : rptP == 'daily' ? 'Day' : 'Month'}</th>${d.names.map(n => `<th class="n">${n}</th>`).join('')}${d.keys.length > 1 ? '<th class="n">Total</th>' : ''}</tr>${d.rows.map(r => `<tr><td>${r.label}</td>${d.keys.map(k => `<td class="n">${rptFmt(r.v[k] || 0)}</td>`).join('')}${d.keys.length > 1 ? `<td class="n"><b>${rptFmt(d.keys.reduce((a, k) => a + (r.v[k] || 0), 0))}</b></td>` : ''}</tr>`).join('')}
  <tr><td><b>Total</b></td>${d.keys.map(k => `<td class="n"><b>${rptFmt(tot(k))}</b></td>`).join('')}${d.keys.length > 1 ? `<td class="n"><b>${rptFmt(d.keys.reduce((a, k) => a + tot(k), 0))}</b></td>` : ''}</tr></table>`};
const csvRow = a => a.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',');
function rptCsv() {const d = rptData(), unit = rptM == 'cost' ? 'USD' : RPT_M[rptM][1];
  dl(`cai_energy_${rptM}_${rptP}.csv`, `# ${RPT_M[rptM][0]} (${unit}) — ${d.proj ? 'MODELED PROJECTION' : 'SIMULATED METERS'} — illustrative tariffs\n` + csvRow(['period', ...d.names]) + '\n' + d.rows.map(r => csvRow([r.label, ...d.keys.map(k => (rptM == 'cost' ? r.v[k] : r.v[k]).toFixed(2))])).join('\n'), 'text/csv')}
function rptFull() {const c = S.cfg, L = [csvRow(['hour', 'band', 'kwh_total', ...Object.keys(ENCATS).map(k => 'kwh_' + k), ...AREAS.map(a => 'kwh_' + a), 'water_m3', 'diesel_l_all', 'diesel_l_airport', 'electricity_usd', 'water_usd', 'diesel_usd', 'co2_kg'])];
  for (let h = 6; h < 24; h++) {const H = S.en.hourly[h]; if (!H) continue; L.push(csvRow([pad(h) + ':00', H.band == 'p' ? 'peak' : 'off-peak', H.kwh.toFixed(1), ...Object.keys(ENCATS).map(k => (H.cat[k] || 0).toFixed(1)), ...AREAS.map(a => (H.term[a] || 0).toFixed(1)), H.water.toFixed(2), H.diesel.toFixed(1), H.dieselA.toFixed(1),
    egp2usd(S, H.kwh * rateB(H.band)).toFixed(2), egp2usd(S, H.water * c.waterEgpM3).toFixed(2), egp2usd(S, H.dieselA * c.dieselEgpL).toFixed(2), (H.kwh * c.gridKgKwh + H.diesel * c.dieselKgL).toFixed(1)]))}
  dl('cai_energy_report.csv', '# CAI digital twin — SIMULATED energy meters, illustrative tariffs, not actual airport data\n' + L.join('\n'), 'text/csv')}

// ---------- 8 · Optimization Simulator ----------
const OPT = {led: {on: 1, pct: 45, capex: 1800000}, hvac: {on: 1, deg: 1, perDeg: 6, sched: 3, capex: 350000}, idle: {on: 1, pct: 75, capex: 220000}, shift: {on: 0, pct: 15, capex: 150000}, egse: {on: 0, share: 60, kwhL: 3, capex: 2400000}, pv: {on: 0, mwp: 8, yld: 5.3, capexMwp: 800000}};
const OPT_F = [['led', 'LED retrofit + daylight dimming', [['pct', 'Lighting saving', '%'], ['capex', 'Capex', 'USD']]], ['hvac', 'HVAC setpoint & occupancy scheduling', [['deg', 'Setpoint raise', '°C'], ['perDeg', 'Saving per °C', '%'], ['sched', 'Scheduling saving', '%'], ['capex', 'Capex', 'USD']]],
  ['idle', 'Conveyor idle-stop (sleep mode)', [['pct', 'Idle energy removed', '%'], ['capex', 'Capex', 'USD']]], ['shift', 'Load shifting (pre-cooling, EV charging off-peak)', [['pct', 'Peak-band kWh shifted', '%'], ['capex', 'Capex', 'USD']]],
  ['egse', 'Convert diesel GSE to electric', [['share', 'Diesel displaced', '%'], ['kwhL', 'Electricity per litre displaced', 'kWh/L'], ['capex', 'Capex', 'USD']]], ['pv', 'Solar PV (carports / roofs)', [['mwp', 'Size', 'MWp'], ['yld', 'Specific yield', 'kWh/kWp·day'], ['capexMwp', 'Capex', 'USD/MWp']]]];
function optCalc() { // annualised from today's metered run-rate; measures applied in sequence so savings are not double counted
  const c = S.cfg, k = dayF() * 365, B = {}; for (const cat in S.en.kwhB) B[cat] = {p: S.en.kwhB[cat].p * k, o: S.en.kwhB[cat].o * k};
  const sumB = X => Object.values(X).reduce((a, b) => ({p: a.p + b.p, o: a.o + b.o}), {p: 0, o: 0}), cost = b => egp2usd(S, b.p * c.elec.peakEgp + b.o * c.elec.offpeakEgp), kwh = b => b.p + b.o;
  const base = {B: JSON.parse(JSON.stringify(B)), dsl: S.en.dieselAirportL * k, dslAll: (S.en.dieselAirportL + S.en.dieselOtherL) * k, peak: S.en.peakKw}, X = JSON.parse(JSON.stringify(B)), rows = [];
  const scale = (cat, f) => {if (X[cat]) {X[cat].p *= f; X[cat].o *= f}}, snap = () => ({kwh: kwh(sumB(X)), cost: cost(sumB(X))});
  let dsl = base.dsl, dslAll = base.dslAll, pvKwh = 0, shiftUsd = 0, shiftKwh = 0;
  const step = (id, name, fn, f) => {const o = OPT[id]; if (!o.on) {rows.push({id, name, off: 1}); return} const a = snap(), d0 = dsl, d0a = dslAll; const extra = fn(o) || 0; const b = snap();
    const dUsd = a.cost - b.cost + (d0 - dsl) * egp2usd(S, c.dieselEgpL) + extra, dKwh = a.kwh - b.kwh, co2 = (dKwh * c.gridKgKwh + (d0a - dslAll) * c.dieselKgL) / 1000, capex = id == 'pv' ? o.mwp * o.capexMwp : o.capex;
    rows.push({id, name, dKwh, dL: d0 - dsl, dUsd, co2, capex, pb: dUsd > 0 ? capex / dUsd : Infinity, f: f(o)})};
  step('led', 'LED retrofit + daylight dimming', o => scale('light', 1 - o.pct / 100), o => `lighting kWh × ${o.pct}%`);
  step('hvac', 'HVAC setpoint & scheduling', o => scale('hvac', 1 - (o.deg * o.perDeg + o.sched) / 100), o => `HVAC kWh × (${o.deg} °C × ${o.perDeg}% + ${o.sched}%)`);
  step('idle', 'Conveyor idle-stop', o => {const idle = xKwh(S, 'wIdle') * k * o.pct / 100, tot = kwh(X.conv || {p: 0, o: 0}) || 1; scale('conv', 1 - Math.min(idle, tot) / tot)}, o => `measured idle conveyor kWh (${kfmt(xKwh(S, 'wIdle'))} today) × ${o.pct}%`);
  step('egse', 'Diesel GSE → electric', o => {const l = dsl * o.share / 100; dsl -= l; dslAll -= l; const add = l * o.kwhL, ev = X.ev || (X.ev = {p: 0, o: 0}); ev.o += add}, o => `airport diesel × ${o.share}% displaced; + ${o.kwhL} kWh off-peak charging per litre`);
  step('shift', 'Load shifting to off-peak', o => {let mv = 0; for (const cat of ['hvac', 'ev']) if (X[cat]) {const m = X[cat].p * o.pct / 100; X[cat].p -= m; X[cat].o += m; mv += m} shiftKwh = mv}, o => `${o.pct}% of peak-band HVAC & charging kWh moved to off-peak × (peak − off-peak tariff)`);
  step('pv', 'Solar PV', o => {pvKwh = Math.min(o.mwp * 1000 * o.yld * 365, kwh(sumB(X)) * .45); for (const cat in X) {const share = X[cat].o / (sumB(X).o || 1); X[cat].o -= Math.min(X[cat].o, pvKwh * share)}}, o => `${o.mwp} MWp × ${o.yld} kWh/kWp·day × 365 (capped at 45% of load), offsets off-peak kWh`);
  const P = sumB(X), B0 = sumB(base.B), redF = kwh(P) / (kwh(B0) || 1), peak = base.peak * Math.min(1, redF + (OPT.pv.on ? pvKwh / (kwh(B0) || 1) * .3 : 0)) * (OPT.shift.on ? 1 - OPT.shift.pct / 100 * .4 : 1);
  const dem = p => egp2usd(S, p * c.elec.demandEgpKwMonth * 12);
  const sum = {cur: {kwh: kwh(B0), elec: cost(B0), dem: dem(base.peak), dsl: base.dsl * egp2usd(S, c.dieselEgpL), co2: (kwh(B0) * c.gridKgKwh + base.dslAll * c.dieselKgL) / 1000, peak: base.peak},
    pro: {kwh: kwh(P), elec: cost(P), dem: dem(peak), dsl: dsl * egp2usd(S, c.dieselEgpL), co2: (kwh(P) * c.gridKgKwh + dslAll * c.dieselKgL) / 1000, peak}};
  for (const s of [sum.cur, sum.pro]) s.tot = s.elec + s.dem + s.dsl;
  return {rows, sum, capex: rows.filter(r => !r.off).reduce((a, r) => a + r.capex, 0)}}
VIEWS['en.optimize'] = {sub: 'Compare current consumption with proposed energy-saving actions. Baseline = today\'s simulated meters annualised; measures are applied in sequence so savings are never counted twice.',
  html: () => `<div class="g" style="grid-template-columns:360px minmax(0,1fr)"><div class="card cfg"><div class="ch">Proposed actions</div>${OPT_F.map(([id, n, fs]) => `<div style="margin-bottom:10px"><label class="row" style="font-weight:600"><input type="checkbox" ${OPT[id].on ? 'checked' : ''} onchange="OPT.${id}.on=this.checked?1:0;live(true)"> ${n}</label>
    <table>${fs.map(([k, l, u]) => `<tr><td class="sm">${l}</td><td><input type="number" step="any" value="${OPT[id][k]}" onchange="OPT.${id}.${k}=+this.value;live(true)"></td><td class="mu sm">${u}</td></tr>`).join('')}</table></div>`).join('')}
    <div class="row"><button class="btn pri" onclick="act('eco')">Apply LED + HVAC + idle-stop live</button><button class="btn" onclick="act('ecooff')">End live intervention</button></div></div>
  <div class="g" style="align-content:start"><div data-live="opKpi"></div><div class="card"><div class="ch">Current vs proposed (per year)</div><div data-live="opSum" class="tw"></div></div><div class="card"><div class="ch">Savings by action</div><div data-live="opTab" class="tw"></div></div>
  <div class="card"><div class="ch">Validate with the simulation engine<span class="sp"></span><button class="btn pri" onclick="simMeasures()">Run full day with LED + HVAC + idle-stop</button></div><div id="measOut" class="tw"><p class="note">Runs two complete simulated days (with and without the measures) through the engine and compares the metered results.</p></div></div></div></div>`};
LIVE.opKpi = () => {const o = optCalc(), d = o.sum.cur.tot - o.sum.pro.tot;
  return `<div class="kp">${kpiTile('Energy cost / yr — current', mk(o.sum.cur.tot), 'run-rate, illustrative tariffs')}${kpiTile('Energy cost / yr — proposed', mk(o.sum.pro.tot))}${kpiTile('Estimated saving', mk(d), Math.round(100 * d / (o.sum.cur.tot || 1)) + '% of energy cost', '', 'pos')}${kpiTile('Capex', mk(o.capex), d > 0 ? 'payback ' + (o.capex / d).toFixed(1) + ' yr' : '')}${kpiTile('Emissions avoided', kfmt(o.sum.cur.co2 - o.sum.pro.co2) + ' tCO₂e/yr', '', '', 'pos')}${kpiTile('Peak demand', kfmt(o.sum.pro.peak) + ' kW', 'from ' + kfmt(o.sum.cur.peak) + ' kW')}</div>`};
LIVE.opSum = () => {const {cur: a, pro: b} = optCalc().sum, r = (n, x, y, f, good) => `<tr><td>${n}</td><td class="n">${f(x)}</td><td class="n">${f(y)}</td><td class="n ${(y - x) * good < 0 ? 'pos' : (y - x) ? 'neg' : ''}">${(y - x > 0 ? '+' : '') + f(y - x)}</td><td class="n mu">${x ? Math.round(100 * (y - x) / x) + '%' : ''}</td></tr>`;
  return `<table><tr><th></th><th class="n">Current</th><th class="n">Proposed</th><th class="n">Change</th><th class="n">%</th></tr>${r('Grid electricity (kWh/yr)', a.kwh, b.kwh, kfmt, 1)}${r('Peak demand (kW)', a.peak, b.peak, kfmt, 1)}${r('Electricity cost', a.elec, b.elec, money, 1)}${r('Demand charges', a.dem, b.dem, money, 1)}${r('Diesel cost (airport)', a.dsl, b.dsl, money, 1)}${r('<b>Total energy cost</b>', a.tot, b.tot, money, 1)}${r('Emissions (tCO₂e/yr)', a.co2, b.co2, kfmt, 1)}</table>`};
LIVE.opTab = () => {const o = optCalc();
  return `<table><tr><th>Action</th><th class="n">kWh/yr</th><th class="n">Diesel L/yr</th><th class="n">Saving/yr</th><th class="n">tCO₂e/yr</th><th class="n">Capex</th><th class="n">Payback</th><th>Formula</th></tr>${o.rows.map(r => r.off ? `<tr class="mu"><td>${r.name}</td><td colspan="7">not selected</td></tr>` : `<tr><td>${r.name}</td><td class="n ${r.dKwh < 0 ? 'neg' : ''}">${kfmt(r.dKwh)}</td><td class="n">${r.dL ? kfmt(r.dL) : '—'}</td><td class="n pos">${money(r.dUsd)}</td><td class="n">${r.co2.toFixed(0)}</td><td class="n">${money(r.capex)}</td><td class="n">${isFinite(r.pb) ? r.pb.toFixed(1) + ' yr' : '—'}</td><td class="formula">${esc(r.f)}</td></tr>`).join('')}</table>
  <p class="note">Baseline = today's metered kWh per tariff band × (1440 ÷ minutes elapsed) × 365. Each action works on what is left after the previous ones (e.g. PV offsets the reduced load), so the rows add up to the total without double counting. Demand-charge savings appear in the summary only. Screening estimates: no financing, maintenance changes or tariff escalation.</p>`};
