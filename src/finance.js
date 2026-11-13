// ===================== TARIFFS, COST ASSUMPTIONS, LEDGER, ENERGY =====================
// ALL VALUES ARE ILLUSTRATIVE ASSUMPTIONS — not official ECAA / Cairo Airport Company tariffs or contracts.
const CFG_DEFAULT = {
  fx: 48.5,                          // EGP per USD
  eurPerUsd: 0.92,                   // EUR per USD (display only)
  handler: 'airport',                // 'airport' = airport-owned handling subsidiary (consolidated); 'independent' = concession only
  handlingConcessionPct: 8,          // % of handler revenue paid to airport when independent
  landing: {usdPerTonne: 6.2, minUsd: 150, mult: {sched: 1, charter: 1.1, private: 1.6, diversion: 1}},
  parking: {freeMin: {sched: 180, charter: 120, private: 60, diversion: 120}, usdPerTonneHr: 0.55, blockMin: 60, graceMin: 15},
  overstay: {graceMin: 15, usdPer15: {B: 40, C: 120, E: 260}, apply: {sched: true, charter: true, private: false, diversion: false},
             exempt: {Weather: true, Airport: true, ANSP: true, 'Ground handler': false, Airline: false}},
  pbbUsdHr: 90, gpuUsdHr: 45, paxUsd: 25, secUsd: 8, bhsUsdBag: 1.2, fuelUsdPerL: 0.006,
  handling: {usd: {B: 600, C: 1800, E: 3600}, costUsd: {B: 350, C: 1050, E: 2100}},
  concession: {spendUsd: 14, share: 0.25, delayUpliftUsdPerMin: 0.06, capMin: 90},
  fbo: {usd: 950, costUsd: 400},
  diversion: {treatment: 'standard', reducedPct: 50, contractUsd: 2500, recoveryPct: 70, extraServicesUsd: 1200},
  payTerms: {sched: 'credit', charter: 'cash', private: 'cash', diversion: 'uncertain'},
  disputeProvisionPct: 50,
  bagWaitMax: 30,                    // min a flight waits for bags before leaving them behind
  // ---- operating cost assumptions ----
  elec: {offpeakEgp: 1.9, peakEgp: 2.6, peakFrom: 17, peakTo: 22, demandEgpKwMonth: 95, peakLimitKw: 14000, peakWarnPct: 95},
  waterEgpM3: 18, dieselEgpL: 15.5, wasteEgpT: 950, gridKgKwh: 0.47, dieselKgL: 2.68,
  staff: {T1: [140, 260], T2: [220, 260], T3: [320, 260], STC: [60, 260], BHS: [40, 280], ARFF: [30, 320], OPS: [45, 340]}, // headcount on duty, EGP/hr
  overtimeEgpHr: 390,
  maint: {facilityUsdHr: 420, gseUsdOpHr: 6, bhsUsdRunHr: 35, bhsFaultCalloutUsd: 2500},
  cleaningUsdPax: 0.35, contractedUsdHr: 260, arffUsdVehHr: 180, medicalUsdCall: 400, busOpsUsdTrip: 25,
  // ---- equipment power ratings (kW) ----
  power: {T1: {base: 650, hvac: 900, light: 240, esc: 14}, T2: {base: 1100, hvac: 1700, light: 420, esc: 30},
          T3: {base: 1700, hvac: 2900, light: 650, esc: 52}, STC: {base: 260, hvac: 520, light: 120, esc: 6}},
  hvacPaxKw: 0.35, escKw: 9, conveyorKw: {checkin: 140, eds: 210, sorter: 280, makeup: 110, reclaim: 120}, convIdleFactor: 0.4,
  agl: {rwyNight: 220, rwyLvp: 160, twyNight: 90, standby: 12}, waste: {occMin: 80, hvacStandby: .3, lightMin: .3},
  gpuKw: 60, evChargerKw: 40, waterM3Pax: 0.012, coolingM3PerMWh: 1.6, wasteKgPax: 0.35,
  gse: {dieselLkm: 0.32, dieselLhr: {TUG: 14, BT: 4, BUS: 6, GPU: 12, FUEL: 5, CAT: 4, FT: 20, AMB: 3, FM: 2}, evKwhKm: 0.7, evKwhHr: {TUG: 25, BT: 6}},
  // ---- other-party cost assumptions (not airport P&L) ----
  pax: {mealUsd: 15, hotelUsd: 120, rebookUsd: 60}, mishandledBagUsd: 110, labourUsdHr: 95, bhsRecoveryPct: 50,
  gseRepairUsd: 850, gseRecoveryUsd: 180, gseRepairMin: 90, termOutStaff: 25, rwyInspUsdHr: 600,
  // ---- other airport commercial activities (accrued hourly, payer → Airport) ----
  other: {carParkUsdDay: 9500, advertUsdDay: 3800, rentUsdDay: 7200, loungeUsdDay: 2600, fastTrackUsdDay: 1400},
  custom: [{name: 'Filming & event permits', payer: 'Event organisers', usdDay: 600}], // user-defined revenue streams
};
// tariff / contract reference shown with each revenue line — placeholders, NOT official document numbers
const CAT_REF = {'Landing charges': 'ILL-AERO-01 landing tariff', 'Aircraft parking': 'ILL-AERO-02 parking tariff', 'Overstay / stand blocking': 'ILL-SLA-03 stand-use agreement',
  'Boarding bridge & 400 Hz': 'ILL-AERO-04 PBB / 400 Hz', 'Passenger & security charges': 'ILL-AERO-05 PSC & security', 'Ground handling': 'ILL-GH-06 handling contract',
  'Ground handling (handler)': 'Handler–airline SGHA (third party)', 'Private aviation handling': 'ILL-FBO-07 FBO price list', 'Aircraft servicing & fuel': 'ILL-FUEL-08 fuel throughput concession',
  'Baggage handling services': 'ILL-AERO-09 BHS usage', 'Concessions (retail/F&B)': 'ILL-COM-10 retail/F&B concessions', 'Other commercial': 'ILL-COM-11 commercial contracts', 'Terminal services': 'ILL-COM-12 lounge & fast-track contracts', 'Reimbursements': 'Cause-allocation assumption'};
const OTHER_COM = [['carParkUsdDay', 'Public car parking', 'Car-park users (via operator)', 'Other commercial'], ['advertUsdDay', 'Advertising media', 'Advertisers', 'Other commercial'], ['rentUsdDay', 'Property & office rental', 'Tenants', 'Other commercial'], ['loungeUsdDay', 'Lounge services', 'Lounge operator', 'Terminal services'], ['fastTrackUsdDay', 'Fast-track & meet-and-assist', 'Passengers (via service desk)', 'Terminal services']];
function commercialTick(S) { // hourly accrual of configurable non-aeronautical income (no flight link)
  if (S.t % 60) return; const h = hourOf(S.t - 1);
  for (const [k, n, payer, cat] of OTHER_COM) {const d = S.cfg.other[k] || 0; if (d > 0) post(S, {key: 'oth:' + k + ':' + S.t, kind: 'rev', cat, desc: n + ' ' + pad(h) + ':00–' + pad((h + 1) % 24) + ':00', payer, payee: 'Airport', usd: d / 24, status: 'accrued', formula: `$${d}/day ÷ 24 h (contract assumption)`})}
  (S.cfg.custom || []).forEach((x, i) => {if (x.usdDay > 0) post(S, {key: 'cus:' + i + ':' + S.t, kind: 'rev', cat: 'Other commercial', desc: x.name + ' ' + pad(h) + ':00–' + pad((h + 1) % 24) + ':00', payer: x.payer || 'Customers', payee: 'Airport', usd: x.usdDay / 24, status: 'accrued', custom: 1, formula: `$${x.usdDay}/day ÷ 24 h (user-defined stream)`})});
}
const PARTIES = ['Airport', 'Airline', 'Ground handler', 'Aircraft owner / MRO', 'Insurer', 'Fuel supplier', 'ANSP', 'Weather'];
const deep = o => JSON.parse(JSON.stringify(o));
const usd = (v, d = 0) => (v < 0 ? '−' : '') + '$' + Math.abs(v).toLocaleString('en-US', {maximumFractionDigits: d, minimumFractionDigits: d});
const egp2usd = (S, v) => v / S.cfg.fx;

// -------- ledger: every charge/cost is one keyed entry → no double counting --------
// kind: rev|cost · status: accrued|invoiced|paid|estimate|disputed|waived|deferred · payer/payee (rev) or bearer (cost)
function post(S, e) {
  if (e.key && S.lkeys[e.key]) return null;
  if (e.key) S.lkeys[e.key] = 1;
  e.id = 'L' + (++S.lid); e.t = S.t; e.usd = Math.round(e.usd * 100) / 100; S.L.push(e);
  if (S.live && e.kind == 'cost' && e.bearer == 'Airport' && e.usd >= 1000 && !/Ground handling costs/.test(e.cat)) alrt(S, 'info', 'Finance', `Cost posted: ${e.desc} ${usd(e.usd)}`, 'Review in Energy & Finance › Profit & Loss', 'Finance controller', {k: 'ledger'});
  return e;
}
const rotLabel = r => (r.dep ? r.dep.fl : r.arr.fl) + ' · ' + r.reg;

function landingCharge(S, r) {
  const c = S.cfg, T = AC_TYPES[r.type], base = Math.max(c.landing.minUsd, T.mtow * c.landing.usdPerTonne), m = c.landing.mult[r.op] || 1;
  let amt = base * m, status = 'accrued', note = '';
  if (r.op == 'diversion') [amt, status, note] = divTreat(S, amt);
  post(S, {key: r.id + ':landing', kind: 'rev', cat: 'Landing charges', desc: 'Landing ' + rotLabel(r), rot: r.id, payer: 'Airline', payee: 'Airport', usd: amt, status,
    formula: `max(${c.landing.minUsd}, ${T.mtow} t × $${c.landing.usdPerTonne}/t) × ${m} (${r.op})${note}`});
}
function divTreat(S, amt) {
  const d = S.cfg.diversion;
  switch (d.treatment) {
    case 'waived': return [amt, 'waived', ' · waived under emergency policy'];
    case 'reduced': return [amt * d.reducedPct / 100, 'estimate', ` · reduced to ${d.reducedPct}%`];
    case 'deferred': return [amt, 'deferred', ' · deferred pending operator agreement'];
    case 'disputed': return [amt, 'disputed', ' · disputed by operator'];
    case 'contracted': return [amt, 'estimate', ' · per handling contract'];
    default: return [amt, 'estimate', ' · standard tariff, recovery not yet confirmed'];
  }
}
// parking per tariff: free period by operation type, then charged per started block beyond grace
function parkingCalc(S, r, tEnd) {
  const c = S.cfg.parking, T = AC_TYPES[r.type], dur = Math.max(0, (tEnd ?? S.t) - r.onBlk), free = c.freeMin[r.op] ?? 180;
  const over = dur - free, blocks = over > c.graceMin ? Math.ceil(over / c.blockMin) : 0, usdAmt = blocks * c.blockMin / 60 * T.mtow * c.usdPerTonneHr;
  return {dur, free, blocks, usd: usdAmt, formula: `${blocks} × ${c.blockMin} min block × ${T.mtow} t × $${c.usdPerTonneHr}/t·h  (stay ${Math.round(dur)} min − free ${free} min, grace ${c.graceMin})`};
}
function dominantParty(r) {
  let best = null; for (const k in r.dly) if (!best || r.dly[k].min > best.min) best = r.dly[k];
  return best || {party: '—', label: 'No delay', min: 0};
}
// one overstay rule set — used by the engine at off-block and by the Finance › Overstay Calculator
function ovQuote(S, q) { // q: {type, op, allowed (sim min), off (sim min), party}
  const c = S.cfg.overstay, code = AC_TYPES[q.type].code, rate = c.usdPer15[code] || 120, over = Math.max(0, q.off - q.allowed - c.graceMin), blocks = Math.ceil(over / 15);
  let status = 'invoiced', why = '';
  if (!c.apply[q.op]) {status = 'waived'; why = 'not applicable to ' + q.op + ' operations'}
  else if (c.exempt[q.party]) {status = 'waived'; why = 'cause attributed to ' + q.party + ' (contract exemption)'}
  else if (q.party == 'Ground handler' && S.cfg.handler == 'airport') {status = 'waived'; why = 'internal: airport-owned handler caused delay'}
  return {over, blocks, rate, code, usd: blocks * rate, status, why, payer: q.party == 'Ground handler' ? 'Ground handler' : 'Airline',
    formula: `ceil(${Math.round(over)} min over [allowed off-block ${loc(q.allowed)} + grace ${c.graceMin}] ÷ 15) × $${rate} (code ${code})`};
}
function overstayCalc(S, r, tEnd) {
  const allowedOff = r.allowedOff ?? (r.dep ? Math.max(r.dep.std, r.onBlk + AC_TYPES[r.type].mtt) : Infinity), dom = dominantParty(r);
  const q = ovQuote(S, {type: r.type, op: r.op, allowed: allowedOff, off: tEnd ?? S.t, party: dom.party});
  return {over: q.over, blocks: q.blocks, usd: q.usd, status: q.status, payer: q.payer, party: dom.party, reason: dom.label, why: q.why, formula: q.formula};
}
function payStatus(S, r) {return S.cfg.payTerms[r.op] == 'cash' ? 'paid' : r.op == 'diversion' ? 'estimate' : 'invoiced'}

function chargesOffBlock(S, r) {
  const c = S.cfg, T = AC_TYPES[r.type], st = STAND[r.stand], code = T.code, ps = payStatus(S, r), lab = rotLabel(r), hrs = (S.t - r.onBlk) / 60;
  for (const e of S.L) if (e.rot == r.id && e.cat == 'Landing charges' && e.status == 'accrued') e.status = ps;
  const pk = parkingCalc(S, r, S.t);
  if (pk.usd > 0) {let [a, s, n] = r.op == 'diversion' ? divTreat(S, pk.usd) : [pk.usd, ps, ''];
    post(S, {key: r.id + ':parking', kind: 'rev', cat: 'Aircraft parking', desc: 'Parking ' + lab, rot: r.id, payer: 'Airline', payee: 'Airport', usd: a, status: s, formula: pk.formula + n})}
  if (r.dep) {const ov = overstayCalc(S, r, S.t);
    if (ov.blocks > 0) post(S, {key: r.id + ':overstay', kind: 'rev', cat: 'Overstay / stand blocking', desc: 'Overstay ' + lab + ' — ' + ov.reason, rot: r.id, payer: ov.payer, payee: 'Airport', usd: ov.usd,
      status: ov.status == 'invoiced' ? (r.disputeOverstay ? 'disputed' : ps) : 'waived', formula: ov.formula + (ov.why ? ' · ' + ov.why : '')})}
  if (st.kind == 'contact') {
    post(S, {key: r.id + ':pbb', kind: 'rev', cat: 'Boarding bridge & 400 Hz', desc: 'Boarding bridge ' + lab, rot: r.id, payer: 'Airline', payee: 'Airport', usd: hrs * c.pbbUsdHr, status: ps, formula: `${hrs.toFixed(2)} h × $${c.pbbUsdHr}/h`});
    post(S, {key: r.id + ':gpu', kind: 'rev', cat: 'Boarding bridge & 400 Hz', desc: 'Fixed 400 Hz GPU ' + lab, rot: r.id, payer: 'Airline', payee: 'Airport', usd: (r.gpuMin || 0) / 60 * c.gpuUsdHr, status: ps, formula: `${((r.gpuMin || 0) / 60).toFixed(2)} h connected × $${c.gpuUsdHr}/h`})}
  if (r.dep && r.paxOut && r.op != 'diversion') { // diverted passengers are not charged departing-passenger fees in this model
    post(S, {key: r.id + ':pax', kind: 'rev', cat: 'Passenger & security charges', desc: 'Passenger service charge ' + lab, rot: r.id, payer: 'Airline (collected from passengers)', payee: 'Airport', usd: r.paxOut * c.paxUsd, status: 'accrued', formula: `${r.paxOut} departing pax × $${c.paxUsd}`});
    post(S, {key: r.id + ':sec', kind: 'rev', cat: 'Passenger & security charges', desc: 'Security charge ' + lab, rot: r.id, payer: 'Airline (collected from passengers)', payee: 'Airport', usd: r.paxOut * c.secUsd, status: 'accrued', formula: `${r.paxOut} pax × $${c.secUsd}`});
    const dmin = Math.min(c.concession.capMin, Math.max(0, S.t - r.dep.std)), lost = closedShare(S, st.term, S.t - 90, S.t), conc = r.paxOut * (c.concession.spendUsd * c.concession.share + dmin * c.concession.delayUpliftUsdPerMin);
    post(S, {key: r.id + ':conc', kind: 'rev', cat: 'Concessions (retail/F&B)', desc: 'Concession share ' + lab, rot: r.id, payer: 'Concessionaires', payee: 'Airport', usd: conc * (1 - lost), status: 'accrued', lostUsd: conc * lost,
      formula: `${r.paxOut} pax × ($${c.concession.spendUsd} × ${c.concession.share} + ${dmin} delay-min × $${c.concession.delayUpliftUsdPerMin})${lost ? ` × (1 − ${Math.round(lost * 100)}% dwell lost to terminal closure)` : ''} — dwell uplift is an illustrative assumption`})}
  const nb = rbags(S, r.id).filter(b => b.r == r.id && b.st == 'LOADED').length;
  if (nb) post(S, {key: r.id + ':bhs', kind: 'rev', cat: 'Baggage handling services', desc: 'BHS usage ' + lab, rot: r.id, payer: 'Airline', payee: 'Airport', usd: nb * c.bhsUsdBag, status: ps, formula: `${nb} bags × $${c.bhsUsdBag}`});
  if (r.op == 'private') {
    post(S, {key: r.id + ':fbo', kind: 'rev', cat: 'Private aviation handling', desc: 'FBO handling ' + lab, rot: r.id, payer: 'Private operator', payee: 'Airport', usd: c.fbo.usd, status: 'paid', formula: `flat FBO fee $${c.fbo.usd}`});
    post(S, {key: r.id + ':fboC', kind: 'cost', cat: 'Ground handling costs', desc: 'FBO service cost ' + lab, rot: r.id, bearer: 'Airport', usd: c.fbo.costUsd, status: 'accrued', variable: 1, term: 'GA', formula: `flat $${c.fbo.costUsd}`})
  } else handlingCharges(S, r, code, ps, lab, r.op == 'diversion');
  // airline-side consequences (not airport P&L)
  const dl = r.dep ? Math.max(0, S.t - r.dep.std) : 0;
  if (dl > 0) post(S, {key: r.id + ':aldelay', kind: 'cost', cat: 'Airline delay cost', desc: 'Airline delay cost ' + lab, rot: r.id, bearer: 'Airline', usd: dl * T.dcost, status: 'estimate', formula: `${dl} min × $${T.dcost}/min (fuel, crew, maintenance reserve — illustrative)`});
  if (dl > 180 && r.paxOut) post(S, {key: r.id + ':care', kind: 'cost', cat: 'Passenger care & rebooking', desc: 'Passenger care ' + lab, rot: r.id, bearer: 'Airline', usd: r.paxOut * (c.pax.mealUsd + (dl > 300 ? c.pax.hotelUsd : 0)) + r.paxOut * .15 * c.pax.rebookUsd, status: 'estimate',
    formula: `${r.paxOut} pax × (meal $${c.pax.mealUsd}${dl > 300 ? ' + hotel $' + c.pax.hotelUsd : ''}) + 15% rebooked × $${c.pax.rebookUsd}`});
}
function closedShare(S, term, a, b) { // fraction of [a,b] during which that terminal was unavailable
  let m = 0; for (const e of S.fev) if (e.type == 'term' && e.ref == term) m += Math.max(0, Math.min(b, e.t1 ?? S.t) - Math.max(a, e.t0));
  return clamp(m / Math.max(1, b - a), 0, 1);
}
function handlingCharges(S, r, code, ps, lab, div) {
  const c = S.cfg, fee0 = c.handling.usd[code], cost = c.handling.costUsd[code];
  let [fee, dst] = div ? divTreat(S, c.diversion.treatment == 'contracted' ? c.diversion.contractUsd : fee0) : [fee0, ps]; ps = dst;
  if (c.handler == 'airport') {
    post(S, {key: r.id + ':gh', kind: 'rev', cat: 'Ground handling', desc: 'Turnaround handling ' + lab, rot: r.id, payer: 'Airline', payee: 'Airport', usd: fee, status: ps, formula: `code ${code} handling fee $${fee}`});
    post(S, {key: r.id + ':ghC', kind: 'cost', cat: 'Ground handling costs', desc: 'Handling labour ' + lab, rot: r.id, bearer: 'Airport', usd: cost, status: 'accrued', variable: 1, term: STAND[r.stand].term, formula: `code ${code} labour & consumables $${cost}`});
  } else {
    post(S, {key: r.id + ':ghH', kind: 'rev', cat: 'Ground handling (handler)', desc: 'Handling fee to handler ' + lab, rot: r.id, payer: 'Airline', payee: 'Ground handler', usd: fee, status: ps, formula: `$${fee}`});
    post(S, {key: r.id + ':ghCon', kind: 'rev', cat: 'Ground handling', desc: 'Handling concession ' + lab, rot: r.id, payer: 'Ground handler', payee: 'Airport', usd: fee * c.handlingConcessionPct / 100, status: 'accrued', formula: `$${fee} × ${c.handlingConcessionPct}% concession`});
  }
}

// -------- P&L --------
function pnl(S) {
  const rev = {}, cost = {}, memo = {waived: 0, deferred: 0, estimate: 0, disputed: 0, paid: 0, invoiced: 0, accrued: 0}, other = {};
  let gross = 0, varC = 0, fixC = 0;
  for (const e of S.L) {
    if (e.kind == 'rev' && e.payee == 'Airport') {
      memo[e.status] = (memo[e.status] || 0) + e.usd;
      if (['accrued', 'invoiced', 'paid', 'disputed'].includes(e.status)) {rev[e.cat] = (rev[e.cat] || 0) + e.usd; gross += e.usd}
    } else if (e.kind == 'cost' && e.bearer == 'Airport') {cost[e.cat] = (cost[e.cat] || 0) + e.usd; e.variable ? varC += e.usd : fixC += e.usd}
    else if (e.kind == 'cost') other[e.bearer] = (other[e.bearer] || 0) + e.usd;
  }
  for (const k in S.cc) {const v = S.cc[k]; cost[k] = (cost[k] || 0) + v.usd; v.variable ? varC += v.usd : fixC += v.usd}
  const provision = memo.disputed * S.cfg.disputeProvisionPct / 100, net = gross - provision, contrib = net - varC, op = contrib - fixC;
  const turns = S.R.filter(r => r.offBlk != null && r.offBlk >= 0).length, hrs = Math.max(1 / 60, S.t / 60);
  return {rev, cost, memo, other, gross, provision, net, varC, fixC, contrib, op, turns, hrs, costTot: varC + fixC,
    perTurn: turns ? (varC + fixC) / turns : 0, perHr: (varC + fixC) / hrs};
}
function addCC(S, cat, usdAmt, variable, term) {
  const v = S.cc[cat] || (S.cc[cat] = {usd: 0, variable}); v.usd += usdAmt;
  if (term) {const T = S.ccT[term] || (S.ccT[term] = {}); T[cat] = (T[cat] || 0) + usdAmt}
}
// estimated revenue still to come from scheduled movements inside the sim day (forecast, not recognised)
function futureRevenue(S) {
  const c = S.cfg; let v = 0;
  for (const r of S.R) {const T = AC_TYPES[r.type];
    if (r.arr && r.onBlk == null && r.arr.sta < DAY_END && !r.diverted) v += Math.max(c.landing.minUsd, T.mtow * c.landing.usdPerTonne) * (c.landing.mult[r.op] || 1);
    if (r.dep && r.offBlk == null && r.dep.std < DAY_END) v += r.paxOut * (c.paxUsd + c.secUsd) + (c.handler == 'airport' ? c.handling.usd[T.code] || 0 : 0)}
  return v;
}

// -------- energy & utilities (simulated meters) --------
const ENCATS = {hvac: 'HVAC & cooling', light: 'Lighting', vert: 'Escalators & elevators', base: 'Terminal base load', conv: 'Baggage conveyors', agl: 'Airfield ground lighting', gpu: 'Aircraft ground power', ev: 'EV / e-GSE charging'};
function tempAt(t) {const h = (360 + t) / 60; return 27 + 9 * Math.sin(2 * Math.PI * (h - 9) / 24)}
function elecRate(S, t) {const h = hourOf(t), e = S.cfg.elec; return h >= e.peakFrom && h < e.peakTo ? e.peakEgp : e.offpeakEgp}
const SEGN = {ci: ['Check-in conveyors', 'checkin'], eds: ['EDS screening line', 'eds'], sort: ['Sorter', 'sorter'], mk: ['Make-up carousels', 'makeup'], rc: ['Reclaim belts', 'reclaim']};
function aglKw(S) { // airfield ground lighting: runway + taxiway circuits by darkness / visibility / runway status
  const A = S.cfg.agl, h = hourOf(S.t), night = !(h >= 7 && h < 17), lvp = S.wx.vis < 3; let kw = 0;
  for (const k of [1, 2]) kw += S.rw[k].open ? (night ? A.rwyNight : lvp ? A.rwyLvp : A.standby) : A.standby;
  return kw + (night ? A.twyNight : lvp ? A.twyNight * .6 : A.standby);
}
function energyTick(S) {
  const c = S.cfg, E = S.en, temp = S.wx.temp, h = hourOf(S.t), day = h >= 7 && h < 17, rate = elecRate(S, S.t), sw = S.sw || {};
  let kwTot = 0;
  // kWh are metered per tariff band (p = peak, o = off-peak) so costs can be re-priced whenever a tariff is edited
  const band = h >= c.elec.peakFrom && h < c.elec.peakTo ? 'p' : 'o', X = (k, kw) => {const x = E.x[k] || (E.x[k] = {p: 0, o: 0}); x[band] += kw / 60};
  const hr = E.hourly[h] || (E.hourly[h] = {kwh: 0, cost: 0, diesel: 0, dieselA: 0, water: 0, kwMax: 0, cat: {}, term: {}, band});
  const nowT = {}, exp = {}, expT = {}, wNow = {conv: 0, T: {}};
  // kw = metered draw, kwE = expected draw without equipment anomalies; operator switches (S.sw) scale both
  const add = (cat, term, kw, kwE = kw) => {const f = sw[term + ':' + cat] ?? 1; kw *= f; kwE *= f; const kwh = kw / 60; E.kwh[cat] = (E.kwh[cat] || 0) + kwh; E.kwhT[term] = E.kwhT[term] || {}; E.kwhT[term][cat] = (E.kwhT[term][cat] || 0) + kwh; kwTot += kw;
    const B = E.kwhB[cat] || (E.kwhB[cat] = {p: 0, o: 0}); B[band] += kwh; const BT = E.kwhBT[term] || (E.kwhBT[term] = {p: 0, o: 0}); BT[band] += kwh; E.now[cat] = (E.now[cat] || 0) + kw;
    nowT[term] = (nowT[term] || 0) + kw; exp[cat] = (exp[cat] || 0) + kwE; expT[term] = (expT[term] || 0) + kwE; hr.cat[cat] = (hr.cat[cat] || 0) + kwh; hr.term[term] = (hr.term[term] || 0) + kwh};
  E.now = {};
  for (const T of TERMS) {const P = c.power[T], occ = S.occ[T] || 0, sp = S.spike && S.spike.term == T ? S.spike.mult : 1, f = k => sw[T + ':' + k] ?? 1;
    const hv0 = (P.hvac * clamp(.35 + .045 * (temp - 20), .3, 1.25) + occ * c.hvacPaxKw) * sp, hv = hv0 * (S.meas.hvac ? .91 : 1), lt0 = P.light * (day ? .55 : 1), lt = lt0 * (S.meas.led ? .55 : 1);
    if (sp > 1) X('spike', (hv - hv / sp) * f('hvac')); if (S.eco) X('save', (hv0 - hv) * f('hvac') + (lt0 - lt) * f('light'));
    add('hvac', T, hv, hv / sp); add('light', T, lt); add('vert', T, P.esc * c.escKw * (.35 + .65 * Math.min(1, occ / 1500))); add('base', T, P.base * (.85 + .15 * Math.min(1, occ / 1500)));
    // waste: conditioning / lighting a (nearly) empty terminal above standby level
    const u = occ < c.waste.occMin ? 1 - occ / c.waste.occMin : 0, wh = Math.max(0, hv * f('hvac') - P.hvac * c.waste.hvacStandby) * u, wl = lt * f('light') * (1 - c.waste.lightMin) * u;
    if (wh) X('wHvac', wh); if (wl) X('wLight', wl); wNow.T[T] = {hvac: wh, light: wl, occ};
    E.waterM3 += occ * c.waterM3Pax / 60 + hv * f('hvac') / 60 / 1000 * c.coolingM3PerMWh}
  // conveyors: running when bags present, idle factor otherwise; stopped segments during fault; S.convX = abnormal draw (e.g. dragging bearings)
  const C = c.conveyorKw, act = S.bagAct, idle = S.meas.bhs ? .1 : c.convIdleFactor, run = seg => act[seg] ? 1 : idle, sortOn = !(S.bhs.fault && !S.bhs.manual);
  const cv0 = C.checkin * run('ci') + C.eds * run('eds') + (sortOn ? C.sorter * run('sort') : 0) + C.makeup * run('mk') + C.reclaim * run('rc'), cm = S.convX ? S.convX.mult : 1;
  if (cm > 1) X('conv', cv0 * (cm - 1));
  if (S.eco && S.meas.bhs) {const rn = seg => act[seg] ? 1 : c.convIdleFactor; X('save', C.checkin * rn('ci') + C.eds * rn('eds') + (sortOn ? C.sorter * rn('sort') : 0) + C.makeup * rn('mk') + C.reclaim * rn('rc') - cv0)}
  for (const k in SEGN) if (!act[k] && (k != 'sort' || sortOn)) wNow.conv += C[SEGN[k][1]] * idle; if (wNow.conv) X('wIdle', wNow.conv);
  add('conv', 'BHS', cv0 * cm, cv0);
  if (!S.bhs.fault) S.bhsRunMin++;
  const agl = aglKw(S); add('agl', 'Airfield', agl);
  add('gpu', 'Apron', S.gpuOn * c.gpuKw);
  const ev = S.evKw; add('ev', 'Depot', ev); S.evKw = 0;
  E.kwTot = kwTot; E.series.push(kwTot); E.nowT = nowT; E.exp = exp; E.expT = expT; E.wNow = wNow;
  for (const k in nowT) (E.serT[k] || (E.serT[k] = [])).push(nowT[k]);
  for (const k in E.now) (E.serC[k] || (E.serC[k] = [])).push(E.now[k]);
  const k15 = E.series.slice(-15), avg = k15.reduce((a, b) => a + b, 0) / k15.length; E.kw15 = avg;
  if (avg > E.peakKw) {E.peakKw = avg; E.peakT = S.t}
  hr.kwh += kwTot / 60; hr.cost += kwTot / 60 * rate; hr.kwMax = Math.max(hr.kwMax, kwTot);
  const dsl = E.dieselAirportL + E.dieselOtherL; hr.diesel += dsl - (E._dsl || 0); hr.dieselA += E.dieselAirportL - (E._dslA || 0); hr.water += E.waterM3 - (E._w || 0); E._dsl = dsl; E._dslA = E.dieselAirportL; E._w = E.waterM3;
  enEvents(S, {agl, ev, act, sortOn, idle});
  if (S.live && S.t % 5 == 0) enAlerts(S);
  // staff, fixed facility & contracted services (per minute)
  for (const k in c.staff) {const [n, r] = c.staff[k]; addCC(S, 'Staff costs', egp2usd(S, n * r / 60), 0, ['T1', 'T2', 'T3', 'STC'].includes(k) ? k : k == 'BHS' ? 'BHS' : 'Airside')}
  addCC(S, 'Facility maintenance', c.maint.facilityUsdHr / 60, 0, 'Airside');
  addCC(S, 'Contracted services', c.contractedUsdHr / 60, 0);
  if (!S.bhs.fault) addCC(S, 'Baggage system maintenance', c.maint.bhsUsdRunHr / 60, 1, 'BHS');
}
// live energy event feed: what switched on/off and why the load moved (derived from engine state, minute by minute)
function enEvents(S, o) {
  const E = S.en, c = S.cfg, pv = E.pv, log = (msg, kw, area) => {E.log.unshift({t: S.t, msg, kw: Math.round(kw), area}); if (E.log.length > 150) E.log.pop()};
  if (pv) {
    if (S.gpuOn != pv.gpu) log(`400 Hz ground power: ${pv.gpu} → ${S.gpuOn} aircraft connected`, (S.gpuOn - pv.gpu) * c.gpuKw, 'Apron');
    for (const k in SEGN) {const on = !!o.act[k] && (k != 'sort' || o.sortOn), was = pv.seg[k]; if (on != was) log(`${SEGN[k][0]} ${on ? 'running — bags present' : k == 'sort' && !o.sortOn ? 'stopped (fault)' : 'idle — no bags'}`, (on ? 1 : -1) * c.conveyorKw[SEGN[k][1]] * (1 - (k == 'sort' && !o.sortOn ? 0 : o.idle)), 'BHS')}
    if ((o.ev > 0) != pv.ev) log(o.ev > 0 ? 'EV / e-GSE charging started at the depot' : 'EV / e-GSE charging finished', o.ev > 0 ? o.ev : -pv.evKw, 'Depot');
    if (Math.abs(o.agl - pv.agl) > 1) log(`Airfield lighting ${o.agl > pv.agl ? 'up' : 'down'} (${hourOf(S.t) >= 17 || hourOf(S.t) < 7 ? 'darkness' : S.wx.vis < 3 ? 'low visibility' : 'daylight'}${!S.rw[1].open || !S.rw[2].open ? ', runway closed' : ''})`, o.agl - pv.agl, 'Airfield');
    if (!!S.spike != pv.spike) log(S.spike ? `Chiller control fault — ${S.spike.term} HVAC ×${S.spike.mult}` : 'Chiller restored — HVAC back to normal', 0, S.spike ? S.spike.term : 'T3');
    if (!!S.convX != pv.convX) log(S.convX ? 'Conveyor drive drawing above normal (anomaly)' : 'Conveyor draw back to normal', 0, 'BHS');
    if (!!S.eco != pv.eco) log(S.eco ? 'Energy-saving intervention started (LED dimming, HVAC setpoint, idle-stop)' : 'Energy-saving intervention ended', 0, 'All');
    if (S.t % 5 == 0) for (const T of TERMS) {const d = (S.occ[T] || 0) - (pv.occ[T] || 0); if (Math.abs(d) >= 60) log(`${T} occupancy ${d > 0 ? '+' : ''}${Math.round(d)} people (${d > 0 ? 'arrivals / check-in wave' : 'departures boarded'}) → HVAC ${d > 0 ? '+' : ''}${Math.round(d * c.hvacPaxKw)} kW`, d * c.hvacPaxKw, T)}
  }
  const seg = {}; for (const k in SEGN) seg[k] = !!o.act[k] && (k != 'sort' || o.sortOn);
  E.pv = {gpu: S.gpuOn, seg, ev: o.ev > 0, evKw: o.ev, agl: o.agl, spike: !!S.spike, convX: !!S.convX, eco: !!S.eco, occ: S.t % 5 == 0 || !pv ? {...S.occ} : pv.occ};
}
// rule-based efficiency findings from the meters (no AI): abnormal draw, waste, peak demand
function enFindings(S) {
  const E = S.en, c = S.cfg, out = [], W = E.wNow || {conv: 0, T: {}}, yr = kw => kw * 24 * 365;
  for (const k in E.now) {const a = E.now[k], e = (E.exp || {})[k] || 0; if (e > 0 && a > e * 1.15 && a - e > 30) out.push({type: 'abnormal', key: 'an:' + k, sev: 'wn', sys: ENCATS[k], kw: a - e, msg: `${ENCATS[k]} drawing ${Math.round(a)} kW vs ${Math.round(e)} kW expected (+${Math.round(100 * (a / e - 1))}%)`, fix: k == 'hvac' ? 'Check chiller controls / sequencing' : k == 'conv' ? 'Inspect drive & bearings; schedule repair' : 'Investigate circuit'})}
  const lim = c.elec.peakLimitKw; if (E.kw15 > lim * c.elec.peakWarnPct / 100) out.push({type: 'peak', key: 'peak', sev: E.kw15 > lim ? 'cr' : 'wn', sys: 'Site demand', kw: E.kw15 - lim * c.elec.peakWarnPct / 100, msg: `15-min demand ${Math.round(E.kw15)} kW vs ${lim} kW contracted capacity (${Math.round(100 * E.kw15 / lim)}%)`, fix: 'Shed non-critical loads: pre-cool, defer EV charging, stage chillers'});
  if (W.conv > 0) out.push({type: 'waste', key: 'w:conv', sev: 'info', sys: 'Baggage conveyors', kw: W.conv, msg: `Conveyor segments running empty: ${Math.round(W.conv)} kW`, fix: 'Conveyor idle-stop (sleep mode)'});
  for (const T in W.T) {const w = W.T[T]; if (w.hvac + w.light > 5) out.push({type: 'waste', key: 'w:' + T, sev: 'info', sys: T, kw: w.hvac + w.light, msg: `${T} nearly empty (${Math.round(w.occ)} people) — HVAC ${Math.round(w.hvac)} kW + lighting ${Math.round(w.light)} kW above standby`, fix: 'Occupancy-based setback / zone switching'})}
  for (const f of out) f.usdYr = egp2usd(S, yr(f.kw) * c.elec.offpeakEgp);
  return out;
}
function enAlerts(S) {
  const E = S.en, F = enFindings(S), on = {};
  for (const f of F) {if (f.type == 'waste') continue; on[f.key] = 1; if (!E.alk[f.key]) {E.alk[f.key] = S.t; alrt(S, f.sev, 'Energy', f.msg, f.fix, 'Energy manager', {k: 'enrule'})}}
  for (const k in E.alk) if (!on[k] && S.t - E.alk[k] > 10) delete E.alk[k];
}
// operator equipment switching (demo control) — airfield lighting cannot be switched off while a runway is open after dark
const SW_OPT = {light: [1, .2, 'Lighting', 'full', 'minimum safe lighting (20%)'], vert: [1, 0, 'Escalators & elevators', 'running', 'stopped'], hvac: [1, .6, 'HVAC', 'normal', 'setback (60%)']};
function swSet(S, term, cat, on, by) {
  const o = SW_OPT[cat]; if (!o) return 'Not switchable';
  const f = on ? o[0] : o[1]; if ((S.sw[term + ':' + cat] ?? 1) == f) return null;
  if (f == 1) delete S.sw[term + ':' + cat]; else S.sw[term + ':' + cat] = f;
  if (cat == 'vert' && !on && (S.occ[term] || 0) > 400) alrt(S, 'wn', 'Energy', `${term} escalators stopped with ${Math.round(S.occ[term])} people in the terminal`, 'Check accessibility & crowding', 'Terminal duty manager');
  S.en.log.unshift({t: S.t, msg: `${term} ${o[2]} switched to ${on ? o[3] : o[4]} by ${by}`, kw: 0, area: term}); return null;
}
const bandEgp = (S, B) => B ? B.p * S.cfg.elec.peakEgp + B.o * S.cfg.elec.offpeakEgp : 0;
function elecReprice(S) { // electricity cost = metered kWh per band × the CURRENT tariff (one source of truth for every view and the P&L)
  const E = S.en; let tot = 0;
  for (const k in E.kwhB) {E.cost[k] = bandEgp(S, E.kwhB[k]); tot += E.cost[k]}
  S.cc['Electricity'] = {usd: egp2usd(S, tot), variable: 1};
  for (const t in E.kwhBT) {const T = S.ccT[t] || (S.ccT[t] = {}); T['Electricity'] = egp2usd(S, bandEgp(S, E.kwhBT[t]))}
}
function energyFinal(S) { // derived totals, recomputed on demand (water/waste/diesel/demand are posted here to keep one source of truth)
  elecReprice(S);
  const c = S.cfg, E = S.en, kwh = Object.values(E.kwh).reduce((a, b) => a + b, 0), elecEgp = Object.values(E.cost).reduce((a, b) => a + b, 0);
  const demandEgp = E.peakKw * c.elec.demandEgpKwMonth / 30 * (S.t / 1440);
  const waterEgp = E.waterM3 * c.waterEgpM3, wasteEgp = E.wasteKg / 1000 * c.wasteEgpT, dieselEgp = E.dieselAirportL * c.dieselEgpL;
  const co2 = kwh * c.gridKgKwh + (E.dieselAirportL + E.dieselOtherL) * c.dieselKgL;
  return {kwh, elecEgp, demandEgp, waterEgp, wasteEgp, dieselEgp, co2, totalEgp: elecEgp + demandEgp + waterEgp + wasteEgp + dieselEgp};
}
function syncUtilityCosts(S) { // water/waste/diesel/demand as running cost accruals
  const f = energyFinal(S);
  S.cc['Water'] = {usd: egp2usd(S, f.waterEgp), variable: 1};
  S.cc['Waste management'] = {usd: egp2usd(S, f.wasteEgp), variable: 1};
  S.cc['Ground vehicle fuel'] = {usd: egp2usd(S, f.dieselEgp), variable: 1};
  S.cc['Electricity demand charge'] = {usd: egp2usd(S, f.demandEgp), variable: 0};
  return f;
}
const MEASURES = [
  {id: 'led', name: 'LED lighting retrofit + daylight dimming', basis: 'light', pct: 45, capexUsd: 1800000, impact: 'Phased night works; no operational impact'},
  {id: 'hvac', name: 'HVAC setpoint +1 °C & occupancy scheduling', basis: 'hvac', pct: 9, capexUsd: 350000, impact: 'Comfort limits must be maintained at peaks'},
  {id: 'bhs', name: 'Conveyor idle-stop (sleep mode)', basis: 'conv', pct: 75, pctOfIdle: true, capexUsd: 220000, impact: 'Restart latency ~3 s per segment'},
  {id: 'egse', name: 'Convert diesel tugs/tractors to electric', basis: 'diesel', pct: 60, capexUsd: 2400000, impact: 'Adds ~3 kWh charging per litre displaced; charger capacity needed'},
  {id: 'pv', name: 'Carport solar PV 8 MWp (grid offset)', basis: 'pv', pct: 0, capexUsd: 6400000, impact: 'No airside impact; glare study required'},
];
