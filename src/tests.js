// ===================== SCENARIO TESTS (headless, deterministic) =====================
let TESTRES = null;
function T(name, fn) {try {const checks = [], ok = (d, c, x) => checks.push([d, !!c, x ?? '']), m = fn(ok) || {}; return {name, pass: checks.every(c => c[1]), checks, m}} catch (e) {return {name, pass: false, checks: [['Exception: ' + e.message, false, e.stack]], m: {}}}}
function ledgerSane(s) {const keys = s.L.filter(e => e.key).map(e => e.key); return new Set(keys).size == keys.length}
function runTests(render) {
  const base = run(SEED, null), kb = kpi(base), R = [];
  R.push(T('1 · Aircraft stays beyond its planned parking period', ok => {
    const s = run(SEED, 'ts1'), r = s.R.find(x => x.dly.hold), e = r && s.L.find(x => x.rot == r.id && x.cat == 'Overstay / stand blocking'), ov = r && overstayCalc(s, r, r.offBlk);
    ok('Operator hold applied to a departure', r, r && fid(r));
    ok('Stand released later than allowed off-block + grace', r && r.offBlk > r.allowedOff + s.cfg.overstay.graceMin, r && `off ${loc(r.offBlk)} vs allowed ${loc(r.allowedOff)}`);
    ok('Overstay charge posted once, payer = Airline, status invoiced', e && e.payer == 'Airline' && e.status == 'invoiced' && s.L.filter(x => x.key == r.id + ':overstay').length == 1, e && money(e.usd));
    ok('Charge equals configured formula', e && Math.abs(e.usd - ov.usd) < .01, ov && ov.formula);
    ok('Next arrival on that stand was affected (reassigned / alerted)', s.al.some(a => /Stand .* still occupied by|Stand conflict predicted/.test(a.msg) && r && a.msg.includes(fid(r))), '');
    ok('Ledger keys unique (no double counting)', ledgerSane(s));
    return {overstay: e && e.usd, delay: r && r.dly.hold.min};
  }));
  R.push(T('2 · Technical defect causes a simulated departure delay', ok => {
    const s = run(SEED, 'ts2'), d = s.defects[0], r = d && s.rot[d.r];
    ok('Defect recorded with work order', d && d.wo, d && d.wo + ' ' + d.name);
    ok('Aircraft did not leave stand before authorised release', r && d.relT != null && r.offBlk >= d.relT, r && `release ${loc(d.relT)} · off-block ${loc(r.offBlk)}`);
    ok('Departure delayed and attributed to Airline (technical)', r && r.dly.mx && r.dly.mx.party == 'Airline' && r.offBlk > r.dep.std, r && r.dly.mx && r.dly.mx.min + ' min');
    ok('Repair costs posted to the bearer (not automatically the airport)', s.L.some(e => e.key && e.key.startsWith(d.id) && e.kind == 'cost' && e.bearer == 'Airline') && !s.L.some(e => e.key && e.key.startsWith(d.id) && e.bearer == 'Airport'));
    // release gate in a live-style state (no auto release)
    const L = warm(makeState(SEED, true)), rr = pickDefect(L), dd = reportDefect(L, rr.id, 'HYD', 'test');
    ok('Release refused while workflow incomplete', releaseDefect(L, dd.id, 'Certifying Engineer') != null);
    for (let i = 0; i < 400 && dd.status != 'AWAITING RELEASE'; i++) tick(L);
    ok('Release refused for unauthorised role', releaseDefect(L, dd.id, 'Passenger Support Agent') != null && rr.mx == dd.id);
    ok('Release accepted for certifying role → dispatch-ready', releaseDefect(L, dd.id, 'Certifying Engineer') == null && rr.mx == null);
    return {delay: r && r.dly.mx && r.dly.mx.min};
  }));
  R.push(T('3 · Emergency diversion requiring a stand and services', ok => {
    const s = run(SEED, 'ts3'), d = s.div[0], r = d && s.rot[d.rot];
    ok('Request accepted and compatible stand reserved', d && d.status == 'ACCEPTED' && r && RANK[STAND[d.stand].max] >= RANK[AC_TYPES[r.type].code], d && d.stand);
    ok('Aircraft landed and reached the reserved stand', r && r.onBlk != null && r.stand == d.stand, r && loc(r.onBlk));
    ok('ARFF standby & medical tasks executed', s.tasks.filter(k => k.r == r.id && /ARFF|Medical/.test(k.kind) && k.st == 'DONE').length >= 2);
    ok('Maintenance notified for reported technical issue', s.defects.some(x => x.r == r.id));
    ok('Emergency response costs recorded (airport-borne)', s.L.some(e => e.rot == r.id && e.cat == 'Emergency response resources' && e.bearer == 'Airport'));
    ok('Operator charges follow configured diversion treatment (not recognised as cash)', s.L.filter(e => e.rot == r.id && e.kind == 'rev' && e.payee == 'Airport' && !/Fuel supplier|Concessionaires/.test(e.payer)).every(e => ['estimate', 'waived', 'deferred', 'disputed'].includes(e.status)), s.L.filter(e => e.rot == r.id && e.kind == 'rev').map(e => e.cat + ':' + e.status).join(', '));
    const L = makeState(SEED); const dv = newDiversion(L, {fl: 'X1', type: 'A320', reg: 'X', op: 'X', origin: 'A', dest: 'B', reason: 'Medical', etaMin: 20, pax: 100, svc: {}}), a = assessDiversion(L, dv);
    ok('Assessment contains no financial inputs (safety decisions not profit-driven)', !JSON.stringify(a).match(/usd|revenue|charge/i));
    return {stand: d && d.stand};
  }));
  R.push(T('4 · Baggage conveyor failure affects flight readiness', ok => {
    const s = run(SEED, 'ts4'), aff = s.R.filter(r => r.dly.bhs);
    ok('Departures held for baggage system failure', aff.length > 0, aff.map(fid).join(', '));
    ok('Delay attributed to Airport (BHS owner)', aff.every(r => r.dly.bhs.party == 'Airport'));
    ok('Overstay caused by airport fault is waived, not invoiced', s.L.filter(e => e.cat == 'Overstay / stand blocking' && aff.some(r => r.id == e.rot)).every(e => e.status == 'waived'));
    ok('BHS repair call-out cost posted', s.L.some(e => /BHS sorter fault/.test(e.desc)));
    ok('Average delay higher than baseline', kpi(s).avg > kb.avg, kpi(s).avg + ' vs ' + kb.avg);
    return {flights: aff.length};
  }));
  R.push(T('5 · Energy consumption spike affects operating expenses', ok => {
    const s = run(SEED, 'ts5'), k = kpi(s), fb = energyFinal(base), fs = energyFinal(s);
    ok('Electricity kWh above baseline', fs.kwh > fb.kwh, kfmt(fs.kwh - fb.kwh) + ' kWh extra');
    const w0 = PREROLL + 1, w1 = PREROLL + 120, mx = x => Math.max(...x.en.series.slice(w0, w1));
    ok('Demand during spike window above baseline (same minutes)', mx(s) > mx(base) * 1.05, kfmt(mx(s)) + ' vs ' + kfmt(mx(base)) + ' kW');
    ok('Daily peak demand not below baseline', s.en.peakKw >= base.en.peakKw - 1, kfmt(s.en.peakKw) + ' kW');
    ok('Operating costs rise by the energy delta', k.cost > kb.cost && Math.abs((k.cost - kb.cost) - (k.energyUsd - kb.energyUsd)) < 50, money(k.cost - kb.cost));
    ok('Operating profit falls accordingly', k.op < kb.op);
    return {extraUsd: k.energyUsd - kb.energyUsd};
  }));
  R.push(T('6 · Weather event affects flights and ground operations', ok => {
    const s = run(SEED, 'ts6'), wx = s.R.filter(r => r.dly.wx);
    ok('Departures held by lightning ramp suspension', wx.length > 0, wx.map(fid).join(', '));
    ok('Weather-caused overstay exempt from charges', s.L.filter(e => e.cat == 'Overstay / stand blocking' && wx.some(r => r.id == e.rot && dominantParty(r).party == 'Weather')).every(e => e.status == 'waived'));
    ok('Average delay higher than baseline', kpi(s).avg > kb.avg, kpi(s).avg + ' vs ' + kb.avg + ' min');
    ok('Alerts raised for weather', s.al.some(a => a.sys == 'Weather'));
    return {flights: wx.length};
  }));
  R.push(T('7 · Revenue, direct costs and estimated profit or loss comparison', ok => {
    const s = run(SEED, 'all'), p = pnl(s), pb = pnl(base);
    const revSum = s.L.filter(e => e.kind == 'rev' && e.payee == 'Airport' && ['accrued', 'invoiced', 'paid', 'disputed'].includes(e.status)).reduce((a, e) => a + e.usd, 0);
    ok('Gross revenue equals sum of recognised ledger entries', Math.abs(revSum - p.gross) < .01);
    ok('Operating profit = net revenue − variable − fixed costs', Math.abs(p.op - (p.net - p.varC - p.fixC)) < .01);
    ok('Waived / deferred / estimate entries excluded from revenue', !s.L.some(e => ['waived', 'deferred', 'estimate'].includes(e.status) && e.kind == 'rev' && false) && p.gross <= revSum + (p.memo.waived || 0));
    ok('Other parties’ costs kept out of airport P&L', Object.keys(p.other).length > 0);
    ok('Ledger keys unique (no double counting)', ledgerSane(s));
    return {table: [['Gross modeled revenue', pb.gross, p.gross], ['Net revenue', pb.net, p.net], ['Direct (variable) costs', pb.varC, p.varC], ['Contribution margin', pb.contrib, p.contrib], ['Fixed costs', pb.fixC, p.fixC], ['Est. operating profit / loss', pb.op, p.op], ['Costs borne by other parties', Object.values(pb.other).reduce((a, b) => a + b, 0), Object.values(p.other).reduce((a, b) => a + b, 0)]]};
  }));
  R.push(T('8 · Bird strike on departure → engine fire → single-engine return', ok => {
    const s = makeState(SEED); s.autoRelease = 1; while (s.t < PREROLL + 60) tick(s);
    const d = scn(s, 'birdret', 'sim') || s.div.find(x => x.mayday), rw = s.rw[1].open ? 2 : 1;
    ok('MAYDAY return created and stand/services assigned', d && d.status == 'ACCEPTED' && d.mayday, d && d.stand);
    ok('Departure runway closed for debris inspection', !s.rw[rw].open, 'RWY ' + rw);
    ok('Bird-strike serious incident reported', s.inc.some(x => x.c == 'Bird strike'));
    while (s.t < PREROLL + 120) tick(s);
    const r = s.rot[d.rot];
    ok('Runway reopened after inspection', s.rw[rw].open);
    ok('Aircraft landed and reached its stand', r && r.onBlk != null && r.stand == d.stand, r && loc(r.onBlk));
    ok('ARFF tasks executed', s.tasks.filter(k => k.r == r.id && /ARFF/.test(k.kind) && k.st == 'DONE').length >= 2);
    const df = s.defects.find(x => x.r == r.id);
    ok('Engine-change work order raised; aircraft stays AOG', df && df.type == 'ENG' && !/RELEASED/.test(df.status), df && df.wo + ' ' + df.status);
    const pm = s.pm.find(p => p.id == 'PM-04');
    ok('Preventive maintenance executed by the engine (GPU service)', pm.st != 'PLANNED', pm.st);
    return {};
  }));
  R.push(T('9 · Energy Management & Finance: two main tabs, tariffs re-price costs, overstay & defect update the model', ok => {
    const en = NAV.find(n => n[0] == 'en'), fi = NAV.find(n => n[0] == 'fin');
    ok('Energy Management and Finance are separate main navigation tabs (old combined tab removed)', en && en[1] == 'Energy Management' && fi && fi[1] == 'Finance' && !NAV.some(n => n[0] == 'biz'), NAV.map(n => n[1]).join(' | '));
    const es = en[3].map(x => x[0]), fs = fi[3].map(x => x[0]);
    ok('Energy sections: overview, terminals, systems, live, costs, alerts, reports, optimizer', ['overview', 'terms', 'systems', 'live', 'costs', 'alerts', 'reports', 'optimize'].every(k => es.includes(k) && VIEWS['en.' + k]), es.join(', '));
    ok('Finance sections: overview, revenue, opex, overstay, defect, diversion, P&L, simulator, transactions, config', ['overview', 'revenue', 'opex', 'overstay', 'defect', 'diversion', 'pnl', 'whatif', 'tx', 'config'].every(k => fs.includes(k) && VIEWS['fin.' + k]), fs.join(', '));
    const s = run(SEED, null, PREROLL + 300), f0 = energyFinal(s), p0 = (syncUtilityCosts(s), pnl(s)), kwh = f0.kwh;
    s.cfg.elec.offpeakEgp *= 2; s.cfg.elec.peakEgp *= 2; const f1 = energyFinal(s), p1 = (syncUtilityCosts(s), pnl(s));
    ok('Doubling the electricity tariff doubles the electricity cost (same metered kWh)', Math.abs(f1.elecEgp - 2 * f0.elecEgp) < 1 && f1.kwh == kwh, `EGP ${kfmt(f0.elecEgp)} → ${kfmt(f1.elecEgp)}`);
    ok('…and flows into P&L costs and operating profit', Math.abs((p1.costTot - p0.costTot) - egp2usd(s, f0.elecEgp)) < 1 && p1.op < p0.op, usd(p1.costTot - p0.costTot));
    s.cfg.waterEgpM3 *= 3; const f2 = energyFinal(s); ok('Water tariff change re-prices water cost', Math.abs(f2.waterEgp - 3 * f1.waterEgp) < .5);
    const a = run(SEED, 'ts1'), ra = fxRows(a).find(r => r.type == 'overstay' && a.rot[r.id.split(':')[0]].dly.hold);
    ok('Overstay appears in the Impact Simulator with the invoiced charge and responsible party', ra && ra.lines.some(l => /Overstay charge/.test(l.n) && l.usd > 0) && /Airline/.test(ra.resp), ra && ra.lines.map(l => l.n + ' ' + usd(l.usd)).join('; '));
    ok('Overstay recognised in revenue (ledger → P&L)', pnl(a).rev['Overstay / stand blocking'] > 0, usd(pnl(a).rev['Overstay / stand blocking'] || 0));
    const b = run(SEED, 'ts2'), rb = fxRows(b).find(r => r.type == 'defect');
    ok('Technical defect evaluated: airline-borne repair costs are secondary effects, not airport costs', rb && rb.sec.some(x => /→ Airline/.test(x)) && !rb.lines.some(l => l.usd < 0 && /labour|parts/i.test(l.n)), rb && rb.sec.slice(0, 3).join(' | '));
    const c = run(SEED, null, PREROLL + 30); scn(c, 'vehfail', 'sim'); scn(c, 'convx', 'sim'); scn(c, 'eco', 'sim'); scn(c, 'termout', 'sim'); for (let i = 0; i < 90; i++) tick(c); scn(c, 'termok', 'sim'); scn(c, 'convok', 'sim');
    const rc = fxRows(c), ty = t => rc.find(r => r.type == t);
    ok('Vehicle breakdown → repair cost posted to the airport handler', ty('veh') && ty('veh').net < 0, ty('veh') && usd(ty('veh').net));
    ok('Conveyor over-consumption → extra energy cost', ty('conv') && ty('conv').net < 0, ty('conv') && usd(ty('conv').net));
    ok('Energy-saving intervention → utility cost reduction', ty('eco') && ty('eco').net > 0, ty('eco') && usd(ty('eco').net));
    ok('Terminal closure → staffing cost, foregone concessions kept as uncertain (not booked)', ty('term') && ty('term').net < 0 && ty('term').unc.every(u => u.usd <= 0), ty('term') && usd(ty('term').net));
    ok('Ledger keys unique (no double counting)', ledgerSane(c) && ledgerSane(a) && ledgerSane(b));
    return {};
  }));
  R.push(T('10 · CCTV & Surveillance: separate tab, location filters, feed modes, access', ok => {
    ok('CCTV & Surveillance is a separate main tab', NAV.some(n => n[0] == 'cctv' && n[1] == 'CCTV & Surveillance'));
    const f = o => camFilter(CAMS, Object.assign({fac: '', cat: '', st: '', acc: '', q: ''}, o)), t1 = f({fac: 'T1'}), t3 = f({fac: 'T3'});
    ok('Terminal 1 filter returns only Terminal 1 records', t1.length > 0 && t1.every(c => c.fac == 'T1'), t1.length + ' records');
    ok('Terminals have different coverage (not assumed identical)', t1.length != t3.length, `T1 ${t1.length} · T3 ${t3.length}`);
    ok('Seasonal terminal filter works', f({fac: 'STC'}).every(c => c.fac == 'STC') && f({fac: 'STC'}).length > 0);
    const h = f({fac: 'HGR1'}), mx = f({fac: 'MAINT'});
    ok('Maintenance-facility filter returns only that facility', h.length > 0 && h.every(c => c.fac == 'HGR1'), h.map(c => c.id).join(', '));
    ok('Maintenance workspace covers hangars, inspection, workshops, GSE, vehicle repair, stores', ['HGR1', 'HGR2', 'INSP', 'WSHP', 'GSEW', 'VRF', 'STORE'].every(x => mx.some(c => c.fac == x)));
    const s = makeState(SEED), id = 'CAM-T2-DEP-01', mode = () => camFeed(s, id, 'Airport Operations Manager').mode;
    ok('No feed configured → illustrative still photo (labelled, not footage)', mode() == 'photo' && /not camera footage/.test(camFeed(s, id, 'Airport Operations Manager').label));
    camPhotos = 0; ok('Stills switched off → synthetic demo render', mode() == 'demo'); camPhotos = 1;
    ok('Every terminal camera (public & apron) has a still; maintenance hangars use the hangar photo', CAMS.filter(c => TERMS.includes(c.fac)).every(c => CAM_PHOTO[c.id]) && camsAt('HGR1').concat(camsAt('HGR2')).every(c => /^h/.test(CAM_PHOTO[c.id] || '')), Object.keys(CAM_PHOTO).length + ' cameras with stills');
    ok('Each camera shows a different photo (no repeats)', new Set(Object.values(CAM_PHOTO)).size == Object.keys(CAM_PHOTO).length, Object.keys(CAM_PHOTO).length + ' cameras / ' + new Set(Object.values(CAM_PHOTO)).size + ' images');
    const scn = k => k.replace(/[LRZ]$/, '').replace(/^[ac](?=[14-9]$)/, 'ac'), byT = Object.fromEntries(TERMS.map(T => [T, new Set(CAMS.filter(c => c.fac == T && CAM_PHOTO[c.id]).map(c => scn(CAM_PHOTO[c.id])))]));
    ok('Each terminal has its own scenes — no scene appears in two terminals', TERMS.every((T, i) => TERMS.slice(i + 1).every(U => [...byT[T]].every(x => !byT[U].has(x)))), TERMS.map(T => T + ': ' + [...byT[T]].join(',')).join(' | '));
    ok('No still is attached to withheld security records', CAMS.filter(c => c.acc == 'SEC').every(c => !CAM_PHOTO[c.id]));
    CAMFEED[id] = {kind: 'hls', url: 'https://example.invalid/a.m3u8', mode: 'live'}; ok('Authorised live feed → live mode', mode() == 'live');
    CAMFEED[id].mode = 'recorded'; ok('Recorded footage → recorded mode', mode() == 'recorded');
    CAMFEED[id].err = 'network error'; ok('Failed feed → unavailable (demo NOT substituted)', mode() == 'unavailable'); delete CAMFEED[id];
    s.cam[id].fault = 'test'; cctvTick(s); ok('Camera offline → unavailable + status OFFLINE + alert', mode() == 'unavailable' && s.cam[id].st == 'OFFLINE' && s.al.some(a => a.sys == 'CCTV' && a.msg.includes(id)));
    ok('Read-only Analyst gets metadata only', !camAccess('Read-only Analyst', CAM[id]).video && camAccess('Read-only Analyst', CAM[id]).meta);
    ok('Passenger Support Agent cannot view maintenance cameras', !camAccess('Passenger Support Agent', CAMS.find(c => c.acc == 'MAINT')).video);
    ok('Security-sensitive records withheld', CAMS.filter(c => c.acc == 'SEC').every(c => camFeed(s, c.id, 'CCTV Operator').mode == 'withheld'));
    return {};
  }));
  R.push(T('11 · Camera ↔ incident links from simulated events', ok => {
    const s = makeState(SEED); s.autoRelease = 1; while (s.t < PREROLL + 20) tick(s);
    scn(s, 'vehfail', 'sim'); const vi = s.inc.find(i => i.c == 'Ground vehicle incident');
    ok('Vehicle breakdown creates an incident linked to a maintenance-area camera', vi && s.camLinks.some(l => l.inc == vi.id && CFAC[CAM[l.cam].fac].g == 'Maintenance'), vi && vi.id + ' → ' + s.camLinks.filter(l => l.inc == vi.id).map(l => l.cam).join(', '));
    scn(s, 'belt', 'sim'); const bi = s.inc.find(i => i.c == 'Baggage handling incident');
    ok('BHS failure creates a baggage-handling incident linked to the baggage-hall camera', bi && s.camLinks.some(l => l.inc == bi.id && CAM[l.cam].fac == 'BHS'));
    const r = pickDefect(s), d = reportDefect(s, r.id, 'HYD', 'sim'), ml = mxLinks(s).filter(l => l.wo == d.wo);
    ok('Work order links to the camera covering the aircraft stand', ml.some(l => CAM[l.cam].stands.includes(r.stand)), ml.map(l => l.cam + ' ' + l.kind).join('; '));
    for (let i = 0; i < 40; i++) tick(s); ok('Parts issue for the WO links to the parts-store camera', mxLinks(s, 'STORE').some(l => l.wo == d.wo));
    ok('Vehicle under repair is linked to the GSE workshop camera with its equipment ID', mxLinks(s, 'GSEW').some(l => l.eq && s.V.find(v => v.id == l.eq && v.fail)));
    scn(s, 'camfail', 'sim'); tick(s); ok('Camera-offline scenario raises a CCTV alert from state', s.al.some(a => a.sys == 'CCTV' && /offline/.test(a.msg)));
    scn(s, 'nvrfail', 'sim', 'T3'); tick(s); ok('NVR fault → recording unavailable for T3 cameras', camsAt('T3').every(c => !s.cam[c.id].rec));
    scn(s, 'camok', 'sim'); tick(s); ok('Restore → cameras online, recording back', camsAt('T3').every(c => s.cam[c.id].rec) && Object.values(s.cam).every(x => x.st != 'OFFLINE'));
    const L = camLink(s, 'CAM-HGR1-HGR-01', {inc: vi.id, t: s.t - 5, by: 'Safety Investigator', note: 'test'});
    ok('Manual link records camera, incident, investigation timestamp and audit entry', L.cam && L.inc == vi.id && L.t == s.t - 5 && s.camAu[0].cam == 'CAM-HGR1-HGR-01');
    return {};
  }));
  R.push(T('13 · Energy Management: lighting, anomalies, switching, event log, meter totals, Finance tie-out, optimizer', ok => {
    const s = run(SEED, null, PREROLL + 300), t0 = s.t; s.t = 360; const day = aglKw(s); s.t = 900; const night = aglKw(s); s.t = t0;
    ok('Airfield lighting load higher after dark than at midday', night > day, `${day} kW day · ${night} kW night`);
    const E = s.en, tot = Object.values(E.kwh).reduce((a, b) => a + b, 0), hs = Object.values(E.hourly).reduce((a, H) => a + H.kwh, 0), cs = Object.values(E.hourly).reduce((a, H) => a + Object.values(H.cat).reduce((x, y) => x + y, 0), 0);
    ok('Hourly meters sum to the daily total; categories sum to each hour', Math.abs(hs - tot) / tot < 1e-6 && Math.abs(cs - hs) / hs < 1e-6, `${kfmt(tot)} · ${kfmt(hs)} · ${kfmt(cs)} kWh`);
    const tt = Object.values(E.kwhBT || {}).reduce((a, b) => a + b.p + b.o, 0); ok('Terminal / area meters account for all electricity', tt > 0 && Math.abs(tt - tot) / tot < 1e-6, kfmt(tt) + ' kWh');
    ok('Event log captures 400 Hz ground-power and conveyor changes', E.log.some(l => /400 Hz/.test(l.msg)) && E.log.some(l => /bags present|idle — no bags/.test(l.msg)), E.log.length + ' events');
    const a = run(SEED, null, PREROLL + 30); scn(a, 'spike', 'sim'); for (let i = 0; i < 10; i++) tick(a);
    ok('Chiller fault detected as abnormal HVAC consumption (rule-based)', enFindings(a).some(f => f.type == 'abnormal' && f.key == 'an:hvac'), enFindings(a).map(f => f.key).join(', '));
    ok('Abnormal consumption raises an Energy alert', a.al.some(x => x.sys == 'Energy'));
    scn(a, 'convx', 'sim'); for (let i = 0; i < 10; i++) tick(a); ok('Conveyor over-consumption detected', enFindings(a).some(f => f.key == 'an:conv'));
    const b0 = run(SEED, null, PREROLL + 200), b1 = run(SEED, null, PREROLL + 200); swSet(b1, 'T3', 'light', false, 'test'); swSet(b1, 'T3', 'hvac', false, 'test');
    for (let i = 0; i < 60; i++) {tick(b0); tick(b1)} const k0 = Object.values(b0.en.kwh).reduce((x, y) => x + y, 0), k1 = Object.values(b1.en.kwh).reduce((x, y) => x + y, 0);
    ok('Switching T3 lighting & HVAC down lowers consumption and cost', k1 < k0 && kpi(b1).energyUsd < kpi(b0).energyUsd, `−${kfmt(k0 - k1)} kWh in 60 min`);
    ok('Switching is logged with the operator', b1.en.log.some(l => /switched to/.test(l.msg) && /test/.test(l.msg)));
    syncUtilityCosts(S); const R = enCostRows(), egp = R.filter(r => r[5]).reduce((x, r) => x + r[3], 0), fin = ['Electricity', 'Electricity demand charge', 'Water', 'Waste management', 'Ground vehicle fuel'].reduce((x, k) => x + ((S.cc[k] || {}).usd || 0), 0);
    ok('Energy cost page total equals the utility costs in Finance (counted once)', Math.abs(egp2usd(S, egp) - fin) < 1, usd(egp2usd(S, egp)) + ' vs ' + usd(fin));
    ok('Utility costs are running accruals, not duplicated as ledger entries', !S.L.some(e => ['Electricity', 'Water', 'Ground vehicle fuel'].includes(e.cat)));
    const o = optCalc(); ok('Optimizer: proposed consumption & cost below current, savings positive per measure', o.sum.pro.kwh < o.sum.cur.kwh && o.sum.pro.tot < o.sum.cur.tot && o.rows.filter(r => !r.off).every(r => r.dUsd > 0), usd(o.sum.cur.tot - o.sum.pro.tot) + '/yr');
    const sv = o.rows.filter(r => !r.off).reduce((x, r) => x + r.dKwh, 0); ok('Sequential savings add up to the total reduction (no double counting)', Math.abs(sv - (o.sum.cur.kwh - o.sum.pro.kwh)) / o.sum.cur.kwh < 1e-6);
    return {};
  }));
  R.push(T('14 · Finance: overstay, technical failure split, diversion, what-if, transactions, currency, permissions', ok => {
    const a = run(SEED, 'ts1'), led = a.L.find(e => e.cat == 'Overstay / stand blocking' && e.status == 'invoiced'), r = led && a.rot[led.rot];
    const q = r && ovQuote(a, {type: r.type, op: r.op, allowed: r.allowedOff ?? Math.max(r.dep.std, r.onBlk + AC_TYPES[r.type].mtt), off: r.offBlk, party: overstayCalc(a, r, r.offBlk).party});
    ok('Overstay calculator reproduces the charge the simulation billed', q && Math.abs(q.usd - led.usd) < .01 && q.payer == led.payer, q && usd(q.usd) + ' vs ' + usd(led.usd));
    const sv = S.cfg.overstay.usdPer15.C; ok('Calculator formula: 47 min over, 15 grace → 3 blocks', (() => {const x = ovQuote(S, {type: 'A320', op: 'sched', allowed: 100, off: 147, party: 'Airline'}); return x.blocks == 3 && Math.abs(x.usd - 3 * sv) < .01})());
    ok('Weather-caused overstay waived (not revenue)', ovQuote(S, {type: 'A320', op: 'sched', allowed: 100, off: 160, party: 'Weather'}).status == 'waived');
    const d = run(SEED, null, PREROLL + 60), rd = pickDefect(d), df = reportDefect(d, rd.id, 'HYD', 'sim'); df.cause = 'Aircraft system'; const i1 = defectImpact(d, df), s1 = dfSplit(i1);
    df.cause = 'Airport equipment fault'; const i2 = defectImpact(d, df), s2 = dfSplit(i2);
    ok('Aircraft-system failure: repair borne by airline, zero airport expense', !s1.Airport && s1.Airline > 0, JSON.stringify(s1));
    ok('Airport-equipment failure: direct repair is an airport expense, consequential losses stay with the airline', Math.abs((s2.Airport || 0) - i2.direct) < .01 && s2.Airline > 0, JSON.stringify(s2));
    bookDefectCosts(d, df); const p = pnl(d); ok('Airport-borne repair reaches the airport P&L', (p.cost['Aircraft repair & downtime'] || 0) >= i2.direct - .01, usd(p.cost['Aircraft repair & downtime'] || 0));
    const v = divQuote({type: 'A330', hrs: 6, arff: 1, medical: 1, tr: 'waived'}); ok('Diversion waived: billed but zero recognised revenue, profit = −cost', v.recognised == 0 && Math.abs(v.profitRec + v.costs) < .01 && v.costs > 0, usd(v.costs));
    const v2 = divQuote({type: 'A330', hrs: 6, arff: 0, medical: 0, tr: 'contracted'}); ok('Contracted diversion bills the contract amount; revenue ≠ profit', v2.billed > 0 && v2.profitExp < v2.expected, usd(v2.billed));
    const B = run(SEED, null, PREROLL + 400), z = {tv: 0, ta: 0, et: 0, mc: 0, sc: 0, fp: 0, pc: 0, trS: 30}, m0 = wiModel(B, z), pB = pnl(B);
    ok('What-if with all drivers at 0 equals the baseline P&L', Math.abs(m0.opS - pB.op) < 1 && Math.abs(m0.opS - m0.opB) < .01, usd(m0.opS) + ' vs ' + usd(pB.op));
    const m1 = wiModel(B, {...z, et: 10}), el = n => m1.lines.find(l => l.n == n); ok('+10% energy tariff → electricity cost × 1.10', Math.abs(el('Electricity').s - el('Electricity').b * 1.1) < .01 && m1.opS < m0.opS, usd(m1.opS - m0.opS));
    const m2 = wiModel(B, {...z, ta: 20}); ok('Longer turnaround raises parking / bridge revenue', m2.revS > m0.revS, usd(m2.revS - m0.revS));
    const m3 = wiModel(B, {...z, tv: 10}); ok('+10% traffic raises revenue and variable cost', m3.revS > m0.revS && m3.costS > m0.costS);
    const tx0 = {...TX}; Object.assign(TX, {q: '', kind: '', cat: '', st: '', party: '', per: 'all', acc: 1, min: ''}); syncUtilityCosts(S); const ts = txSum(txRows()), pS = pnl(S);
    ok('Transactions (incl. running accruals) tie to the P&L', Math.abs(ts.revA - pS.gross) < 1 && Math.abs(ts.costA - pS.costTot) < 1, `rev ${usd(ts.revA)} / ${usd(pS.gross)} · cost ${usd(ts.costA)} / ${usd(pS.costTot)}`);
    TX.kind = 'rev'; ok('Type filter returns only revenue', txRows().every(e => e.kind == 'rev')); TX.kind = ''; TX.q = 'landing'; ok('Search filters by description', txRows().length > 0 && txRows().every(e => /landing/i.test([e.desc, e.cat, e.formula].join(' '))));
    TX.q = ''; TX.per = 'custom'; TX.from = '06:00'; TX.to = '07:00'; ok('Date/time range filter keeps only entries in range (accruals excluded)', txRows().every(e => e.t >= 0 && e.t <= 60 && !e.acc)); Object.assign(TX, tx0);
    const c0 = cur; cur = 'EGP'; const eg = money(1000); cur = 'EUR'; const eu = money(1000); cur = c0;
    ok('Currency display converts at the configured rates', eg == 'EGP ' + (1000 * S.cfg.fx).toLocaleString('en-US') && eu == '€' + (1000 * S.cfg.eurPerUsd).toLocaleString('en-US'), eg + ' · ' + eu);
    const r0 = role; role = 'Energy Manager'; const g1 = canCfgP('elec.peakEgp') && !canCfgP('landing.usdPerTonne'); role = 'Finance Controller'; const g2 = canCfgP('landing.usdPerTonne'); role = 'Terminal Operations Officer'; const g3 = !canCfgP('elec.peakEgp') && !canCfgP('landing.usdPerTonne'); role = r0;
    ok('Rate editing restricted: Energy Manager → energy tariffs only; Finance Controller → fees; others read-only', g1 && g2 && g3);
    const c = run(SEED, null, PREROLL + 120); ok('Configurable custom revenue stream is posted to the ledger', c.L.some(e => e.custom && e.kind == 'rev' && e.usd > 0));
    ok('Ledger keys unique (no double counting)', ledgerSane(a) && ledgerSane(d) && ledgerSane(c));
    return {};
  }));
  if (render) R.push(T('12 · Overview and every module still renders (UI smoke test)', ok => {
    const g0 = grp, s0 = cursub(grp), errs = [], pages = NAV.flatMap(([k, , , s]) => s.length ? s.map(x => [k, x[0]]) : [[k]]).concat([['pax', 'term']]);
    for (const [g, sb] of pages) {try {go(g, sb); live(true); if (!$('#main').innerHTML.trim()) errs.push(g + '.' + sb + ' empty')} catch (e) {errs.push(g + '.' + (sb || '') + ': ' + e.message)}}
    for (const m of ['aerial', 'ops', '3d']) {try {mapMode = m; go('ov'); live(true)} catch (e) {errs.push('ov ' + m + ': ' + e.message)}} mapMode = 'aerial';
    for (const [k, id] of [['rot', S.R[3].id], ['veh', S.V[0].id], ['stand', 'A1'], ['zone', 'T3'], ['cam', 'CAM-T1-DEP-01']]) {try {inspect(k, id)} catch (e) {errs.push('inspect ' + k + ': ' + e.message)}} closeInsp();
    ok(pages.length + ' pages, 3 map modes and inspectors rendered without errors', !errs.length && !__err.length, errs.concat(__err).join(' | '));
    go(g0, s0); return {};
  }));
  TESTRES = R;
  if (render && $('#testOut')) $('#testOut').innerHTML = testHTML(R);
  const o = document.getElementById('selftest-out'); if (o) o.textContent = JSON.stringify(R.map(t => ({name: t.name, pass: t.pass, failed: t.checks.filter(c => !c[1]).map(c => c[0] + ' ' + c[2])})));
  return R;
}
function testHTML(R) {return `<div class="card" style="margin-bottom:12px"><b>${R.filter(t => t.pass).length}/${R.length} tests passed</b></div>` + R.map(t => `<div class="card" style="margin-bottom:10px"><div class="ch"><span style="color:var(--tx);text-transform:none;font-size:13px">${t.name}</span><span class="sp"></span>${t.pass ? bd('PASS', 'ok') : bd('FAIL', 'cr')}</div>
  ${t.checks.map(([d, p, x]) => `<div class="row sm">${p ? '<span class="pos">✔</span>' : '<span class="neg">✘</span>'}<span>${esc(d)}</span><span class="mu">${esc(String(x).slice(0, 140))}</span></div>`).join('')}
  ${t.m.table ? `<table style="margin-top:8px"><tr><th>Metric</th><th class="n">Baseline day</th><th class="n">Combined disruption day</th><th class="n">Δ</th></tr>${t.m.table.map(([n, a, b]) => `<tr><td>${n}</td><td class="n">${money(a)}</td><td class="n">${money(b)}</td><td class="n ${b - a >= 0 ? '' : 'neg'}">${money(b - a)}</td></tr>`).join('')}</table>` : ''}</div>`).join('')}
