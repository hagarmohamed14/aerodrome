// ===================== SHARED SIMULATION ENGINE =====================
// One state object S drives every module. tick() = 1 simulated minute.
const TAXI_SPD = 160, VEH_SPD = 140;
const VFLEET = [ // id, type, electric, owner
  ['TG1','TUG',0,'GH'],['TG2','TUG',0,'GH'],['TG3','TUG',1,'GH'],['TG4','TUG',1,'GH'],
  ['BT1','BT',1,'GH'],['BT2','BT',1,'GH'],['BT3','BT',1,'GH'],['BT4','BT',1,'GH'],['BT5','BT',0,'GH'],['BT6','BT',0,'GH'],
  ['BS1','BUS',0,'GH'],['BS2','BUS',0,'GH'],['BS3','BUS',0,'GH'],['GP1','GPU',0,'GH'],['GP2','GPU',0,'GH'],['GP3','GPU',0,'GH'],['GP4','GPU',0,'GH'],
  ['FB1','FUEL',0,'Fuel supplier'],['FB2','FUEL',0,'Fuel supplier'],['FB3','FUEL',0,'Fuel supplier'],['FB4','FUEL',0,'Fuel supplier'],['CT1','CAT',0,'Caterer'],['CT2','CAT',0,'Caterer'],['CT3','CAT',0,'Caterer'],
  ['FT1','FT',0,'Airport'],['FT2','FT',0,'Airport'],['AM1','AMB',0,'Airport'],['FM1','FM',0,'Airport']];
const VNAME = {TUG:'Pushback tug',BT:'Baggage tractor',BUS:'Apron bus',GPU:'Mobile GPU',FUEL:'Fuel bowser',CAT:'Catering truck',FT:'ARFF fire tender',AMB:'Ambulance',FM:'Follow-me car'};
const VHOME = {FUEL:'FUEL',FT:'ARFF',AMB:'ARFF'};
const DEFECTS = {
  HYD:{ata:'ATA 29',name:'Hydraulic system B leak',sev:'NO-GO',cause:'Aircraft system',steps:[['Troubleshooting',25],['Parts issue',20],['Seal replacement',45],['Leak check & inspection',20]],insp:2,lab:6,parts:[['P-2901','Hydraulic pump seal kit',1],['P-2902','Hydraulic fluid (L)',20]],ext:0,tow:0},
  BLD:{ata:'ATA 36',name:'Bleed air valve fault',sev:'MEL',cause:'Aircraft system',mel:'MEL 36-11-01 Cat C — one pack inoperative, FL restriction',steps:[['Troubleshooting',20],['MEL deferral procedure',15],['Placard & inspection',10]],insp:1,lab:2,parts:[],ext:0,tow:0},
  TYR:{ata:'ATA 32',name:'Main-wheel tyre damage',sev:'NO-GO',cause:'FOD on airport pavement',steps:[['Inspection',15],['Parts issue',15],['Wheel change',40],['Inspection',10]],insp:1,lab:4,parts:[['P-3201','MLG wheel & tyre assembly',1]],ext:0,tow:0},
  BRD:{ata:'ATA 05',name:'Bird strike — structural inspection',sev:'NO-GO',cause:'Wildlife strike',steps:[['Borescope & structural inspection',60],['Inspection sign-off',15]],insp:4,lab:2,parts:[],ext:1800,tow:0},
  ENG:{ata:'ATA 72/26',name:'Engine bird ingestion + engine fire — engine change',sev:'NO-GO',cause:'Wildlife strike',steps:[['Fire-damage & borescope inspection',90],['OEM disposition: engine change required',45],['Parts issue',20],['Spare-engine change',480],['Engine ground run & leak check',40]],insp:6,lab:40,parts:[['P-2601','Engine fire-extinguisher bottle',1]],ext:28000,tow:1},
  GSE:{ata:'ATA 53',name:'GSE contact damage — fuselage dent',sev:'NO-GO',cause:'GSE impact',steps:[['Damage assessment',30],['Tow to MRO hangar',15],['Structural repair (OEM support)',120],['Inspection',20]],insp:3,lab:10,parts:[['P-5301','Doubler repair kit',1]],ext:9500,tow:1},
};
const PARTS0 = [['P-2901','Hydraulic pump seal kit','ATA 29',3,1450],['P-2902','Hydraulic fluid (L)','ATA 29',200,28],['P-3201','MLG wheel & tyre assembly','ATA 32',2,6800],
  ['P-5301','Doubler repair kit','ATA 53',1,3900],['P-3601','Bleed valve (exchange)','ATA 36',1,12500],['P-BH01','Sorter drive motor','BHS',1,7800],['P-BH02','Conveyor belt section','BHS',4,1900],['P-GS01','Tug hydraulic hose set','GSE',6,320],['P-2601','Engine fire-extinguisher bottle','ATA 26',2,5200]];
const CAUSE_ALLOC = { // who bears / potential reimbursement — configurable assumptions, never automatic airport liability
  'Aircraft system':{bearer:'Airline',reimb:'Aircraft owner / MRO',pct:60,note:'Operator bears; parts may be covered by MRO / power-by-the-hour contract'},
  'FOD on airport pavement':{bearer:'Airline',reimb:'Insurer',pct:0,note:'Liability pending investigation — airport only liable if FOD control failure is established',contingent:'Airport'},
  'Wildlife strike':{bearer:'Airline',reimb:'Insurer',pct:50,note:'Generally operator/hull insurer; airport wildlife programme under review'},
  'GSE impact':{bearer:'Airline',reimb:'Ground handler',pct:100,note:'Initially borne by operator; recoverable from handler / handler insurer'},
  'Airport equipment fault':{bearer:'Airport',reimb:'Equipment supplier (warranty)',pct:30,note:'Airport-owned equipment (boarding bridge, 400 Hz, stand guidance) caused the damage — airport bears the repair; airline consequential losses remain the airline\'s unless claimed'},
};

function makeState(seed, live) {
  const R0 = buildSchedule(seed), S = {seed, live: !!live, t: 0, R: R0, V: [], B: [], tasks: [], ev: [], al: [], ho: [], au: [], rnd: rng(seed), n: 0,
    wx: {vis: 10, wind: 8, c: 'CAVOK', light: 0, sand: 0, temp: tempAt(0)}, rw: {1: {open: 1, nextArr: 0, nextDep: 0}, 2: {open: 1, nextArr: 0, nextDep: 0}},
    bhs: {fault: 0, manual: 0, faultT: null}, tugDown: 0, hof: 0, spike: null, mad: 0, plan: [], stOcc: {}, stRes: {}, stClosed: {}, pm: PM_TODAY.map(p => ({...p, st: 'PLANNED', log: []})),
    defects: [], parts: PARTS0.map(p => ({id: p[0], name: p[1], ata: p[2], qty: p[3], usd: p[4], used: 0})), claims: [], inc: [], tk: [], div: [], risks: [],
    L: [], lkeys: {}, lid: 0, cc: {}, ccT: {}, opp: [], occ: {}, bagAct: {}, gpuOn: 0, evKw: 0, bhsRunMin: 0, meas: {}, snap: [], cfg: deep(CFG_DEFAULT),
    fev: [], cam: {}, camLinks: [], camAu: [], en: {kwh: {}, kwhT: {}, kwhB: {}, kwhBT: {}, x: {}, cost: {}, now: {}, series: [], hourly: {}, peakKw: 0, peakT: 0, waterM3: 0, wasteKg: 0, dieselAirportL: 0, dieselOtherL: 0, kwTot: 0, kw15: 0, nowT: {}, exp: {}, expT: {}, serT: {}, serC: {}, log: [], pv: null, alk: {}}, sw: {}};
  const R = rng(seed * 13 + 1);
  for (const [id, type, ev, owner] of VFLEET) {const home = PLACES[VHOME[type] || 'DEPOT'], j = S.V.length % 5;
    S.V.push({id, type, ev, owner, home: VHOME[type] || 'DEPOT', x: home.pt[0] - 30 + j * 15, y: home.pt[1] + (j % 2) * 8, st: 'IDLE', task: null, mv: null, km: 0, kwh: 0, L: 0, workMin: 0, debt: 0, down: 0})}
  for (const r of S.R) {
    Object.assign(r, {ph: r.arr ? 'SCHEDULED' : 'ON STAND', phT: 0, mv: null, eta: r.arr ? r.arr.sta - 7 : null, onBlk: r.arr ? null : -180, offBlk: null, rw: 1, dly: {}, mx: null, hold: null, gpuMin: 0, notes: [], alerted: {}, loadRate: AC_TYPES[r.type].code == 'E' ? 18 : 12});
    if (!r.arr) {S.stOcc[r.stand] = r.id; r.tobt = r.dep.std; r.allowedOff = r.tobt; makeTasks(S, r)}
    // departing bags (individual items, each with a pseudonymous passenger reference)
    if (r.dep && r.op != 'private' && r.dep.std < DAY_END + 60) {const nb = Math.round(r.paxOut * .75);
      for (let i = 0; i < nb; i++) {const ci = r.dep.std - 45 - Math.floor(Math.pow(R(), .8) * 120), id = 'BG' + r.dep.fl.replace(/\W/g, '') + pad(i + 1).padStart(3, '0');
        const b = {id, r: r.id, fl: r.dep.fl, px: 'PX-' + (hash(id + seed) % 900000 + 100000), st: 'PLANNED', t0: ci, ci, sc: [], h: hash(id)};
        if (ci < -20) {b.st = 'LOADED'; b.sc.push([ci, 'CHECK-IN'], [ci + 5, 'SCREENED'], [ci + 9, 'SORTED'], [ci + 40, 'LOADED'])}
        S.B.push(b)}}
    if (r.arr && r.op != 'private') {const nb = Math.round(r.paxIn * .75);
      for (let i = 0; i < nb; i++) {const id = 'BG' + r.arr.fl.replace(/\W/g, '') + 'A' + pad(i + 1).padStart(3, '0'), b = {id, r: r.id, fl: r.arr.fl, px: 'PX-' + (hash(id + seed) % 900000 + 100000), st: 'ON AIRCRAFT', t0: 0, sc: [[r.arr.sta - 200, 'LOADED AT ' + r.arr.apt]], h: hash(id), arr: 1};
        if (R() < .08) {const cx = S.R.filter(x => x.dep && x.op == 'sched' && x.dep.std > r.arr.sta + 70 && x.dep.std < r.arr.sta + 300); if (cx.length) {const c = cx[Math.floor(R() * cx.length)]; b.tr = c.id; b.trFl = c.dep.fl}}
        S.B.push(b)}}
  }
  S.Bact = S.B.map((b, i) => i); S.rb = {}; S.B.forEach((b, i) => (S.rb[b.r] = S.rb[b.r] || []).push(i));
  S.rot = Object.fromEntries(S.R.map(r => [r.id, r]));
  cctvInit(S);
  return S;
}
const ev = (S, type, f, msg) => {S.ev.unshift({t: S.t, type, f, msg}); if (S.ev.length > 600) S.ev.pop()};
function alrt(S, sev, sys, msg, rec, owner, ref) {S.al.unshift({id: 'AL-' + (++S.n), t: S.t, sev, sys, msg, rec, owner, ref: ref || null, res: 0}); if (S.al.length > 300) S.al.pop()}
const mv = (pts, t0, dur, rev) => ({pts, t0, dur: Math.max(.5, dur), rev: !!rev});
const mvDone = (S, m) => !m || S.t >= m.t0 + m.dur;
function setPh(S, r, ph, msg) {r.ph = ph; r.phT = S.t; ev(S, 'Flight' + ph.replace(/\W/g, ''), fid(r), msg || ph)}
const fid = r => r.dep && (r.onBlk != null || !r.arr) ? r.dep.fl : r.arr ? r.arr.fl : r.dep.fl;
function handoff(S, r, a, b) {S.ho.push({id: 'HO-' + (S.ho.length + 1), f: fid(r), from: a, to: b, t: S.t, ack: null}); ev(S, 'ATCHandoffRequested', fid(r), a + ' → ' + b)}
const arrSpacing = S => S.wx.vis < 1.5 ? 6 : S.wx.light ? 5 : S.wx.wind > 30 ? 4 : S.wx.sand ? 5 : 3;
const depSpacing = S => S.wx.vis < 1.5 ? 4 : S.wx.wind > 30 ? 3 : S.wx.sand ? 3 : 2;
function arrRunway(S) {return S.rw[1].open ? 1 : S.rw[2].open ? 2 : 0}
function depRunway(S) {return S.rw[2].open ? 2 : S.rw[1].open ? 1 : 0}
const mixed = S => !(S.rw[1].open && S.rw[2].open);
function useRunway(S, id, kind) {const w = S.rw[id]; if (kind == 'arr') {w.nextArr = S.t + arrSpacing(S); if (mixed(S)) w.nextDep = Math.max(w.nextDep, S.t + 2)} else {w.nextDep = S.t + depSpacing(S); if (mixed(S)) w.nextArr = Math.max(w.nextArr, S.t + 2)}}
function addDelay(r, key, label, party) {const d = r.dly[key] || (r.dly[key] = {min: 0, label, party}); d.min++; d.label = label}

// ---------- stands ----------
function standFreeFor(S, sid, r) {const o = S.stOcc[sid], res = S.stRes[sid]; return (!o || o == r.id) && (!res || res == r.id) && !(S.stClosed[sid] && r.onBlk == null)}
function allocStand(S, r) {
  if (standFreeFor(S, r.stand, r)) return STAND[r.stand];
  const code = AC_TYPES[r.type].code, cur = STAND[r.stand], blocker = S.rot[S.stOcc[r.stand]];
  const cand = STANDS.filter(s => RANK[s.max] >= RANK[code] && standFreeFor(S, s.id, r) && (r.op == 'private' ? s.kind == 'ga' : ['contact', 'remote', 'stc'].includes(s.kind)) &&
    !S.R.some(x => x !== r && x.stand == s.id && x.onBlk == null && x.arr && x.eta < S.t + 40 && x.ph != 'DIVERTED'));
  cand.sort((a, b) => ((a.term == cur.term ? 0 : a.kind == 'contact' ? 1 : 2) - (b.term == cur.term ? 0 : b.kind == 'contact' ? 1 : 2)));
  const s = cand[0];
  if (!r.alerted.standConf) {r.alerted.standConf = 1;
    const by = blocker ? `${fid(blocker)} (${dominantParty(blocker).label})` : 'reservation';
    alrt(S, 'wn', 'Stands', `Stand ${r.stand} still occupied by ${by} — ${fid(r)} ${s ? 'reassigned to ' + s.id : 'awaiting stand'}`, s ? 'Reassignment applied; check bus / bridge resources' : 'Hold on taxiway; expedite departure from stand', 'Apron control', {k: 'rot', id: r.id})}
  if (!s) return null;
  ev(S, 'StandReassigned', fid(r), r.stand + ' → ' + s.id);
  if (cur.kind == 'contact' && s.kind != 'contact') S.opp.push({t: S.t, rot: r.id, from: cur.id, to: s.id, blocker: blocker && blocker.id, usd: ((r.tobt || r.eta + 60) - S.t) / 60 * S.cfg.pbbUsdHr + 2 * S.cfg.busOpsUsdTrip,
    note: 'Lost boarding-bridge revenue + extra bus trips (opportunity cost, not booked as P&L)'});
  r.standBlockedBy = blocker && blocker.id; r.stand = s.id;
  return s;
}

// ---------- turnaround tasks / ground handling ----------
function makeTasks(S, r) {
  const T = AC_TYPES[r.type], st = STAND[r.stand], E = T.code == 'E', on = r.arr ? Math.max(r.onBlk, S.t) : -60, tb = r.tobt, add = (kind, veh, start, dur, o = {}) => {const k = {id: 'TK' + (S.tasks.length + 1), r: r.id, kind, veh, start, dur, st: 'PLANNED', v: null, ...o}; S.tasks.push(k); return k};
  const turn = r.arr && r.onBlk != null && r.onBlk >= -5;
  if (turn && r.op != 'private') add('Unload bags', 'BT', on + 2, E ? 20 : 12, {cont: 'unload'});
  if (turn && st.kind != 'contact' && r.op != 'private') add('Arrival bus', 'BUS', on, 8);
  if (st.kind != 'contact' && r.dep) add('Mobile GPU', 'GPU', on + 1, 0, {cont: 'gpu'});
  if (!r.dep) return;
  if (r.op != 'private') add('Cleaning', null, Math.max(on + 5, tb - 55), E ? 25 : 15);
  if (r.op != 'private') add('Catering', 'CAT', Math.max(on + 8, tb - 50), E ? 25 : 15, {need: 1});
  add('Fueling', 'FUEL', Math.max(on + 8, tb - 45), E ? 30 : T.code == 'B' ? 10 : 18, {need: 1});
  if (r.op != 'private') add('Load bags', 'BT', tb - 35, 15, {cont: 'load', need: 1});
  if (st.kind != 'contact' && r.op != 'private') add('Departure bus', 'BUS', tb - 30, 10, {need: 1});
  add('Pushback', 'TUG', tb - 12, 0, {cont: 'push', need: 1});
}
function retimeTasks(S, r) {for (const k of S.tasks) if (k.r == r.id && k.st == 'PLANNED') {
  if (k.kind == 'Load bags') k.start = r.tobt - 35; if (k.kind == 'Departure bus') k.start = r.tobt - 30; if (k.kind == 'Pushback') k.start = r.tobt - 12}}
function vehAvail(S, type) {return S.V.filter(v => v.type == type && !v.down && (v.st == 'IDLE' || v.st == 'RETURNING') && !(type == 'TUG' && S.tugDown))}
function vPos(v) {return [v.x, v.y]}
function homeOf(v) {const h = PLACES[v.home], i = +v.id.replace(/\D/g, '') || 0; return {pt: [h.pt[0] - 30 + (i % 5) * 14 + (v.type.length * 3), h.pt[1] + (i % 2) * 9 - 4], acc: h.acc}}
function sendVeh(S, v, dest, st) {const from = {pt: vPos(v), acc: nearestAcc(vPos(v))}, p = vRoute(from, dest), spd = VEH_SPD * (S.wx.vis < 1.5 ? .6 : 1);
  v.mv = mv(p, S.t, plen(p) / spd); v.st = st}
function nearestAcc(p) { // snap a point to the closest road
  let best = null, bd = 1e9; for (const [a, b] of ROADS) {const q = a[0] == b[0] ? [a[0], clamp(p[1], Math.min(a[1], b[1]), Math.max(a[1], b[1]))] : [clamp(p[0], Math.min(a[0], b[0]), Math.max(a[0], b[0])), a[1]];
    const d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d < bd) {bd = d; best = q}} return best}
function taskDest(S, k) {if (k.dest) return PLACES[k.dest]; const r = S.rot[k.r]; return servicePoint(STAND[r.stand])}
function stepTasks(S) {
  const susp = S.wx.light;
  for (const k of S.tasks) {
    if (k.st == 'DONE') continue;
    const r = S.rot[k.r];
    if (k.st == 'PLANNED' && S.t >= k.start && (r.onBlk != null && r.onBlk <= S.t || k.pre) && !(k.cont == 'push' && (r.mx || r.hold && S.t < r.hold.until - 10 || S.wx.light))) k.st = 'WAITING';
    if (k.st == 'WAITING') {
      if (susp && !k.emerg) continue;
      if (!k.veh) {k.st = 'WORKING'; k.ws = S.t; continue}
      const av = vehAvail(S, k.veh); if (!av.length) {k.waitMin = (k.waitMin || 0) + 1; if (k.waitMin == 6 && S.live) alrt(S, 'wn', 'Ground handling', `${k.kind} for ${fid(r)} waiting for ${VNAME[k.veh]} (${k.waitMin} min)`, 'Re-prioritise fleet / call spare unit', 'Ramp dispatcher', {k: 'rot', id: r.id}); continue}
      const d = taskDest(S, k); av.sort((a, b) => Math.hypot(a.x - d.pt[0], a.y - d.pt[1]) - Math.hypot(b.x - d.pt[0], b.y - d.pt[1]));
      const v = av[0]; v.task = k.id; k.v = v.id; sendVeh(S, v, d, 'TO TASK'); k.st = 'ENROUTE'; ev(S, 'GroundVehicleDispatched', v.id, `${k.kind} → ${fid(r)} @ ${r.stand}`);
    }
    if (k.st == 'ENROUTE') {const v = S.V.find(x => x.id == k.v); if (mvDone(S, v.mv) && !susp) {k.st = 'WORKING'; k.ws = S.t; v.st = 'WORKING'}}
    if (k.st == 'WORKING') {
      if (susp && !k.emerg) {k.ws++; continue}
      let done = false;
      if (k.cont == 'load') done = S.t >= k.ws + k.dur && bagsReady(S, r);
      else if (k.cont == 'unload') done = S.t >= k.ws + k.dur && !rbags(S, r.id).some(b => b.r == r.id && b.st == 'ON AIRCRAFT' && b.arr);
      else if (k.cont == 'gpu') done = r.ph == 'PUSHBACK' || r.offBlk != null || (!r.dep && S.t > k.ws + 60);
      else if (k.cont == 'push') done = r.ph == 'TAXI-OUT' || r.offBlk != null && r.ph != 'PUSHBACK';
      else if (k.cont == 'standby') done = r.onBlk != null || r.ph == 'DIVERTED';
      else done = S.t >= k.ws + k.dur;
      if (k.kind == 'Fueling' && done) post(S, {key: r.id + ':fuel', kind: 'rev', cat: 'Aircraft servicing & fuel', desc: 'Fuel throughput fee ' + rotLabel(r), rot: r.id, payer: 'Fuel supplier', payee: 'Airport', usd: AC_TYPES[r.type].fuel * S.cfg.fuelUsdPerL, status: 'accrued', formula: `${AC_TYPES[r.type].fuel} L uplift × $${S.cfg.fuelUsdPerL}/L`});
      if (done) {k.st = 'DONE'; k.te = S.t; const v = S.V.find(x => x.id == k.v); if (v) {v.task = null; v.st = 'RETURNING'; sendVeh(S, v, homeOf(v), 'RETURNING')}}
    }
  }
}
function stepVehicles(S) {
  const c = S.cfg.gse;
  for (const v of S.V) {
    if (v.down) {v.st = 'DOWN'; continue}
    if (S.tugDown && v.type == 'TUG' && !v.task) {v.st = 'UNAVAILABLE'}
    else if (v.st == 'UNAVAILABLE') v.st = 'IDLE';
    if (S.wx.light && v.st != 'WORKING' && !(v.type == 'FT' || v.type == 'AMB')) {if (v.mv) v.mv.t0++; v.sus = 1; continue} v.sus = 0;
    const moving = v.mv && !mvDone(S, v.mv);
    if (v.mv) {const q = (S.t - v.mv.t0) / v.mv.dur, p = pAt(v.mv.pts, q); const d = Math.hypot(p[0] - v.x, p[1] - v.y); v.x = p[0]; v.y = p[1]; v.hd = p[2];
      const km = d * 2.6 / 1000; v.km += km; if (v.ev) {v.kwh += km * c.evKwhKm; v.debt += km * c.evKwhKm} else {const l = km * c.dieselLkm; v.L += l; fuelAcc(S, v, l)}}
    if (v.st == 'WORKING') {v.workMin++; if (v.ev) {const e = (c.evKwhHr[v.type] || 4) / 60; v.kwh += e; v.debt += e} else {const l = (c.dieselLhr[v.type] || 3) / 60; v.L += l; fuelAcc(S, v, l)}
      if (v.owner == 'GH' || v.owner == 'Airport') addCC(S, 'Equipment maintenance (GSE)', S.cfg.maint.gseUsdOpHr / 60, 1, 'Airside')}
    if (v.st == 'RETURNING' && mvDone(S, v.mv)) {v.st = 'IDLE'; v.mv = null}
    if (v.st == 'IDLE' && v.ev && v.debt > 0) {const e = Math.min(v.debt, S.cfg.evChargerKw / 60); v.debt -= e; S.evKw += e * 60; v.chg = 1} else v.chg = 0;
    if (!moving && v.st == 'TO TASK' && v.mv && mvDone(S, v.mv)) {}
  }
}
function fuelAcc(S, v, l) {const airportOwned = v.owner == 'Airport' || (v.owner == 'GH' && S.cfg.handler == 'airport'); if (airportOwned) S.en.dieselAirportL += l; else S.en.dieselOtherL += l}

// ---------- baggage ----------
const rbags = (S, rid) => (S.rb[rid] || []).map(i => S.B[i]);
const BAG_PRE = new Set(['PLANNED', 'CHECK-IN', 'ID SCAN', 'SCREEN Q', 'SCREENING L1', 'SCREENING L2', 'L3 INSPECTION', 'SORT Q', 'SORTING', 'MAKE-UP', 'LOADING', 'TRANSFER']);
function bagsReady(S, r) {
  if (S.t < r.tobt - 40 && r.dep.std - 45 > S.t) return false;
  for (const b of rbags(S, r.id)) if (b.r == r.id && !b.arr && (b.st == 'PLANNED' ? b.ci <= S.t : BAG_PRE.has(b.st) && b.st != 'TRANSFER')) return false;
  return true;
}
function bstage(S, b, st) {b.st = st; b.t0 = S.t; b.sc.push([S.t, st])}
function stepBags(S) {
  let eds = 45, sort = S.bhs.fault ? (S.bhs.manual ? 6 : 0) : 60; const load = {}, unload = {}, act = {ci: 0, eds: 0, sort: 0, mk: 0, rc: 0};
  const working = {}; for (const k of S.tasks) if (k.st == 'WORKING' && (k.cont == 'load' || k.cont == 'unload')) working[k.r + k.cont] = 1;
  const keep = [];
  for (const i of S.Bact) {const b = S.B[i], r = S.rot[b.r], age = S.t - b.t0; let alive = true;
    switch (b.st) {
      case 'PLANNED': if (S.t >= b.ci) {bstage(S, b, 'CHECK-IN'); act.ci++} break;
      case 'CHECK-IN': act.ci++; if (age >= 1) bstage(S, b, 'ID SCAN'); break;
      case 'ID SCAN': act.ci++; if (age >= 1) bstage(S, b, 'SCREEN Q'); break;
      case 'SCREEN Q': if (eds > 0) {eds--; bstage(S, b, 'SCREENING L1')} act.eds++; break;
      case 'SCREENING L1': act.eds++; if (age >= 1) bstage(S, b, b.h % 100 < 4 ? 'SCREENING L2' : 'SORT Q'); break;
      case 'SCREENING L2': act.eds++; if (age >= 3) bstage(S, b, b.h % 1000 < 7 ? 'L3 INSPECTION' : 'SORT Q'); break;
      case 'L3 INSPECTION': if (age >= 12) {if (b.h % 5 == 0) {bstage(S, b, 'SECURITY HOLD'); ev(S, 'BagSecurityHold', b.id, 'Offloaded after L3 review by authorised staff')} else bstage(S, b, 'SORT Q')} break;
      case 'SORT Q': if (sort > 0) {sort--; bstage(S, b, 'SORTING')} act.sort++; break;
      case 'SORTING': act.sort++; if (age >= 2) {if (r.offBlk != null) missBag(S, b, r); else bstage(S, b, 'MAKE-UP')} break;
      case 'MAKE-UP': act.mk++; if (r.offBlk != null) {missBag(S, b, r); break}
        if (working[r.id + 'load']) {load[r.id] = (load[r.id] || 0) + 1; if (load[r.id] <= r.loadRate) bstage(S, b, 'LOADING')} break;
      case 'LOADING': if (age >= 1) bstage(S, b, 'LOADED'); break;
      case 'LOADED': if (r.ph == 'DEPARTED' || r.ph == 'COMPLETED' || r.ph == 'TAKEOFF') {bstage(S, b, 'IN FLIGHT'); alive = false} break;
      case 'ON AIRCRAFT': if (r.ph == 'DIVERTED') {alive = false; break}
        if (r.divHold && r.onBlk != null) {if (working[r.id + 'unload']) {bstage(S, b, 'HELD — DIVERSION STORAGE'); alive = false}}
        else if (working[r.id + 'unload']) {unload[r.id] = (unload[r.id] || 0) + 1; if (unload[r.id] <= 15) bstage(S, b, 'UNLOADING')} break;
      case 'UNLOADING': if (age >= 1) bstage(S, b, b.tr ? 'TRANSFER' : 'TO RECLAIM'); break;
      case 'TRANSFER': if (age >= 8) {const c = S.rot[b.tr]; b.fromR = b.r; b.r = b.tr; (S.rb[b.tr] = S.rb[b.tr] || []).push(i); b.fl = b.trFl; b.arr = 0; if (c.offBlk != null) missBag(S, b, c); else bstage(S, b, 'SCREEN Q')} break;
      case 'TO RECLAIM': act.rc++; if (age >= 5) {b.car = 'Belt ' + ({T1: 1, T2: 3, T3: 5, STC: 8, Remote: 4}[STAND[r.stand].term] + (b.h % 2)); bstage(S, b, 'ON RECLAIM')} break;
      case 'ON RECLAIM': act.rc++; if (age >= 4 + b.h % 22) {bstage(S, b, 'COLLECTED'); alive = false} break;
      default: alive = false;
    }
    if (alive) keep.push(i);
  }
  S.Bact = keep; S.bagAct = act;
}
function missBag(S, b, r) {
  bstage(S, b, 'MISSED FLIGHT');
  const cause = b.fromR ? 'Missed transfer connection' : S.bhs.fault || S.bhs.faultT != null && S.t - S.bhs.faultT < 240 ? 'Baggage system failure' : 'Late bag (left behind)';
  const c = {id: 'PIR-' + pad(S.claims.length + 1).padStart(4, '0'), t: S.t, bag: b.id, px: b.px, fl: r.dep.fl, cause, st: 'OPEN', usd: S.cfg.mishandledBagUsd,
    bearer: 'Airline', recover: cause == 'Baggage system failure' ? S.cfg.bhsRecoveryPct : 0};
  S.claims.push(c);
  post(S, {key: c.id, kind: 'cost', cat: 'Mishandled baggage', desc: `Mishandled bag ${b.id} (${cause})`, rot: r.id, bearer: 'Airline', usd: c.usd, status: 'estimate', formula: `$${S.cfg.mishandledBagUsd} delivery & interim expense per bag`});
  if (c.recover) post(S, {key: c.id + ':rec', kind: 'cost', cat: 'Disruption-related expenses', desc: `BHS-failure recovery claim on ${c.id}`, rot: r.id, bearer: 'Airport', usd: c.usd * c.recover / 100, status: 'estimate', variable: 1, term: 'BHS',
    formula: `$${c.usd} × ${c.recover}% contractual BHS recovery (assumption)`});
}

// ---------- flights ----------
function blockReason(S, r) {
  const t = S.t;
  if (r.hold && t < r.hold.until) return ['hold', r.hold.reason, r.hold.party];
  if (r.mx) {const d = S.defects.find(x => x.id == r.mx); return ['mx', `Technical defect ${d.ata} — ${d.status}`, 'Airline']}
  if (S.wx.light) return ['wx', 'Lightning: ramp operations suspended', 'Weather'];
  const pend = S.tasks.filter(k => k.r == r.id && k.need && k.st != 'DONE' && k.cont != 'push' && k.cont != 'load');
  if (pend.length) return ['gh', 'Turnaround incomplete: ' + pend.map(k => k.kind).join(', '), 'Ground handler'];
  if (!bagsReady(S, r)) {
    const stuck = S.B.some(b => b.r == r.id && (b.st == 'SORT Q') && S.bhs.fault);
    r.bagWait = (r.bagWait || 0) + 1;
    if (r.bagWait > S.cfg.bagWaitMax) releaseWithoutBags(S, r);
    else return stuck ? ['bhs', 'Baggage system failure — bags not in make-up', 'Airport'] : ['bag', 'Baggage loading in progress', 'Ground handler'];
  }
  const dr = depRunway(S);
  if (!dr) return ['rwy', 'Departure runway closed', 'Airport'];
  const tug = S.tasks.find(k => k.r == r.id && k.cont == 'push');
  if (!tug || tug.st != 'WORKING') return ['tug', S.tugDown ? 'No pushback tug available' : 'Waiting for pushback tug', 'Ground handler'];
  if (S.rw[dr].nextDep > t + 8) return ['atc', 'Start-up delayed: runway capacity', S.wx.vis < 1.5 || S.wx.wind > 30 || S.wx.sand ? 'Weather' : 'ANSP'];
  return null;
}
function releaseWithoutBags(S, r) {
  let n = 0; for (const b of rbags(S, r.id)) if (b.r == r.id && BAG_PRE.has(b.st) && b.st != 'PLANNED' && !b.arr) {missBag(S, b, r); n++}
  if (n) {alrt(S, 'cr', 'Baggage', `${fid(r)} released after ${S.cfg.bagWaitMax} min bag wait — ${n} bags left behind (rush-tag)`, 'Forward on next service; passenger notification', 'Baggage ops officer', {k: 'rot', id: r.id}); ev(S, 'FlightReleasedWithoutBags', fid(r), n + ' bags')}
}
function stepRot(S, r) {
  const T = AC_TYPES[r.type], code = T.code, t = S.t;
  switch (r.ph) {
    case 'SCHEDULED': if (t >= r.eta - 45) {setPh(S, r, 'EN ROUTE'); handoff(S, r, 'FIR (adjacent)', 'ACC')} break;
    case 'EN ROUTE': if (t >= r.eta - 15) {setPh(S, r, 'APPROACH'); handoff(S, r, 'ACC', 'APP')} break;
    case 'APPROACH': case 'HOLDING': {
      if (r.ph == 'HOLDING') {r.eta = Math.max(r.eta, t + 3); r.holdMin = (r.holdMin || 0) + 1;
        if (r.holdMin > 45 && r.op != 'diversion') {divertAway(S, r); break}}
      if (t < r.eta - 3) break;
      const rw = arrRunway(S), prio = r.op == 'diversion' && r.emerg;
      if (!rw || (t < S.rw[rw].nextArr && !prio) || r.missHold > t) {
        if (r.ph != 'HOLDING') {setPh(S, r, 'HOLDING', !rw ? 'Runway closed — holding' : 'Sequencing — holding'); if (!rw && !r.alerted.hold) {r.alerted.hold = 1; alrt(S, 'wn', 'ATC', fid(r) + ' holding: no arrival runway', 'Reopen runway or consider diversion (authorised decision)', 'APP controller (training)', {k: 'rot', id: r.id})}}
        break}
      r.rw = rw; useRunway(S, rw, 'arr'); r.mv = mv(pathApproach(rw), t, 3); setPh(S, r, 'FINAL', 'Final approach RWY ' + rw); break}
    case 'FINAL': if (!mvDone(S, r.mv)) break;
      if (S.wx.vis < 1.5 && !r.mad && S.rnd() < .35) {r.mad = 1; S.mad++; r.missHold = t + 8; r.eta = t + 11; setPh(S, r, 'HOLDING', 'Missed approach, low visibility; re-sequenced +11 min');
        alrt(S, 'wn', 'ATC', fid(r) + ' missed approach (simulated)', 'Re-sequence in APP', 'APP controller (training)', {k: 'rot', id: r.id}); break}
      if (!S.rw[r.rw].open) {setPh(S, r, 'HOLDING', 'Go-around: runway closed'); break}
      r.mv = mv(pathLanding(r.rw, code), t, 1); r.ata = t; setPh(S, r, 'LANDING', 'Touchdown RWY ' + r.rw); handoff(S, r, 'APP', 'TWR'); landingCharge(S, r);
      if (r.op == 'diversion') divLanded(S, r); break;
    case 'LANDING': if (!mvDone(S, r.mv)) break;
    // fallthrough
    case 'AWAITING STAND': {const s = allocStand(S, r);
      if (!s) {if (r.ph != 'AWAITING STAND') setPh(S, r, 'AWAITING STAND'); const b = S.rot[S.stOcc[r.stand]]; r.arrDly = (r.arrDly || 0) + 1;
        addDelay(r, 'stand', 'Arrival held: stand occupied' + (b ? ' by ' + fid(b) : ''), b ? dominantParty(b).party : 'Airport'); break}
      const p = pathTaxiIn(s, r.rw, code); r.mv = mv(p, t, plen(p) / (TAXI_SPD * (S.wx.vis < 1.5 ? .65 : 1))); S.stRes[s.id] == r.id && delete S.stRes[s.id]; S.stOcc[s.id] = r.id; setPh(S, r, 'TAXI-IN', 'Taxi to ' + s.id); break}
    case 'TAXI-IN': if (!mvDone(S, r.mv)) break;
      r.onBlk = t; r.mv = null; setPh(S, r, 'ON STAND', 'On-block ' + r.stand);
      if (r.dep) {r.tobt = Math.max(r.dep.std, t + T.mtt); r.allowedOff = r.tobt; r.dep.etd = r.tobt}
      makeTasks(S, r); if (r.op == 'diversion') divOnBlock(S, r);
      for (const b of rbags(S, r.id)) if (b.tr && b.r == r.id && b.st == 'ON AIRCRAFT') {const c = S.rot[b.tr]; if (c.dep.std - 20 < t + 45 && !r.alerted['mct' + c.id]) {r.alerted['mct' + c.id] = 1; alrt(S, 'wn', 'Baggage', `Missed-connection risk: ${fid(r)} → ${c.dep.fl} (transfer bags)`, 'Priority transfer handling', 'Transfer desk', {k: 'rot', id: c.id})}}
      break;
    case 'ON STAND': if (r.dep && t >= r.tobt - 35) setPh(S, r, 'BOARDING'); break;
    case 'BOARDING': {
      if (t < r.tobt) break;
      const why = blockReason(S, r);
      if (why) {addDelay(r, why[0], why[1], why[2]); r.block = why[1]; if (!r.alerted[why[0]] && (r.dly[why[0]].min >= 5)) {r.alerted[why[0]] = 1;
        alrt(S, why[2] == 'Weather' ? 'wn' : 'wn', why[0] == 'mx' ? 'Maintenance' : why[0] == 'bhs' || why[0] == 'bag' ? 'Baggage' : why[0] == 'atc' || why[0] == 'rwy' ? 'ATC' : 'Ground handling', `${fid(r)} departure held: ${why[1]}`, 'Stand occupancy extending; check next allocation', 'Duty manager', {k: 'rot', id: r.id})}
        predictConflict(S, r); break}
      r.block = null; r.offBlk = t; r.mv = mv(pathPush(STAND[r.stand]), t, 3, 1); delete S.stOcc[r.stand]; setPh(S, r, 'PUSHBACK', 'Off-block ' + r.stand + (t > r.dep.std ? ' (+' + (t - r.dep.std) + ' min)' : '')); chargesOffBlock(S, r); break}
    case 'PUSHBACK': if (!mvDone(S, r.mv)) break; {const rw = depRunway(S) || 2, p = pathTaxiOut(STAND[r.stand], rw); r.rw = rw; r.mv = mv(p, t, plen(p) / (TAXI_SPD * (S.wx.vis < 1.5 ? .65 : 1))); setPh(S, r, 'TAXI-OUT', 'Taxi to RWY ' + rw)} break;
    case 'TAXI-OUT': if (!mvDone(S, r.mv)) break; {const rw = depRunway(S);
      if (!rw || t < S.rw[rw].nextDep) {r.rwyWait = (r.rwyWait || 0) + 1; r.block = rw ? 'Holding point: runway sequence' : 'Runway closed'; break}
      r.block = null; useRunway(S, rw, 'dep'); r.rw = rw; r.mv = mv(pathTakeoff(rw), t, 1.6); setPh(S, r, 'TAKEOFF', 'Takeoff RWY ' + rw); break}
    case 'TAKEOFF': if (!mvDone(S, r.mv)) break; r.atd = t; setPh(S, r, 'DEPARTED', 'Airborne'); handoff(S, r, 'TWR', 'APP'); break;
    case 'DEPARTED': if (t - r.phT >= 8) {setPh(S, r, 'EN ROUTE OUT', 'Climb'); handoff(S, r, 'APP', 'ACC')} break;
    case 'EN ROUTE OUT': if (t - r.phT >= 15) setPh(S, r, 'COMPLETED', 'Left CAI airspace'); break;
  }
}
function predictConflict(S, r) { // another aircraft planned on this stand arriving soon?
  const nx = S.R.find(x => x !== r && x.stand == r.stand && x.onBlk == null && x.arr && x.ph != 'DIVERTED' && x.eta < S.t + 25);
  if (nx && !r.alerted['pc' + nx.id]) {r.alerted['pc' + nx.id] = 1; alrt(S, 'cr', 'Stands', `Stand conflict predicted at ${r.stand}: ${fid(r)} overstaying, ${fid(nx)} due ${loc(nx.eta + 7)}`, 'Pre-assign alternative stand / expedite off-block', 'Apron control', {k: 'stand', id: r.stand})}
}
function divertAway(S, r) {
  setPh(S, r, 'DIVERTED', 'Diverted to alternate after holding'); r.diverted = 1;
  alrt(S, 'cr', 'ATC', `${fid(r)} diverted to alternate after ${r.holdMin} min holding`, 'Outbound rotation cancelled; rebook passengers', 'Airline OCC', {k: 'rot', id: r.id});
  if (r.dep) {r.dep.cancelled = 1; post(S, {key: r.id + ':cxl', kind: 'cost', cat: 'Passenger care & rebooking', desc: 'Cancellation after diversion ' + rotLabel(r), rot: r.id, bearer: 'Airline', usd: r.paxOut * (S.cfg.pax.rebookUsd + S.cfg.pax.hotelUsd * .5), status: 'estimate', formula: `${r.paxOut} pax × (rebook $${S.cfg.pax.rebookUsd} + 50% hotel $${S.cfg.pax.hotelUsd})`})}
}

// ---------- defects & maintenance ----------
function reportDefect(S, rid, type, by) {
  const r = S.rot[rid], D = DEFECTS[type]; if (!r || r.mx) return null;
  const d = {id: 'DEF-' + pad(S.defects.length + 1).padStart(3, '0'), wo: 'WO-' + (24100 + S.defects.length + 1), r: rid, type, ...deep(D), status: 'REPORTED', step: -1, stepT: S.t, t: S.t, by: by || 'sim', log: [[S.t, 'Defect recorded; work order raised']], partsUsd: 0, aog: 0};
  d.estReady = S.t + D.steps.reduce((a, s) => a + s[1], 0) + 10; S.defects.push(d);
  if (D.sev != 'GO') r.mx = d.id;
  ev(S, 'MaintenanceDefectReported', fid(r), `${D.ata} ${D.name} (${D.sev})`);
  alrt(S, 'cr', 'Maintenance', `${fid(r)} ${r.reg}: ${D.name} — ${D.sev == 'NO-GO' ? 'NOT dispatch-ready' : 'MEL deferral required'}`, `${d.wo} raised; est. ready ${loc(d.estReady)}`, 'Maintenance control', {k: 'def', id: d.id});
  if (r.dep && r.tobt && d.estReady > r.tobt) predictConflict(S, r);
  return d;
}
function stepDefects(S) {
  for (const d of S.defects) {
    if (d.status == 'AWAITING RELEASE' && S.autoRelease && S.t - d.stepT >= 10) releaseDefect(S, d.id, 'sim');
    if (['AWAITING RELEASE', 'RELEASED', 'MEL — RELEASED'].includes(d.status)) continue;
    const cur = d.steps[d.step];
    if (d.step < 0 || S.t >= d.stepT + cur[1] + (d.aogUntil && d.aogUntil > S.t ? 1e9 : 0)) {
      d.step++; d.stepT = S.t;
      if (d.step >= d.steps.length) {d.status = 'AWAITING RELEASE'; d.stepT = S.t; d.log.push([S.t, 'Work complete — awaiting authorised release (CRS)']); alrt(S, 'info', 'Maintenance', `${d.wo} work complete — certifying staff release required`, 'Sign CRS in Assets & Maintenance', 'Certifying engineer', {k: 'def', id: d.id}); continue}
      const nm = d.steps[d.step][0]; d.status = nm.toUpperCase(); d.log.push([S.t, nm + ' started']);
      if (/Parts/.test(nm)) for (const [pid, , q] of d.parts) {const p = S.parts.find(x => x.id == pid);
        if (p.qty >= q) {p.qty -= q; p.used += q; d.partsUsd += q * p.usd} else {d.aog = 1; d.aogUntil = S.t + 150; d.partsUsd += q * p.usd * 1.35; d.log.push([S.t, 'AOG: ' + p.name + ' out of stock — expedited order (+150 min, +35% cost)']);
          alrt(S, 'cr', 'Maintenance', `AOG parts order: ${p.name} for ${d.wo}`, 'Expedite from supplier / pool', 'Stores', {k: 'def', id: d.id}); d.estReady += 150}}
      if (/Tow/.test(nm)) {const r = S.rot[d.r]; const m = STANDS.find(s => s.kind == 'mro' && !S.stOcc[s.id]); if (m) {delete S.stOcc[r.stand]; d.fromStand = r.stand; r.stand = m.id; S.stOcc[m.id] = r.id; d.towUsd = 650; d.log.push([S.t, 'Towed to ' + m.id + ' (stand ' + d.fromStand + ' released)']); ev(S, 'AircraftTowed', fid(r), d.fromStand + ' → ' + m.id)}}
    }
  }
}
function releaseDefect(S, id, role) {
  const d = S.defects.find(x => x.id == id); if (!d) return 'Unknown defect';
  if (d.status != 'AWAITING RELEASE') return 'Release refused: maintenance workflow not complete (' + d.status + ')';
  if (!['Maintenance Planner', 'Certifying Engineer', 'sim'].includes(role)) return 'Release refused: requires Certifying Engineer or Maintenance Planner role';
  const r = S.rot[d.r]; d.status = d.sev == 'MEL' ? 'MEL — RELEASED' : 'RELEASED'; d.relT = S.t; d.relBy = role; d.log.push([S.t, 'Certificate of release to service signed by ' + role]);
  if (r.mx == d.id) r.mx = null;
  if (d.tow && STAND[r.stand].kind == 'mro' && r.ph != 'PUSHBACK') {/* aircraft departs from MRO apron */}
  ev(S, 'MaintenanceReleaseRecorded', fid(r), d.wo + ' released');
  bookDefectCosts(S, d); return null;
}
function defectImpact(S, d) {
  const r = S.rot[d.r], T = AC_TYPES[r.type], c = S.cfg, A = CAUSE_ALLOC[d.cause], end = d.relT ?? Math.max(S.t, d.estReady);
  const delay = r.dep ? Math.max(0, (r.offBlk ?? end) - r.dep.std) : 0, down = Math.max(0, end - d.t);
  const rows = [
    ['Inspection labour', d.insp * c.labourUsdHr, 'direct', A.bearer, 'Line maintenance', `${d.insp} h × $${c.labourUsdHr}/h`],
    ['Repair labour', d.lab * c.labourUsdHr, 'direct', A.bearer, 'Line maintenance', `${d.lab} h × $${c.labourUsdHr}/h`],
    ['Replacement parts', d.partsUsd || d.parts.reduce((a, [pid, , q]) => a + q * S.parts.find(p => p.id == pid).usd, 0), 'direct', A.bearer, 'Stores', d.aog ? 'incl. +35% AOG premium' : 'stock price'],
    ['External maintenance support', d.ext, 'direct', A.bearer, 'MRO / OEM', 'quoted'],
    ['Towing / recovery', d.towUsd || 0, 'direct', A.bearer, 'Ground handler', 'tow tractor + crew'],
    ['Aircraft downtime', down * T.dcost * .6, 'consequential', 'Airline', 'Fleet', `${Math.round(down)} min × $${(T.dcost * .6).toFixed(0)}/min ownership & crew`],
    ['Passenger care & rebooking', delay > 180 ? r.paxOut * (c.pax.mealUsd + (delay > 300 ? c.pax.hotelUsd : 0)) : delay > 120 ? r.paxOut * c.pax.mealUsd : 0, 'consequential', 'Airline', 'Customer service', delay > 120 ? `${r.paxOut} pax, delay ${delay} min` : 'below care threshold'],
    ['Baggage disruption', S.B.filter(b => (b.r == r.id || b.fromR == r.id) && b.st == 'MISSED FLIGHT').length * c.mishandledBagUsd, 'consequential', 'Airline', 'Baggage', 'mishandled bags × unit cost'],
    ['Airport stand charges (parking/overstay)', r.dep ? parkingCalc(S, r, r.offBlk ?? end).usd + (overstayCalc(S, r, r.offBlk ?? end).status != 'waived' ? overstayCalc(S, r, r.offBlk ?? end).usd : 0) : 0, 'contractual', 'Airline', 'Airport revenue', 'already in ledger once — shown here for reference, not added twice'],
  ];
  const direct = rows.filter(x => x[2] == 'direct').reduce((a, x) => a + x[1], 0), cons = rows.filter(x => x[2] != 'direct').reduce((a, x) => a + x[1], 0);
  const reimb = direct * A.pct / 100;
  return {rows, direct, cons, reimb, net: direct + cons - reimb, A, delay, down};
}
function bookDefectCosts(S, d) {
  const im = defectImpact(S, d), r = S.rot[d.r];
  for (const [item, amt, nature, bearer, cc] of im.rows) if (amt > 0 && nature != 'contractual')
    post(S, {key: d.id + ':' + item, kind: 'cost', cat: 'Aircraft repair & downtime', desc: `${d.wo} ${item}`, rot: r.id, bearer, usd: amt, status: nature == 'direct' ? 'accrued' : 'estimate', formula: item + ' — cost centre ' + cc});
  if (im.reimb > 0) post(S, {key: d.id + ':reimb', kind: 'rev', cat: 'Reimbursements', desc: `${d.wo} recovery from ${im.A.reimb}`, rot: r.id, payer: im.A.reimb, payee: im.A.bearer, usd: im.reimb, status: 'estimate', formula: `${im.A.pct}% of direct cost`});
  if (im.A.contingent) post(S, {key: d.id + ':cont', kind: 'cost', cat: 'Contingent liabilities (memo)', desc: `${d.wo} possible airport liability — ${im.A.note}`, rot: r.id, bearer: 'Airport (contingent)', usd: im.direct, status: 'estimate', formula: 'not recognised until liability established'});
}

// ---------- emergency diversion inbound ----------
function newDiversion(S, o) {
  const d = Object.assign({id: 'DIV-' + pad(S.div.length + 1), status: 'REQUESTED', t: S.t, log: [[S.t, 'Diversion / emergency request received']]}, o);
  d.etaT = S.t + (+d.etaMin || 20); S.div.push(d);
  ev(S, 'DiversionRequested', d.fl, `${d.reason} · ETA ${loc(d.etaT)}`);
  alrt(S, 'cr', 'Emergency', `${d.fl} (${d.type}) requests diversion: ${d.reason}`, 'Assess capacity; decision by authorised personnel', 'Airport duty manager / ATC', {k: 'div', id: d.id});
  return d;
}
function assessDiversion(S, d) {
  const T = AC_TYPES[d.type], code = T.code, rw = arrRunway(S), at = d.etaT;
  const conflicts = S.R.filter(r => r.arr && r.onBlk == null && !r.diverted && Math.abs(r.eta - at) < 5).map(fid);
  const projFree = s => {const o = S.rot[S.stOcc[s.id]]; if (S.stRes[s.id] || S.stClosed[s.id]) return false; if (!o) return !S.R.some(x => x.stand == s.id && x.onBlk == null && x.arr && Math.abs(x.eta - at) < 60);
    return o.dep && (o.tobt + Object.values(o.dly).reduce((a, x) => a + x.min, 0)) < at - 10 && !o.mx};
  const opts = STANDS.filter(s => RANK[s.max] >= RANK[code] && ['contact', 'remote', 'stc', 'mro'].includes(s.kind) && projFree(s))
    .map(s => ({stand: s.id, kind: s.kind, term: s.term, bus: s.kind != 'contact', note: s.kind == 'mro' ? 'Suits technical inspection; no terminal access' : s.kind == 'contact' ? 'Boarding bridge: fastest passenger care' : 'Bus transfer required'}))
    .sort((a, b) => (d.tech && a.kind == 'mro' ? -1 : 0) - (d.tech && b.kind == 'mro' ? -1 : 0) || (a.kind == 'contact' ? 0 : 1) - (b.kind == 'contact' ? 0 : 1)).slice(0, 4);
  const svc = {ARFF: vehAvail(S, 'FT').length, Ambulance: vehAvail(S, 'AMB').length, Buses: vehAvail(S, 'BUS').length, 'Fuel bowsers': vehAvail(S, 'FUEL').length, Tugs: vehAvail(S, 'TUG').length};
  const warn = []; if (!rw) warn.push('No arrival runway open'); if (S.wx.vis < 1.5) warn.push('Low visibility'); if (S.wx.light) warn.push('Lightning: ramp suspended'); if (!opts.length) warn.push('No compatible stand projected free — hold on taxiway / remote apron needed');
  return {rw, conflicts, opts, svc, warn};
}
function acceptDiversion(S, id, optIdx, role) {
  const d = S.div.find(x => x.id == id); if (!d || d.status != 'REQUESTED') return 'Not pending';
  if (role && !['Airport Operations Manager', 'sim'].includes(role)) return 'Acceptance requires the Airport Operations Manager role (authorised personnel)';
  const a = assessDiversion(S, d), o = a.opts[optIdx || 0]; if (!o) return 'No compatible stand available — cannot reserve';
  const T = AC_TYPES[d.type], std = d.overnight ? DAY_END + 600 : d.etaT + T.mtt + 90;
  const r = {id: 'D' + pad(S.div.length), al: d.op, cc: 'DV', term: o.term, type: d.type, reg: d.reg, op: 'diversion', arr: {fl: d.fl, apt: d.origin, sta: d.etaT + 7}, dep: {fl: d.fl, apt: d.dest, std},
    paxIn: +d.pax, paxOut: +d.pax, stand: o.stand, planStand: o.stand, planOn: d.etaT + 7, planOff: std, ph: 'EN ROUTE', phT: S.t, eta: d.etaT, onBlk: null, offBlk: null, rw: 1, dly: {}, mx: null, hold: null, gpuMin: 0,
    notes: [], alerted: {}, loadRate: 15, emerg: 1, div: d.id, divHold: d.overnight};
  S.R.push(r); S.rot[r.id] = r; S.stRes[o.stand] = r.id;
  if (d.overnight) for (let i = 0; i < Math.round(r.paxIn * .7); i++) {const bid = 'BG' + d.fl.replace(/\W/g, '') + 'D' + pad(i + 1).padStart(3, '0'); S.B.push({id: bid, r: r.id, fl: d.fl, px: 'PX-' + (hash(bid) % 900000 + 100000), st: 'ON AIRCRAFT', t0: S.t, sc: [[S.t, 'ON BOARD (diverted)']], h: hash(bid), arr: 1}); S.Bact.push(S.B.length - 1); (S.rb[r.id] = S.rb[r.id] || []).push(S.B.length - 1)} d.rot = r.id; d.stand = o.stand; d.status = 'ACCEPTED'; d.acceptT = S.t; d.by = role || 'sim';
  d.log.push([S.t, `Accepted by ${role || 'sim'}; stand ${o.stand} reserved`]);
  const add = (kind, veh, start, o2) => S.tasks.push({id: 'TK' + (S.tasks.length + 1), r: r.id, kind, veh, start, dur: 20, st: 'PLANNED', v: null, emerg: 1, pre: 1, ...o2});
  if (d.svc.arff) {add('ARFF runway standby', 'FT', d.etaT - 8, {dest: 'RWY', cont: 'standby'}); add('ARFF runway standby', 'FT', d.etaT - 8, {dest: 'RWY', cont: 'standby'})}
  if (d.svc.medical) add('Medical response', 'AMB', d.etaT - 4, {pre: 0, dur: 25});
  if (d.svc.fuel) add('Fueling', 'FUEL', d.etaT + 20, {pre: 0, dur: 30, need: !d.overnight});
  for (const k of S.tasks) if (k.r == r.id && k.pre == 0) k.pre = undefined;
  if (d.tech) d.techPending = 1;
  ev(S, 'DiversionAccepted', d.fl, 'Stand ' + o.stand); alrt(S, 'wn', 'Emergency', `${d.fl} accepted — stand ${o.stand} reserved, services allocated`, 'Monitor timeline; passenger & baggage tasks created', 'Duty manager', {k: 'div', id: d.id});
  S.au.unshift({t: S.t, role: role || 'sim', m: 'Diversion accepted ' + d.fl + ' → ' + o.stand});
  return null;
}
function declineDiversion(S, id, role) {const d = S.div.find(x => x.id == id); if (!d || d.status != 'REQUESTED') return; d.status = 'REFERRED TO ALTERNATE'; d.log.push([S.t, 'Referred to alternate by ' + role]); S.au.unshift({t: S.t, role, m: 'Diversion referred ' + d.fl})}
function divLanded(S, r) {const d = S.div.find(x => x.id == r.div); d.log.push([S.t, 'Landed RWY ' + r.rw]); d.landT = S.t}
function divOnBlock(S, r) {
  const d = S.div.find(x => x.id == r.div), c = S.cfg; d.log.push([S.t, 'On-block ' + r.stand + (d.overnight ? ' — unplanned overnight parking' : '')]);
  if (d.tech) {const def = reportDefect(S, r.id, d.techType || 'HYD', 'diversion'); if (def) d.log.push([S.t, 'Maintenance notified: ' + def.wo])}
  if (d.svc.medical) {post(S, {key: d.id + ':med', kind: 'cost', cat: 'Emergency response resources', desc: 'Medical response ' + d.fl, rot: r.id, bearer: 'Airport', usd: c.medicalUsdCall, status: 'accrued', variable: 1, term: 'Airside', formula: `$${c.medicalUsdCall} per call-out`})}
  if (d.svc.arff) {const hrs = 2 * Math.max(.25, (S.t - (d.etaT - 8)) / 60);
    post(S, {key: d.id + ':arff', kind: 'cost', cat: 'Emergency response resources', desc: 'ARFF standby ' + d.fl, rot: r.id, bearer: 'Airport', usd: hrs * c.arffUsdVehHr, status: 'accrued', variable: 1, term: 'Airside', formula: `${hrs.toFixed(2)} vehicle-h × $${c.arffUsdVehHr}`})}
  const resUsd = (d.svc.medical ? c.medicalUsdCall : 0) + (d.svc.arff ? 2 * c.arffUsdVehHr * .5 : 0) + c.diversion.extraServicesUsd;
  const tr = c.diversion.treatment, rec = c.diversion.recoveryPct;
  post(S, {key: d.id + ':svc', kind: 'rev', cat: 'Diversion handling', desc: 'Additional diversion services ' + d.fl, rot: r.id, payer: 'Aircraft operator', payee: 'Airport', usd: tr == 'contracted' ? c.diversion.contractUsd : c.diversion.extraServicesUsd,
    status: tr == 'waived' ? 'waived' : tr == 'deferred' ? 'deferred' : tr == 'disputed' ? 'disputed' : 'estimate', formula: tr == 'contracted' ? `contract flat $${c.diversion.contractUsd}` : `$${c.diversion.extraServicesUsd} services (buses, pax handling, coordination)`});
  post(S, {key: d.id + ':recov', kind: 'rev', cat: 'Reimbursements', desc: 'Emergency-cost recovery (operator/insurer) ' + d.fl, rot: r.id, payer: 'Insurer', payee: 'Airport', usd: resUsd * rec / 100, status: 'estimate', formula: `${rec}% × $${resUsd.toFixed(0)} response cost — uncertain recovery, not recognised`});
  if (d.overnight) {d.log.push([S.t, 'Passengers to terminal / hotel; baggage held in diversion storage']); alrt(S, 'info', 'Passengers', `${d.fl}: ${r.paxIn} passengers need landside processing / accommodation`, 'Coordinate with operator & immigration', 'Passenger services', {k: 'div', id: d.id})}
}

// ---------- planned preventive maintenance (airport assets, today) ----------
// start/dur in sim minutes (0 = 06:00). kind: stand → stand closed while worked; veh → unit out of service; info → no capacity effect
const PM_TODAY = [
  {id: 'PM-01', asset: 'ARFF fleet FT1/FT2', task: 'Daily vehicle & foam system check', freq: 'Daily', start: 30, dur: 30, kind: 'info', owner: 'ARFF'},
  {id: 'PM-02', asset: 'Runways (both)', task: 'Movement-area FOD & surface inspection', freq: '4× daily', start: 90, dur: 15, kind: 'info', owner: 'Airfield ops'},
  {id: 'PM-03', asset: 'Airfield', task: 'Wildlife (bird) hazard patrol & dispersal', freq: 'Every 2 h', start: 120, dur: 20, kind: 'info', owner: 'Wildlife control'},
  {id: 'PM-04', asset: 'Mobile GPU GP4', task: '250-h engine service', freq: '250 run-h', start: 180, dur: 120, kind: 'veh', ref: 'GP4', owner: 'Ground handler'},
  {id: 'PM-05', asset: 'Chiller CH-2 (CUP)', task: 'Condenser tube cleaning (CH-1/3 carry load)', freq: 'Semi-annual', start: 240, dur: 240, kind: 'info', owner: 'Energy / CUP'},
  {id: 'PM-06', asset: 'Boarding bridge A3', task: 'Quarterly PBB inspection (drive, canopy, auto-level)', freq: 'Quarterly', start: 420, dur: 120, kind: 'stand', ref: 'A3', owner: 'Facilities'},
  {id: 'PM-07', asset: 'Runways (both)', task: 'Movement-area FOD & surface inspection', freq: '4× daily', start: 450, dur: 15, kind: 'info', owner: 'Airfield ops'},
  {id: 'PM-08', asset: 'Airfield', task: 'Wildlife (bird) hazard patrol & dispersal', freq: 'Every 2 h', start: 600, dur: 20, kind: 'info', owner: 'Wildlife control'},
  {id: 'PM-09', asset: 'Remote stand R6', task: 'Stand marking repaint & AGL lamp check', freq: 'Annual', start: 720, dur: 150, kind: 'stand', ref: 'R6', owner: 'Airfield maintenance'},
  {id: 'PM-10', asset: 'Runways (both)', task: 'Movement-area FOD & surface inspection', freq: '4× daily', start: 810, dur: 15, kind: 'info', owner: 'Airfield ops'},
  {id: 'PM-11', asset: 'BHS sorter', task: 'Weekly sorter PM (trays, drives, scanners)', freq: 'Weekly', start: 1110, dur: 180, kind: 'info', owner: 'BHS contractor'},
  {id: 'PM-13', asset: 'CCTV recorder NVR-T1', task: 'Recorder firmware update (T1 recording paused, live view continues)', freq: 'Quarterly', start: 330, dur: 40, kind: 'info', ref: 'NVR-T1', owner: 'Security systems'},
  {id: 'PM-12', asset: 'RWY 2', task: 'Rubber removal & friction test (night closure)', freq: 'Monthly', start: 1170, dur: 240, kind: 'info', owner: 'Airfield maintenance'},
];
function stepPM(S) {
  for (const p of S.pm) {
    if (p.st == 'PLANNED' || p.st == 'WAITING') {if (S.t < p.start) continue;
      const wait = why => {if (p.st != 'WAITING' || p.why != why) {p.st = 'WAITING'; p.why = why; p.log.push([S.t, 'Waiting: ' + why])}};
      if (S.wx.light && p.kind != 'info') {wait('lightning ramp stop'); continue}
      if (p.kind == 'stand' && (S.stOcc[p.ref] || S.stRes[p.ref])) {wait('stand occupied'); continue}
      if (p.kind == 'veh') {const v = S.V.find(x => x.id == p.ref); if (v.task) {wait('unit on task'); continue} v.down = 1}
      if (p.kind == 'stand') S.stClosed[p.ref] = p.id;
      p.st = 'IN PROGRESS'; p.t0 = S.t; p.log.push([S.t, 'Started']); ev(S, 'PreventiveMaintenanceStarted', p.asset, p.task)}
    else if (p.st == 'IN PROGRESS' && S.t >= p.t0 + p.dur) {
      if (p.kind == 'stand') delete S.stClosed[p.ref];
      if (p.kind == 'veh') {const v = S.V.find(x => x.id == p.ref); v.down = 0; v.st = 'IDLE'}
      p.st = 'DONE'; p.t1 = S.t; p.log.push([S.t, 'Completed']); ev(S, 'PreventiveMaintenanceCompleted', p.asset, p.task)}
  }
}

// ---------- scenarios ----------
const SCN = {
  fog: 'Dense fog', wind: 'Strong crosswind', storm: 'Thunderstorm (lightning)', sand: 'Sandstorm (khamsin)', clear: 'Weather clears',
  rwy1: 'Close RWY 1 (arrivals)', rwy2: 'Close RWY 2 (departures)', rwyok: 'Reopen runways', belt: 'BHS sorter failure', manual: 'BHS manual sort mode', beltok: 'BHS restored',
  birdret: 'Bird strike on departure → engine fire → single-engine return', tug: 'Pushback tugs unavailable', tugok: 'Tugs restored', hof: 'ATC handoff failures', hofok: 'Handoffs normal', spike: 'Chiller fault: T3 HVAC spike', spikeok: 'Chiller restored',
  vehfail: 'Ground vehicle breakdown (one unit)', convx: 'Baggage conveyor over-consumption', convok: 'Conveyor draw normal', termout: 'Terminal 1 departures hall unavailable', termok: 'Terminal 1 reopened',
  eco: 'Energy-saving intervention (LED dimming + HVAC setback + conveyor idle-stop)', ecooff: 'End energy-saving intervention', camfail: 'CCTV camera offline', nvrfail: 'CCTV recorder (NVR) fault — recording unavailable', camok: 'CCTV restored',
};
// financial-event register: scenario events that the Impact Simulator evaluates (defects, holds and diversions are read from their own records)
function fevOpen(S, type, ref, label) {const e = {id: 'FE-' + pad(S.fev.length + 1).padStart(3, '0'), type, ref, label, t0: S.t, t1: null}; S.fev.push(e); return e}
function fevClose(S, type, ref) {for (const e of S.fev) if (e.type == type && e.t1 == null && (ref == null || e.ref == ref)) {e.t1 = S.t;
  if (type == 'rwy') post(S, {key: 'rwyinsp:' + e.id, kind: 'cost', cat: 'Disruption-related expenses', desc: `RWY ${e.ref} inspection crew & equipment`, bearer: 'Airport', usd: Math.max(15, e.t1 - e.t0) / 60 * S.cfg.rwyInspUsdHr, status: 'accrued', variable: 1, term: 'Airside', formula: `${Math.max(15, e.t1 - e.t0)} min (min. 15) × $${S.cfg.rwyInspUsdHr}/h`})}}
function scn(S, k, role, arg) {
  const A = m => S.au.unshift({t: S.t, role: role || 'sim', m}); A('Scenario: ' + (SCN[k] || k));
  const W = (o, msg) => {Object.assign(S.wx, o); ev(S, 'WeatherConditionChanged', '—', msg)};
  switch (k) {
    case 'fog': W({vis: .8, wind: 6, c: 'DENSE FOG', light: 0, sand: 0}, 'Visibility 0.8 km; LVP'); alrt(S, 'wn', 'Weather', 'Low-visibility procedures: arrival spacing 6 min, taxi speed reduced, missed-approach risk', 'Reduce throughput / delay departures (authorised decision)', 'Duty manager'); break;
    case 'wind': W({vis: 10, wind: 38, c: 'STRONG WIND', light: 0, sand: 0}, 'Wind 38 kt'); alrt(S, 'wn', 'Weather', 'Strong wind: runway throughput reduced', 'Check crosswind limits per type', 'Duty manager'); break;
    case 'storm': W({vis: 3, wind: 30, c: 'THUNDERSTORM', light: 1, sand: 0}, 'Thunderstorm; lightning within 5 nm'); alrt(S, 'cr', 'Weather', 'Lightning: ramp, fuelling & pushback suspended; arrivals spaced', 'Resume only when all-clear criteria met', 'Ramp safety officer'); break;
    case 'sand': W({vis: 2, wind: 28, c: 'SANDSTORM', light: 0, sand: 1}, 'Khamsin: visibility 2 km'); alrt(S, 'wn', 'Weather', 'Sandstorm: reduced capacity; FOD inspection of movement area required', 'Schedule runway FOD sweep', 'Airfield ops'); S.risks.push({t: S.t, k: 'FOD'}); break;
    case 'clear': W({vis: 10, wind: 8, c: 'CAVOK', light: 0, sand: 0}, 'Conditions improved'); break;
    case 'rwy1': if (S.rw[1].open) fevOpen(S, 'rwy', 1, 'RWY 1 closed'); S.rw[1].open = 0; ev(S, 'RunwayStatusChanged', 'RWY 1', 'Closed (inspection)'); alrt(S, 'cr', 'Runway', 'RWY 1 closed — mixed-mode on RWY 2, capacity reduced', 'Inspect, then reopen via authorised release', 'Airfield ops', {k: 'rwy', id: 1}); break;
    case 'rwy2': if (S.rw[2].open) fevOpen(S, 'rwy', 2, 'RWY 2 closed'); S.rw[2].open = 0; ev(S, 'RunwayStatusChanged', 'RWY 2', 'Closed (inspection)'); alrt(S, 'cr', 'Runway', 'RWY 2 closed — mixed-mode on RWY 1, capacity reduced', 'Inspect, then reopen via authorised release', 'Airfield ops', {k: 'rwy', id: 2}); break;
    case 'rwyok': fevClose(S, 'rwy'); S.rw[1].open = S.rw[2].open = 1; ev(S, 'RunwayStatusChanged', 'RWY', 'Reopened'); break;
    case 'rwyre': fevClose(S, 'rwy', arg); S.rw[arg].open = 1; ev(S, 'RunwayStatusChanged', 'RWY ' + arg, 'Reopened after inspection'); alrt(S, 'info', 'Runway', `RWY ${arg} reopened — inspection complete, bird remains & debris removed`, 'Resume normal sequencing', 'Airfield ops', {k: 'rwy', id: arg}); break;
    case 'birdret': birdStrikeReturn(S, role, arg); break;
    case 'belt': if (!S.bhs.fault) {S.bhs.fault = 1; S.bhs.faultT = S.t; fevOpen(S, 'bhs', 'BHS', 'BHS sorter failure'); cctvIncident(S, 'Baggage handling incident', 'BHS sorter drive failure — bags queued before sortation', 'BHS', {eq: 'BHS-SORTER'}); ev(S, 'GroundEquipmentFailure', 'BHS', 'Sorter drive failure');
      post(S, {key: 'bhsfault' + S.t, kind: 'cost', cat: 'Baggage system maintenance', desc: 'BHS sorter fault call-out & repair', bearer: 'Airport', usd: S.cfg.maint.bhsFaultCalloutUsd, status: 'accrued', variable: 1, term: 'BHS', formula: 'contractor call-out (assumption)'});
      alrt(S, 'cr', 'Baggage', 'BHS sorter failure: bags queue before sortation; departures at risk', 'Switch to manual sort; notify airlines', 'Baggage ops officer', {k: 'zone', id: 'BHS'})} break;
    case 'manual': if (S.bhs.fault) {S.bhs.manual = 1; ev(S, 'BHSManualSort', 'BHS', 'Manual sort team deployed (6 bags/min)'); addCC(S, 'Disruption-related expenses', 12 * S.cfg.overtimeEgpHr / S.cfg.fx, 1, 'BHS')} break;
    case 'beltok': fevClose(S, 'bhs'); S.bhs.fault = 0; S.bhs.manual = 0; ev(S, 'BeltRestored', 'BHS', 'Sorter restored'); break;
    case 'tug': if (!S.tugDown) fevOpen(S, 'tug', 'TUGS', 'All pushback tugs unavailable'); S.tugDown = 1; ev(S, 'GroundVehicleBreakdown', 'TUGS', 'All tugs unavailable'); alrt(S, 'wn', 'Fleet', 'No tug available: pushbacks cannot start', 'Dispatch spare tug / tow tractor', 'Fleet dispatcher'); break;
    case 'tugok': fevClose(S, 'tug'); S.tugDown = 0; ev(S, 'GroundVehicleDispatched', 'TUGS', 'Tugs available'); break;
    case 'hof': S.hof = 1; ev(S, 'ATCHandoffFailure', 'ATC', 'Handoff acknowledgement failures enabled'); break;
    case 'hofok': S.hof = 0; break;
    case 'spike': if (!S.spike) fevOpen(S, 'spike', 'T3', 'T3 chiller control fault'); S.spike = {term: 'T3', mult: 1.8, t: S.t}; ev(S, 'EnergySpike', 'T3', 'Chiller control fault — HVAC +80%'); alrt(S, 'wn', 'Energy', 'T3 HVAC demand +80% (chiller control fault) — peak demand charge at risk', 'Dispatch CUP technician; shed non-critical loads', 'Energy manager', {k: 'zone', id: 'CUP'}); break;
    case 'spikeok': fevClose(S, 'spike'); S.spike = null; ev(S, 'EnergySpikeCleared', 'T3', 'Chiller restored'); break;
    case 'overstay': {const r = arg ? S.rot[arg] : pickOverstay(S); if (!r) break; r.hold = {until: Math.max(S.t, r.tobt || S.t) + 70, reason: 'Airline: late inbound crew (duty-time)', party: 'Airline'};
      ev(S, 'CommercialHold', fid(r), 'Operator hold +70 min'); alrt(S, 'wn', 'Stands', `${fid(r)} operator hold: crew late — stand ${r.stand} occupied ~70 min beyond plan`, 'Overstay tariff applies per contract', 'Apron control', {k: 'rot', id: r.id}); break}
    case 'defect': {const r = arg ? S.rot[arg.r] : pickDefect(S); if (r) reportDefect(S, r.id, (arg && arg.type) || 'HYD', role); break}
    case 'vehfail': {const v = (arg && S.V.find(x => x.id == arg)) || S.V.filter(x => !x.down && !x.task && x.st == 'IDLE' && (x.type == 'TUG' || x.type == 'BT')).sort((a, b) => b.workMin - a.workMin)[0]; if (!v) break;
      v.down = 1; v.fail = {t: S.t, until: S.t + S.cfg.gseRepairMin, cause: v.ev ? 'Traction battery contactor fault' : 'Hydraulic hose rupture'}; fevOpen(S, 'veh', v.id, VNAME[v.type] + ' ' + v.id + ' breakdown');
      const bearer = v.owner == 'Airport' || (v.owner == 'GH' && S.cfg.handler == 'airport') ? 'Airport' : 'Ground handler';
      post(S, {key: 'vehfail:' + v.id + ':' + S.t, kind: 'cost', cat: 'Equipment maintenance (GSE)', desc: `${v.id} breakdown repair (${v.fail.cause})`, bearer, usd: S.cfg.gseRepairUsd, status: 'accrued', variable: 1, term: 'Airside', veh: v.id, formula: `workshop repair $${S.cfg.gseRepairUsd} (assumption)`});
      post(S, {key: 'vehrec:' + v.id + ':' + S.t, kind: 'cost', cat: 'Equipment maintenance (GSE)', desc: `${v.id} recovery to GSE workshop`, bearer, usd: S.cfg.gseRecoveryUsd, status: 'accrued', variable: 1, term: 'Airside', veh: v.id, formula: `recovery tow $${S.cfg.gseRecoveryUsd} (assumption)`});
      ev(S, 'GroundVehicleBreakdown', v.id, v.fail.cause); alrt(S, 'wn', 'Fleet', `${VNAME[v.type]} ${v.id} broken down: ${v.fail.cause} — out of service ~${S.cfg.gseRepairMin} min`, 'Recovered to GSE workshop; dispatch reassigns tasks to remaining units', 'Fleet dispatcher', {k: 'veh', id: v.id});
      cctvIncident(S, 'Ground vehicle incident', `${v.id} ${VNAME[v.type]}: ${v.fail.cause}`, 'GSEW', {eq: v.id}); S.plan.push({t: v.fail.until, k: 'vehok', role: 'sim', arg: v.id}); break}
    case 'vehok': {const v = S.V.find(x => x.id == arg); if (v && v.fail) {v.down = 0; v.st = 'IDLE'; v.fail = null; fevClose(S, 'veh', v.id); ev(S, 'GroundVehicleRepaired', v.id, 'Returned to service')} break}
    case 'convx': if (!S.convX) {S.convX = {mult: 1.6, t: S.t}; fevOpen(S, 'conv', 'BHS', 'Conveyor over-consumption (+60%)'); ev(S, 'EnergyAnomaly', 'BHS', 'Conveyor drives drawing +60% (bearing drag suspected)');
      alrt(S, 'wn', 'Energy', 'Baggage conveyors drawing 60% above expected — likely mechanical drag', 'Inspect drives & bearings; schedule repair before failure', 'BHS contractor', {k: 'zone', id: 'BHS'})} break;
    case 'convok': fevClose(S, 'conv'); S.convX = null; break;
    case 'termout': {const T = arg || 'T1'; if (S.termOut) break; S.termOut = {term: T, t: S.t}; fevOpen(S, 'term', T, ZONE[T].name + ' departures hall unavailable'); ev(S, 'TerminalUnavailable', T, 'Departures hall closed (fire-alarm evacuation drill / power fault)');
      alrt(S, 'cr', 'Terminal', `${ZONE[T].name} departures hall unavailable — retail closed, passengers held landside`, 'Re-open after all-clear; extra staff for queue management', 'Terminal duty manager', {k: 'zone', id: T}); break}
    case 'termok': if (S.termOut) {fevClose(S, 'term', S.termOut.term); ev(S, 'TerminalReopened', S.termOut.term, 'Reopened'); S.termOut = null} break;
    case 'eco': if (!S.eco) {S.eco = 1; S.meas = Object.assign({}, S.meas, {led: 1, hvac: 1, bhs: 1}); fevOpen(S, 'eco', 'ALL', 'Energy-saving intervention'); ev(S, 'EnergySavingStarted', 'BMS', 'LED dimming, HVAC +1 °C setback, conveyor idle-stop')} break;
    case 'ecooff': if (S.eco) {S.eco = 0; S.meas = {}; fevClose(S, 'eco'); ev(S, 'EnergySavingEnded', 'BMS', 'Normal setpoints')} break;
    case 'camfail': case 'nvrfail': case 'camok': cctvScn(S, k, arg); break;
    case 'diversion': {const d = newDiversion(S, Object.assign({fl: 'SV 9917', type: 'B77W', reg: 'HZ-AK42', op: 'Saudia (diverted)', origin: 'JED', dest: 'LHR', reason: 'Medical emergency + hydraulic caution', etaMin: 18, pax: 330, crew: 16,
      fuel: 1, tech: 1, techType: 'HYD', overnight: 0, svc: {arff: 1, medical: 1, fuel: 1}}, arg || {})); if (!S.live || (arg && arg.auto)) acceptDiversion(S, d.id, 0, 'sim'); break}
  }
}
// Bird strike on departure: engine fire warning, crew declares MAYDAY and returns on one engine (air turnback)
function birdStrikeReturn(S, role, o) {
  o = o || {}; const rw = depRunway(S) || 2;
  const r = S.R.filter(x => x.dep && x.offBlk != null && ['TAKEOFF', 'DEPARTED', 'EN ROUTE OUT'].includes(x.ph) && x.op == 'sched' && !x.returned).sort((a, b) => b.offBlk - a.offBlk)[0];
  const fl = o.fl || (r ? r.dep.fl : 'MS 9001'), type = o.type || (r ? r.type : 'A320'), pax = o.pax || (r ? r.paxOut : 150);
  if (r) {r.returned = 1; r.notes.push('Bird strike after take-off — returned to CAI as emergency'); setPh(S, r, 'COMPLETED', 'Air turnback: continues as emergency return')}
  ev(S, 'BirdStrike', fl, `Climbing out RWY ${rw}: flock ingested, ENG 1 fire warning`);
  ev(S, 'MaydayDeclared', fl, 'MAYDAY ×3 — engine fire, single-engine return');
  alrt(S, 'cr', 'Emergency', `MAYDAY ${fl}: bird strike, engine fire warning — returning single-engine`, 'Full emergency: ARFF to positions, clear the approach, keep transmissions to the crew minimal (ASSIST)', 'ATC / airport duty manager');
  S.rw[rw].open = 0; ev(S, 'RunwayStatusChanged', 'RWY ' + rw, 'Closed — bird-strike debris & remains inspection');
  alrt(S, 'cr', 'Runway', `RWY ${rw} closed: bird-strike debris inspection (the returning aircraft lands on the other runway)`, 'Inspect, remove remains, collect samples for species ID', 'Airfield ops / wildlife control', {k: 'rwy', id: rw});
  S.plan.push({t: S.t + 25, k: 'rwyre', role: 'sim', arg: rw});
  S.inc.unshift({id: 'INC-' + pad(S.inc.length + 1), c: 'Bird strike', s: 'Serious incident', d: `${fl}: multiple bird ingestion on departure RWY ${rw}, engine fire warning, MAYDAY, single-engine return`, t: S.t, step: 1});
  S.risks.push({t: S.t, k: 'BIRD'});
  const d = newDiversion(S, {fl, type, reg: o.reg || (r ? r.reg : 'SU-GCA'), op: (r ? r.al : 'EgyptAir') + ' (emergency return)', origin: 'CAI', dest: r ? r.dep.apt : '—', reason: 'MAYDAY: bird strike, engine fire — single-engine return', etaMin: o.etaMin || 14, pax, crew: 8,
    tech: 1, techType: 'ENG', overnight: 1, mayday: 1, svc: {arff: 1, medical: 1, fuel: 0}});
  d.log.push([S.t, 'Landing priority is not subject to approval — this workflow only assigns stand & ground services']);
  if (!S.live || o.auto) acceptDiversion(S, d.id, 0, 'sim');
  return d;
}
function pickOverstay(S) {const c = S.R.filter(r => r.dep && (r.ph == 'ON STAND' || r.ph == 'BOARDING') && r.tobt > S.t + 5 && STAND[r.stand].kind == 'contact' && r.op == 'sched' && !r.mx);
  const nxt = r => S.R.some(x => x !== r && x.stand == r.stand && x.arr && x.onBlk == null && x.eta > r.tobt && x.eta < r.tobt + 70);
  return c.sort((a, b) => (nxt(b) - nxt(a)) || a.tobt - b.tobt)[0]}
function pickDefect(S) {return S.R.filter(r => r.dep && (r.ph == 'ON STAND' || r.ph == 'BOARDING') && r.tobt > S.t + 15 && !r.mx && r.op == 'sched').sort((a, b) => a.tobt - b.tobt)[0]}
// test-scenario presets: timed injections relative to now
const PRESETS = {
  ts1: {name: '1 · Aircraft overstays planned parking', ev: [[1, 'overstay']]},
  ts2: {name: '2 · Technical defect delays a departure', ev: [[1, 'defect']]},
  ts3: {name: '3 · Emergency diversion needs a stand & services', ev: [[1, 'diversion']]},
  ts4: {name: '4 · Baggage conveyor failure', ev: [[1, 'belt'], [60, 'beltok']]},
  ts5: {name: '5 · Energy consumption spike', ev: [[1, 'spike'], [120, 'spikeok']]},
  ts6: {name: '6 · Thunderstorm affects flights & ramp', ev: [[1, 'storm'], [36, 'clear']]},
  all: {name: '7 · Combined disruption day (for P&L comparison)', ev: [[1, 'overstay'], [10, 'defect'], [30, 'belt'], [70, 'beltok'], [60, 'spike'], [180, 'spikeok'], [120, 'storm'], [150, 'clear'], [200, 'diversion']]},
};
function schedulePreset(S, k, role) {for (const [dt, sk] of PRESETS[k].ev) S.plan.push({t: S.t + dt, k: sk, role}); S.au.unshift({t: S.t, role: role || 'sim', m: 'Preset scheduled: ' + PRESETS[k].name})}

// ---------- tick ----------
function tick(S) {
  if (S.t >= DAY_END) return false;
  S.t++; S.wx.temp = tempAt(S.t);
  for (const p of S.plan) if (p.t == S.t) scn(S, p.k, p.role, p.arg);
  // MAYDAY traffic lands whether or not a stand decision was recorded: default stand & services assigned near ETA
  for (const d of S.div) if (d.mayday && d.status == 'REQUESTED' && S.t >= d.etaT - 6) {d.log.push([S.t, 'No decision recorded before approach — default stand & services auto-assigned (MAYDAY)']); acceptDiversion(S, d.id, 0, 'sim')}
  for (const r of S.R) stepRot(S, r);
  stepTasks(S); stepVehicles(S); stepBags(S); stepDefects(S); stepPM(S);
  // occupancy (pax in terminals) & GPU connections
  const occ = {T1: 0, T2: 0, T3: 0, STC: 0}; let gpu = 0, depPax = 0;
  for (const r of S.R) {const term = STAND[r.stand].term, tt = occ[term] != null ? term : r.term in occ ? r.term : 'T2';
    if (r.dep && r.offBlk == null && !r.dep.cancelled) {const tb = r.tobt ?? r.dep.std, a = clamp((S.t - (r.dep.std - 180)) / 140, 0, 1), bd = clamp((S.t - (tb - 35)) / 30, 0, 1); occ[tt] += r.paxOut * a * (1 - bd)}
    if (r.arr && r.onBlk != null && S.t - r.onBlk < 40) occ[tt] += r.paxIn * (1 - (S.t - r.onBlk) / 40);
    if (r.onBlk != null && r.offBlk == null && STAND[r.stand].kind == 'contact' && r.onBlk <= S.t) {gpu++; r.gpuMin++}
    if (r.offBlk == S.t && r.paxOut) depPax += r.paxOut}
  S.occ = occ; S.gpuOn = gpu; S.en.wasteKg += depPax * S.cfg.wasteKgPax;
  for (const T in occ) addCC(S, 'Cleaning & waste services', occ[T] / 60 / 60 * S.cfg.cleaningUsdPax * 2, 1, T);
  energyTick(S); commercialTick(S); cctvTick(S);
  if (S.termOut) addCC(S, 'Disruption-related expenses', S.cfg.termOutStaff * S.cfg.overtimeEgpHr / 60 / S.cfg.fx, 1, S.termOut.term);
  // ATC handoff acknowledgements
  for (const h of S.ho) if (!h.ack) {const age = S.t - h.t; if (!S.hof || age >= 6) {h.ack = S.t; ev(S, 'ATCHandoffAcknowledged', h.f, h.from + '→' + h.to + (age >= 6 && S.hof ? ' (after retry)' : ''))}
    else if (age == 3 && !h.warn) {h.warn = 1; alrt(S, 'cr', 'ATC', `Handoff ${h.id} (${h.f}) unacknowledged`, 'Retry via backup line (simulated)', 'Supervisor')}}
  if (S.t % 15 == 0) {syncUtilityCosts(S); const p = pnl(S); S.snap.push({t: S.t, rev: p.net, cost: p.costTot, op: p.op, kw: S.en.kwTot, dly: avgDelay(S), occ: {...S.occ}})}
  return true;
}
function avgDelay(S) {const d = S.R.filter(r => r.dep && r.offBlk != null && r.offBlk >= 0); return d.length ? d.reduce((a, r) => a + Math.max(0, r.offBlk - r.dep.std), 0) / d.length : 0}
function kpi(S) {
  syncUtilityCosts(S); const p = pnl(S), dep = S.R.filter(r => r.dep && r.offBlk != null && r.offBlk >= 0), arr = S.R.filter(r => r.arr && r.onBlk != null && r.onBlk >= 0);
  const f = energyFinal(S);
  return {dep: dep.length, arr: arr.length, avg: +avgDelay(S).toFixed(1), ot: dep.length ? Math.round(100 * dep.filter(r => r.offBlk - r.dep.std <= 15).length / dep.length) : 100, mad: S.mad,
    al: S.al.length, div: S.R.filter(r => r.diverted).length, held: S.R.filter(r => r.block).length, bagsMiss: S.claims.length, gross: p.gross, net: p.net, cost: p.costTot, op: p.op, kwh: f.kwh, energyUsd: egp2usd(S, f.totalEgp), co2: f.co2, opp: S.opp.reduce((a, o) => a + o.usd, 0)};
}
function warm(S) {while (S.t < PREROLL) tick(S); S.live = true; return S}
function run(seed, preset, n = DAY_END, cfg, meas) { // headless deterministic run
  const s = makeState(seed); s.autoRelease = 1; if (cfg) s.cfg = deep(cfg); if (meas) s.meas = meas;
  if (preset) for (const [dt, k] of PRESETS[preset].ev) s.plan.push({t: PREROLL + dt, k, role: 'sim'});
  while (s.t < n && tick(s)); return s;
}
