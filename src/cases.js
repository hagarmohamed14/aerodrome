// ===================== REAL-WORLD CASE STUDIES & MAINTENANCE SCHEDULE =====================
// Case summaries are condensed from the official investigation reports cited on each card. They are training
// material, not a substitute for the reports. Drills re-create the airport side of each event at CAI (simulated).
const CASES = [
  {id: 'us1549', cat: 'Bird strike', fl: 'US Airways 1549', date: '15 Jan 2009', ac: 'Airbus A320', where: 'New York LaGuardia → ditched on the Hudson River', aboard: '155 aboard — all survived',
    what: 'About two minutes after take-off, climbing through roughly 2,800 ft, the aircraft flew into a flock of Canada geese. Both engines ingested birds and lost almost all thrust. With too little height and speed to reach LaGuardia or Teterboro, the crew ditched on the Hudson about three and a half minutes after the strike.',
    tl: ['Bird strike, dual loss of thrust at low altitude', 'Captain takes control ("my aircraft"); First Officer starts the engine dual-failure checklist; APU started early for electrical & hydraulic power', 'ATC offers return to LaGuardia, then Teterboro — captain judges neither reachable', 'One short cabin PA: "Brace for impact"', 'Ditching; ferries and first responders reach the aircraft within minutes'],
    calm: ['Clear, immediate division of labour: one pilot flew, the other ran the checklist', 'Decision made early and stated plainly instead of attempting an unreachable runway', 'Controller kept transmissions short and kept offering options without pressure', 'Cabin crew executed their brace & evacuation drills under water-landing conditions'],
    lesson: ['Airport wildlife hazard management (habitat, patrols, strike reporting) is the first line of defence', 'NTSB recommended checklists designed for dual-engine failure at low altitude', 'Rescue capability for water landings on approach/departure paths'],
    src: 'NTSB Aircraft Accident Report NTSB/AAR-10/03', drill: {k: 'birdret'}},
  {id: 'swa1380', cat: 'Engine failure', fl: 'Southwest Airlines 1380', date: '17 Apr 2018', ac: 'Boeing 737-700', where: 'New York LaGuardia → diverted to Philadelphia', aboard: '149 aboard — 1 passenger fatally injured',
    what: 'Climbing through about 32,000 ft, a fan blade in the left CFM56-7B engine separated because of a fatigue crack. Inlet and cowling debris struck the fuselage and broke a cabin window, causing a rapid depressurisation. The crew made an emergency descent and a single-engine diversion to Philadelphia.',
    tl: ['Fan-blade fatigue failure, uncontained cowling debris, window loss, rapid decompression', 'Oxygen masks, emergency descent, engine-failure/fire checklists', 'Diversion to Philadelphia on one engine; passengers and crew pull the injured passenger back into the cabin', 'Landing and stop on the runway; ARFF and medical response'],
    calm: ['The captain\'s radio calls stayed measured and specific ("part of the aircraft missing") — controllers got exactly what they needed', 'Workload split: captain flew, first officer ran the checklists', 'Cabin crew and passengers gave first aid while the flight crew flew the approach'],
    lesson: ['FAA emergency airworthiness directive mandated ultrasonic inspections of CFM56-7B fan blades', 'Inspection intervals must reflect real crack-growth data — a maintenance-schedule lesson', 'Receiving airport: medical response meeting the aircraft at the stand/runway'],
    src: 'NTSB Aircraft Accident Report NTSB/AAR-19/03', drill: {type: 'B738', reason: 'Uncontained engine failure + rapid decompression — single-engine diversion', pax: 144, crew: 5, etaMin: 20, svc: {arff: 1, medical: 1, fuel: 0}, tech: 1, techType: 'ENG', overnight: 1}},
  {id: 'qf32', cat: 'Engine failure', fl: 'Qantas 32', date: '4 Nov 2010', ac: 'Airbus A380', where: 'Singapore → returned to Singapore Changi', aboard: '469 aboard — no injuries',
    what: 'Shortly after departure the No. 2 Trent 900 engine suffered an uncontained turbine-disc failure caused by an oil fire from a fatigue-cracked oil feed pipe (a manufacturing defect). Debris damaged the wing, fuel system, hydraulics and electrics. The crew worked through a long series of system checklists before returning to Singapore with the aircraft heavy and fast. After landing, the No. 1 engine could not be shut down; fire crews eventually stopped it with firefighting foam.',
    tl: ['Uncontained engine failure shortly after take-off', 'Holding while the crew works through many electronic checklist messages and assesses landing performance', 'Overweight, high-speed landing back at Changi with degraded braking', 'No. 1 engine keeps running; fuel leaking near hot brakes — ARFF manage the hazard before disembarkation'],
    calm: ['Five pilots on the flight deck shared the workload deliberately', 'Captain shifted focus from what had failed to what still worked, to build a landing plan', 'Regular, honest PAs to the passengers kept the cabin calm during a long hold'],
    lesson: ['Engine maker inspected and changed engines across the fleet after finding the oil pipe defect', 'Receiving airport: ARFF must be ready for an engine that will not shut down, fuel leaks and hot brakes', 'Keep the runway and a remote parking position available for an extended emergency'],
    src: 'ATSB Transport Safety Report AO-2010-089', drill: {type: 'B77W', reason: 'Uncontained engine failure — return, overweight landing, fuel leak', pax: 440, crew: 29, etaMin: 30, svc: {arff: 1, medical: 0, fuel: 0}, tech: 1, techType: 'ENG', overnight: 1}},
  {id: 'ba38', cat: 'Fuel system', fl: 'British Airways 38', date: '17 Jan 2008', ac: 'Boeing 777-200ER', where: 'Beijing → London Heathrow (landed short of RWY 27L)', aboard: '152 aboard — no fatalities',
    what: 'On final approach both engines failed to respond to thrust demands. Ice that had built up in the fuel system during the long, cold flight was released and restricted fuel flow at the fuel-oil heat exchangers. The aircraft touched down in the grass short of the runway; the landing gear collapsed.',
    tl: ['Loss of thrust on both engines at low height on final', 'First officer keeps flying; captain reduces flap setting to cut drag and stretch the glide over the airport boundary', 'Touchdown in the grass ~330 m short of the threshold; gear collapse', 'On-airport ARFF on scene within a minute or two; orderly evacuation'],
    calm: ['Captain made one decisive, unconventional change (flap reduction) and let the first officer continue flying', 'No time for checklists — trained instinct and calm hand-over of tasks'],
    lesson: ['Engine maker redesigned the fuel-oil heat exchanger; interim operating procedures were issued', 'Undershoot area & runway-end safety areas matter: keep them clear of obstacles', 'On-airport ARFF response time is critical'],
    src: 'UK AAIB Aircraft Accident Report 1/2010', drill: {type: 'B77W', reason: 'Dual engine thrust rollback on final — full emergency', pax: 136, crew: 16, etaMin: 8, svc: {arff: 1, medical: 1, fuel: 0}, tech: 1, techType: 'HYD', overnight: 1}},
  {id: 'ts236', cat: 'Maintenance', fl: 'Air Transat 236', date: '24 Aug 2001', ac: 'Airbus A330-200', where: 'Toronto → glided to Lajes, Azores', aboard: '306 aboard — all survived',
    what: 'During an earlier engine change, a hydraulic line that did not match that engine\'s configuration was fitted. In flight it chafed a fuel line, causing a large fuel leak. The leak was not recognised at first, and opening the fuel crossfeed sent more fuel into it. Both engines flamed out over the Atlantic; the crew glided for about 19 minutes and landed at Lajes Air Base.',
    tl: ['Unusual fuel indications; fuel imbalance; crossfeed opened', 'Right engine, then left engine flame out — no engine power', 'Glide of roughly 65 NM; S-turns and a 360° turn to lose excess height', 'Hard landing at Lajes, tyres burst; evacuation'],
    calm: ['Once committed, the crew flew a disciplined glide approach with precise energy management', 'Cabin was prepared for a possible ditching while the flight deck flew'],
    lesson: ['Maintenance error: the fitted part was not the correct configuration for that engine', 'Part-configuration control and service-bulletin compliance must be checked at every engine change', 'Operators added fuel-leak procedures (check fuel balance before using crossfeed)'],
    src: 'Portuguese GPIAA final report on the C-GITS accident', drill: {type: 'A330', reason: 'Fuel leak — dual engine flameout, glide approach', pax: 293, crew: 13, etaMin: 15, svc: {arff: 1, medical: 1, fuel: 0}, tech: 1, techType: 'HYD', overnight: 1}},
  {id: 'ba9', cat: 'Environment', fl: 'British Airways 9', date: '24 Jun 1982', ac: 'Boeing 747-200', where: 'Kuala Lumpur → Perth leg, diverted to Jakarta', aboard: '263 aboard — all survived',
    what: 'At night over Java the aircraft flew into an ash cloud from Mount Galunggung. All four engines flamed out. The 747 glided for many minutes while the crew repeatedly attempted restarts; after descending out of the ash the engines restarted and the crew landed at Jakarta with a sand-blasted windscreen.',
    tl: ['St Elmo\'s fire and acrid smell; all four engines stop', 'Glide and repeated restart attempts', 'Engines restart below the ash cloud', 'Approach to Jakarta flown largely through the edges of the windscreen'],
    calm: ['The captain\'s PA has become a classic of calm communication: "Ladies and gentlemen, this is your captain speaking. We have a small problem. All four engines have stopped. We are doing our damnedest to get them going again. I trust you are not in too much distress."', 'Understatement and honesty kept the cabin calm while the crew worked'],
    lesson: ['Led to the global network of Volcanic Ash Advisory Centres', 'Airports: sandstorms and ash both demand runway inspections and engine/ingestion awareness'],
    src: 'UK Air Accidents Investigation Branch records; widely documented', drill: {type: 'B77W', reason: 'Multiple engine flameout after ash encounter — restarted, inspection required', pax: 248, crew: 15, etaMin: 25, svc: {arff: 1, medical: 0, fuel: 0}, tech: 1, techType: 'BRD', overnight: 1}},
  {id: 'ua232', cat: 'Maintenance', fl: 'United Airlines 232', date: '19 Jul 1989', ac: 'McDonnell Douglas DC-10', where: 'Denver → crash-landed at Sioux City', aboard: '296 aboard — 184 survived, 112 died',
    what: 'In cruise, the fan disk of the tail-mounted engine broke apart because of a manufacturing flaw and a fatigue crack that inspections had not found. The debris cut all three hydraulic systems, leaving no conventional flight controls. The crew, joined by an off-duty training captain, steered with engine thrust alone for about 40 minutes and crash-landed at Sioux City.',
    tl: ['Uncontained No. 2 engine failure; total hydraulic loss', 'Off-duty DC-10 instructor joins the flight deck and works the throttles', 'Wide right turns towards Sioux City using differential thrust', 'Crash landing; Sioux City\'s rescue and hospital plan, rehearsed two years earlier, is activated'],
    calm: ['Captain asked for and accepted help — a landmark example of crew resource management (CRM)', 'Calm, even humorous exchanges with the controller under extreme stress', 'Sioux City\'s prior disaster drill meant fire, rescue and hospitals were ready'],
    lesson: ['Inspection techniques for rotating engine parts were improved after this accident', 'Airport emergency plans must be exercised — the 1987 Sioux City drill saved lives', 'Mass-casualty capacity: ambulances, triage areas and hospital coordination'],
    src: 'NTSB Aircraft Accident Report NTSB/AAR-90/06', drill: {type: 'B77W', reason: 'Total hydraulic failure — controlled crash landing, mass-casualty standby', pax: 285, crew: 11, etaMin: 35, svc: {arff: 1, medical: 1, fuel: 0}, tech: 1, techType: 'HYD', overnight: 1}},
  {id: 'aq243', cat: 'Maintenance', fl: 'Aloha Airlines 243', date: '28 Apr 1988', ac: 'Boeing 737-200', where: 'Hilo → diverted to Kahului, Maui', aboard: '95 aboard — 1 flight attendant died',
    what: 'At about 24,000 ft a large section of the upper fuselage tore away. The aircraft had flown a very high number of short, pressurised island flights, and the maintenance inspection programme had not detected fatigue cracking and corrosion in the fuselage lap joints. The crew landed at Kahului; a flight attendant was swept from the cabin.',
    tl: ['Explosive decompression; roof section lost', 'Crew communicates with hand signals because of the noise', 'Emergency descent and diversion to Kahului; nose-gear indication uncertain', 'Landing; ARFF and medical response'],
    calm: ['The crew flew a severely damaged aircraft to a landing without knowing its full condition', 'Flight attendants cared for injured passengers in an open cabin'],
    lesson: ['Started the aging-aircraft programme: inspections now depend on flight cycles, not only hours or calendar time', 'A maintenance schedule is only as good as the inspection behind each task', 'Receiving airport: plan for multiple injured passengers on a small aircraft'],
    src: 'NTSB Aircraft Accident Report NTSB/AAR-89/03', drill: {type: 'B738', reason: 'Structural failure — rapid decompression, injured on board', pax: 89, crew: 6, etaMin: 18, svc: {arff: 1, medical: 1, fuel: 0}, tech: 1, techType: 'GSE', overnight: 1}},
];
const COMPOSURE = [
  ['Aviate, navigate, communicate', 'Fly the aircraft first. Every crew above kept someone flying while others handled the problem.'],
  ['Pause before acting', 'A few seconds to confirm the right engine and the right checklist prevents shutting down the good engine.'],
  ['Say who does what', '"My aircraft / your aircraft" and clear task splits stop two people doing the same thing — or neither.'],
  ['Use the checklist, then think beyond it', 'Checklists handle the known; QF32 and BA38 show when judgement has to take over.'],
  ['Closed-loop, plain communication', 'Short calls, read-backs, standard phrases: MAYDAY ×3 for distress, PAN-PAN for urgency.'],
  ['Tell the cabin early and honestly', 'BA9\'s "small problem" PA shows how calm honesty prevents panic.'],
  ['Accept help', 'United 232\'s captain welcomed an extra pilot — crew resource management in practice.'],
  ['For ATC & the airport: ASSIST', 'Acknowledge · Separate · Silence (keep the frequency quiet) · Inform (ARFF, duty manager) · Support · Time (let the crew think).'],
];
const YOURS = {title: 'Your scenario — bird strike, engine fire, single-engine return to CAI', note: 'CAI training scenario built from the example you described (not a real event). Note: kiwis are flightless, so in reality the bird would be something like a goose, gull, kite or egret.',
  tl: [['Crew', 'Bird strike on climb-out; loud bang, vibration, ENG 1 fire warning'], ['Crew', 'Fly the aircraft — stop the climb at a safe altitude, maintain speed, confirm the affected engine'], ['Crew', 'Engine fire procedure: thrust lever idle, fuel control off, fire switch, discharge bottle; second bottle if the warning persists (per the type\'s QRH)'],
    ['Crew → ATC', 'MAYDAY ×3, intentions: return for landing; request ARFF; souls on board & fuel'], ['ATC', 'Priority vectors, other traffic held; the departure runway closed for debris & bird-remains inspection; landing on the other runway'],
    ['Airport', 'Full emergency: ARFF to standby positions, medical team alerted, stand at the MRO apron reserved'], ['Crew', 'Overweight-landing assessment, single-engine approach briefing, cabin briefed (NITS: nature, intentions, time, special instructions)'],
    ['ARFF', 'Aircraft stops on the runway; ARFF checks the engine and brakes; captain decides between disembarking at the stand and evacuating'], ['Maintenance', 'Engine-fire and bird-ingestion work order: borescope, likely engine change; aircraft AOG'],
    ['Airport', 'Wildlife team collects remains for species ID; patrols intensified; the safety report starts the investigation']],
};
let caseCat = '';
VIEWS['saf.cases'] = {sub: 'Documented real incidents (from official investigation reports): what happened, how the crews kept their composure, and what airports & maintenance learned. Each can be rehearsed as a CAI drill.',
  html: () => `<div class="g g2" style="margin-bottom:12px"><div class="card case"><div class="ch">${esc(YOURS.title)}<span class="sp"></span><span class="tag">training scenario</span></div>
    <p class="note" style="margin-top:0">${esc(YOURS.note)}</p><div class="steps">${YOURS.tl.map(([w, m], i) => `<div><i>${i + 1}</i><b>${w}</b><span>${esc(m)}</span></div>`).join('')}</div>
    <div class="row" style="margin-top:10px"><button class="btn pri" onclick="runCase('yours')">▶ Run at CAI now</button><span class="mu sm">Uses the most recent departure; closes its runway for inspection; MAYDAY return with ARFF & an engine-change work order.</span></div></div>
    <div class="card"><div class="ch">Staying composed — what these crews did</div>${COMPOSURE.map(([h, t]) => `<div class="cp"><b>${h}</b><span>${esc(t)}</span></div>`).join('')}</div></div>
  <div class="row" style="margin-bottom:10px"><span class="mu sm">Filter</span><div class="seg">${['', 'Bird strike', 'Engine failure', 'Fuel system', 'Maintenance', 'Environment'].map(c => `<button class="${caseCat == c ? 'on' : ''}" onclick="caseCat='${c}';renderPage()">${c || 'All'}</button>`).join('')}</div><span class="sp"></span><span class="mu sm">Summaries condensed from the cited reports — read the full reports for training use.</span></div>
  <div class="g g2">${CASES.filter(c => !caseCat || c.cat == caseCat).map(c => `<div class="card case"><div class="ch"><span style="color:var(--tx);text-transform:none;font-size:14px">${c.fl}</span><span class="sp"></span>${bd(c.cat, c.cat == 'Maintenance' ? 'wn' : 'in')}</div>
    <div class="kv"><span>Date</span><b>${c.date}</b><span>Aircraft</span><b>${c.ac}</b><span>Route</span><b>${c.where}</b><span>Outcome</span><b>${c.aboard}</b></div>
    <p>${esc(c.what)}</p><h4>Sequence</h4><ol>${c.tl.map(x => `<li>${esc(x)}</li>`).join('')}</ol>
    <h4>Composure & crew resource management</h4><ul>${c.calm.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
    <h4>Airport & maintenance lessons</h4><ul>${c.lesson.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
    <div class="row" style="margin-top:8px"><span class="mu sm">Source: ${esc(c.src)}</span><span class="sp"></span><button class="btn" onclick="runCase('${c.id}')">▶ Rehearse at CAI</button></div></div>`).join('')}</div>
  <div class="card" style="margin-top:12px"><div class="ch">Drills run this session</div><div data-live="drillList"></div></div>`};
let drillN = 0;
function runCase(id) {
  if (!can()) return;
  if (id == 'yours' || CASES.find(c => c.id == id).drill.k == 'birdret') {
    if (!confirm('Run the bird strike → engine fire → single-engine return scenario?\n\nThis closes the departure runway for inspection and declares a MAYDAY return (simulated).')) return;
    scn(S, 'birdret', role); audit('Drill: bird strike return' + (id == 'yours' ? '' : ' (modeled on ' + CASES.find(c => c.id == id).fl + ')')); go('saf', 'emerg'); return}
  const c = CASES.find(x => x.id == id), o = c.drill;
  if (!confirm(`Start a CAI drill modeled on ${c.fl}?\n\n${o.reason}\n\nA simulated emergency request will be created for the duty manager to assess.`)) return;
  const d = newDiversion(S, Object.assign({fl: 'DRILL ' + pad(++drillN), reg: 'DRL-' + pad(drillN), op: 'Training drill (modeled on ' + c.fl + ')', origin: 'FIR', dest: '—', mayday: 1, drillOf: c.fl}, o));
  d.log.push([S.t, 'Drill modeled on ' + c.fl + ' (' + c.date + '). Landing priority is not subject to approval.']);
  audit('Drill started: ' + c.fl); go('saf', 'emerg');
}
LIVE.drillList = () => {const l = S.div.filter(d => d.mayday); return l.length ? `<table><tr><th>Flight</th><th>Modeled on</th><th>Reason</th><th>Status</th><th>Stand</th></tr>${l.map(d => `<tr class="r" onclick="inspect('div','${d.id}')"><td>${d.fl}</td><td>${d.drillOf || 'Your scenario'}</td><td class="sm">${esc(d.reason)}</td><td>${bd(d.status, d.status == 'ACCEPTED' ? 'vi' : 'cr')}</td><td>${d.stand || '—'}</td></tr>`).join('')}</table>` : '<div class="empty">No drills yet — press ▶ on any case.</div>'};

// ---------- MAINTENANCE SCHEDULE ----------
// Aircraft check intervals are ILLUSTRATIVE; real intervals come from each operator's approved maintenance programme (AMP), based on the manufacturer's MPD.
const CHECKS = {C: {daily: 48, A: 750, util: 11, aDur: 8}, E: {daily: 48, A: 1000, util: 14, aDur: 10}, B: {daily: 48, A: 600, util: 3, aDur: 6}};
const SIMDATE = new Date(2026, 9, 20);
const dstr = days => {const d = new Date(SIMDATE.getTime() + days * 864e5); return d.toLocaleDateString('en-GB', {day: '2-digit', month: 'short'})};
function acPlan() {
  const seen = {}, out = [];
  for (const r of S.R) {if (!r.reg || seen[r.reg] || r.op == 'diversion') continue; seen[r.reg] = 1;
    const T = AC_TYPES[r.type], C = CHECKS[T.code], h = hash(r.reg + 'mx') >>> 0;
    let aRem = C.A * (.04 + (h % 1000) / 1000 * .94);
    const night = !r.dep; // night-stopping at CAI tonight
    const dailyRem = 4 + (h >>> 4) % 44, cMonths = (h >>> 7) % 24, mel = S.defects.filter(d => d.r == r.id && d.status == 'MEL — RELEASED'), open = S.defects.filter(d => d.r == r.id && !/RELEASED/.test(d.status));
    out.push({r, reg: r.reg, type: r.type, code: T.code, al: r.al, C, aRem, aDays: aRem / C.util, dailyRem, cDue: 24 - cMonths, mel, open, night})}
  // hangar slots tonight: the night-stop aircraft closest to its A-check goes into M1, a second into M2
  const ns = out.filter(x => x.night).sort((a, b) => a.aRem - b.aRem);
  if (ns[0]) {ns[0].aRem = Math.min(ns[0].aRem, ns[0].C.util * .6); ns[0].aDays = ns[0].aRem / ns[0].C.util; ns[0].slot = 'M1'}
  if (ns[1]) ns[1].slot = 'M2';
  for (const x of out) {x.aDays = x.aRem / x.C.util; x.status = x.open.length ? 'UNSCHEDULED WORK' : x.slot == 'M1' ? 'A-CHECK TONIGHT' : x.aDays < 1 ? 'DUE ≤ 24 H — SLOT AT OUTSTATION' : x.aDays < 4 ? 'DUE SOON' : 'IN LIMITS'}
  return out.sort((a, b) => (b.open.length - a.open.length) || a.aDays - b.aDays);
}
VIEWS['ast.sched'] = {sub: 'Planned maintenance: aircraft checks (illustrative intervals) and today\'s airport-asset preventive maintenance, which the simulation executes and which affects stands and vehicles.',
  html: () => `<div class="card" style="margin-bottom:12px"><div class="ch">Today's airport-asset preventive maintenance<span class="sp"></span><span class="tag">live</span></div><div data-live="pmTab" class="tw"></div>
    <p class="note">Stand and vehicle tasks take the asset out of service while worked (allocation avoids closed stands). Ramp tasks pause during a lightning stop. Costs sit in the fixed facility-maintenance budget in the P&L — not posted again.</p></div>
  <div class="card"><div class="ch">Aircraft maintenance programme — next 14 days<span class="sp"></span><span class="tag">illustrative intervals</span></div><div data-live="acSched" class="tw"></div>
    <p class="note">Intervals shown (48 h daily check, A-check ${CHECKS.C.A} FH narrow-body / ${CHECKS.E.A} FH wide-body, C-check 24 months) are typical examples only. Each operator's approved maintenance programme governs. MEL Cat C items must be fixed within 10 calendar days.</p></div>`};
LIVE.pmTab = () => `<table><tr><th>ID</th><th>Asset</th><th>Task</th><th>Frequency</th><th>Window</th><th>Owner</th><th>Impact</th><th>Status</th></tr>${S.pm.map(p => `<tr><td class="mu">${p.id}</td><td><b>${p.asset}</b></td><td class="sm">${p.task}</td><td class="sm">${p.freq}</td><td>${loc(p.start)}–${loc(p.start + p.dur)}${p.t0 != null && p.t0 != p.start ? `<div class="mu sm">started ${loc(p.t0)}</div>` : ''}</td><td class="sm">${p.owner}</td>
  <td class="sm">${p.kind == 'stand' ? 'Stand ' + p.ref + ' closed' : p.kind == 'veh' ? p.ref + ' out of service' : p.start >= DAY_END ? 'After 24:00 — no traffic impact' : 'No capacity impact'}</td>
  <td>${bd(p.st + (p.st == 'WAITING' ? ' — ' + p.why : ''), p.st == 'DONE' ? 'ok' : p.st == 'IN PROGRESS' ? 'in' : p.st == 'WAITING' ? 'wn' : '')}</td></tr>`).join('')}</table>`;
LIVE.acSched = () => {const P = acPlan(), days = 14;
  const cells = x => {let s = ''; for (let d = 0; d < days; d++) {const a = x.aDays >= d && x.aDays < d + 1, dl = d % 2 == 0, c = x.cDue <= 1 && d == 13;
    s += `<td class="dc${a ? ' a' : ''}${c ? ' c' : ''}" title="${dstr(d)}${a ? ' · A-check' : ''}${c ? ' · C-check input' : ''}">${a ? 'A' : c ? 'C' : dl ? '·' : ''}</td>`} return s};
  return `<table class="msch"><tr><th>Reg</th><th>Type</th><th>Operator</th><th class="n">FH to A-check</th><th>A-check due</th><th>Next daily</th><th>C-check</th><th>Deferred / open</th><th>Status</th>${Array.from({length: days}, (_, d) => `<th class="dc">${dstr(d).slice(0, 2)}</th>`).join('')}</tr>
  ${P.map(x => `<tr class="r" onclick="inspect('rot','${x.r.id}')"><td><b>${x.reg}</b></td><td>${x.type}</td><td class="sm">${x.al}</td><td class="n">${Math.round(x.aRem)}</td><td>${x.slot == 'M1' ? 'Tonight · hangar M1' : dstr(Math.floor(x.aDays))}</td><td class="sm">in ${x.dailyRem} h${x.slot == 'M2' ? ' · tonight M2' : ''}</td><td class="sm">${x.cDue <= 1 ? 'input next month' : 'in ' + x.cDue + ' mo'}</td>
  <td class="sm">${x.open.map(d => `<a href="#" onclick="event.stopPropagation();inspect('def','${d.id}');return false" style="color:var(--ac)">${d.wo}</a> ${d.status}`).join(' ')}${x.mel.map(d => `${d.wo} MEL Cat C — fix by ${dstr(10)}`).join(' ')}${!x.open.length && !x.mel.length ? '—' : ''}</td>
  <td>${bd(x.status, x.status == 'IN LIMITS' ? 'ok' : x.status == 'DUE SOON' ? 'wn' : x.status == 'A-CHECK TONIGHT' ? 'in' : x.status.startsWith('DUE') ? 'wn' : 'cr')}</td>${cells(x)}</tr>`).join('')}</table>`};
