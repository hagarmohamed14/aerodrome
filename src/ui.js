// ===================== UI CORE =====================
const SEED = 2026;
let S, BASE, play = 1, spd = 2, timer, lastTick = performance.now(), role = 'Airport Operations Manager', grp = 'ov', sub = {}, sel = null, mapMode = 'aerial', notifSeen = 0, cur = 'USD';
const LAYERS = {ac: 1, veh: 1, stands: 1, zones: 1, alerts: 1, labels: 1};
const ROLES = ['Airport Operations Manager', 'Terminal Operations Officer', 'Ground Handling Supervisor', 'Baggage Operations Officer', 'Maintenance Planner', 'Certifying Engineer', 'Energy Manager', 'Finance Controller', 'Safety Investigator', 'ATC Training User', 'Passenger Support Agent', 'CCTV Operator', 'Read-only Analyst'];
const IC = {
  ov: '<path d="M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z"/>',
  ops: '<path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/>',
  bag: '<path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M4 7h16v13H4zM9 7v13M15 7v13"/>',
  ast: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>',
  biz: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  pax: '<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0"/>',
  saf: '<path d="M12 2l8 3v6c0 5-3.5 9.5-8 11-4.5-1.5-8-6-8-11V5z"/>',
  ef: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  cam: '<path d="M3 7h11l3 3v4l-3 3H3zM17 10l4-2v8l-4-2M7 21h4M9 17v4"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
  search: '<path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3"/>',
  play: '<path d="M7 4l13 8-13 8z" fill="currentColor"/>', pause: '<path d="M6 4h4v16H6zM14 4h4v16h-4z" fill="currentColor"/>',
  step: '<path d="M5 4l10 8-10 8zM17 4h2v16h-2z" fill="currentColor"/>', reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5"/>',
  chev: '<path d="M9 6l6 6-6 6"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>', menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
};
const ico = (k, cls = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="${cls}" aria-hidden="true">${IC[k]}</svg>`;
const NAV = [
  ['ov', 'Overview', 'ov', []],
  ['ops', 'Airport Operations', 'ops', [['flights', 'Flights & Flight Plans'], ['stands', 'Stands & Apron'], ['airfield', 'Runways, Taxiways & Weather'], ['atc', 'ATC Training Sim'], ['terms', 'Terminals & Gates']]],
  ['bag', 'Baggage & Ground Handling', 'bag', [['flow', 'Baggage Flow (live)'], ['track', 'Bag Tracking & QR'], ['screen', 'Screening Workflow'], ['ground', 'Turnaround & Ground Handling'], ['fleet', 'Ground Vehicles']]],
  ['ast', 'Assets & Maintenance', 'ast', [['tech', 'Aircraft Technical Status'], ['wo', 'Defects & Work Orders'], ['sched', 'Maintenance Schedule'], ['parts', 'Spare Parts'], ['pave', 'Pavement & Facilities'], ['gse', 'GSE Availability & Costs']]],
  ['en', 'Energy Management', 'ef', [['overview', 'Energy Overview'], ['terms', 'Terminal Consumption'], ['systems', 'Systems Monitoring'], ['live', 'Live Simulation'], ['costs', 'Cost per Resource'], ['alerts', 'Efficiency & Alerts'], ['reports', 'Charts & Reports'], ['optimize', 'Optimization Simulator']]],
  ['fin', 'Finance', 'biz', [['overview', 'Financial Overview'], ['revenue', 'Revenue Sources'], ['opex', 'Operating Expenses'], ['overstay', 'Overstay Calculator'], ['defect', 'Aircraft Technical Failure'], ['diversion', 'Emergency Diversions'], ['pnl', 'Profit & Loss'], ['whatif', 'Financial Impact Simulator'], ['events', 'Event Impact Register'], ['tx', 'Transactions & Reports'], ['config', 'Rates, Fees & Currency']]],
  ['pax', 'Passengers & Services', 'pax', [['services', 'Passenger Services'], ['tickets', 'Tickets & Refunds'], ['claims', 'Lost Baggage & Claims'], ['private', 'Private Aviation & Seasonal']]],
  ['saf', 'Safety & Reports', 'saf', [['emerg', 'Emergencies & Diversions'], ['inc', 'Incidents'], ['cases', 'Real-World Case Studies'], ['risk', 'Risk Register'], ['reports', 'KPIs & Reports'], ['tests', 'Scenario Tests'], ['audit', 'Audit Log & Data Sources']]],
  ['cctv', 'CCTV & Surveillance', 'cam', [['wall', 'Camera Map & Live View'], ['dir', 'Camera Directory'], ['maint', 'Maintenance Cameras'], ['alerts', 'Alerts & Incidents'], ['access', 'Privacy & Access']]],
];
const bd = (s, c) => `<span class="b ${c || ''}">${s}</span>`;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const curK = () => cur == 'EGP' ? S.cfg.fx : cur == 'EUR' ? S.cfg.eurPerUsd : 1;
const money = (v, d = 0) => cur == 'USD' ? usd(v, d) : (v < 0 ? '−' : '') + (cur == 'EUR' ? '€' : 'EGP ') + Math.abs(v * curK()).toLocaleString('en-US', {maximumFractionDigits: d});
const kfmt = v => Math.abs(v) >= 1e6 ? (v / 1e6).toFixed(2) + 'M' : Math.abs(v) >= 1e4 ? (v / 1e3).toFixed(1) + 'k' : Math.round(v).toLocaleString('en-US');
const mk = v => (v < 0 ? '−' : '') + (cur == 'EGP' ? 'EGP ' : cur == 'EUR' ? '€' : '$') + kfmt(Math.abs(v * curK()));
const curSeg = () => `<div class="seg">${['USD', 'EGP', 'EUR'].map(c => `<button class="${cur == c ? 'on' : ''}" onclick="cur='${c}';renderPage()">${c}</button>`).join('')}</div>`;
// who may change rates (demo permissions): financial rates & fees vs energy tariffs and equipment ratings
const CFG_ROLES = {fin: ['Airport Operations Manager', 'Finance Controller'], en: ['Airport Operations Manager', 'Finance Controller', 'Energy Manager']};
const EN_P = /^(elec\.|waterEgpM3|dieselEgpL|wasteEgpT|gridKgKwh|power\.|hvacPaxKw|conveyorKw|convIdleFactor|gpuKw|evChargerKw|gse\.dieselLkm|agl\.|waste\.)/;
const cfgKind = p => EN_P.test(p) ? 'en' : 'fin', canCfgK = k => CFG_ROLES[k].includes(role), canCfgP = p => canCfgK(cfgKind(p));
const cfgDis = p => canCfgP(p) ? '' : `disabled title="${cfgKind(p) == 'en' ? 'Energy tariffs' : 'Financial rates'} are editable by ${CFG_ROLES[cfgKind(p)].join(', ')}"`;
const toast = m => {const e = $('#toast'); e.textContent = m; e.style.display = 'block'; clearTimeout(e.t); e.t = setTimeout(() => e.style.display = 'none', 2800)};
const can = () => role != 'Read-only Analyst' || (toast('Read-only Analyst cannot perform actions'), false);
const audit = m => S.au.unshift({t: S.t, role, m});
const phCls = r => r.block || r.ph == 'HOLDING' || r.ph == 'AWAITING STAND' ? 'wn' : r.ph == 'DIVERTED' ? 'cr' : ['COMPLETED', 'EN ROUTE OUT', 'DEPARTED'].includes(r.ph) ? 'ok' : r.ph == 'ON STAND' || r.ph == 'BOARDING' ? 'in' : '';
const totDelay = r => Object.values(r.dly).reduce((a, d) => a + d.min, 0);

// ---------- boot ----------
function boot() {
  S = warm(makeState(SEED, true));
  try {const p = JSON.parse(localStorage.getItem('cai-ui') || '{}'); if (p.mapMode) mapMode = p.mapMode; if (p.nav) $('#nav').classList.toggle('col', p.nav == 'col')} catch (e) {}
  BASE = run(SEED, null, DAY_END);
  let th = 'dark'; try {th = localStorage.getItem('cai-theme') || 'dark'} catch (e) {} if (/theme=light/.test(location.hash)) th = 'light';
  shell(); setTheme(th); go('ov'); rst(); requestAnimationFrame(frame);
  if (location.hash == '#selftest') setTimeout(() => {go('saf', 'tests'); runTests(true)}, 50);
  const hp = new URLSearchParams(location.hash.slice(1)); // deep link, e.g. #view=biz.pnl&p=ts2&t=300&play=0
  if (hp.get('view')) {const [g, s2] = hp.get('view').split('.'); if (hp.get('p')) schedulePreset(S, hp.get('p'), role); if (hp.get('t')) while (S.t < +hp.get('t')) tick(S);
    if (hp.get('tour')) tour();
    if (hp.get('map')) mapMode = hp.get('map'); if (hp.get('play') == '0') {play = 0; rst()} go(g, s2); if (hp.get('sel')) {const [k, i] = hp.get('sel').split(':'); inspect(k, i)} live(true)}
}
function tour() { // QA aid: cycles through every page, map mode and inspector while the sim runs at 30×
  const pages = NAV.flatMap(([k, , , s]) => s.length ? s.map(x => [k, x[0]]) : [[k]]), mm = ['aerial', 'ops', '3d']; let i = 0; spd = 30; rst();
  const sc = ['p:all', 's:diversion', 's:belt', 's:storm', 's:defect', 's:rwy1', 's:rwyok', 's:beltok', 's:clear', 's:spike', 's:tug', 's:tugok', 's:vehfail', 's:convx', 's:termout', 's:termok', 's:eco', 's:camfail', 's:nvrfail', 's:camok', 's:convok', 's:ecooff'];
  setInterval(() => {const [g, s] = pages[i % pages.length]; if (g == 'ov') mapMode = mm[Math.floor(i / pages.length) % 3]; go(g, s);
    const v = sc[i % sc.length].split(':'); v[0] == 'p' ? schedulePreset(S, v[1], role) : scn(S, v[1], role);
    if (i % 3 == 0 && S.R[i % S.R.length]) inspect('rot', S.R[i % S.R.length].id); if (i % 5 == 1) inspect('veh', S.V[i % S.V.length].id); if (i % 7 == 2 && S.B[i * 37 % S.B.length]) inspect('bag', S.B[i * 37 % S.B.length].id); if (i % 4 == 3) inspect('stand', STANDS[i % STANDS.length].id);
    if (g == 'cctv' && i % 2 == 0) camSelect(CAMS[(i * 7) % (CAMS.length - 1)].id, 1);
    if (i % 6 == 4 && S.div.some(d => d.status == 'REQUESTED')) acceptDiversion(S, S.div.find(d => d.status == 'REQUESTED').id, 0, role);
    for (const d of S.defects) if (d.status == 'AWAITING RELEASE') releaseDefect(S, d.id, 'Certifying Engineer');
    const o = $('#selftest-out'); if (!__err.length) o.textContent = 'OK t=' + S.t + ' page=' + g + '.' + (s || '') + ' visited=' + (i + 1); i++}, 700);
}
function setTheme(t) {document.documentElement.dataset.theme = t; try {localStorage.setItem('cai-theme', t)} catch (e) {} const b = $('#themeBtn'); if (b) b.title = t == 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
function toggleTheme() {setTheme(document.documentElement.dataset.theme == 'light' ? 'dark' : 'light'); if (grp == 'ov' && mapMode == '3d') fit3d('m1')}
function savePrefs() {try {localStorage.setItem('cai-ui', JSON.stringify({mapMode, nav: $('#nav').classList.contains('col') ? 'col' : ''}))} catch (e) {}}
function shell() {
  $('#top').innerHTML = `<div class="brands" role="img" aria-label="Schneider Electric and AVEVA"><img class="se" alt="Schneider Electric" src="${IMG.se}"><span class="sep"></span><img class="av" alt="AVEVA" src="${IMG.av}"></div><span class="hsep"></span>
  <div class="brand"><div class="mk">CAI</div><div><b>Cairo Airport Digital Twin</b><small>Operations simulation · decision support · not for operational use</small></div></div>
  <div class="simbar"><div class="clock" id="clk"></div><span id="simst" class="pill"></span>
  <button class="ib pri" id="bplay" title="Play / pause (Space)" onclick="tg()"></button><button class="ib" title="Step 1 min" onclick="stepOne()">${ico('step')}</button>
  <select id="spd" aria-label="Simulation speed" onchange="spd=+this.value;rst()">${[1, 2, 5, 10, 30].map(s => `<option value="${s}" ${s == spd ? 'selected' : ''}>${s}× </option>`).join('')}</select>
  <button class="ib" title="Reset simulation" onclick="resetSim()">${ico('reset')}</button></div>
  <div class="row"><select id="scnSel" aria-label="Scenario">${scnOptions()}</select><button class="btn" onclick="inject()">Inject</button></div>
  <div class="sp"></div>
  <div class="search">${ico('search')}<input id="srch" placeholder="Search flight, reg, bag, stand, vehicle…" aria-label="Global search" autocomplete="off"><div class="dd" id="srchdd"></div></div>
  <div class="bell" style="position:relative"><button class="ib" title="Notifications" onclick="toggleNotif()">${ico('bell')}</button><span class="cnt" id="ncnt" style="display:none"></span><div class="dd" id="notif" style="width:380px"></div></div>
  <select id="role" aria-label="Demo role" title="Demo role (not real access control)">${ROLES.map(r => `<option ${r == role ? 'selected' : ''}>${r}</option>`).join('')}</select>
  <button class="ib theme-btn" id="themeBtn" type="button" title="Light / dark mode" aria-label="Toggle light mode" onclick="toggleTheme()"><svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg><svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.2M12 19.8V22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2 12h2.2M19.8 12H22M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6"/></svg></button>`;
  $('#role').onchange = e => {role = e.target.value; audit('Role switched (demo only, not real access control)'); refresh()};
  $('#srch').oninput = e => search(e.target.value); $('#srch').onfocus = e => search(e.target.value);
  document.addEventListener('click', e => {if (!e.target.closest('.search')) $('#srchdd').classList.remove('on'); if (!e.target.closest('.bell')) $('#notif').classList.remove('on')});
  document.addEventListener('keydown', e => {if (e.target.matches('input,select,textarea')) return; if (e.code == 'Space') {e.preventDefault(); tg()} if (e.key == 'Escape') closeInsp()});
  navRender();
}
function scnOptions() {return `<optgroup label="Test scenarios (timed)">${Object.entries(PRESETS).map(([k, p]) => `<option value="p:${k}">${p.name}</option>`).join('')}</optgroup>
  <optgroup label="Inject now">${Object.entries(SCN).map(([k, n]) => `<option value="s:${k}">${n}</option>`).join('')}<option value="s:overstay">Operator hold → stand overstay</option><option value="s:defect">Technical defect (next departure)</option><option value="s:diversion">Emergency diversion request</option></optgroup>`}
function inject() {
  if (!can()) return; const v = $('#scnSel').value, [t, k] = v.split(':');
  if (['rwy1', 'rwy2', 'belt', 'defect', 'vehfail', 'termout'].includes(k) && !confirm('Apply "' + (SCN[k] || k) + '"?\n\nSensitive action — written to the audit log.')) return;
  if (t == 'p') {schedulePreset(S, k, role); toast('Scheduled: ' + PRESETS[k].name)} else {scn(S, k, role); toast('Applied: ' + (SCN[k] || k)); if (k == 'diversion') {go('saf', 'emerg')}}
  refresh();
}
function navRender() {
  $('#nav').innerHTML = NAV.map(([k, n, i, subs]) => `<div class="ng ${grp == k ? 'on open' : ''}"><button onclick="go('${k}')" title="${n}">${ico(i)}<span class="lbl">${n}</span>${subs.length ? ico('chev', 'chev') : ''}</button>
    ${subs.length ? `<div class="subs">${subs.map(([s, sn]) => `<button class="${grp == k && cursub(k) == s ? 'on' : ''}" onclick="go('${k}','${s}')">${sn}</button>`).join('')}</div>` : ''}</div>`).join('') +
    `<button class="ib colbtn" title="Collapse navigation" onclick="$('#nav').classList.toggle('col');savePrefs()">${ico('menu')}</button>`;
}
const cursub = k => sub[k] || (NAV.find(n => n[0] == k)[3][0] || [])[0];
const LEGACY = {energy: ['en', 'overview'], costs: ['fin', 'opex'], revenue: ['fin', 'revenue'], pnl: ['fin', 'pnl'], impact: ['fin', 'whatif'], ledger: ['fin', 'tx'], tariffs: ['fin', 'config'], parking: ['fin', 'overstay']};
function go(k, s) {if (k == 'biz') [k, s] = LEGACY[s] || ['fin', 'overview']; grp = k; if (s) sub[k] = s; navRender(); renderPage(); $('#main').scrollTop = 0}
function renderPage() {
  MAPS.length = 0; CHARTS = {};
  const N = NAV.find(n => n[0] == grp), s = cursub(grp), V = VIEWS[grp + (s ? '.' + s : '')];
  const tabs = N[3].length ? `<div class="tabs">${N[3].map(([x, xn]) => `<button class="${x == s ? 'on' : ''}" onclick="go('${grp}','${x}')">${xn}</button>`).join('')}</div>` : '';
  $('#main').innerHTML = grp == 'ov' ? V.html() : `<div class="ph"><div><h2>${N[1]}</h2><p>${V.sub || ''}</p></div><div class="sp"></div>${tabs}</div>${grp == 'en' || grp == 'fin' ? provBar() : ''}${V.html()}`;
  if (V.mount) V.mount();
  live(true);
}
const refresh = () => renderPage();
// data provenance strip on Energy & Finance pages — nothing here is actual metered or accounting data
const provBar = () => `<div class="prov">${bd('SIMULATED', 'in')}<span>seed ${SEED} · sim time ${loc(S.t)}</span>${bd('ILLUSTRATIVE PRICES', 'wn')}<span>tariffs, fees & FX are assumptions — not official Cairo Airport tariffs</span>${bd('ACTUAL DATA: none connected')}<span>no meter, BMS, ERP or billing integration</span><span class="sp"></span>${curSeg()}</div>`;

// ---------- live regions: <div data-live="fn"> re-rendered after ticks (throttled) ----------
const LIVE = {}; let lastLive = 0;
function live(force) {
  const now = performance.now(); if (!force && now - lastLive < 300) return; lastLive = now;
  syncUtilityCosts(S);
  for (const el of document.querySelectorAll('[data-live]')) {const f = LIVE[el.dataset.live]; if (!f) continue; const h = f(el); if (h != null && el._h !== h) {el._h = h; el.innerHTML = h}}
  topLive(); if (sel) inspRender();
  for (const m of MAPS) if (m.liveUpd) m.liveUpd();
}
function topLive() {
  $('#clk').innerHTML = `${loc(S.t)}<small>Cairo · ${utc(S.t)}Z</small>`;
  const st = S.t >= DAY_END ? ['END OF DAY', 'pau'] : play ? ['SIMULATING ' + spd + '×', 'run'] : ['PAUSED', 'pau'];
  $('#simst').className = 'pill ' + st[1]; $('#simst').textContent = st[0]; $('#bplay').innerHTML = ico(play ? 'pause' : 'play');
  const open = S.al.filter(a => !a.res && a.sev != 'info').length, nw = S.al.length ? S.al.filter(a => +a.id.slice(3) > notifSeen && a.sev != 'info').length : 0;
  $('#ncnt').style.display = nw ? 'grid' : 'none'; $('#ncnt').textContent = nw > 99 ? '99+' : nw;
  document.body.classList.toggle('paused', !play);
}
// ---------- sim controls ----------
function tg() {play = !play; if (S.t >= DAY_END) play = 0; rst(); topLive()}
function rst() {clearInterval(timer); if (play) timer = setInterval(() => {if (!tick(S)) {play = 0; clearInterval(timer); toast('End of simulated day (24:00). Reset to replay.')} lastTick = performance.now(); live()}, 1000 / spd)}
function stepOne() {if (play) tg(); tick(S); lastTick = performance.now() - 1e5; live(true)}
function resetSim() {if (!confirm('Reset the simulation to 07:15 (seed ' + SEED + ')? All injected scenarios and decisions are cleared.')) return; const cfg = S.cfg; S = warm(makeState(SEED, true)); S.cfg = cfg; sel = null; closeInsp(); for (const m of MAPS) m.reset && m.reset(); renderPage(); toast('Simulation reset')}
const frac = () => play ? clamp((performance.now() - lastTick) * spd / 1000, 0, 1) : 0;

// ---------- notifications & search ----------
function toggleNotif() {
  const d = $('#notif'), on = !d.classList.contains('on');
  d.innerHTML = `<div class="row" style="padding:4px 6px"><b>Notifications</b><span class="sp"></span><button class="btn" onclick="go('saf','reports')">All events</button></div>` + (S.al.slice(0, 14).map(alHtml).join('') || '<div class="empty">No alerts</div>');
  d.classList.toggle('on', on); if (on && S.al.length) {notifSeen = +S.al[0].id.slice(3); topLive()}
}
function search(q) {
  const d = $('#srchdd'); q = q.trim().toLowerCase(); if (!q) {d.classList.remove('on'); return}
  const res = [];
  for (const r of S.R) if ([r.arr && r.arr.fl, r.dep && r.dep.fl, r.reg, r.al].join(' ').toLowerCase().includes(q)) res.push(['Flight', `${fid(r)} · ${r.reg} · ${r.al}`, `inspect('rot','${r.id}')`]);
  for (const s of STANDS) if (s.id.toLowerCase() == q) res.push(['Stand', s.id + ' · ' + s.term, `inspect('stand','${s.id}')`]);
  for (const v of S.V) if ((v.id + ' ' + VNAME[v.type]).toLowerCase().includes(q)) res.push(['Vehicle', v.id + ' · ' + VNAME[v.type], `inspect('veh','${v.id}')`]);
  for (const z of ZONES) if ((z.id + ' ' + z.name).toLowerCase().includes(q)) res.push(['Zone', z.name, `inspect('zone','${z.id}')`]);
  if (q.length >= 4) for (const b of S.B) if (b.id.toLowerCase().includes(q) || b.px.toLowerCase().includes(q)) {res.push(['Bag', b.id + ' · ' + b.fl + ' · ' + b.st, `inspect('bag','${b.id}')`]); if (res.length > 30) break}
  d.innerHTML = res.slice(0, 25).map(([k, t, a]) => `<div class="it" onclick="${a};$('#srchdd').classList.remove('on')"><span class="tag">${k}</span>${esc(t)}</div>`).join('') || '<div class="empty">No matches</div>';
  d.classList.add('on');
}
function alHtml(a) {return `<div class="al ${a.sev} ${a.res ? 'res' : ''}" onclick="alClick('${a.id}')"><div class="h">${bd(a.sev == 'cr' ? 'CRITICAL' : a.sev == 'wn' ? 'CAUTION' : 'INFO', a.sev == 'info' ? 'in' : a.sev)}<span>${loc(a.t)} · ${a.sys}</span></div><div class="m">${esc(a.msg)}</div></div>`}
function alClick(id) {const a = S.al.find(x => x.id == id); inspect('alert', id)}

// ---------- inspector drawer ----------
function inspect(k, id) {sel = {k, id}; $('#insp').classList.add('on'); inspRender(); for (const m of MAPS) m.liveUpd && m.liveUpd()}
function closeInsp() {sel = null; $('#insp').classList.remove('on')}
function inspRender() {const f = INSP[sel.k]; if (!f) return; const [t, h] = f(sel.id); const el = $('#insp .ic'); $('#insp .ih h3').innerHTML = t; if (el._h !== h) {el._h = h; el.innerHTML = h}}

// ---------- charts (SVG, hover tooltips) ----------
let CHARTS = {};
function lineChart(id, series, o = {}) { // series: [{name, color, pts:[[x,y]], dash}]
  const W = o.w || 600, H = o.h || 170, P = {l: 46, r: 12, t: 10, b: 22}, xs = series.flatMap(s => s.pts.map(p => p[0])), ys = series.flatMap(s => s.pts.map(p => p[1]));
  if (!xs.length) return '<div class="empty">No data yet</div>';
  const x0 = o.x0 ?? Math.min(...xs), x1 = o.x1 ?? Math.max(...xs), y0 = Math.min(0, ...ys), y1 = Math.max(...ys) * 1.08 || 1;
  const X = x => P.l + (x - x0) / (x1 - x0 || 1) * (W - P.l - P.r), Y = y => H - P.b - (y - y0) / (y1 - y0 || 1) * (H - P.t - P.b);
  const ticks = [0, .25, .5, .75, 1].map(f => y0 + (y1 - y0) * f);
  let s = `<svg viewBox="0 0 ${W} ${H}" onmousemove="chartHover(event,'${id}')" onmouseleave="chartHover(null,'${id}')">`;
  s += ticks.map(v => `<line x1="${P.l}" x2="${W - P.r}" y1="${Y(v)}" y2="${Y(v)}" style="stroke:var(--grid)"/><text x="${P.l - 6}" y="${Y(v) + 3}" text-anchor="end">${o.fy ? o.fy(v) : kfmt(v)}</text>`).join('');
  const xt = o.xt || 6; for (let i = 0; i <= xt; i++) {const xv = x0 + (x1 - x0) * i / xt; s += `<text x="${X(xv)}" y="${H - 6}" text-anchor="middle">${o.fx ? o.fx(xv) : Math.round(xv)}</text>`}
  if (y0 < 0) s += `<line x1="${P.l}" x2="${W - P.r}" y1="${Y(0)}" y2="${Y(0)}" style="stroke:var(--mu2)"/>`;
  for (const se of series) s += `<polyline fill="none" stroke="${se.color}" stroke-width="2" stroke-linejoin="round" ${se.dash ? 'stroke-dasharray="5 4"' : ''} points="${se.pts.map(p => X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1)).join(' ')}"/>`;
  s += `<line class="xh" y1="${P.t}" y2="${H - P.b}" stroke-width="1" style="display:none;stroke:var(--mu)"/></svg><div class="tip"></div>`;
  CHARTS[id] = {series, X, Y, x0, x1, W, P, o};
  const lg = series.length > 1 ? `<div class="row sm mu" style="margin-top:4px">${series.map(se => `<span><i style="display:inline-block;width:14px;height:2px;background:${se.color};vertical-align:3px;margin-right:4px"></i>${se.name}</span>`).join('')}</div>` : '';
  return `<div class="chart" id="${id}">${s}</div>${lg}`;
}
function chartHover(e, id) {
  const el = document.getElementById(id), C = CHARTS[id]; if (!el || !C) return; const tip = el.querySelector('.tip'), xh = el.querySelector('.xh');
  if (!e) {tip.style.display = 'none'; xh.style.display = 'none'; return}
  const svg = el.querySelector('svg'), b = svg.getBoundingClientRect(), vx = (e.clientX - b.left) / b.width * C.W, xv = C.x0 + (vx - C.P.l) / (C.W - C.P.l - C.P.r) * (C.x1 - C.x0);
  const rows = C.series.map(se => {let best = null; for (const p of se.pts) if (!best || Math.abs(p[0] - xv) < Math.abs(best[0] - xv)) best = p; return [se, best]}).filter(r => r[1]);
  if (!rows.length) return; const px = rows[0][1][0];
  xh.setAttribute('x1', C.X(px)); xh.setAttribute('x2', C.X(px)); xh.style.display = '';
  tip.innerHTML = `<b>${C.o.fx ? C.o.fx(px) : px}</b><br>` + rows.map(([se, p]) => `<span style="color:${se.color}">●</span> ${se.name}: ${C.o.fy ? C.o.fy(p[1]) : kfmt(p[1])}`).join('<br>');
  tip.style.display = 'block'; const lx = (e.clientX - b.left); tip.style.left = Math.min(lx + 12, b.width - 160) + 'px'; tip.style.top = '4px';
}
function stackBars(id, rows, keys, colors, o = {}) { // rows: [{x,label, v:{key:val}}]
  const W = o.w || 600, H = o.h || 170, P = {l: 46, r: 8, t: 8, b: 22}, n = rows.length; if (!n) return '<div class="empty">No data yet</div>';
  const mx = Math.max(...rows.map(r => keys.reduce((a, k) => a + (r.v[k] || 0), 0))) * 1.08 || 1, bw = (W - P.l - P.r) / n;
  const Y = v => (H - P.t - P.b) * v / mx; let s = `<svg viewBox="0 0 ${W} ${H}">`;
  for (const f of [0, .5, 1]) s += `<line x1="${P.l}" x2="${W - P.r}" y1="${H - P.b - Y(mx * f)}" y2="${H - P.b - Y(mx * f)}" style="stroke:var(--grid)"/><text x="${P.l - 6}" y="${H - P.b - Y(mx * f) + 3}" text-anchor="end">${o.fy ? o.fy(mx * f) : kfmt(mx * f)}</text>`;
  rows.forEach((r, i) => {let y = H - P.b; const x = P.l + i * bw + bw * .15, w = bw * .7, tipTxt = esc(r.label + ' — ' + keys.map((k, j) => o.names[j] + ': ' + (o.fy ? o.fy(r.v[k] || 0) : kfmt(r.v[k] || 0))).join(' · '));
    s += `<g><title>${tipTxt}</title>`; keys.forEach((k, j) => {const h = Y(r.v[k] || 0); if (h > .5) {s += `<rect x="${x}" y="${y - h + (j ? 1 : 0)}" width="${w}" height="${Math.max(0, h - (j ? 1 : 0))}" fill="${colors[j]}" rx="${j == keys.length - 1 ? 2 : 0}"/>`; y -= h}}); s += `<rect x="${P.l + i * bw}" y="${P.t}" width="${bw}" height="${H - P.t - P.b}" fill="transparent"/></g>`;
    if (n <= 24 || i % 2 == 0) s += `<text x="${x + w / 2}" y="${H - 6}" text-anchor="middle">${r.x}</text>`});
  return `<div class="chart">${s}</svg></div><div class="row sm mu" style="margin-top:4px">${keys.map((k, j) => `<span><i style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${colors[j]};margin-right:4px;vertical-align:-1px"></i>${o.names[j]}</span>`).join('')}</div>`;
}
function hbars(rows, o = {}) { // rows: [[label, value, color?, title?]]
  const mx = Math.max(...rows.map(r => Math.abs(r[1])), 1);
  return `<div class="hbar">${rows.map(r => `<span title="${esc(r[3] || '')}">${r[0]}</span><div class="tr" title="${esc(r[3] || '')}"><i style="width:${Math.abs(r[1]) / mx * 100}%;background:${r[2] || 'var(--s1)'}"></i></div><b class="${o.cls || ''}">${o.f ? o.f(r[1]) : mk(r[1])}</b>`).join('')}</div>`;
}
