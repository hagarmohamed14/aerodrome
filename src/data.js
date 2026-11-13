// ===================== REFERENCE DATA & LAYOUT =====================
// Everything here is ILLUSTRATIVE (not verified Cairo Airport data). Sim time = minutes after 06:00 local.
const DAY_END = 1080, PREROLL = 75;
const $ = s => document.querySelector(s), pad = n => String(n).padStart(2, '0');
function rng(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function hash(s){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
const loc = t => {const m = Math.floor(360 + t); return pad(Math.floor(m/60)%24)+':'+pad(m%60)};
const utc = t => {const m = Math.floor(180 + t); return pad(Math.floor(m/60)%24)+':'+pad(m%60)};
const hourOf = t => Math.floor((360 + t) / 60) % 24;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// size params: ICAO code letter, MTOW (t), wingspan (m), min turnaround (min), typical uplift (L), airline delay cost/min (USD, illustrative)
const AC_TYPES = {
  A320:{code:'C',mtow:78,span:35.8,seats:180,mtt:45,fuel:9000,dcost:60},
  A321:{code:'C',mtow:93,span:35.8,seats:200,mtt:50,fuel:11000,dcost:70},
  B738:{code:'C',mtow:79,span:35.8,seats:180,mtt:45,fuel:9000,dcost:60},
  E190:{code:'C',mtow:51,span:28.7,seats:100,mtt:35,fuel:5000,dcost:45},
  A330:{code:'E',mtow:242,span:60.3,seats:300,mtt:75,fuel:45000,dcost:140},
  B788:{code:'E',mtow:228,span:60.1,seats:250,mtt:75,fuel:40000,dcost:130},
  B789:{code:'E',mtow:254,span:60.1,seats:290,mtt:80,fuel:50000,dcost:145},
  A359:{code:'E',mtow:280,span:64.8,seats:320,mtt:80,fuel:55000,dcost:155},
  B77W:{code:'E',mtow:351,span:64.8,seats:360,mtt:90,fuel:70000,dcost:180},
  G650:{code:'B',mtow:45,span:30.4,seats:14,mtt:30,fuel:6000,dcost:20},
  F7X:{code:'B',mtow:32,span:26.2,seats:12,mtt:30,fuel:4000,dcost:18},
  CL60:{code:'B',mtow:22,span:19.6,seats:10,mtt:30,fuel:3000,dcost:15},
};
const RANK = {B:1, C:2, D:3, E:4, F:5};
// code, name, preferred terminal, types, destinations
const CARRIERS = [
  ['MS','EgyptAir','T3',['A320','A321','B738','B789','A330','B788'],['DXB','JED','RUH','LHR','CDG','FRA','AMM','BEY','ATH','FCO','KWI','DOH','ADD','NBO']],
  ['SV','Saudia','T2',['A320','A321','B789'],['JED','RUH','DMM','MED']],
  ['EK','Emirates','T2',['B77W'],['DXB']],
  ['QR','Qatar Airways','T2',['A320','B788','A359'],['DOH']],
  ['TK','Turkish Airlines','T3',['B738','A321','A330'],['IST','SAW']],
  ['LH','Lufthansa','T3',['A321','A320'],['FRA','MUC']],
  ['ET','Ethiopian','T3',['B738','B788'],['ADD']],
  ['KU','Kuwait Airways','T2',['A320'],['KWI']],
  ['XY','flynas','T1',['A320'],['RUH','JED','DMM']],
  ['G9','Air Arabia','T1',['A320'],['SHJ']],
  ['NP','Nile Air','T1',['A320','E190'],['JED','KWI','RUH']],
  ['RJ','Royal Jordanian','T2',['A320','E190'],['AMM']],
  ['GF','Gulf Air','T2',['A321'],['BAH']],
];

const REGP={MS:'SU-G',SV:'HZ-A',EK:'A6-E',QR:'A7-A',TK:'TC-J',LH:'D-AI',ET:'ET-A',KU:'9K-A',XY:'HZ-N',G9:'A6-A',NP:'SU-B',RJ:'JY-A',GF:'A9C-'};
// ---------- conceptual layout (map units; 1 unit ≈ 2.6 m) ----------
const G = {W:1400, H:530, R1y:50, R2y:100, TWA:145, TWB:172, TL:238, CS:282, ROAD:308, LTL:414, LS:432, LROAD:452};
const STANDS = [];
const addStand = (id,x,y,term,max,kind) => STANDS.push({id,x,y,term,max,kind});
[110,170,230,290].forEach((x,i)=>addStand('C'+(i+1),x,G.CS,'T1','C','contact'));
[395,460,525,590,655].forEach((x,i)=>addStand('A'+(i+1),x,G.CS,'T2',i<3?'C':'E','contact'));
[760,830,900,970,1040,1105].forEach((x,i)=>addStand('B'+(i+1),x,G.CS,'T3',i<2?'C':'E','contact'));
[[1215,205],[1285,205],[1215,255],[1285,255],[1215,305],[1285,305]].forEach(([x,y],i)=>addStand('R'+(i+1),x,y,'Remote',i<4?'E':'C','remote'));
[120,205,290].forEach((x,i)=>addStand('S'+(i+1),x,G.LS,'STC','E','stc'));
[405,465,525].forEach((x,i)=>addStand('P'+(i+1),x,G.LS,'GA','B','ga'));
[1235,1305].forEach((x,i)=>addStand('M'+(i+1),x,G.LS,'MRO','E','mro'));
const STAND = Object.fromEntries(STANDS.map(s=>[s.id,s]));

// buildings / service zones (x,y,w,h)
const ZONES = [
  {id:'T1',name:'Terminal 1',kind:'terminal',x:80,y:318,w:250,h:54},
  {id:'T2',name:'Terminal 2',kind:'terminal',x:360,y:318,w:330,h:54},
  {id:'T3',name:'Terminal 3',kind:'terminal',x:720,y:318,w:410,h:54},
  {id:'BHS',name:'Baggage hall (T2/T3)',kind:'service',x:360,y:376,w:770,h:26},
  {id:'STC',name:'Seasonal terminal',kind:'terminal',x:80,y:462,w:250,h:48},
  {id:'FBO',name:'Private aviation / FBO',kind:'service',x:380,y:462,w:180,h:48},
  {id:'DEPOT',name:'GSE depot & EV charging',kind:'service',x:600,y:462,w:170,h:48},
  {id:'FUEL',name:'Fuel farm',kind:'service',x:800,y:462,w:100,h:48},
  {id:'ARFF',name:'Fire & rescue station',kind:'service',x:930,y:462,w:110,h:48},
  {id:'CUP',name:'Central utility plant',kind:'service',x:1060,y:462,w:90,h:48},
  {id:'MRO',name:'MRO hangar',kind:'service',x:1180,y:462,w:160,h:48},
  {id:'TWR',name:'ATC tower',kind:'service',x:695,y:200,w:20,h:20},
];
const ZONE = Object.fromEntries(ZONES.map(z=>[z.id,z]));
const TERMS = ['T1','T2','T3','STC'];

// ---------- aircraft movement paths ----------
function standEntry(st, ry){ // taxiway → stand
  if(st.kind=='contact') return [[st.x,G.TWA],[st.x,G.TL],[st.x,st.y]];
  if(st.kind=='remote') return [[st.x,G.TWA],[st.x,G.TWB],[st.x,st.y]];
  if(st.kind=='mro') return [[1370,G.TWA],[1370,G.LTL],[st.x,G.LTL],[st.x,st.y]];
  return [[50,G.TWA],[50,G.LTL],[st.x,G.LTL],[st.x,st.y]];
}
const runwayY = r => r==1 ? G.R1y : G.R2y;
function pathLanding(rw, code){const y=runwayY(rw), ex=code=='E'?880:code=='B'?1100:1000; return [[1300,y],[ex,y]]}
function pathTaxiIn(st, rw, code){const y=runwayY(rw), ex=code=='E'?880:code=='B'?1100:1000; return [[ex,y],[ex,G.TWA]].concat(standEntry(st))}
function pathPush(st){
  if(st.kind=='contact') return [[st.x,st.y],[st.x,G.TL]];
  if(st.kind=='remote') return [[st.x,st.y],[st.x,st.y-18]];
  return [[st.x,st.y],[st.x,G.LTL]];
}
function pathTaxiOut(st, rw){
  const y=runwayY(rw), tail=[[1340,G.TWB],[1340,y]];
  if(st.kind=='contact') return [[st.x,G.TL],[st.x,G.TWB]].concat(tail);
  if(st.kind=='remote') return [[st.x,st.y-18],[st.x,G.TWB]].concat(tail);
  if(st.kind=='mro') return [[st.x,G.LTL],[1370,G.LTL],[1370,G.TWB]].concat(tail);
  return [[st.x,G.LTL],[50,G.LTL],[50,G.TWB]].concat(tail);
}
function pathTakeoff(rw){const y=runwayY(rw); return [[1340,y],[420,y],[-200,y-70]]}
const pathApproach = rw => {const y=runwayY(rw); return [[1700,y-60],[1300,y]]};
function plen(p){let L=0;for(let i=1;i<p.length;i++)L+=Math.hypot(p[i][0]-p[i-1][0],p[i][1]-p[i-1][1]);return L}
// point + heading along polyline at fraction q
function pAt(p, q){
  const L=plen(p); let d=clamp(q,0,1)*L;
  for(let i=1;i<p.length;i++){const a=p[i-1],b=p[i],s=Math.hypot(b[0]-a[0],b[1]-a[1]);
    if(d<=s||i==p.length-1){const f=s?Math.min(1,d/s):0;return [a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f,Math.atan2(b[0]-a[0],-(b[1]-a[1]))*57.3]}d-=s}
  return [p[0][0],p[0][1],0];
}

// ---------- service-road network for ground vehicles ----------
const ROADS = [ // straight segments
  [[90,G.ROAD],[1160,G.ROAD]], [[80,G.LROAD],[1345,G.LROAD]], [[705,G.ROAD],[705,G.LROAD]], [[1160,G.TWA],[1160,G.LROAD]], [[1160,G.TWA],[1000,G.TWA]]
];
function onSeg(p, s){const [a,b]=s;if(a[0]==b[0])return Math.abs(p[0]-a[0])<.5&&p[1]>=Math.min(a[1],b[1])-.5&&p[1]<=Math.max(a[1],b[1])+.5;return Math.abs(p[1]-a[1])<.5&&p[0]>=Math.min(a[0],b[0])-.5&&p[0]<=Math.max(a[0],b[0])+.5}
const JCT = [[705,G.ROAD],[705,G.LROAD],[1160,G.ROAD],[1160,G.LROAD],[1160,G.TWA]];
function roadRoute(p, q){ // shortest path between two points that lie on roads
  const N=[...JCT,p,q], n=N.length, adj=N.map(()=>[]);
  for(const s of ROADS){const on=[];N.forEach((x,i)=>{if(onSeg(x,s))on.push(i)});const ax=s[0][0]==s[1][0]?1:0;on.sort((i,j)=>N[i][ax]-N[j][ax]);
    for(let k=1;k<on.length;k++){const i=on[k-1],j=on[k],d=Math.hypot(N[i][0]-N[j][0],N[i][1]-N[j][1]);adj[i].push([j,d]);adj[j].push([i,d])}}
  const D=Array(n).fill(1e9),P=Array(n).fill(-1),V=Array(n).fill(0);D[n-2]=0;
  for(let it=0;it<n;it++){let u=-1;for(let i=0;i<n;i++)if(!V[i]&&(u<0||D[i]<D[u]))u=i;if(u<0||D[u]>=1e9)break;V[u]=1;for(const[v,d]of adj[u])if(D[u]+d<D[v]){D[v]=D[u]+d;P[v]=u}}
  if(D[n-1]>=1e9)return [p,q];const out=[];for(let u=n-1;u>=0;u=P[u])out.unshift(N[u]);return out;
}
// where a vehicle parks to service a stand, and the road access point
function servicePoint(st){
  if(st.kind=='contact') return {pt:[st.x+15,st.y+14], acc:[st.x+15,G.ROAD]};
  if(st.kind=='remote') return {pt:[st.x-24,st.y+6], acc:[1160,st.y+6]};
  return {pt:[st.x+15,st.y+10], acc:[st.x+15,G.LROAD]};
}
const PLACES = {
  DEPOT:{pt:[685,470],acc:[685,G.LROAD]}, FUEL:{pt:[850,470],acc:[850,G.LROAD]}, ARFF:{pt:[985,470],acc:[985,G.LROAD]},
  RWY:{pt:[1000,G.R1y+16],acc:[1000,G.TWA]}, FBO:{pt:[470,470],acc:[470,G.LROAD]}, MRO:{pt:[1260,470],acc:[1260,G.LROAD]}
};
function vRoute(a, b){ // a,b = {pt,acc}
  return [a.pt].concat(roadRoute(a.acc, b.acc)).concat([b.pt]);
}

// ---------- illustrative schedule ----------
function buildSchedule(seed){
  const R=rng(seed*7+3), pick=a=>a[Math.floor(R()*a.length)], rots=[];
  const fixed=[ // originating aircraft (night-stopped before 06:00)
    ['MS','MS 777','CDG',35,'A330','SU-GCE'],['MS','MS 985','LHR',55,'B788','SU-GEB'],['SV','SV 302','JED',70,'A321','HZ-ASB'],
    ['TK','TK 693','IST',90,'B738','TC-JHM'],['MS','MS 701','DXB',110,'A320','SU-GFJ'],['XY','XY 524','RUH',125,'A320','HZ-NS22'],
    ['G9','G9 553','SHJ',150,'A320','A6-ANV'],['NP','NP 141','KWI',175,'A320','SU-BQM']];
  for(const [c,fl,to,std,type,reg] of fixed){const C=CARRIERS.find(x=>x[0]==c),T=AC_TYPES[type];
    rots.push({al:C[1],cc:c,term:C[2],type,reg,op:'sched',arr:null,dep:{fl,apt:to,std},paxIn:0,paxOut:Math.round(T.seats*(.78+R()*.17))})}
  let n=100;
  for(let k=0;k<28;k++){const C=CARRIERS[(k*5+3)%CARRIERS.length],type=pick(C[3]),T=AC_TYPES[type],apt=pick(C[4]);
    const sta=25+k*31+Math.floor(R()*14),std=sta+T.mtt+15+Math.floor(R()*35),num=n+=Math.floor(2+R()*40);
    rots.push({al:C[1],cc:C[0],term:C[2],type,reg:(REGP[C[0]]||'SU-')+String.fromCharCode(65+k%26)+String.fromCharCode(65+(k*7)%26)+String.fromCharCode(65+(k*3)%26),op:'sched',
      arr:{fl:C[0]+' '+(num*2),apt,sta},dep:{fl:C[0]+' '+(num*2+1),apt,std},paxIn:Math.round(T.seats*(.7+R()*.25)),paxOut:Math.round(T.seats*(.72+R()*.25))})}
  for(let k=0;k<4;k++){const C=CARRIERS[[0,1,3,4][k]],type=pick(C[3]),T=AC_TYPES[type];
    rots.push({al:C[1],cc:C[0],term:C[2],type,reg:'NS-'+(k+1),op:'sched',arr:{fl:C[0]+' '+(900+k*7),apt:pick(C[4]),sta:925+k*38},dep:null,paxIn:Math.round(T.seats*.8),paxOut:0})}
  [['SM 3301','JED',150,320],['SM 3303','MED',420,560],['SM 3305','JED',690,840]].forEach(([fl,apt,sta,std],k)=>{const T=AC_TYPES.A330;
    rots.push({al:'Air Cairo (charter)',cc:'SM',term:'STC',type:'A330',reg:'SU-BT'+k,op:'charter',arr:{fl:fl.replace(/\d$/,d=>d-1),apt,sta},dep:{fl,apt,std},paxIn:Math.round(T.seats*.9),paxOut:Math.round(T.seats*.95)})});
  [['G650','N650GA',60,300],['F7X','HB-FXA',240,420],['CL60','OE-ICL',480,640],['G650','VP-CGA',700,960]].forEach(([type,reg,sta,std],k)=>
    rots.push({al:'Private operator',cc:'PV',term:'GA',type,reg,op:'private',arr:{fl:reg,apt:['LBG','GVA','VIE','LTN'][k],sta},dep:{fl:reg,apt:['NCE','DXB','LBG','RUH'][k],std},paxIn:6+k,paxOut:5+k}));
  rots.forEach((r,i)=>{r.id='R'+pad(i+1);r.planOn=r.arr?r.arr.sta:-120;r.planOff=r.dep?r.dep.std:DAY_END+600});
  // greedy stand plan with 20-min buffers
  const busy={},free=(sid,a,b)=>(busy[sid]||[]).every(([x,y])=>b+20<=x||a>=y+20);
  const order=rots.slice().sort((a,b)=>a.planOn-b.planOn);
  for(const r of order){const code=AC_TYPES[r.type].code;
    const cand=STANDS.filter(s=>RANK[s.max]>=RANK[code]&&(r.op=='private'?s.kind=='ga':r.op=='charter'?s.kind=='stc':s.kind=='contact'||s.kind=='remote'));
    cand.sort((a,b)=>((a.term==r.term?0:a.kind=='contact'?1:2)-(b.term==r.term?0:b.kind=='contact'?1:2))||(RANK[a.max]-RANK[b.max]));
    const s=cand.find(s=>free(s.id,r.planOn,r.planOff))||cand[cand.length-1];r.stand=r.planStand=s.id;(busy[s.id]=busy[s.id]||[]).push([r.planOn,r.planOff])}
  return rots;
}
