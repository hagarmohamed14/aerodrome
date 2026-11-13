// ===================== CCTV & SURVEILLANCE (simulation + optional authorised feeds) =====================
// Camera records are ILLUSTRATIVE placeholders on a conceptual plan — not real Cairo Airport camera positions or coverage.
// No real CAI feed is connected. Video plays only from (a) a stream URL / file the user supplies and is authorised to view,
// or (b) a synthetic demo render clearly labelled as such. Security-sensitive areas are withheld (placeholder only).
const CAM_FAC = [ // id, name, group, plan rect (conceptual site plan 1000×560)
  {id: 'T1', n: 'Terminal 1', g: 'Terminals', x: 40, y: 210, w: 170, h: 90}, {id: 'T2', n: 'Terminal 2', g: 'Terminals', x: 230, y: 210, w: 220, h: 90},
  {id: 'T3', n: 'Terminal 3', g: 'Terminals', x: 470, y: 210, w: 300, h: 90}, {id: 'STC', n: 'Seasonal Flights Terminal', g: 'Terminals', x: 40, y: 330, w: 170, h: 70},
  {id: 'GA', n: 'Private aviation / FBO', g: 'Other facilities', x: 230, y: 360, w: 130, h: 60}, {id: 'BHS', n: 'Baggage hall (T2/T3)', g: 'Other facilities', x: 230, y: 305, w: 540, h: 34},
  {id: 'DEPOT', n: 'GSE staging & EV charging', g: 'Ground support', x: 380, y: 360, w: 170, h: 60}, {id: 'PARK', n: 'Public car parks & forecourts', g: 'Public access', x: 40, y: 440, w: 730, h: 70},
  {id: 'INSP', n: 'Aircraft inspection apron (M1–M2)', g: 'Maintenance', mx: 'Aircraft inspection area', x: 800, y: 130, w: 170, h: 70},
  {id: 'HGR1', n: 'Maintenance hangar 1 (base checks)', g: 'Maintenance', mx: 'Aircraft maintenance hangar', x: 800, y: 210, w: 170, h: 80},
  {id: 'HGR2', n: 'Maintenance hangar 2 (line & AOG)', g: 'Maintenance', mx: 'Aircraft maintenance hangar', x: 800, y: 300, w: 170, h: 60},
  {id: 'WSHP', n: 'Component & avionics workshops', g: 'Maintenance', mx: 'Workshop', x: 800, y: 370, w: 80, h: 50},
  {id: 'STORE', n: 'Parts & equipment store', g: 'Maintenance', mx: 'Parts & equipment storage', x: 890, y: 370, w: 80, h: 50},
  {id: 'GSEW', n: 'GSE maintenance workshop', g: 'Maintenance', mx: 'Ground equipment maintenance', x: 570, y: 360, w: 100, h: 60},
  {id: 'VRF', n: 'Vehicle repair facility', g: 'Maintenance', mx: 'Vehicle repair facility', x: 690, y: 360, w: 80, h: 60},
  {id: 'SEC', n: 'Security-sensitive areas (withheld)', g: 'Restricted', x: 40, y: 28, w: 730, h: 80},
];
const CFAC = Object.fromEntries(CAM_FAC.map(f => [f.id, f]));
const CAM_AREA = { // code → display, category, access class, purpose, indoor?, quadrant in facility rect
  DEP: ['Public departures hall', 'Public departures areas', 'PUBLIC', 'Crowd density & queue monitoring', 1, [0, 0]],
  CHK: ['Check-in & passenger services', 'Check-in & passenger service areas', 'PUBLIC', 'Queue length & desk staffing', 1, [.5, 0]],
  ARR: ['Public arrivals hall', 'Public arrivals areas', 'PUBLIC', 'Arrivals flow & passenger assistance', 1, [0, .5]],
  REC: ['Public baggage reclaim', 'Public baggage reclaim areas', 'PUBLIC', 'Carousel status & reclaim congestion', 1, [.5, .5]],
  APR: ['Apron view (approved)', 'Approved apron & ground handling views', 'OPS', 'Turnaround progress & GSE safety', 0],
  LNG: ['FBO lounge', 'Check-in & passenger service areas', 'PUBLIC', 'Guest service', 1, [0, 0]],
  BHS: ['Baggage make-up & sorter', 'Other configurable airport facilities', 'OPS', 'Conveyor jams & equipment status', 1, [0, 0]],
  HGR: ['Hangar floor', 'Aircraft maintenance facilities', 'MAINT', 'Work-area safety & maintenance progress', 1, [0, 0]],
  INS: ['Inspection position', 'Aircraft maintenance facilities', 'MAINT', 'Inspection evidence & tooling control', 0, [0, 0]],
  WSH: ['Workshop bench area', 'Maintenance hangars & workshops', 'MAINT', 'Workshop task progress', 1, [0, 0]],
  STO: ['Parts issue counter', 'Maintenance hangars & workshops', 'MAINT', 'Parts issue & AOG pick verification', 1, [0, 0]],
  GSE: ['GSE workshop bay', 'Ground support equipment areas', 'MAINT', 'GSE repair & PM progress', 1, [0, 0]],
  VRF: ['Vehicle repair bay', 'Vehicle service & charging areas', 'MAINT', 'Vehicle repair progress', 1, [0, 0]],
  STG: ['GSE staging area', 'Ground support equipment areas', 'OPS', 'Equipment availability', 0, [0, 0]],
  EVC: ['EV charging bay', 'Vehicle service & charging areas', 'OPS', 'Charger occupancy & fire watch', 0, [.5, 0]],
  PRK: ['Car park / forecourt', 'Parking & public access areas', 'PUBLIC', 'Traffic flow & public assistance', 0, [0, 0]],
  SEC: ['Withheld', 'Security-sensitive (withheld)', 'SEC', 'Not published', 0, [0, 0]],
};
// coverage differs per facility on purpose (not every terminal is equipped alike); apron cameras list the stands they view
const CAM_PLAN = {
  T1: [['DEP', 2], ['CHK', 2], ['ARR', 2], ['REC', 1], ['APR', [['C1', 'C2'], ['C3', 'C4']]]],
  T2: [['DEP', 3], ['CHK', 3], ['ARR', 2], ['REC', 2], ['APR', [['A1', 'A2'], ['A3'], ['A4', 'A5']]]],
  T3: [['DEP', 4], ['CHK', 4], ['ARR', 3], ['REC', 3], ['APR', [['B1', 'B2'], ['B3'], ['B4', 'B5'], ['B6']]]],
  STC: [['DEP', 2], ['CHK', 1], ['ARR', 1], ['REC', 1], ['APR', [['S1', 'S2'], ['S3']]]],
  GA: [['LNG', 1], ['APR', [['P1', 'P2', 'P3']]]], BHS: [['BHS', 3]], DEPOT: [['STG', 2], ['EVC', 1]], PARK: [['PRK', 4]],
  INSP: [['INS', [['M1'], ['M2']]]], HGR1: [['HGR', 3]], HGR2: [['HGR', 2]], WSHP: [['WSH', 2]], STORE: [['STO', 1]], GSEW: [['GSE', 2]], VRF: [['VRF', 1]], SEC: [['SEC', 1]],
};
const CAMS = []; (() => {
  for (const [fac, plan] of Object.entries(CAM_PLAN)) {const F = CFAC[fac]; let k = 0, nAll = plan.reduce((a, [, c]) => a + (Array.isArray(c) ? c.length : c), 0);
    for (const [code, c] of plan) {const A = CAM_AREA[code], list = Array.isArray(c) ? c : Array.from({length: c}, () => null);
      list.forEach((stands, i) => {const id = `CAM-${fac}-${code}-${pad(i + 1)}`, h = hash(id);
        let x, y; if (code == 'APR') {x = F.x + F.w * (i + .5) / list.length; y = 165} else if (A[5] && TERMS.includes(fac)) {x = F.x + F.w * (A[5][0] + .1 + .3 * ((i + .5) / list.length)); y = F.y + F.h * (A[5][1] + .25)}
        else {x = F.x + F.w * (k + .5) / nAll; y = F.y + F.h * (.35 + (h % 30) / 100)}
        CAMS.push({id, fac, code, name: `${F.n.replace(/ \(.*\)/, '')} · ${A[0]}${list.length > 1 ? ' ' + (i + 1) : ''}${stands ? ' (' + stands.join(', ') + ')' : ''}`, area: A[0], cat: A[1], acc: A[2], purpose: A[3], indoor: A[4], stands: stands || [], x, y, ph: h});
        k++})}}
})();
const CAM = Object.fromEntries(CAMS.map(c => [c.id, c]));
// illustrative still photos supplied by the user (generic airport scenes, not Cairo Airport CCTV) — matched to each camera's area type
// each terminal gets its OWN scenes (never shown in another terminal), so terminals can be told apart; more views come from crops of that terminal's scenes
const CAM_POOL = {
  T1: {DEP: ['c5', 'c3', 'a3'], CHK: ['c3', 'a3', 'c5'], ARR: ['a3', 'c3', 'c5'], REC: ['c3', 'a3', 'c5'], APR: ['d3', 'd4']},
  T2: {DEP: ['b1', 'b4', 'b3'], CHK: ['b4', 'b1', 'b3'], ARR: ['b3', 'b4', 'b1'], REC: ['b3', 'b1', 'b4'], APR: ['b2', 'd2']},
  T3: {DEP: ['c8', 'c1', 'c2', 'c9'], CHK: ['c2', 'c9', 'c1', 'c8'], ARR: ['c1', 'c9', 'c8', 'c2'], REC: ['c9', 'c1', 'c2', 'c8'], APR: ['c4', 'c7', 'd1']},
  STC: {DEP: ['c6', 'a2'], CHK: ['a2', 'c6'], ARR: ['a2', 'c6'], REC: ['a2', 'c6'], APR: ['e2', 'e3']},
  PARK: {PRK: ['e1', 'e4']}, HGR1: {HGR: ['h1', 'h2', 'h3']}, HGR2: {HGR: ['h5', 'h4']}, INSP: {INS: ['h6', 'h7']}};
const CAM_PHOTO = {}; (() => {const used = new Set(), cc = IMG.cc || {}, idx = c => +c.id.slice(-2), cnt = {};
  for (const c of CAMS.filter(c => (CAM_POOL[c.fac] || {})[c.code] && c.acc != 'SEC').sort((a, b) => idx(a) - idx(b) || CAMS.indexOf(a) - CAMS.indexOf(b))) {const p = CAM_POOL[c.fac][c.code];
    const cand = ['', 'Z', 'L', 'R'].flatMap(v => p.map(x => x + v)).filter(x => cc[x] && !used.has(x)), sc = x => x.replace(/[LRZ]$/, ''), F = cnt[c.fac] || (cnt[c.fac] = {}), A = cnt[c.fac + c.code] || (cnt[c.fac + c.code] = {});
    const k = cand.reduce((b, x) => b == null || 10 * (A[sc(x)] || 0) + (F[sc(x)] || 0) < 10 * (A[sc(b)] || 0) + (F[sc(b)] || 0) ? x : b, null); // least-shown scene in this area, then in this terminal
    if (k) {used.add(k); A[sc(k)] = (A[sc(k)] || 0) + 1; F[sc(k)] = (F[sc(k)] || 0) + 1; CAM_PHOTO[c.id] = k}}})();
let camPhotos = 1, camTrack = 1; const CAMIMG = {};
const camImg = k => {let im = CAMIMG[k]; if (!im) {im = CAMIMG[k] = new Image(); im.src = IMG.cc[k]} return im.complete && im.naturalWidth ? im : null};
const CAM_ACC = {
  PUBLIC: {n: 'Public-area (demo)', cls: 'ok', roles: ROLES.filter(r => r != 'Read-only Analyst')},
  OPS: {n: 'Operational — restricted', cls: 'wn', roles: ['Airport Operations Manager', 'Terminal Operations Officer', 'Ground Handling Supervisor', 'Baggage Operations Officer', 'Safety Investigator', 'CCTV Operator']},
  MAINT: {n: 'Maintenance — restricted', cls: 'wn', roles: ['Airport Operations Manager', 'Maintenance Planner', 'Certifying Engineer', 'Safety Investigator', 'CCTV Operator']},
  SEC: {n: 'Security-sensitive — withheld', cls: 'cr', roles: []},
};
const CAM_RET0 = {PUBLIC: {days: 30, purpose: 'Passenger flow, safety & service', mask: true, export: 'Duty manager approval'}, OPS: {days: 30, purpose: 'Ramp safety & turnaround investigation', mask: true, export: 'Ops manager + DPO approval'},
  MAINT: {days: 90, purpose: 'Maintenance quality & occurrence investigation', mask: true, export: 'Quality manager approval'}, SEC: {days: 0, purpose: 'Withheld — governed by the airport security programme', mask: true, export: 'n/a'}};
const camAccess = (role, c) => {const A = CAM_ACC[c.acc]; if (c.acc == 'SEC') return {video: 0, meta: 0, mx: 0, why: 'Security-sensitive record withheld in this dashboard'};
  if (role == 'Read-only Analyst') return {video: 0, meta: 1, mx: 0, why: 'Read-only Analyst: metadata only, no video'};
  const ok = A.roles.includes(role), mx = CAM_ACC.MAINT.roles.includes(role); return {video: ok, meta: 1, mx, why: ok ? 'Granted (' + A.n + ')' : `Role "${role}" lacks ${A.n} access`}};
const OUTDOOR = c => !c.indoor;

// ---------- engine side: status, faults, incidents (deterministic, runs headless too) ----------
function cctvInit(S) {for (const c of CAMS) S.cam[c.id] = {st: c.acc == 'SEC' ? 'WITHHELD' : 'ONLINE', rec: c.acc != 'SEC', since: 0, last: 0, why: ''}; S.cctvRet = deep(CAM_RET0)}
function camAlert(S, sev, c, msg, rec) {alrt(S, sev, 'CCTV', `${c.id}: ${msg}`, rec, 'CCTV / security systems', {k: 'cam', id: c.id})}
function cctvTick(S) {
  const nvr = S.pm.find(p => p.id == 'PM-13'), nvrT1 = nvr && nvr.st == 'IN PROGRESS', lowVis = S.wx.vis < 3 || S.wx.sand;
  for (const c of CAMS) {const s = S.cam[c.id]; if (s.st == 'WITHHELD') continue;
    if (s.fault) {if (s.st != 'OFFLINE') {s.st = 'OFFLINE'; s.since = S.t; s.why = s.fault; camAlert(S, 'wn', c, 'camera offline — ' + s.fault, 'Dispatch security-systems technician; use adjacent camera')} }
    else {const deg = OUTDOOR(c) && lowVis, st = deg ? 'DEGRADED' : 'ONLINE';
      if (s.st != st) {s.st = st; s.since = S.t; s.why = deg ? 'Low visibility (' + S.wx.c.toLowerCase() + ')' : ''}}
    const recOk = !s.nvr && !(nvrT1 && c.fac == 'T1') && s.st != 'OFFLINE';
    if (s.rec && !recOk && s.st != 'OFFLINE') {s.recWhy = s.nvr || 'NVR firmware update (PM-13)'; if (!S.camRecAl || S.camRecAl[c.fac] != s.recWhy) {(S.camRecAl = S.camRecAl || {})[c.fac] = s.recWhy; camAlert(S, 'info', c, `recording unavailable for ${CFAC[c.fac].n} — ${s.recWhy}`, 'Live view continues; incidents must be logged manually')}}
    if (recOk && !s.rec && S.camRecAl) delete S.camRecAl[c.fac];
    s.rec = recOk; if (s.st != 'OFFLINE') s.last = S.t}
}
function cctvScn(S, k, arg) {
  if (k == 'camfail') {const cand = CAMS.filter(x => x.acc != 'SEC' && !S.cam[x.id].fault), c = arg ? CAM[arg] : cand[(S.t * 31) % (cand.length || 1)]; if (!c) return;
    S.cam[c.id].fault = ['PoE switch port down', 'Camera power loss', 'Network link down'][S.t % 3]; fevOpen(S, 'cam', c.id, c.id + ' offline'); ev(S, 'CameraOffline', c.id, S.cam[c.id].fault)}
  if (k == 'nvrfail') {const fac = arg || 'T3'; for (const c of CAMS) if (c.fac == fac) S.cam[c.id].nvr = 'Recorder (NVR) disk fault'; ev(S, 'RecorderFault', fac, 'NVR disk fault — recording unavailable');
    alrt(S, 'wn', 'CCTV', `${CFAC[fac].n}: recording unavailable — NVR disk fault (authorised equipment fault notification)`, 'Replace disk; preserve existing footage', 'CCTV / security systems', {k: 'cam', id: CAMS.find(c => c.fac == fac).id})}
  if (k == 'camok') {for (const c of CAMS) {const s = S.cam[c.id]; s.fault = null; s.nvr = null} fevClose(S, 'cam'); ev(S, 'CCTVRestored', 'CCTV', 'All cameras & recorders restored')}
}
const camsAt = (fac, area) => CAMS.filter(c => c.fac == fac && (!area || c.code == area));
const camsForStand = sid => CAMS.filter(c => c.stands.includes(sid));
let camLinkN = 0;
function camLink(S, cam, o) { // link a camera record to an incident / work order / equipment at a timestamp (for investigation)
  const L = Object.assign({id: 'CL-' + pad(S.camLinks.length + 1).padStart(3, '0'), cam, t: S.t, by: 'sim'}, o); S.camLinks.push(L);
  S.camAu.unshift({t: S.t, role: L.by, cam, act: 'Linked to ' + [L.inc, L.wo, L.eq].filter(Boolean).join(' / '), res: 'recorded'}); return L;
}
function cctvIncident(S, cat, desc, fac, x) { // incident raised from engine state, linked to the facility's camera(s)
  const id = 'INC-' + pad(S.inc.length + 1), cams = camsAt(fac).filter(c => c.acc != 'SEC').slice(0, 2);
  S.inc.unshift({id, c: cat, s: 'Occurrence', d: desc, t: S.t, step: 0, cams: cams.map(c => c.id)});
  for (const c of cams) camLink(S, c.id, Object.assign({inc: id, note: cat + ' — auto-linked from simulation event', auto: 1}, x || {}));
  ev(S, 'IncidentReported', id, cat); alrt(S, 'wn', 'CCTV', `${cat} reported — ${cams.map(c => c.id).join(', ')} linked to ${id}`, 'Review recording around ' + loc(S.t) + ' (if recording available)', 'Safety investigator', {k: 'cam', id: cams[0] && cams[0].id});
  return id;
}
// derived maintenance links (no extra state): work orders, defects, inspections, equipment & workshop tasks ↔ facility cameras
function mxLinks(S, fac, plan) { // plan: include tonight's hangar slots (UI only — acPlan reads the live state)
  const out = [], add = (cams, o) => {for (const c of cams) if (!fac || c.fac == fac) out.push(Object.assign({cam: c.id}, o))};
  for (const d of S.defects) {const r = S.rot[d.r], live = !/RELEASED/.test(d.status), st = d.steps[d.step];
    const base = {wo: d.wo, def: d.id, reg: r.reg, t: d.t, st: d.status, live};
    add(camsForStand(r.stand), Object.assign({kind: 'Work order / defect', desc: `${d.ata} ${d.name} on stand ${r.stand}`}, base));
    if (d.fromStand) add(camsForStand(d.fromStand), Object.assign({kind: 'Defect report (origin stand)', desc: 'Reported on ' + d.fromStand + ' before tow'}, base));
    if (st && /Inspect|inspection|Borescope|Leak check/.test(st[0])) add(STAND[r.stand].kind == 'mro' ? camsForStand(r.stand) : camsAt('HGR2'), Object.assign({kind: 'Inspection event', desc: st[0]}, base));
    if (d.parts.length && d.step >= 0) add(camsAt('STORE'), Object.assign({kind: 'Parts issue', desc: d.parts.map(p => p[1]).join(', ') + (d.aog ? ' — AOG order' : '')}, base));
    if (d.ext > 0 || d.type == 'ENG') add(camsAt('WSHP'), Object.assign({kind: 'Workshop task', desc: d.type == 'ENG' ? 'Engine QEC build-up & accessory transfer' : 'Component / structural support for ' + d.wo}, base))}
  for (const v of S.V) if (v.fail) add(camsAt(['TUG', 'BT', 'GPU'].includes(v.type) ? 'GSEW' : 'VRF'), {kind: 'Equipment repair', eq: v.id, desc: `${VNAME[v.type]} ${v.id}: ${v.fail.cause} · back ~${loc(v.fail.until)}`, t: v.fail.t, st: 'IN REPAIR', live: 1});
  for (const p of S.pm) if (p.kind == 'veh' && p.st != 'PLANNED') add(camsAt('GSEW'), {kind: 'Workshop task (PM)', eq: p.ref, wo: p.id, desc: p.task, t: p.t0 ?? p.start, st: p.st, live: p.st == 'IN PROGRESS'});
  if (plan && typeof acPlan == 'function') for (const x of acPlan()) if (x.slot) add(camsAt(x.slot == 'M1' ? 'HGR1' : 'HGR2'), {kind: 'Inspection event (planned)', reg: x.reg, desc: (x.slot == 'M1' ? 'A-check input tonight' : 'Daily check tonight') + ' · ' + x.type, t: null, st: 'PLANNED', live: 0});
  for (const L of S.camLinks) if (!fac || CAM[L.cam].fac == fac) out.push({cam: L.cam, kind: L.inc ? 'Incident reference' : 'Manual link', inc: L.inc, wo: L.wo, eq: L.eq, reg: L.reg, desc: L.note || '', t: L.t, st: L.id, live: 1, link: L.id});
  return out;
}
// feed classification — what the player may show for a camera right now
const CAMFEED = {}; // camId → {kind: 'hls'|'whep'|'url'|'file', url, mode: 'live'|'recorded', label}; held in memory only, never saved
function camFeed(S, id, role) {
  const c = CAM[id], s = S.cam[id], f = CAMFEED[id], a = camAccess(role, c);
  if (c.acc == 'SEC') return {mode: 'withheld', label: 'Withheld — security-sensitive', cls: 'cr'};
  if (!a.video) return {mode: 'restricted', label: 'Access restricted', cls: 'cr', why: a.why};
  if (s.st == 'OFFLINE') return {mode: 'unavailable', label: 'Unavailable — camera offline', cls: 'cr'};
  if (f && f.err) return {mode: 'unavailable', label: 'Unavailable — feed error: ' + f.err, cls: 'cr'};
  if (f && f.mode == 'live') return {mode: 'live', label: 'Authorised live feed (user-configured)', cls: 'ok'};
  if (f && f.mode == 'recorded') return {mode: 'recorded', label: 'Recorded footage (user-supplied)', cls: 'in'};
  if (camPhotos && CAM_PHOTO[id]) return {mode: 'photo', label: 'Illustrative still photo (user-supplied) — not camera footage', cls: 'in'};
  return {mode: 'demo', label: 'Demo — synthetic render (not footage)', cls: 'wn'};
}
const camFilter = (list, F) => list.filter(c => (!F.fac || (F.fac == 'MAINT' ? CFAC[c.fac].g == 'Maintenance' : F.fac == 'TERMS' ? CFAC[c.fac].g == 'Terminals' : c.fac == F.fac)) && (!F.cat || c.cat == F.cat) && (!F.st || S.cam[c.id].st == F.st) && (!F.acc || c.acc == F.acc)
  && (!F.q || (c.id + ' ' + c.name).toLowerCase().includes(F.q.toLowerCase())));

// ---------- UI state ----------
let camSel = null, camView = 1, camRaf = 0, camLastDraw = 0;
const camF = {fac: '', cat: '', st: '', acc: '', q: ''}, CAMPS = {}; // CAMPS: per-camera player state {state, wall}
const camAud = (cam, act, res) => {S.camAu.unshift({t: S.t, role, cam, act, res}); if (S.camAu.length > 400) S.camAu.pop(); audit(`CCTV ${cam}: ${act} — ${res}`)};
function camSelect(id, noNav) {
  const c = CAM[id]; if (!c) return; camSel = id; const a = camAccess(role, c);
  camAud(id, 'View requested', a.video ? 'granted' : 'denied — ' + a.why);
  if (!noNav && !(grp == 'cctv' && cursub('cctv') == 'wall')) {go('cctv', 'wall'); return}
  camMountPlayer(); camLinkForm(); live(true);
}
const camWall = () => {const l = camFilter(CAMS.filter(c => c.acc != 'SEC'), camF), ids = [camSel, ...l.map(c => c.id).filter(i => i != camSel)].filter(Boolean); return ids.slice(0, camView * camView)};
function camMountPlayer() {
  const P = $('#ccPlayer'); if (!P) return; for (const v of P.querySelectorAll('video')) camStopVideo(v);
  if (!camSel) camSel = camFilter(CAMS.filter(c => c.acc != 'SEC'), camF)[0]?.id || CAMS[0].id;
  const ids = camWall(); P.style.gridTemplateColumns = `repeat(${camView},1fr)`;
  P.innerHTML = ids.map(id => {const f = camFeed(S, id, role), useV = (f.mode == 'live' || f.mode == 'recorded');
    return `<div class="cct${id == camSel ? ' on' : ''}" data-cam="${id}" onclick="if('${id}'!='${camSel}')camSelect('${id}',1)">${useV ? `<video playsinline muted ${camView == 1 ? 'controls' : ''}></video>` : `<canvas width="${camView == 1 ? 960 : 480}" height="${camView == 1 ? 540 : 270}"></canvas>`}
      <div class="cco"><b>${id}</b><span class="b ${f.cls}">${f.mode.toUpperCase()}</span></div></div>`}).join('');
  for (const el of P.querySelectorAll('.cct')) {const id = el.dataset.cam, v = el.querySelector('video'); CAMPS[id] = {state: 'IDLE', wall: CAMPS[id]?.wall || null}; if (v) camAttach(v, id)}
  if (!camRaf) camRaf = requestAnimationFrame(camLoop);
}
function camLoop(ts) {
  const P = $('#ccPlayer'); if (!P) {camRaf = 0; return}
  if (ts - camLastDraw > (camPhotos && camTrack ? 33 : 66)) {camLastDraw = ts; for (const cv of P.querySelectorAll('canvas')) {const id = cv.parentNode.dataset.cam, f = camFeed(S, id, role), st = CAMPS[id] || (CAMPS[id] = {});
    // a mode change (camera went offline, access changed) swaps the tile type
    if ((f.mode == 'live' || f.mode == 'recorded')) {camMountPlayer(); break}
    drawCam(cv.getContext('2d'), cv.width, cv.height, CAM[id], f, ts); st.state = f.mode == 'demo' ? 'DEMO RENDERING' : f.mode == 'photo' ? 'STILL PHOTO (illustrative)' : f.mode.toUpperCase(); if (f.mode == 'demo') st.wall = Date.now()}
    for (const v of P.querySelectorAll('video')) {const m = camFeed(S, v.parentNode.dataset.cam, role).mode; if (m != 'live' && m != 'recorded') {camMountPlayer(); break}}}
  camRaf = requestAnimationFrame(camLoop);
}
// ---------- real video: HLS (native or hls.js), WebRTC (WHEP), progressive URL, or local file ----------
let hlsLib = null;
const loadHls = () => hlsLib || (hlsLib = new Promise((ok, no) => {const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.13/dist/hls.min.js'; s.onload = () => ok(window.Hls); s.onerror = () => no(new Error('hls.js could not be loaded')); document.head.appendChild(s)}));
function camStopVideo(v) {try {if (v._hls) v._hls.destroy(); if (v._pc) v._pc.close(); v.pause(); v.removeAttribute('src'); v.srcObject = null; v.load()} catch (e) {}}
function camAttach(v, id) {
  const f = CAMFEED[id], st = CAMPS[id], fail = m => camFeedErr(id, m);
  st.state = 'CONNECTING'; camAud(id, 'Feed connect (' + f.kind + ')', 'attempt');
  v.onplaying = () => {st.state = f.mode == 'live' ? 'PLAYING — LIVE' : 'PLAYING — RECORDED'; st.wall = Date.now(); f.ok = Date.now(); live(true)};
  v.ontimeupdate = () => {st.wall = Date.now()}; v.onwaiting = () => {st.state = 'BUFFERING'}; v.onstalled = () => {st.state = 'STALLED'};
  v.onerror = () => fail(v.error ? ['aborted', 'network error', 'decode error', 'format not supported / blocked'][v.error.code - 1] || 'media error' : 'media error');
  if (f.kind == 'whep') camWhep(v, f.url).catch(e => fail(e.message || 'WebRTC negotiation failed'));
  else if (f.kind == 'hls' && !v.canPlayType('application/vnd.apple.mpegurl')) loadHls().then(H => {if (!H || !H.isSupported()) return fail('HLS not supported in this browser');
    const h = new H(); v._hls = h; h.on(H.Events.ERROR, (e, d) => {if (d.fatal) fail('HLS ' + d.details)}); h.loadSource(f.url); h.attachMedia(v); v.play().catch(() => {})}).catch(e => fail(e.message));
  else {v.src = f.url; v.play().catch(e => {if (e && e.name == 'NotAllowedError') st.state = 'READY — press play'})}
}
async function camWhep(v, url) { // WebRTC-HTTP Egress Protocol: POST SDP offer, receive SDP answer
  const pc = new RTCPeerConnection(); v._pc = pc; pc.addTransceiver('video', {direction: 'recvonly'}); pc.addTransceiver('audio', {direction: 'recvonly'});
  pc.ontrack = e => {v.srcObject = e.streams[0]; v.play().catch(() => {})}; pc.onconnectionstatechange = () => {if (['failed', 'disconnected'].includes(pc.connectionState)) camFeedErr(v.parentNode.dataset.cam, 'WebRTC ' + pc.connectionState)};
  const o = await pc.createOffer(); await pc.setLocalDescription(o);
  const r = await fetch(url, {method: 'POST', headers: {'Content-Type': 'application/sdp'}, body: o.sdp}); if (!r.ok) throw new Error('WHEP endpoint returned HTTP ' + r.status);
  await pc.setRemoteDescription({type: 'answer', sdp: await r.text()});
}
function camFeedErr(id, m) {const f = CAMFEED[id]; if (!f || f.err) return; f.err = m; CAMPS[id] && (CAMPS[id].state = 'ERROR — ' + m); camAud(id, 'Feed error', m);
  alrt(S, 'wn', 'CCTV', `${id}: video feed unavailable — ${m}`, 'Check stream URL, authorisation and network path; demo render is NOT substituted for a failed live feed', 'CCTV / security systems', {k: 'cam', id}); camMountPlayer(); live(true)}
function camConnect() {
  if (!can()) return; const id = camSel, c = CAM[id], a = camAccess(role, c); if (!a.video) return toast(a.why);
  const url = $('#ccUrl').value.trim(), kind = $('#ccKind').value, mode = $('#ccMode').value;
  if (!url) return toast('Enter an authorised stream URL');
  if (!/^https:\/\//i.test(url) && !/^http:\/\/(localhost|127\.0\.0\.1)/i.test(url)) return toast('Use an https:// URL (or http://localhost for a local test server)');
  if (/\/\/[^/]*:[^/]*@/.test(url) || /[?&](pass(word)?|pwd|token|key|secret|auth)=/i.test(url)) return toast('Refused: URL appears to embed credentials. Use a server-side authorised proxy — credentials must not be placed in the browser.');
  if (!$('#ccAuth').checked) return toast('Confirm you are authorised to view this feed');
  CAMFEED[id] = {kind, url, mode, label: kind.toUpperCase()}; camAud(id, `Feed configured (${kind}, ${mode})`, 'authorisation confirmed by user'); camMountPlayer(); live(true);
}
function camFile(inp) {
  const id = camSel, f = inp.files && inp.files[0]; if (!f) return; const a = camAccess(role, CAM[id]); if (!a.video) return toast(a.why);
  if (!$('#ccAuth').checked) {inp.value = ''; return toast('Confirm you are authorised to use this recording')}
  CAMFEED[id] = {kind: 'file', url: URL.createObjectURL(f), mode: 'recorded', label: 'Local file: ' + f.name}; camAud(id, 'Recorded clip opened (local file ' + f.name + ')', 'user-supplied'); camMountPlayer(); live(true);
}
function camDemo() {const id = camSel, f = CAMFEED[id]; if (f && f.kind == 'file') URL.revokeObjectURL(f.url); delete CAMFEED[id]; camAud(id, 'Switched to demo render', 'ok'); camMountPlayer(); live(true)}
function camFull() {const P = $('#ccPlayer'); const t = camView == 1 ? P : P.querySelector('.cct.on') || P; (t.requestFullscreen ? t.requestFullscreen() : Promise.reject(new Error('unsupported'))).catch(() => toast('Full screen is not permitted in this frame — open the page in its own tab'))}

// ---------- synthetic demo renderer (driven by the simulation state; contains no real imagery) ----------
function drawCam(g, W, H, c, f, ts) {
  const s = S.cam[c.id], z = W / 960, tt = ts / 1000, hr = hourOf(S.t) + (S.t % 60) / 60, night = hr >= 18.5 || hr < 6, R = rng(c.ph);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  if (f.mode == 'photo') {const im = camImg(CAM_PHOTO[c.id]); g.fillStyle = '#05080e'; g.fillRect(0, 0, W, H);
    if (im) {if (camTrack) camPtz(g, W, H, c, im, ts, z); else {const k = Math.max(W / im.naturalWidth, H / im.naturalHeight), w = im.naturalWidth * k, h = im.naturalHeight * k; g.drawImage(im, (W - w) / 2, (H - h) / 2, w, h)}}
    if (S.termOut && S.termOut.term == c.fac && ['DEP', 'CHK'].includes(c.code)) {g.fillStyle = 'rgba(127,29,29,.55)'; g.fillRect(0, 0, W, H); g.fillStyle = '#fecaca'; g.font = `700 ${22 * z}px system-ui`; g.textAlign = 'center'; g.fillText('SIMULATION: AREA CLOSED', W / 2, H / 2)}
    if (s.st == 'DEGRADED') {g.fillStyle = 'rgba(200,200,200,.18)'; g.fillRect(0, 0, W, H)}
    camHud(g, W, H, c, s, z, 2); g.restore(); return}
  if (f.mode != 'demo') { // unavailable / restricted / withheld cards
    g.fillStyle = '#05080e'; g.fillRect(0, 0, W, H); for (let i = 0; i < 400 * z; i++) {g.fillStyle = `rgba(255,255,255,${Math.random() * .08})`; g.fillRect(Math.random() * W, Math.random() * H, 2, 2)}
    g.fillStyle = f.mode == 'restricted' || f.mode == 'withheld' ? '#fca5a5' : '#fcd34d'; g.font = `600 ${28 * z}px system-ui`; g.textAlign = 'center';
    g.fillText(f.mode == 'restricted' ? 'ACCESS RESTRICTED' : f.mode == 'withheld' ? 'WITHHELD' : 'NO SIGNAL', W / 2, H / 2 - 8 * z);
    g.font = `${15 * z}px system-ui`; g.fillStyle = '#9fb2cf'; g.fillText(f.mode == 'restricted' ? f.why : f.mode == 'unavailable' ? (s.st == 'OFFLINE' ? `Camera offline since ${loc(s.since)} — ${s.why}` : f.label) : 'Security-sensitive record', W / 2, H / 2 + 22 * z);
    camHud(g, W, H, c, s, z, 0); g.restore(); return}
  const sky = night ? ['#0a1020', '#141c2c'] : ['#7aa6cf', '#c9d8e6'];
  const gr = g.createLinearGradient(0, 0, 0, H);
  if (c.indoor) {gr.addColorStop(0, '#2a2f38'); gr.addColorStop(.45, '#3a404a'); gr.addColorStop(1, '#565c66')} else {gr.addColorStop(0, sky[0]); gr.addColorStop(.38, sky[1]); gr.addColorStop(.381, night ? '#2b2f36' : '#7b7f86'); gr.addColorStop(1, night ? '#1d2026' : '#5d6168')}
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  // perspective floor grid
  g.strokeStyle = c.indoor ? 'rgba(255,255,255,.07)' : 'rgba(255,255,255,.05)'; g.lineWidth = 1; const hy = H * .38;
  for (let i = -8; i <= 8; i++) {g.beginPath(); g.moveTo(W / 2 + i * 30 * z, hy); g.lineTo(W / 2 + i * 260 * z, H); g.stroke()}
  for (let j = 1; j < 9; j++) {const y = hy + (H - hy) * Math.pow(j / 9, 1.8); g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke()}
  const person = (x, y, sc, col) => {g.fillStyle = col || '#9aa7b8'; g.beginPath(); g.ellipse(x, y - 10 * sc, 5 * sc, 11 * sc, 0, 0, 7); g.fill(); g.fillStyle = '#c3ccd6'; g.beginPath(); g.arc(x, y - 25 * sc, 4.2 * sc, 0, 7); g.fill()}; // faces never rendered (privacy masking)
  const crowd = (n, x0, x1, y0, y1, spd) => {for (let i = 0; i < n; i++) {const a = R(), b = R(), v = (R() - .5) * spd, y = y0 + (y1 - y0) * b, sc = (.5 + 1.1 * (y - hy) / (H - hy)) * z; let x = x0 + (x1 - x0) * ((a + v * tt * .02) % 1 + 1) % 1; person(x, y, sc, ['#7c8aa0', '#a58f7a', '#6f8f86', '#9a7e93', '#8794a8'][i % 5])}};
  const occ = S.occ[c.fac] || 0, nCam = camsAt(c.fac).filter(x => x.indoor).length || 1;
  const vehicle = (x, y, w, h, col, lab) => {g.fillStyle = col; g.fillRect(x, y - h, w, h); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x + w * .1, y - h * .9, w * .3, h * .4); g.fillStyle = '#111'; g.beginPath(); g.arc(x + w * .2, y, h * .18, 0, 7); g.arc(x + w * .8, y, h * .18, 0, 7); g.fill();
    if (lab) {g.fillStyle = '#e8eef7'; g.font = `600 ${11 * z}px system-ui`; g.textAlign = 'center'; g.fillText(lab, x + w / 2, y - h - 5 * z)}};
  const aircraft = (cx, cy, sc, lab) => {g.fillStyle = '#e9edf2'; g.beginPath(); g.ellipse(cx, cy, 230 * sc, 26 * sc, 0, 0, 7); g.fill(); g.beginPath(); g.moveTo(cx + 170 * sc, cy - 10 * sc); g.lineTo(cx + 240 * sc, cy - 95 * sc); g.lineTo(cx + 262 * sc, cy - 95 * sc); g.lineTo(cx + 228 * sc, cy); g.fill();
    g.fillStyle = '#c9d0d9'; g.beginPath(); g.moveTo(cx - 30 * sc, cy + 6 * sc); g.lineTo(cx + 70 * sc, cy + 6 * sc); g.lineTo(cx + 140 * sc, cy + 40 * sc); g.lineTo(cx + 105 * sc, cy + 40 * sc); g.fill();
    g.fillStyle = '#3b4a5e'; for (let i = 0; i < 14; i++) g.fillRect(cx - 170 * sc + i * 22 * sc, cy - 9 * sc, 8 * sc, 6 * sc); g.fillStyle = '#9aa3ad'; g.fillRect(cx + 20 * sc, cy + 22 * sc, 46 * sc, 16 * sc);
    if (lab) {g.fillStyle = '#1e293b'; g.font = `700 ${16 * sc}px system-ui`; g.textAlign = 'center'; g.fillText(lab, cx + 120 * sc, cy + 4 * sc)}};
  const a = camAccess(role, c);
  switch (c.code) {
    case 'DEP': case 'CHK': case 'ARR': case 'LNG': {
      if (c.code == 'CHK') {g.fillStyle = '#4b5563'; for (let i = 0; i < 6; i++) {const x = 80 * z + i * 140 * z; g.fillRect(x, hy + 30 * z, 100 * z, 34 * z); g.fillStyle = '#0ea5e9'; g.fillRect(x + 20 * z, hy + 6 * z, 60 * z, 14 * z); g.fillStyle = '#4b5563'}}
      if (c.code == 'ARR') {g.fillStyle = '#1f2937'; g.fillRect(W * .38, hy - 70 * z, W * .24, 70 * z); g.fillStyle = '#60a5fa33'; g.fillRect(W * .39, hy - 64 * z, W * .22, 64 * z)}
      if (c.code == 'DEP') {g.fillStyle = '#111827'; g.fillRect(W * .62, hy - 90 * z, 260 * z, 60 * z); g.fillStyle = '#fbbf24'; g.font = `${10 * z}px monospace`; g.textAlign = 'left'; S.R.filter(r => r.dep && r.offBlk == null && STAND[r.stand].term == c.fac).slice(0, 4).forEach((r, i) => g.fillText(`${r.dep.fl.padEnd(8)} ${loc(r.tobt ?? r.dep.std)} ${r.dep.apt}`, W * .62 + 8 * z, hy - 76 * z + i * 13 * z))}
      const closed = S.termOut && S.termOut.term == c.fac && c.code != 'ARR';
      crowd(closed ? 2 : clamp(Math.round(occ / nCam / 18), 3, 70), 0, W, hy + 40 * z, H - 10 * z, c.code == 'CHK' ? .2 : 1);
      if (closed) {g.fillStyle = 'rgba(239,68,68,.18)'; g.fillRect(0, 0, W, H); g.fillStyle = '#fecaca'; g.font = `700 ${20 * z}px system-ui`; g.textAlign = 'center'; g.fillText('AREA CLOSED — passengers held landside', W / 2, hy)}
      break}
    case 'REC': {const act = S.R.some(r => r.arr && r.onBlk != null && S.t - r.onBlk < 40 && STAND[r.stand].term == c.fac);
      g.strokeStyle = '#6b7280'; g.lineWidth = 26 * z; g.beginPath(); g.ellipse(W / 2, hy + 120 * z, 330 * z, 70 * z, 0, 0, 7); g.stroke();
      if (act) for (let i = 0; i < 18; i++) {const q = (i / 18 + tt * .03) % 1, x = W / 2 + 330 * z * Math.cos(q * 6.283), y = hy + 120 * z + 70 * z * Math.sin(q * 6.283); g.fillStyle = ['#7c2d12', '#1e3a8a', '#14532d', '#3f3f46'][i % 4]; g.fillRect(x - 10 * z, y - 7 * z, 20 * z, 13 * z)}
      crowd(act ? clamp(Math.round(occ / nCam / 25), 4, 40) : 2, 0, W, hy + 200 * z, H - 6 * z, .3);
      g.fillStyle = act ? '#4ade80' : '#9ca3af'; g.font = `${12 * z}px system-ui`; g.textAlign = 'left'; g.fillText(act ? 'Carousel running' : 'Carousel idle', 16 * z, hy + 20 * z); break}
    case 'APR': case 'INS': {const sid = c.stands.find(x => S.stOcc[x]) || null, r = sid && S.rot[S.stOcc[sid]];
      g.strokeStyle = '#facc15'; g.lineWidth = 3 * z; g.beginPath(); g.moveTo(W * .2, H); g.lineTo(W * .5, hy + 8); g.stroke();
      if (r) {aircraft(W * .45, hy + 90 * z, z * .95, a.video && (c.acc != 'MAINT' || a.mx) ? r.reg : '');
        const ks = S.tasks.filter(k => k.r == r.id && k.st == 'WORKING'); ks.slice(0, 4).forEach((k, i) => {const v = S.V.find(x => x.id == k.v); vehicle(W * (.18 + i * .2) + Math.sin(tt + i) * 6 * z, hy + 190 * z, 70 * z, 30 * z, ['#f59e0b', '#38bdf8', '#a3e635', '#f472b6'][i], v ? v.id : '')});
        g.fillStyle = '#e2e8f0'; g.font = `600 ${13 * z}px system-ui`; g.textAlign = 'left'; g.fillText(`${sid} · ${fid(r)} · ${r.ph}`, 16 * z, H - 40 * z)}
      else {g.fillStyle = '#e2e8f0'; g.font = `${13 * z}px system-ui`; g.textAlign = 'left'; g.fillText(`${c.stands.join(', ')} · stand vacant`, 16 * z, H - 40 * z)}
      break}
    case 'BHS': {const stop = S.bhs.fault && !S.bhs.manual, sp = stop ? 0 : 1;
      for (let L = 0; L < 3; L++) {const y = hy + 50 * z + L * 85 * z; g.fillStyle = '#374151'; g.fillRect(0, y, W, 22 * z); g.fillStyle = '#1f2937'; for (let i = 0; i < 12; i++) {const x = ((i * 90 * z + sp * tt * 60 * z * (L % 2 ? -1 : 1)) % W + W) % W; g.fillRect(x, y - 12 * z, 38 * z, 14 * z)}}
      if (stop) {g.fillStyle = Math.floor(tt * 2) % 2 ? '#ef4444' : '#7f1d1d'; g.beginPath(); g.arc(W - 40 * z, hy + 20 * z, 12 * z, 0, 7); g.fill(); g.fillStyle = '#fecaca'; g.font = `700 ${16 * z}px system-ui`; g.textAlign = 'center'; g.fillText('SORTER STOPPED', W / 2, hy + 20 * z)}
      if (S.bhs.manual) crowd(6, W * .2, W * .8, hy + 60 * z, H - 20 * z, .5);
      if (S.convX) {g.fillStyle = '#fcd34d'; g.font = `${12 * z}px system-ui`; g.textAlign = 'left'; g.fillText('BMS overlay: conveyor drive current +60%', 16 * z, H - 40 * z)}
      break}
    case 'HGR': case 'WSH': case 'STO': {g.fillStyle = '#1f2937'; g.fillRect(0, 0, W, 34 * z); g.fillStyle = '#fef9c3'; for (let i = 0; i < 6; i++) g.fillRect(60 * z + i * 150 * z, 12 * z, 70 * z, 8 * z);
      if (c.code == 'HGR') {const busy = c.fac == 'HGR1' ? hr >= 21 : S.defects.some(d => !/RELEASED/.test(d.status) && (d.type == 'ENG' || d.tow));
        if (busy) {aircraft(W * .45, hy + 110 * z, z * 1.05, ''); crowd(5, W * .1, W * .9, hy + 160 * z, H - 20 * z, .15)} else {g.fillStyle = '#9ca3af'; g.font = `${13 * z}px system-ui`; g.textAlign = 'left'; g.fillText(c.fac == 'HGR1' ? 'Bay empty — base-check input planned 21:00' : 'Bay empty', 16 * z, H - 40 * z)}}
      else {g.fillStyle = '#4b5563'; for (let i = 0; i < 4; i++) g.fillRect(70 * z + i * 220 * z, hy + 70 * z, 150 * z, 40 * z); crowd(c.code == 'STO' ? 2 : 4, W * .1, W * .9, hy + 150 * z, H - 30 * z, .15)}
      break}
    case 'GSE': case 'VRF': {const vs = S.V.filter(v => (v.fail && (['TUG', 'BT', 'GPU'].includes(v.type) ? 'GSEW' : 'VRF') == c.fac) || (c.fac == 'GSEW' && S.pm.some(p => p.kind == 'veh' && p.st == 'IN PROGRESS' && p.ref == v.id)));
      g.fillStyle = '#334155'; for (let i = 0; i < 3; i++) g.fillRect(60 * z + i * 300 * z, hy + 20 * z, 240 * z, 180 * z);
      vs.slice(0, 3).forEach((v, i) => vehicle(110 * z + i * 300 * z, hy + 170 * z, 140 * z, 60 * z, v.ev ? '#22c55e' : '#f59e0b', a.mx ? v.id + ' · ' + VNAME[v.type] : VNAME[v.type]));
      crowd(vs.length ? 3 : 1, W * .1, W * .9, hy + 190 * z, H - 20 * z, .1);
      if (!vs.length) {g.fillStyle = '#9ca3af'; g.font = `${13 * z}px system-ui`; g.textAlign = 'left'; g.fillText('No units in repair', 16 * z, H - 40 * z)} break}
    case 'STG': case 'EVC': {const idle = S.V.filter(v => (v.st == 'IDLE' || v.st == 'DOWN') && (c.code == 'EVC' ? v.ev : !v.ev)).slice(0, 7);
      idle.forEach((v, i) => {vehicle(40 * z + i * 128 * z, hy + 160 * z + (i % 2) * 50 * z, 100 * z, 44 * z, v.down ? '#ef4444' : v.ev ? '#22c55e' : '#f59e0b', v.id); if (v.chg) {g.fillStyle = '#facc15'; g.font = `${18 * z}px system-ui`; g.fillText('⚡', 90 * z + i * 128 * z, hy + 100 * z + (i % 2) * 50 * z)}});
      break}
    case 'PRK': {const fill = clamp(.35 + .5 * Math.sin((hr - 6) / 14 * Math.PI), .2, .95);
      for (let row = 0; row < 4; row++) for (let i = 0; i < 16; i++) if (R() < fill) {const y = hy + 40 * z + row * 55 * z, sc = .6 + row * .15; g.fillStyle = ['#94a3b8', '#e2e8f0', '#1e293b', '#7f1d1d', '#1e3a8a'][(i + row) % 5]; g.fillRect(20 * z + i * 58 * z, y, 44 * z * sc, 22 * z * sc)}
      break}
  }
  // weather & degradation (outdoor cameras)
  if (!c.indoor) {if (S.wx.sand) {g.fillStyle = 'rgba(190,140,70,.42)'; g.fillRect(0, 0, W, H)} else if (S.wx.vis < 3) {g.fillStyle = 'rgba(215,220,226,.55)'; g.fillRect(0, 0, W, H)} if (S.wx.light && Math.random() < .02) {g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(0, 0, W, H)} if (night) {g.fillStyle = 'rgba(0,0,10,.35)'; g.fillRect(0, 0, W, H)}}
  for (let i = 0; i < 160 * z; i++) {g.fillStyle = `rgba(255,255,255,${Math.random() * .06})`; g.fillRect(Math.random() * W, Math.random() * H, 1.5, 1.5)}
  camHud(g, W, H, c, s, z, 1); g.restore();
}
// ---------- animated still: simulated PTZ drift / auto-follow + person-tracking overlay ----------
// Person boxes come from an offline detector run once on the illustrative stills (tools/detect_people.py) — no live detection, no identification.
const camHash = s => [...s].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
let camNoise = null;
function camPtz(g, W, H, c, im, ts, z) {
  const st = CAMPS[c.id] || (CAMPS[c.id] = {}), iw = im.naturalWidth, ih = im.naturalHeight, k0 = Math.max(W / iw, H / ih), t = ts / 1000, h0 = camHash(c.id), ph = h0 % 628 / 100;
  const P = (IMG.ccp || {})[CAM_PHOTO[c.id]] || [], single = camView == 1;
  // tracks: each detected person gets a stable ID, is acquired/lost on its own cycle, and jitters slightly like a real tracker
  const T = P.map((b, i) => {const per = 9 + (h0 + i * 7) % 8, q = ((t + (h0 % 97) + i * 3.7) % per) / per, vis = q < .88, age = q * per;
    return {i, b, id: 'P-' + String(1000 + (h0 + i * 37) % 9000).padStart(4, '0'), vis, age, conf: Math.min(.99, b[4] + .04 * Math.sin(t * 2 + i))}}).filter(r => r.vis);
  // camera move: single view auto-follows one tracked person at a time; multi-view drifts slowly
  const ptz = st.ptz || (st.ptz = {cx: .5, cy: .5, z: 1.06, last: ts}), dt = Math.min(.2, (ts - ptz.last) / 1000); ptz.last = ts;
  let tx = .5 + .06 * Math.sin(t * .11 + ph), ty = .5 + .04 * Math.sin(t * .07 + ph), tz = 1.08 + .05 * Math.sin(t * .09 + ph), fol = null;
  if (single && T.length) {const big = [...T].sort((a, b) => b.b[3] - a.b[3]).slice(0, 6).sort((a, b) => a.b[0] - b.b[0]); fol = big[Math.floor(t / 7 + (h0 % 5)) % big.length];
    if (fol) {tx = fol.b[0] + fol.b[2] / 2; ty = fol.b[1] + fol.b[3] / 2; tz = clamp(.5 * H / (fol.b[3] * ih * k0), 1.15, 1.8)}}
  const a = 1 - Math.exp(-dt * (single ? 1.6 : .8)); ptz.cx += (tx - ptz.cx) * a; ptz.cy += (ty - ptz.cy) * a; ptz.z += (tz - ptz.z) * a;
  const k = k0 * ptz.z, w = iw * k, h = ih * k, ox = clamp(W / 2 - ptz.cx * w, W - w, 0), oy = clamp(H / 2 - ptz.cy * h, H - h, 0);
  g.filter = `brightness(${1 + .03 * Math.sin(t * 1.3 + ph)}) contrast(1.04)`; g.drawImage(im, ox, oy, w, h); g.filter = 'none';
  // sensor grain + rolling scan band
  if (!camNoise) {camNoise = document.createElement('canvas'); camNoise.width = camNoise.height = 256; const n = camNoise.getContext('2d'), d = n.createImageData(256, 256); for (let i = 0; i < d.data.length; i += 4) {const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 22} n.putImageData(d, 0, 0)}
  g.fillStyle = g.createPattern(camNoise, 'repeat'); g.save(); g.translate(-Math.random() * 256, -Math.random() * 256); g.fillRect(0, 0, W + 256, H + 256); g.restore();
  const sy = (t * 60 * z) % (H + 80 * z) - 40 * z; g.fillStyle = 'rgba(255,255,255,.035)'; g.fillRect(0, sy, W, 40 * z);
  // tracking boxes
  g.lineWidth = Math.max(1, 1.6 * z); g.font = `600 ${(single ? 11 : 13) * z}px ui-monospace,Consolas,monospace`; g.textAlign = 'left';
  for (const r of T) {const [bx, by, bw, bh] = r.b, j = .8 * z * Math.sin(t * 9 + r.i * 2.1), acq = Math.min(1, r.age / .5), grow = 1 + .6 * (1 - acq);
    let x = ox + bx * w + j, y = oy + by * h + j * .6, ww = bw * w, hh = bh * h; x -= ww * (grow - 1) / 2; y -= hh * (grow - 1) / 2; ww *= grow; hh *= grow;
    if (x > W || y > H || x + ww < 0 || y + hh < 0) continue;
    const on = fol && r.i == fol.i, col = on ? '#fbbf24' : '#4ade80', L = Math.min(ww, hh) * .25;
    g.strokeStyle = col; g.globalAlpha = .4 + .6 * acq; g.beginPath();
    for (const [px, py, dx, dy] of [[x, y, 1, 1], [x + ww, y, -1, 1], [x, y + hh, 1, -1], [x + ww, y + hh, -1, -1]]) {g.moveTo(px + dx * L, py); g.lineTo(px, py); g.lineTo(px, py + dy * L)}
    g.stroke(); if (on) {g.setLineDash([4 * z, 4 * z]); g.strokeRect(x, y, ww, hh); g.setLineDash([]); g.beginPath(); g.moveTo(x + ww / 2, y - 8 * z); g.lineTo(x + ww / 2, y + 6 * z); g.moveTo(x + ww / 2, y + hh - 6 * z); g.lineTo(x + ww / 2, y + hh + 8 * z); g.stroke()}
    if (single || on || ww > 40 * z) {const lab = on ? `TRACKING ${r.id} · ${String(Math.floor(r.age)).padStart(2, '0')}s` : `${r.id} ${r.conf.toFixed(2)}`, tw = g.measureText(lab).width + 8 * z;
      g.fillStyle = on ? 'rgba(120,53,15,.85)' : 'rgba(5,46,22,.75)'; g.fillRect(x, y - 15 * z, tw, 14 * z); g.fillStyle = on ? '#fde68a' : '#bbf7d0'; g.fillText(lab, x + 4 * z, y - 4 * z)}
    g.globalAlpha = 1}
  // counter panel
  g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(8 * z, 32 * z, 300 * z, 34 * z); g.fillStyle = '#86efac'; g.font = `600 ${12 * z}px ui-monospace,Consolas,monospace`;
  g.fillText(`PERSONS IN VIEW ${String(T.length).padStart(2, '0')}  ${single ? (fol ? 'AUTO-FOLLOW' : 'PATROL') : 'PATROL'}`, 14 * z, 46 * z);
  g.fillStyle = '#9fb2cf'; g.font = `${10.5 * z}px system-ui`; g.fillText(`Simulated PTZ · zoom ${ptz.z.toFixed(1)}× · demo tracking overlay`, 14 * z, 60 * z);
}
function camHud(g, W, H, c, s, z, demo) {
  g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, 0, W, 26 * z); g.fillStyle = '#e5edf7'; g.font = `600 ${13 * z}px ui-monospace,Consolas,monospace`; g.textAlign = 'left';
  g.fillText(`${c.id} · ${c.area}`, 10 * z, 18 * z); g.textAlign = 'right'; if (demo == 2) {g.fillStyle = '#93c5fd'; g.fillText(camTrack ? 'ANIMATED STILL' : 'STILL IMAGE', W - 10 * z, 18 * z);
    g.fillStyle = 'rgba(30,58,138,.88)'; g.fillRect(0, H - 26 * z, W, 26 * z); g.fillStyle = '#dbeafe'; g.font = `700 ${12.5 * z}px system-ui`; g.textAlign = 'center';
    g.fillText('ILLUSTRATIVE STILL PHOTO' + (camTrack ? ' + SIMULATED TRACKING' : '') + ' — NOT LIVE OR RECORDED AIRPORT CCTV' + (s.st == 'DEGRADED' ? ' · CAMERA DEGRADED (sim): ' + s.why : ''), W / 2, H - 9 * z); return}
  const ts = `SIM ${loc(S.t)} CAIRO`, rx = W - 22 * z - g.measureText(ts).width; g.fillText(ts, W - 10 * z, 18 * z);
  if (s.rec && s.st != 'OFFLINE') {g.fillStyle = Math.floor(performance.now() / 600) % 2 ? '#ef4444' : '#7f1d1d'; g.beginPath(); g.textAlign = 'right'; g.font = `600 ${13 * z}px ui-monospace,Consolas,monospace`; const rw = g.measureText('REC (sim)').width; g.beginPath(); g.arc(rx - rw - 10 * z, 13 * z, 5 * z, 0, 7); g.fill(); g.fillStyle = '#fca5a5'; g.fillText('REC (sim)', rx, 18 * z)}
  else if (s.st != 'WITHHELD') {g.fillStyle = '#fcd34d'; g.textAlign = 'right'; g.fillText('NO REC', rx, 18 * z)}
  if (demo) {g.fillStyle = 'rgba(120,53,15,.85)'; g.fillRect(0, H - 26 * z, W, 26 * z); g.fillStyle = '#fde68a'; g.font = `700 ${12.5 * z}px system-ui`; g.textAlign = 'center';
    g.fillText('DEMO · SYNTHETIC RENDER FROM SIMULATION STATE — NOT CAMERA FOOTAGE' + (s.st == 'DEGRADED' ? ' · DEGRADED: ' + s.why : ''), W / 2, H - 9 * z)}
}

// ---------- views ----------
const camStB = s => bd(s.st, s.st == 'ONLINE' ? 'ok' : s.st == 'DEGRADED' ? 'wn' : s.st == 'WITHHELD' ? '' : 'cr');
const camAccB = c => bd(CAM_ACC[c.acc].n, CAM_ACC[c.acc].cls);
const camIncs = id => S.camLinks.filter(l => l.cam == id && l.inc).map(l => l.inc);
const facOpts = sel => `<option value="">All locations</option><option value="TERMS" ${sel == 'TERMS' ? 'selected' : ''}>All terminals</option><option value="MAINT" ${sel == 'MAINT' ? 'selected' : ''}>All maintenance facilities</option>` +
  [...new Set(CAM_FAC.map(f => f.g))].map(gn => `<optgroup label="${gn}">${CAM_FAC.filter(f => f.g == gn).map(f => `<option value="${f.id}" ${f.id == sel ? 'selected' : ''}>${f.n}</option>`).join('')}</optgroup>`).join('');
const camFilters = () => `<div class="row" style="margin-bottom:8px"><select aria-label="Location" onchange="camF.fac=this.value;camRe()">${facOpts(camF.fac)}</select>
  <select aria-label="Category" onchange="camF.cat=this.value;camRe()"><option value="">All categories</option>${[...new Set(CAMS.map(c => c.cat))].map(x => `<option ${x == camF.cat ? 'selected' : ''}>${x}</option>`).join('')}</select>
  <select aria-label="Status" onchange="camF.st=this.value;camRe()"><option value="">Any status</option>${['ONLINE', 'DEGRADED', 'OFFLINE'].map(x => `<option ${x == camF.st ? 'selected' : ''}>${x}</option>`).join('')}</select>
  <input placeholder="Search camera ID / name" value="${esc(camF.q)}" oninput="camF.q=this.value;live(true)" style="width:180px"></div>`;
function camRe() {renderPage()}
const privNote = () => `<div class="ccpriv"><b>Privacy & data notice.</b> No real Cairo Airport CCTV is connected. Camera records, locations and coverage are <b>illustrative placeholders on a conceptual plan</b>; security-sensitive areas are withheld. Video shows only (1) a stream or file <b>you</b> supply and are authorised to view, or (2) a clearly labelled illustrative still photo (generic airport scenes you supplied, not Cairo Airport CCTV) or synthetic demo render. Nothing here performs live AI surveillance or detects behaviour: the person boxes on the animated stills were found once, offline, by a generic person detector run on those same stills — no faces, identities or behaviour, and the IDs are random demo labels; alerts come from simulated equipment state and named scenarios. Demo role permissions are not real access control.</div>`;

VIEWS['cctv.wall'] = {sub: 'Camera map, live-view area and status — authorised feeds only; otherwise a labelled illustrative still photo or synthetic demo render.',
  html: () => `${privNote()}<div class="ccw"><div class="g" style="align-content:start"><div class="card"><div class="ch">Location<span class="sp"></span><span class="tag">conceptual plan</span></div>
    <div class="row" style="margin-bottom:8px">${[['', 'All'], ['T1', 'T1'], ['T2', 'T2'], ['T3', 'T3'], ['STC', 'Seasonal'], ['MAINT', 'Maintenance'], ['DEPOT', 'GSE / EV'], ['PARK', 'Parking']].map(([k, n]) => `<button class="btn ${camF.fac == k ? 'pri' : ''}" onclick="camF.fac='${k}';camRe()">${n}</button>`).join('')}</div>
    ${camFilters()}<div data-live="ccMap"></div></div><div class="card"><div class="ch">Cameras in view<span class="sp"></span><span data-live="ccCount"></span></div><div data-live="ccList" class="tw" style="max-height:38vh"></div></div></div>
  <div class="g" style="align-content:start"><div class="card"><div class="ch">Live view<span class="sp"></span><div class="seg">${[1, 2, 3].map(n => `<button class="${camView == n ? 'on' : ''}" onclick="camView=${n};renderPage()">${n * n == 1 ? 'Single' : n * n + '-up'}</button>`).join('')}</div><button class="btn" onclick="camPhotos=camPhotos?0:1;camAud(camSel,'Display switched to '+(camPhotos?'illustrative stills':'synthetic render'),'ok');camMountPlayer();live(true);renderPage()" title="Toggle between illustrative still photos and the simulation-driven synthetic render">${camPhotos ? '▣ Stills' : '◈ Synthetic'}</button>${camPhotos ? `<button class="btn${camTrack ? ' on' : ''}" onclick="camTrack=camTrack?0:1;camAud(camSel,'People tracking overlay '+(camTrack?'on':'off'),'ok');renderPage()" title="Animate the stills: simulated PTZ pan/zoom, auto-follow and person-tracking boxes">${camTrack ? '⌖ Tracking on' : '⌖ Tracking off'}</button>` : ''}<button class="btn" onclick="camFull()">⛶ Full screen</button></div>
    <div id="ccPlayer" class="ccp"></div><div data-live="ccStat" style="margin-top:8px"></div>
    <details class="ccsrc" style="margin-top:8px"><summary>Connect an authorised feed or open a recording</summary><div class="frm" style="margin-top:8px"><label>Source type<select id="ccKind"><option value="hls">HLS (.m3u8)</option><option value="whep">WebRTC (WHEP endpoint)</option><option value="url">Progressive video URL (MP4/WebM)</option></select></label>
      <label>Use as<select id="ccMode"><option value="live">Live stream</option><option value="recorded">Recorded footage</option></select></label><label style="grid-column:1/-1">Stream URL (https, no credentials)<input id="ccUrl" placeholder="https://vms.example/approved/stream.m3u8"></label></div>
      <label class="row sm" style="margin-top:6px"><input type="checkbox" id="ccAuth"> I am authorised to view this feed / recording, and it contains no restricted security footage.</label>
      <div class="row" style="margin-top:6px"><button class="btn pri" onclick="camConnect()">Connect feed</button><label class="btn">Open local recording…<input type="file" accept="video/*" hidden onchange="camFile(this)"></label><button class="btn" onclick="camDemo()">Use demo render</button></div>
      <p class="note">The URL stays in this page's memory only (not saved). Credentials in URLs are refused — use an authorised server-side proxy. A failed live feed is shown as <b>unavailable</b>; the demo render is never substituted for it.</p></details></div>
    <div class="card"><div class="ch">Camera details</div><div data-live="ccDet"></div><div id="ccLink"></div></div></div></div>`,
  mount: () => {camMountPlayer(); camLinkForm()}};
LIVE.ccCount = () => camFilter(CAMS, camF).length + ' records';
LIVE.ccMap = () => {const vis = new Set(camFilter(CAMS, camF).map(c => c.id)), T = TERMS.includes(camF.fac);
  if (T) return termPlan(camF.fac, vis);
  let s = `<svg viewBox="0 0 1000 560" class="ccmap" role="img" aria-label="Conceptual site plan with camera markers"><rect x="0" y="0" width="1000" height="560" class="bg"/>
    <rect x="40" y="128" width="730" height="74" class="apr"/><text x="48" y="146">Apron — approved ground-handling views only</text>`;
  for (const f of CAM_FAC) {const on = !camF.fac || camF.fac == f.id || (camF.fac == 'MAINT' && f.g == 'Maintenance') || (camF.fac == 'TERMS' && f.g == 'Terminals');
    s += `<g class="fac${on ? ' on' : ''}${f.id == 'SEC' ? ' sec' : ''}" onclick="camF.fac='${f.id == 'SEC' ? '' : f.id}';camRe()" style="cursor:pointer"><rect x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" rx="5"/><text x="${f.x + 6}" y="${f.y + 15}">${f.id == 'SEC' ? 'Security-sensitive areas — camera records withheld' : f.n.replace(/ \(.*\)/, '')}</text></g>`}
  for (const c of CAMS) if (c.acc != 'SEC') {const st = S.cam[c.id].st; s += `<g class="cm ${st.toLowerCase()}${c.id == camSel ? ' sel' : ''}${vis.has(c.id) ? '' : ' dim'}" onclick="camSelect('${c.id}',1)"><title>${c.id} · ${esc(c.name)} · ${st}</title><circle cx="${c.x}" cy="${c.y}" r="${c.id == camSel ? 7 : 5}"/></g>`}
  return s + `<text x="992" y="552" text-anchor="end" class="disc2">Illustrative conceptual plan — not real camera positions or coverage</text></svg>`};
function termPlan(T, vis) { // conceptual terminal floor plan (same generic template for every terminal, labelled as such)
  const Z = [['APR', 'Apron edge (approved views)', 20, 20, 960, 70], ['DEP', 'Departures hall', 20, 110, 470, 120], ['CHK', 'Check-in & services', 510, 110, 470, 120], ['ARR', 'Arrivals hall', 20, 250, 470, 110], ['REC', 'Baggage reclaim', 510, 250, 470, 110]];
  let s = `<svg viewBox="0 0 1000 400" class="ccmap" role="img" aria-label="${T} conceptual floor plan"><rect width="1000" height="400" class="bg"/>`;
  for (const [k, n, x, y, w, h] of Z) {const cs = CAMS.filter(c => c.fac == T && c.code == k); s += `<g class="fac on"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6"/><text x="${x + 8}" y="${y + 17}">${n} · ${cs.length ? cs.length + ' camera' + (cs.length > 1 ? 's' : '') : 'no camera record'}</text></g>`;
    cs.forEach((c, i) => {const cx = x + w * (i + .5) / cs.length, cy = y + h * .62, st = S.cam[c.id].st; s += `<g class="cm ${st.toLowerCase()}${c.id == camSel ? ' sel' : ''}${vis.has(c.id) ? '' : ' dim'}" onclick="camSelect('${c.id}',1)"><title>${c.id} · ${st}</title><circle cx="${cx}" cy="${cy}" r="${c.id == camSel ? 9 : 7}"/><text x="${cx}" y="${cy + 22}" text-anchor="middle">${c.id.split('-').slice(2).join('-')}</text></g>`})}
  return s + `<text x="992" y="392" text-anchor="end" class="disc2">${ZONE[T] ? ZONE[T].name : T} — generic conceptual plan, not the real floor plan</text></svg>`;
}
LIVE.ccList = () => {const l = camFilter(CAMS, camF);
  return l.length ? `<table><tr><th>Camera</th><th>Status</th></tr>${l.map(c => {const s = S.cam[c.id], f = camFeed(S, c.id, role);
    return `<tr class="r${c.id == camSel ? ' selr' : ''}" onclick="${c.acc == 'SEC' ? "toast('Security-sensitive record withheld')" : `camSelect('${c.id}',1)`}"><td><b>${c.id}</b><div class="mu sm">${esc(c.name)}</div></td><td>${camStB(s)}</td></tr>`}).join('')}</table>` : '<div class="empty">No camera records for this filter</div>'};
LIVE.ccStat = () => {if (!camSel) return ''; const c = CAM[camSel], s = S.cam[camSel], f = camFeed(S, camSel, role), p = CAMPS[camSel] || {}, a = camAccess(role, c), fd = CAMFEED[camSel];
  return `<div class="row">${bd(f.label, f.cls)}${camStB(s)}${s.rec ? bd('Recording (sim) available', 'ok') : bd('Recording unavailable' + (s.recWhy ? ' — ' + s.recWhy : ''), 'wn')}<span class="sm mu">Player: <b>${p.state || '—'}</b> · last successful update ${p.wall ? new Date(p.wall).toLocaleTimeString() : '—'} (wall clock) · camera heartbeat ${loc(s.last)} sim</span></div>
    <div class="row sm" style="margin-top:4px">${bd(a.video ? 'Access granted' : 'Access denied', a.video ? 'ok' : 'cr')}<span class="mu">${esc(a.why)}${fd ? ' · source: ' + esc(fd.label) + (fd.kind != 'file' ? ' ' + esc(fd.url.replace(/[?#].*/, '')) : '') : ''}</span></div>`};
LIVE.ccDet = () => {if (!camSel) return '<div class="empty">Select a camera</div>'; const c = CAM[camSel], s = S.cam[camSel], a = camAccess(role, c), mx = mxLinks(S, null, 1).filter(l => l.cam == c.id);
  return `<div class="kv"><span>Camera ID</span><b>${c.id}</b><span>Display name</span><b>${esc(c.name)}</b><span>Terminal / facility</span><b>${CFAC[c.fac].n}</b><span>General area</span><b>${c.area}</b><span>Category</span><b>${c.cat}</b><span>Operational purpose</span><b>${c.purpose}</b>
    <span>Status</span><b>${s.st}${s.why ? ' — ' + esc(s.why) : ''} (since ${loc(s.since)})</b><span>Feed availability</span><b>${camFeed(S, c.id, role).label}</b><span>Last update</span><b>${loc(s.last)} (sim)</b><span>Access classification</span><b>${camAccB(c)}</b>
    <span>Coverage</span><b>${c.stands.length ? 'Stands ' + c.stands.join(', ') : 'Area view'}</b><span>Retention policy</span><b>${S.cctvRet[c.acc].days} days · ${esc(S.cctvRet[c.acc].purpose)}</b><span>Related incidents</span><b>${camIncs(c.id).join(', ') || '—'}</b></div>
    ${mx.length ? `<h4 style="margin:10px 0 4px;font-size:11px;color:var(--mu)">LINKED RECORDS</h4><table><tr><th>Type</th><th>Reference</th><th>Detail</th><th>Time</th></tr>${mx.slice(0, 12).map(l => `<tr><td class="sm">${l.kind}</td><td class="sm">${mxRef(l, a)}</td><td class="sm" style="white-space:normal">${a.mx || !(l.wo || l.reg) ? esc(l.desc) : '<span class="mu">restricted</span>'}</td><td class="sm">${l.t != null ? loc(l.t) : '—'}</td></tr>`).join('')}</table>` : ''}`};
const mxRef = (l, a) => [l.inc && `<a href="#" onclick="go('saf','inc');return false" style="color:var(--ac)">${l.inc}</a>`, l.wo && (a.mx ? (l.def ? `<a href="#" onclick="inspect('def','${l.def}');return false" style="color:var(--ac)">${l.wo}</a>` : l.wo) : 'WO ▒▒▒'), l.def && a.mx && l.def, l.reg && (a.mx ? l.reg : 'reg ▒▒▒'), l.eq].filter(Boolean).join(' · ');
function camLinkForm() {const el = $('#ccLink'); if (!el) return; const c = CAM[camSel]; if (!c) return el.innerHTML = '';
  el.innerHTML = `<details style="margin-top:10px"><summary class="sm">Link this camera to an incident (investigation timestamp)</summary><div class="frm" style="margin-top:6px"><label>Incident<select id="clInc">${S.inc.map(i => `<option value="${i.id}">${i.id} · ${esc(i.c)} · ${loc(i.t)}</option>`).join('') || '<option value="">— no incidents —</option>'}<option value="NEW">+ Report new maintenance-area incident</option></select></label>
    <label>Timestamp (sim, HH:MM)<input id="clT" value="${loc(S.t)}"></label><label style="grid-column:1/-1">Note<input id="clN" placeholder="e.g. footage window to preserve"></label></div><div class="row" style="margin-top:6px"><button class="btn pri" onclick="camDoLink()">Link camera record</button></div></details>`}
function camDoLink() {
  if (!can()) return; const c = CAM[camSel], a = camAccess(role, c); if (!a.video && role != 'Safety Investigator') return toast('Linking requires access to this camera category');
  let inc = $('#clInc').value; const m = /^(\d{1,2}):(\d{2})$/.exec($('#clT').value.trim()); if (!m) return toast('Timestamp must be HH:MM');
  const t = ((+m[1] * 60 + +m[2]) - 360 + 1440) % 1440; if (t > S.t) return toast('Timestamp is in the future (sim time ' + loc(S.t) + ')');
  if (inc == 'NEW') {inc = 'INC-' + pad(S.inc.length + 1); S.inc.unshift({id: inc, c: CFAC[c.fac].g == 'Maintenance' ? 'Maintenance-area incident' : 'Occurrence', s: 'Occurrence', d: ($('#clN').value || 'Reported from camera ' + c.id), t, step: 0, cams: [c.id]}); ev(S, 'IncidentReported', inc, 'from CCTV ' + c.id)}
  if (!inc) return toast('Select an incident');
  camLink(S, c.id, {inc, t, by: role, note: $('#clN').value || 'Manual link'}); camAud(c.id, 'Linked to ' + inc + ' @ ' + loc(t), 'recorded'); toast(c.id + ' linked to ' + inc); camLinkForm(); live(true);
}

VIEWS['cctv.dir'] = {sub: 'Every camera record with location, purpose, status, feed availability, access classification and incident references (illustrative records).',
  html: () => `${privNote()}<div class="card">${camFilters()}<div data-live="ccDir" class="tw" style="max-height:68vh"></div></div>`};
LIVE.ccDir = () => {const l = camFilter(CAMS, camF);
  return `<table><tr><th>Camera ID</th><th>Display name</th><th>Terminal / facility</th><th>General area</th><th>Category</th><th>Purpose</th><th>Status</th><th>Feed availability</th><th>Last update</th><th>Access</th><th>Incidents</th></tr>${l.map(c => {const s = S.cam[c.id], f = camFeed(S, c.id, role), w = c.acc == 'SEC';
    return `<tr class="r" onclick="${w ? "toast('Security-sensitive record withheld')" : `camSelect('${c.id}')`}"><td><b>${c.id}</b></td><td>${w ? '<span class="mu">withheld</span>' : esc(c.name)}</td><td>${CFAC[c.fac].n}</td><td class="sm">${c.area}</td><td class="sm">${c.cat}</td><td class="sm">${c.purpose}</td><td>${camStB(s)}</td><td>${bd(f.mode, f.cls)}</td><td>${w ? '—' : loc(s.last)}</td><td>${camAccB(c)}</td><td class="sm">${camIncs(c.id).join(', ') || '—'}</td></tr>`}).join('')}</table>
    <p class="note">Coverage differs per facility (e.g. Terminal 3 has more records than Terminal 1; remote stands R1–R6 have no approved apron view). These are modelling choices, not verified CAI camera coverage. Terminals follow the publicly described CAI structure (Terminals 1, 2, 3 and the Seasonal Flights Terminal); layouts are conceptual.</p>`};

let camMx = 'HGR1';
VIEWS['cctv.maint'] = {sub: 'Maintenance Cameras: hangars, inspection areas, workshops, GSE & vehicle repair and stores — linked to work orders, defects, inspections and equipment.',
  html: () => `${privNote()}<div data-live="ccMxFac"></div><div class="g g2" style="margin-top:12px"><div class="card"><div class="ch">Cameras — <span data-live="ccMxName"></span></div><div data-live="ccMxCams" class="tw"></div></div>
    <div class="card"><div class="ch">Maintenance links & incident references</div><div data-live="ccMxLinks" class="tw" style="max-height:48vh"></div></div></div>`};
LIVE.ccMxName = () => CFAC[camMx].n;
LIVE.ccMxFac = () => {const F = CAM_FAC.filter(f => f.g == 'Maintenance'), L = mxLinks(S, null, 1);
  return `<div class="kp">${F.map(f => {const cs = camsAt(f.id), on = cs.filter(c => S.cam[c.id].st != 'OFFLINE').length, ln = L.filter(l => CAM[l.cam].fac == f.id && l.live).length;
    return `<div class="k cl${f.id == camMx ? ' kon' : ''}" onclick="camMx='${f.id}';live(true)"><span>${f.mx}</span><b style="font-size:14px;white-space:normal">${f.n}</b><i>${on}/${cs.length} cameras online · ${ln} active link${ln == 1 ? '' : 's'}</i></div>`}).join('')}</div>`};
LIVE.ccMxCams = () => {const cs = camsAt(camMx); return `<table><tr><th>Camera</th><th>Status</th><th>Recording</th><th>Feed</th><th></th></tr>${cs.map(c => {const s = S.cam[c.id], f = camFeed(S, c.id, role);
  return `<tr><td><b>${c.id}</b><div class="sm mu">${esc(c.name)}</div></td><td class="sm">${c.area}</td><td>${camStB(s)}</td><td>${s.rec ? bd('available', 'ok') : bd('unavailable', 'wn')}</td><td>${bd(f.mode, f.cls)}</td><td><button class="btn" onclick="camSelect('${c.id}')">Open</button></td></tr>`}).join('')}</table>`};
LIVE.ccMxLinks = () => {const a = {mx: CAM_ACC.MAINT.roles.includes(role)}, l = mxLinks(S, camMx, 1);
  return (a.mx ? '' : `<div class="ccpriv" style="margin-bottom:8px">Role "${esc(role)}" has no maintenance-record access: aircraft registrations, work orders and defect details are masked.</div>`) +
    (l.length ? `<table><tr><th>Camera</th><th>Link type</th><th>Reference</th><th>Detail</th><th>Time</th><th>State</th></tr>${l.map(x => `<tr><td class="sm">${x.cam}</td><td class="sm">${x.kind}</td><td class="sm">${mxRef(x, a)}</td><td class="sm" style="white-space:normal">${a.mx || !(x.wo || x.reg) ? esc(x.desc) : '<span class="mu">restricted</span>'}</td><td class="sm">${x.t != null ? loc(x.t) : '—'}</td><td>${bd(x.st, x.live ? 'in' : '')}</td></tr>`).join('')}</table>` : '<div class="empty">No maintenance activity linked to this facility yet. Inject “Technical defect”, “Ground vehicle breakdown” or wait for planned PM.</div>')};

VIEWS['cctv.alerts'] = {sub: 'Camera & equipment alerts generated from simulation state or named scenarios, and camera ↔ incident links for investigation.',
  html: () => `${privNote()}<div class="row" style="margin-bottom:12px"><button class="btn dg" onclick="act('camfail')">Camera offline</button><button class="btn dg" onclick="act('nvrfail')">Recorder (NVR) fault — T3</button><button class="btn" onclick="act('camok')">Restore CCTV</button>
    <button class="btn dg" onclick="act('vehfail')">Ground vehicle breakdown</button><button class="btn dg" onclick="act('belt','BHS sorter failure')">Baggage handling incident (BHS fault)</button><button class="btn" onclick="act('beltok')">BHS restored</button></div>
    <div data-live="ccAlK"></div><div class="g g2" style="margin-top:12px"><div class="card"><div class="ch">CCTV & equipment alerts</div><div data-live="ccAl" style="max-height:56vh;overflow:auto"></div></div>
    <div class="card"><div class="ch">Camera ↔ incident links</div><div data-live="ccLinks" class="tw" style="max-height:56vh"></div><p class="note">Auto-links are created by the engine when a simulated event names a facility (vehicle breakdown → GSE workshop, BHS fault → baggage hall). Manual links are added from Camera details.</p></div></div>`};
LIVE.ccAlK = () => {const st = Object.values(S.cam), n = k => st.filter(s => s.st == k).length;
  return `<div class="kp">${kpiTile('Camera records', CAMS.filter(c => c.acc != 'SEC').length, '+1 withheld placeholder')}${kpiTile('Online', n('ONLINE'))}${kpiTile('Degraded', n('DEGRADED'), 'low visibility', '', n('DEGRADED') ? 'neg' : '')}${kpiTile('Offline', n('OFFLINE'), '', '', n('OFFLINE') ? 'neg' : '')}${kpiTile('Recording unavailable', st.filter(s => !s.rec && s.st != 'WITHHELD').length)}${kpiTile('Camera-linked incidents', new Set(S.camLinks.filter(l => l.inc).map(l => l.inc)).size)}</div>`};
LIVE.ccAl = () => {const l = S.al.filter(a => a.sys == 'CCTV' || (a.sys == 'Fleet' && /broken down/.test(a.msg)) || (a.sys == 'Baggage' && /BHS/.test(a.msg)) || (a.sys == 'Energy' && /conveyor/i.test(a.msg))).slice(0, 40); return l.map(alHtml).join('') || '<div class="empty">No camera alerts</div>'};
LIVE.ccLinks = () => S.camLinks.length ? `<table><tr><th>Link</th><th>Camera</th><th>Incident</th><th>Equipment / WO</th><th>Timestamp</th><th>By</th><th>Note</th></tr>${S.camLinks.slice().reverse().map(l => `<tr class="r" onclick="camSelect('${l.cam}')"><td class="mu">${l.id}</td><td><b>${l.cam}</b></td><td>${l.inc || '—'}</td><td>${[l.eq, l.wo].filter(Boolean).join(' · ') || '—'}</td><td>${loc(l.t)}</td><td class="sm">${esc(l.by)}${l.auto ? ' (auto)' : ''}</td><td class="sm" style="white-space:normal">${esc(l.note || '')}</td></tr>`).join('')}</table>` : '<div class="empty">No links yet</div>';

VIEWS['cctv.access'] = {sub: 'Role-based demo permissions, retention-policy fields, camera-access audit log and data-source statement.',
  html: () => `${privNote()}<div class="g g2"><div class="card"><div class="ch">Access matrix (demo roles — not real access control)</div><div data-live="ccAcc" class="tw"></div></div>
    <div class="card cfg"><div class="ch">Retention policy (configurable)<span class="sp"></span><button class="btn pri" onclick="camRetSave()">Save policy</button></div><table><tr><th>Class</th><th>Retention (days)</th><th>Purpose</th><th>Privacy masking</th><th>Export approval</th></tr>${Object.entries(S.cctvRet).map(([k, r]) => `<tr><td>${bd(CAM_ACC[k].n, CAM_ACC[k].cls)}</td>${k == 'SEC' ? '<td colspan="4" class="mu sm">Governed by the airport security programme — not configurable here</td>' : `<td><input type="number" min="0" max="365" data-rk="${k}.days" value="${r.days}"></td><td><input data-rk="${k}.purpose" value="${esc(r.purpose)}" style="width:190px"></td><td><input type="checkbox" data-rk="${k}.mask" ${r.mask ? 'checked' : ''}></td><td><input data-rk="${k}.export" value="${esc(r.export)}" style="width:150px"></td>`}</tr>`).join('')}</table>
      <p class="note">Fields record policy settings only — the demo stores no footage. Synthetic renders never draw faces; masking applies to any user-supplied footage only if your VMS provides it.</p></div></div>
    <div class="g g2" style="margin-top:12px"><div class="card"><div class="ch">Camera access audit log</div><div data-live="ccAud" class="tw" style="max-height:50vh"></div></div>
    <div class="card"><div class="ch">Data sources & integration status</div><table>
      <tr><td>${bd('Not connected', 'cr')}</td><td style="white-space:normal">Cairo Airport CCTV / VMS — no public or authorised feed is available to this dashboard; none is assumed.</td></tr>
      <tr><td>${bd('Supported', 'ok')}</td><td style="white-space:normal">User-supplied authorised feeds: HLS (native or hls.js), WebRTC via WHEP, progressive MP4/WebM, local recorded files. External URLs can be blocked by the hosting page's content-security policy or by CORS.</td></tr>
      <tr><td>${bd('Simulated', 'in')}</td><td style="white-space:normal">Camera status, recording availability, faults, alerts and incident links — driven by the shared simulation engine (seed ${SEED}).</td></tr>
      <tr><td>${bd('Illustrative', 'wn')}</td><td style="white-space:normal">Camera IDs, names, counts, positions, facility plans and retention values.</td></tr>
      <tr><td>${bd('Not implemented', '')}</td><td style="white-space:normal">Video analytics / AI detection of behaviour — none. No alert claims to detect suspicious activity.</td></tr></table></div></div>`};
LIVE.ccAcc = () => `<table><tr><th>Role</th>${Object.values(CAM_ACC).map(a => `<th>${a.n}</th>`).join('')}<th>Maint. records</th></tr>${ROLES.map(r => `<tr${r == role ? ' class="selr"' : ''}><td>${r}${r == role ? ' <span class="tag">current</span>' : ''}</td>${Object.keys(CAM_ACC).map(k => {const a = camAccess(r, {acc: k}); return `<td>${a.video ? bd('video', 'ok') : a.meta ? bd('metadata', '') : bd('none', 'cr')}</td>`}).join('')}<td>${CAM_ACC.MAINT.roles.includes(r) && r != 'Read-only Analyst' ? bd('yes', 'ok') : bd('masked', '')}</td></tr>`).join('')}</table>`;
LIVE.ccAud = () => S.camAu.length ? `<table><tr><th>Sim time</th><th>Role</th><th>Camera</th><th>Action</th><th>Result</th></tr>${S.camAu.slice(0, 200).map(a => `<tr><td>${loc(a.t)}</td><td class="sm">${esc(a.role)}</td><td>${a.cam}</td><td class="sm">${esc(a.act)}</td><td class="sm ${/denied|error/i.test(a.res) ? 'neg' : ''}">${esc(a.res)}</td></tr>`).join('')}</table>` : '<div class="empty">No camera access yet</div>';
function camRetSave() {if (!can()) return; if (!['Airport Operations Manager', 'CCTV Operator', 'Safety Investigator'].includes(role)) return toast('Retention policy requires Airport Operations Manager, CCTV Operator or Safety Investigator role');
  for (const el of document.querySelectorAll('[data-rk]')) {const [k, f] = el.dataset.rk.split('.'), v = el.type == 'checkbox' ? el.checked : el.type == 'number' ? +el.value : el.value; if (S.cctvRet[k][f] !== v) {camAud('—', `Retention ${k}.${f}: ${S.cctvRet[k][f]} → ${v}`, 'saved'); S.cctvRet[k][f] = v}} toast('Retention policy saved (simulation)')}
INSP.cam = id => {const c = CAM[id]; if (!c) return ['Camera', '']; const s = S.cam[id];
  return [`Camera ${id}`, `<div class="kv"><span>Name</span><b>${esc(c.name)}</b><span>Facility</span><b>${CFAC[c.fac].n}</b><span>Status</span><b>${s.st}${s.why ? ' — ' + esc(s.why) : ''}</b><span>Recording</span><b>${s.rec ? 'available (sim)' : 'unavailable'}</b><span>Access</span><b>${CAM_ACC[c.acc].n}</b><span>Incidents</span><b>${camIncs(id).join(', ') || '—'}</b></div><div class="row" style="margin-top:10px"><button class="btn pri" onclick="closeInsp();camSelect('${id}')">Open in CCTV & Surveillance</button></div>`]};
