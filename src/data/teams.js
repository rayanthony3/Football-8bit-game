// ─── Star rating helpers ────────────────────────────────────────────────────
export function getStars(overall) {
  if (overall >= 9) return 5;
  if (overall >= 7) return 4;
  if (overall >= 5) return 3;
  if (overall >= 3) return 2;
  return 1;
}
export function starsStr(n) { return '★'.repeat(n) + '☆'.repeat(5 - n); }

export function getTeamStars(team) {
  const avgStars = (positions) => {
    const vals = positions.map(pos => {
      const p = team.roster.filter(r => r.pos === pos).sort((a,b) => getOverall(b)-getOverall(a))[0];
      return p ? getStars(getOverall(p)) : 0;
    }).filter(v => v > 0);
    return vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : 0;
  };
  const off = avgStars(['QB','RB','WR','TE','LT','LG','C','RG','RT']);
  const def = avgStars(['DE','DT','MLB','OLB','CB','FS','SS']);
  const st  = avgStars(['K','P']);
  return {
    off: Math.round(off * 10) / 10,
    def: Math.round(def * 10) / 10,
    st:  Math.round(st  * 10) / 10,
    overall: Math.min(5, Math.round(off * 0.4 + def * 0.4 + st * 0.2)),
  };
}

// ─── Name pools ─────────────────────────────────────────────────────────────
const INIT = 'ABCDEFGHJKLMNPQRSTVWZ';
const QB_L  = ['Rivers','Wilson','Mahomes','Young','Brady','Allen','Herbert','Lawrence','Fields','Hurts','Purdy','Love','Stroud','Murray','Carr','Flacco','Tua','Goff','Cousins','Stafford'];
const RB_L  = ['Henry','Hill','Cook','Swift','Hall','Jones','Pierce','Carter','Mixon','Barkley','Kamara','Taylor','Chubb','Hunt','Gordon','Jacobs','Walker','White','Sanders','McCaffrey'];
const WR_L  = ['Adams','Diggs','Cooper','Moore','Lamb','Chase','Evans','Brown','Lockett','Metcalf','Smith','Green','Jefferson','Hill','Kupp','Thielen','Ridley','Davante','Cooks','Waddle'];
const TE_L  = ['Kelce','Pitts','Andrews','Goedert','Ertz','Henry','Engram','Njoku','Hockenson','Kittle','Smith','Gesicki','Otton','Dulcich','Kmet'];
const OL_L  = ['Moses','Brown','Trent','Vea','Lamp','Turner','Davis','Ford','Bell','Walsh','Cole','Nash','Little','Miller','Penn','Williams','Thomas','Collins','Thuney','Linsley'];
const DL_L  = ['Donald','Watt','Bosa','Jones','Hicks','Allen','Miller','Sweat','Maxx','Crosby','Hendrickson','Simmons','Lawrence','Burns','Hutchinson'];
const LB_L  = ['Wagner','Smith','White','Hightower','Davis','Leonard','Parsons','Campbell','Walker','Lloyd','Evans','Vander','Byard','Queen','Darius'];
const DB_L  = ['Ramsey','Rhodes','Ward','Baker','Grant','Jackson','Mathieu','Adams','Key','Neal','Harris','Diggs','Williams','Jenkins','Peterson'];
const K_L   = ['Tucker','Gay','Boswell','Lutz','Butker','McLaughlin','York','Bass','Evan','Prater'];
const P_L   = ['Hekker','Dixon','Wadman','Scott','Fox','Thomas','Bojorquez','Cooke','Cole','Roy'];

function pickName(pool, used) {
  for (let i = 0; i < 150; i++) {
    const init = INIT[Math.floor(Math.random() * INIT.length)];
    const last = pool[Math.floor(Math.random() * pool.length)];
    const n = `${init}. ${last}`;
    if (!used.has(n)) { used.add(n); return n; }
  }
  return `${INIT[Math.floor(Math.random()*INIT.length)]}. Player`;
}

// ─── Player factory functions ────────────────────────────────────────────────
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const rng   = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const stat  = (tier, lo, hi) => clamp(rng(tier + lo, tier + hi), 1, 10);

function makeQB(name, tier) {
  const b = clamp(tier, 1, 10);
  return { pos:'QB', name, stats:{ spd:stat(b,-1,1), str:rng(4,7), awr:stat(b,0,2), agi:stat(b,-1,1), stm:stat(b,-1,2), thr:stat(b,0,2), acc:stat(b,-1,2), ctc:4,rtr:3,blk:2,tck:2,cvr:2,kpw:3,kac:3 }, fatigue:0, active:true };
}
function makeRB(name, tier) {
  const b = clamp(tier, 1, 10);
  return { pos:'RB', name, stats:{ spd:stat(b,0,2), str:stat(b,-1,1), awr:stat(b,-1,1), agi:stat(b,0,2), stm:stat(b,-1,2), thr:3,acc:3, ctc:stat(b,-1,1), rtr:4, blk:stat(b,-2,0), tck:3,cvr:2,kpw:2,kac:2 }, fatigue:0, active:true };
}
function makeFB(name, tier) {
  const b = clamp(tier, 1, 10);
  return { pos:'FB', name, stats:{ spd:stat(b,-2,0), str:stat(b,0,2), awr:stat(b,-1,1), agi:stat(b,-2,0), stm:stat(b,0,2), thr:2,acc:2, ctc:stat(b,-2,0), rtr:3, blk:stat(b,0,2), tck:stat(b,-1,1), cvr:2,kpw:2,kac:2 }, fatigue:0, active:true };
}
function makeWR(name, tier) {
  const b = clamp(tier, 1, 10);
  return { pos:'WR', name, stats:{ spd:stat(b,0,2), str:rng(4,6), awr:stat(b,-1,1), agi:stat(b,0,2), stm:stat(b,-1,1), thr:2,acc:2, ctc:stat(b,0,2), rtr:stat(b,0,2), blk:rng(3,5), tck:2,cvr:3,kpw:2,kac:2 }, fatigue:0, active:true };
}
function makeTE(name, tier) {
  const b = clamp(tier, 1, 10);
  return { pos:'TE', name, stats:{ spd:stat(b,-1,1), str:stat(b,0,2), awr:stat(b,-1,1), agi:stat(b,-1,1), stm:stat(b,-1,1), thr:2,acc:2, ctc:stat(b,0,2), rtr:stat(b,-1,1), blk:stat(b,0,2), tck:3,cvr:3,kpw:2,kac:2 }, fatigue:0, active:true };
}
function makeOL(name, pos, tier) {
  const b = clamp(tier, 1, 10);
  return { pos, name, stats:{ spd:rng(4,6), str:stat(b,0,2), awr:stat(b,-1,1), agi:rng(4,6), stm:stat(b,-1,1), thr:1,acc:1,ctc:2,rtr:2, blk:stat(b,0,2), tck:stat(b,-2,0), cvr:1,kpw:2,kac:2 }, fatigue:0, active:true };
}
function makeDE(name, tier) {
  const b = clamp(tier, 1, 10);
  return { pos:'DE', name, stats:{ spd:stat(b,-1,1), str:stat(b,0,2), awr:stat(b,-1,1), agi:stat(b,-1,1), stm:stat(b,-1,1), thr:1,acc:1,ctc:2,rtr:2, blk:stat(b,-1,1), tck:stat(b,0,2), cvr:3,kpw:2,kac:2 }, fatigue:0, active:true };
}
function makeDT(name, tier) {
  const b = clamp(tier, 1, 10);
  return { pos:'DT', name, stats:{ spd:rng(4,6), str:stat(b,0,2), awr:stat(b,-1,1), agi:rng(4,6), stm:stat(b,-1,1), thr:1,acc:1,ctc:2,rtr:2, blk:stat(b,-1,1), tck:stat(b,0,2), cvr:2,kpw:2,kac:2 }, fatigue:0, active:true };
}
function makeLB(name, pos, tier) {
  const b = clamp(tier, 1, 10);
  return { pos, name, stats:{ spd:stat(b,-1,1), str:stat(b,-1,1), awr:stat(b,0,2), agi:stat(b,-1,1), stm:stat(b,-1,1), thr:1,acc:1,ctc:2,rtr:2, blk:stat(b,-2,0), tck:stat(b,0,2), cvr:stat(b,-1,1), kpw:2,kac:2 }, fatigue:0, active:true };
}
function makeCB(name, tier) {
  const b = clamp(tier, 1, 10);
  return { pos:'CB', name, stats:{ spd:stat(b,0,2), str:rng(4,6), awr:stat(b,0,2), agi:stat(b,0,2), stm:stat(b,-1,1), thr:1,acc:1,ctc:3,rtr:2, blk:rng(3,5), tck:stat(b,-1,1), cvr:stat(b,0,2), kpw:2,kac:2 }, fatigue:0, active:true };
}
function makeSafety(name, pos, tier) {
  const b = clamp(tier, 1, 10);
  return { pos, name, stats:{ spd:stat(b,-1,1), str:stat(b,-1,1), awr:stat(b,0,2), agi:stat(b,-1,1), stm:stat(b,-1,1), thr:1,acc:1,ctc:3,rtr:2, blk:rng(3,5), tck:stat(b,0,2), cvr:stat(b,0,2), kpw:2,kac:2 }, fatigue:0, active:true };
}
function makeK(name, tier) {
  const b = clamp(tier, 1, 10);
  return { pos:'K', name, stats:{ spd:5,str:5, awr:stat(b,-1,1), agi:5, stm:8, thr:3,acc:3,ctc:2,rtr:2,blk:1,tck:1,cvr:1, kpw:stat(b,0,2), kac:stat(b,0,2) }, fatigue:0, active:true };
}
function makeP(name, tier) {
  const b = clamp(tier, 1, 10);
  return { pos:'P', name, stats:{ spd:5,str:5, awr:stat(b,-1,1), agi:5, stm:8, thr:stat(b,0,1), acc:stat(b,0,1), ctc:2,rtr:2,blk:1,tck:1,cvr:1, kpw:stat(b,0,2), kac:stat(b,0,2) }, fatigue:0, active:true };
}

// ─── Roster builder (random names, tier-based stats) ─────────────────────────
// All starter tiers are clamped to minimum 5 to guarantee 3-star starters
function buildRoster(t) {
  const used = new Set();
  const p = (pool) => pickName(pool, used);
  const MIN = 5; // starter minimum tier
  const { os, ob, ot, ds, db, dt, ss, sb } = {
    os: Math.max(MIN, t.offStart), ob: Math.max(MIN-1, t.offBack), ot: Math.max(MIN-2, t.offThird),
    ds: Math.max(MIN, t.defStart), db: Math.max(MIN-1, t.defBack), dt: Math.max(MIN-2, t.defThird),
    ss: Math.max(MIN, t.stStart),  sb: Math.max(MIN-1, t.stBack),
  };

  const players = [
    // QB x3
    makeQB(p(QB_L),os), makeQB(p(QB_L),ob), makeQB(p(QB_L),ot),
    // RB x4
    makeRB(p(RB_L),os), makeRB(p(RB_L),os), makeRB(p(RB_L),ob), makeRB(p(RB_L),ot),
    // FB x1
    makeFB(p(OL_L),ob),
    // WR x6
    makeWR(p(WR_L),os), makeWR(p(WR_L),os), makeWR(p(WR_L),os),
    makeWR(p(WR_L),ob), makeWR(p(WR_L),ob), makeWR(p(WR_L),ot),
    // TE x3
    makeTE(p(TE_L),os), makeTE(p(TE_L),ob), makeTE(p(TE_L),ot),
    // OL x8
    makeOL(p(OL_L),'LT',os), makeOL(p(OL_L),'LG',os), makeOL(p(OL_L),'C',os),
    makeOL(p(OL_L),'RG',os), makeOL(p(OL_L),'RT',os),
    makeOL(p(OL_L),'LT',ob), makeOL(p(OL_L),'LG',ob), makeOL(p(OL_L),'C',ob),
    // DE x4
    makeDE(p(DL_L),ds), makeDE(p(DL_L),ds), makeDE(p(DL_L),db), makeDE(p(DL_L),dt),
    // DT x3
    makeDT(p(DL_L),ds), makeDT(p(DL_L),db), makeDT(p(DL_L),dt),
    // MLB x2
    makeLB(p(LB_L),'MLB',ds), makeLB(p(LB_L),'MLB',db),
    // OLB x4
    makeLB(p(LB_L),'OLB',ds), makeLB(p(LB_L),'OLB',ds),
    makeLB(p(LB_L),'OLB',db), makeLB(p(LB_L),'OLB',dt),
    // CB x6
    makeCB(p(DB_L),ds), makeCB(p(DB_L),ds), makeCB(p(DB_L),ds),
    makeCB(p(DB_L),db), makeCB(p(DB_L),db), makeCB(p(DB_L),dt),
    // FS x2
    makeSafety(p(DB_L),'FS',ds), makeSafety(p(DB_L),'FS',db),
    // SS x2
    makeSafety(p(DB_L),'SS',ds), makeSafety(p(DB_L),'SS',db),
    // K + P
    makeK(p(K_L),ss), makeP(p(P_L),ss),
  ];

  // Assign jersey numbers — unique within team, position-appropriate ranges
  const numRanges = {
    QB:[1,19], RB:[20,49], FB:[44,49], WR:[10,89], TE:[80,89],
    LT:[50,79], LG:[50,79], C:[50,79], RG:[50,79], RT:[50,79],
    DE:[90,99], DT:[90,99], MLB:[40,59], OLB:[40,59],
    CB:[20,39], FS:[20,39], SS:[20,39], K:[1,19], P:[1,19],
  };
  const usedNums = new Set();
  for (const pl of players) {
    const [lo, hi] = numRanges[pl.pos] || [1, 99];
    let n;
    for (let tries = 0; tries < 60; tries++) {
      n = lo + Math.floor(Math.random() * (hi - lo + 1));
      if (!usedNums.has(n)) break;
    }
    usedNums.add(n);
    pl.num = n;
  }
  return players;
}

// ─── 10 Team definitions ─────────────────────────────────────────────────────
const TEAM_DEFS = [
  // id 0  ★★★★★ Elite balanced
  { name:'Ironclad FC',    city:'IRON CITY',     abbr:'IFC', primary:0x1a3a8a, secondary:0xffd700, textColor:'#ffd700',
    tiers:{ offStart:9, offBack:7, offThird:5, defStart:8, defBack:7, defThird:5, stStart:7, stBack:5 } },
  // id 1  ★★★★★ Elite offense
  { name:'Thunder Hawks',  city:'THUNDER RIDGE', abbr:'THK', primary:0x4b0082, secondary:0xff6600, textColor:'#ff6600',
    tiers:{ offStart:9, offBack:8, offThird:5, defStart:7, defBack:6, defThird:5, stStart:6, stBack:5 } },
  // id 2  ★★★★ Strong defense
  { name:'Red Storm',      city:'STORM BAY',     abbr:'STM', primary:0x8b0000, secondary:0xc8c8c8, textColor:'#c8c8c8',
    tiers:{ offStart:7, offBack:6, offThird:5, defStart:8, defBack:7, defThird:5, stStart:7, stBack:5 } },
  // id 3  ★★★★ Balanced good
  { name:'Bay Sharks',     city:'BAY HARBOR',    abbr:'BSH', primary:0x006666, secondary:0xeeffff, textColor:'#eeffff',
    tiers:{ offStart:7, offBack:6, offThird:5, defStart:7, defBack:6, defThird:5, stStart:6, stBack:5 } },
  // id 4  ★★★ Run-focused
  { name:'Golden Wolves',  city:'GOLD VALLEY',   abbr:'GWV', primary:0x997700, secondary:0x228b22, textColor:'#ccaa00',
    tiers:{ offStart:7, offBack:5, offThird:5, defStart:6, defBack:5, defThird:5, stStart:7, stBack:5 } },
  // id 5  ★★★ Defense-focused
  { name:'Steel Titans',   city:'STEEL CITY',    abbr:'STL', primary:0x444444, secondary:0xaaaaaa, textColor:'#cccccc',
    tiers:{ offStart:6, offBack:5, offThird:5, defStart:7, defBack:6, defThird:5, stStart:5, stBack:5 } },
  // id 6  ★★★ Pass-focused
  { name:'Desert Vipers',  city:'DESERT PEAK',   abbr:'DVP', primary:0xcc4400, secondary:0x1a1a1a, textColor:'#ff8844',
    tiers:{ offStart:7, offBack:6, offThird:5, defStart:6, defBack:5, defThird:5, stStart:6, stBack:5 } },
  // id 7  ★★ Average
  { name:'River Kings',    city:'RIVER BEND',    abbr:'RVK', primary:0x660000, secondary:0xf5deb3, textColor:'#f5deb3',
    tiers:{ offStart:6, offBack:5, offThird:5, defStart:6, defBack:5, defThird:5, stStart:5, stBack:5 } },
  // id 8  ★★ Defense-leaning
  { name:'Frost Giants',   city:'FROST FALLS',   abbr:'FRG', primary:0x336688, secondary:0xddeeff, textColor:'#ddeeff',
    tiers:{ offStart:5, offBack:5, offThird:5, defStart:6, defBack:5, defThird:5, stStart:6, stBack:5 } },
  // id 9  ★  Rebuilding
  { name:'Iron Eagles',    city:'EAGLE POINT',   abbr:'IEG', primary:0x1a1a3a, secondary:0x8b7355, textColor:'#aa9966',
    tiers:{ offStart:5, offBack:5, offThird:5, defStart:5, defBack:5, defThird:5, stStart:5, stBack:5 } },
];

// ─── Public API ──────────────────────────────────────────────────────────────
export function createAllTeams() {
  return TEAM_DEFS.map(def => ({
    name:      def.name,
    city:      def.city,
    abbr:      def.abbr,
    primary:   def.primary,
    secondary: def.secondary,
    textColor: def.textColor,
    score:        0,
    timeoutsLeft: 3,
    roster: buildRoster(def.tiers),
  }));
}

export function createTeams() {
  const all = createAllTeams();
  return [all[0], all[1]];
}

export function getRosterByPosition(roster, pos) {
  return roster.filter(p => p.pos === pos);
}

export function getStarters(roster) {
  const counts = { QB:1,RB:1,FB:1,WR:2,TE:1,LT:1,LG:1,C:1,RG:1,RT:1,DE:2,DT:2,MLB:1,OLB:2,CB:2,FS:1,SS:1,K:1,P:1 };
  const starters = {};
  for (const [pos, n] of Object.entries(counts)) {
    starters[pos] = roster.filter(p => p.pos === pos && p.active)
      .sort((a,b) => avgStat(b.stats) - avgStat(a.stats)).slice(0, n);
  }
  return starters;
}

function avgStat(stats) {
  const vals = Object.values(stats);
  return vals.reduce((a,b) => a+b, 0) / vals.length;
}

export function getOverall(player) {
  const s = player.stats;
  const posWeights = {
    QB: ['thr','acc','awr','spd','agi'],  RB: ['spd','agi','str','ctc','stm'],
    FB: ['str','blk','stm','spd','agi'],  WR: ['spd','ctc','rtr','agi','awr'],
    TE: ['ctc','blk','str','spd','awr'],  LT: ['blk','str','awr','stm','agi'],
    LG: ['blk','str','awr','stm','agi'],  C:  ['blk','str','awr','stm','agi'],
    RG: ['blk','str','awr','stm','agi'],  RT: ['blk','str','awr','stm','agi'],
    DE: ['tck','str','spd','agi','awr'],  DT: ['tck','str','blk','stm','awr'],
    MLB:['tck','awr','str','cvr','spd'],  OLB:['tck','spd','cvr','str','agi'],
    CB: ['cvr','spd','agi','tck','awr'],  FS: ['cvr','awr','spd','tck','str'],
    SS: ['tck','cvr','str','spd','awr'],  K:  ['kpw','kac','stm','awr','spd'],
    P:  ['kpw','kac','stm','awr','spd'],
  };
  const keys = posWeights[player.pos] || Object.keys(s);
  const weights = [3,3,2,1,1];
  let total = 0, wSum = 0;
  keys.forEach((k,i) => { const w = weights[i]||1; total += (s[k]||5)*w; wSum += w; });
  return Math.round(total / wSum);
}
