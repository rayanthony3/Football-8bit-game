import { CFG } from '../config.js';

function rng(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function statBlock(base, ...keys) {
  const stats = {};
  for (const k of keys) stats[k] = Math.min(10, Math.max(1, base + rng(-2, 2)));
  return stats;
}

const QB_NAMES = [
  'A. Rivers','B. Kelce','C. Wilson','D. Mahomes','E. Young',
  'F. Brady','G. Allen','H. Herbert',
];
const RB_NAMES = [
  'A. Henry','B. Hill','C. Cook','D. Swift','E. Hall',
  'F. Jones','G. Pierce','H. Carter','I. Mixon','J. Barkley',
];
const WR_NAMES = [
  'A. Adams','B. Diggs','C. Cooper','D. Moore','E. Lamb',
  'F. Chase','G. Evans','H. Brown','I. Lockett','J. Metcalf',
  'K. Smith','L. Green',
];
const TE_NAMES  = ['A. Kelce','B. Pitts','C. Andrews','D. Goedert','E. Ertz','F. Henry'];
const OL_NAMES  = [
  'A. Moses','B. Brown','C. Trent','D. Vea','E. Lamp',
  'F. Gage','G. Turner','H. Davis','I. Ford','J. Bell',
  'K. Walsh','L. Cole','M. Petit','N. Nash',
];
const DL_NAMES  = [
  'A. Donald','B. Watt','C. Bosa','D. Jones','E. Hicks',
  'F. Allen','G. Miller','H. Sweat',
];
const LB_NAMES  = [
  'A. Wagner','B. Smith','C. White','D. Hightower','E. Davis',
  'F. Leonard','G. Parsons','H. Campbell','I. Walker','J. Lloyd',
];
const DB_NAMES  = [
  'A. Ramsey','B. Rhodes','C. Ward','D. Baker','E. Grant',
  'F. Jackson','G. Diggs','H. Mathieu','I. Adams','J. Byard',
  'K. Key','L. Neal','M. Hill','N. Harris',
];
const K_NAMES   = ['A. Tucker','B. Gay'];
const P_NAMES   = ['A. Heckert','B. Dixon'];

function makeQB(name, tier) {
  const b = tier;
  return {
    pos: 'QB', name,
    stats: { spd: rng(b-1,b+1), str: rng(4,7), awr: rng(b,b+2), agi: rng(b-1,b+1),
             stm: rng(b-1,b+2), thr: rng(b,b+2), acc: rng(b-1,b+2),
             ctc:4, rtr:3, blk:2, tck:2, cvr:2, kpw:3, kac:3 },
    fatigue: 0, active: true,
  };
}
function makeRB(name, tier) {
  const b = tier;
  return {
    pos: 'RB', name,
    stats: { spd: rng(b,b+2), str: rng(b-1,b+1), awr: rng(b-1,b+1), agi: rng(b,b+2),
             stm: rng(b-1,b+2), thr:3, acc:3, ctc: rng(b-1,b+1),
             rtr:4, blk: rng(b-2,b), tck:3, cvr:2, kpw:2, kac:2 },
    fatigue: 0, active: true,
  };
}
function makeFB(name, tier) {
  const b = tier;
  return {
    pos: 'FB', name,
    stats: { spd: rng(b-2,b), str: rng(b,b+2), awr: rng(b-1,b+1), agi: rng(b-2,b),
             stm: rng(b,b+2), thr:2, acc:2, ctc: rng(b-2,b),
             rtr:3, blk: rng(b,b+2), tck: rng(b-1,b+1), cvr:2, kpw:2, kac:2 },
    fatigue: 0, active: true,
  };
}
function makeWR(name, tier) {
  const b = tier;
  return {
    pos: 'WR', name,
    stats: { spd: rng(b,b+2), str: rng(4,6), awr: rng(b-1,b+1), agi: rng(b,b+2),
             stm: rng(b-1,b+1), thr:2, acc:2, ctc: rng(b,b+2),
             rtr: rng(b,b+2), blk: rng(3,5), tck:2, cvr:3, kpw:2, kac:2 },
    fatigue: 0, active: true,
  };
}
function makeTE(name, tier) {
  const b = tier;
  return {
    pos: 'TE', name,
    stats: { spd: rng(b-1,b+1), str: rng(b,b+2), awr: rng(b-1,b+1), agi: rng(b-1,b+1),
             stm: rng(b-1,b+1), thr:2, acc:2, ctc: rng(b,b+2),
             rtr: rng(b-1,b+1), blk: rng(b,b+2), tck:3, cvr:3, kpw:2, kac:2 },
    fatigue: 0, active: true,
  };
}
function makeOL(name, pos, tier) {
  const b = tier;
  return {
    pos, name,
    stats: { spd: rng(4,6), str: rng(b,b+2), awr: rng(b-1,b+1), agi: rng(4,6),
             stm: rng(b-1,b+1), thr:1, acc:1, ctc:2,
             rtr:2, blk: rng(b,b+2), tck: rng(b-2,b), cvr:1, kpw:2, kac:2 },
    fatigue: 0, active: true,
  };
}
function makeDE(name, tier) {
  const b = tier;
  return {
    pos: 'DE', name,
    stats: { spd: rng(b-1,b+1), str: rng(b,b+2), awr: rng(b-1,b+1), agi: rng(b-1,b+1),
             stm: rng(b-1,b+1), thr:1, acc:1, ctc:2,
             rtr:2, blk: rng(b-1,b+1), tck: rng(b,b+2), cvr:3, kpw:2, kac:2 },
    fatigue: 0, active: true,
  };
}
function makeDT(name, tier) {
  const b = tier;
  return {
    pos: 'DT', name,
    stats: { spd: rng(4,6), str: rng(b,b+2), awr: rng(b-1,b+1), agi: rng(4,6),
             stm: rng(b-1,b+1), thr:1, acc:1, ctc:2,
             rtr:2, blk: rng(b-1,b+1), tck: rng(b,b+2), cvr:2, kpw:2, kac:2 },
    fatigue: 0, active: true,
  };
}
function makeLB(name, pos, tier) {
  const b = tier;
  return {
    pos, name,
    stats: { spd: rng(b-1,b+1), str: rng(b-1,b+1), awr: rng(b,b+2), agi: rng(b-1,b+1),
             stm: rng(b-1,b+1), thr:1, acc:1, ctc:2,
             rtr:2, blk: rng(b-2,b), tck: rng(b,b+2), cvr: rng(b-1,b+1), kpw:2, kac:2 },
    fatigue: 0, active: true,
  };
}
function makeCB(name, tier) {
  const b = tier;
  return {
    pos: 'CB', name,
    stats: { spd: rng(b,b+2), str: rng(4,6), awr: rng(b,b+2), agi: rng(b,b+2),
             stm: rng(b-1,b+1), thr:1, acc:1, ctc:3,
             rtr:2, blk: rng(3,5), tck: rng(b-1,b+1), cvr: rng(b,b+2), kpw:2, kac:2 },
    fatigue: 0, active: true,
  };
}
function makeSafety(name, pos, tier) {
  const b = tier;
  return {
    pos, name,
    stats: { spd: rng(b-1,b+1), str: rng(b-1,b+1), awr: rng(b,b+2), agi: rng(b-1,b+1),
             stm: rng(b-1,b+1), thr:1, acc:1, ctc:3,
             rtr:2, blk: rng(3,5), tck: rng(b,b+2), cvr: rng(b,b+2), kpw:2, kac:2 },
    fatigue: 0, active: true,
  };
}
function makeK(name, tier) {
  const b = tier;
  return {
    pos: 'K', name,
    stats: { spd:5, str:5, awr: rng(b-1,b+1), agi:5,
             stm:8, thr:3, acc:3, ctc:2,
             rtr:2, blk:1, tck:1, cvr:1, kpw: rng(b,b+2), kac: rng(b,b+2) },
    fatigue: 0, active: true,
  };
}
function makeP(name, tier) {
  const b = tier;
  return {
    pos: 'P', name,
    stats: { spd:5, str:5, awr: rng(b-1,b+1), agi:5,
             stm:8, thr: rng(b,b+1), acc: rng(b,b+1), ctc:2,
             rtr:2, blk:1, tck:1, cvr:1, kpw: rng(b,b+2), kac: rng(b,b+2) },
    fatigue: 0, active: true,
  };
}

function buildRoster(nameArrays, tiers) {
  const roster = [];

  // QB x3
  roster.push(makeQB(nameArrays.QB[0], tiers[0]), makeQB(nameArrays.QB[1], tiers[1]), makeQB(nameArrays.QB[2], tiers[2]));
  // RB x4
  for (let i=0;i<4;i++) roster.push(makeRB(nameArrays.RB[i], tiers[i<2?0:1]));
  // FB x1
  roster.push(makeFB(nameArrays.FB[0], tiers[1]));
  // WR x6
  for (let i=0;i<6;i++) roster.push(makeWR(nameArrays.WR[i], tiers[i<3?0:1]));
  // TE x3
  for (let i=0;i<3;i++) roster.push(makeTE(nameArrays.TE[i], tiers[i<2?0:1]));
  // OL x8 (LT,LG,C,RG,RT x starters + 3 backups)
  roster.push(makeOL(nameArrays.OL[0],'LT',tiers[0]), makeOL(nameArrays.OL[1],'LG',tiers[0]),
              makeOL(nameArrays.OL[2],'C', tiers[0]), makeOL(nameArrays.OL[3],'RG',tiers[0]),
              makeOL(nameArrays.OL[4],'RT',tiers[0]));
  roster.push(makeOL(nameArrays.OL[5],'LT',tiers[1]), makeOL(nameArrays.OL[6],'LG',tiers[1]),
              makeOL(nameArrays.OL[7],'C', tiers[1]));
  // DE x4
  for (let i=0;i<4;i++) roster.push(makeDE(nameArrays.DE[i], tiers[i<2?0:1]));
  // DT x3
  for (let i=0;i<3;i++) roster.push(makeDT(nameArrays.DT[i], tiers[i===0?0:1]));
  // MLB x2
  roster.push(makeLB(nameArrays.LB[0],'MLB',tiers[0]), makeLB(nameArrays.LB[1],'MLB',tiers[1]));
  // OLB x4
  for (let i=0;i<4;i++) roster.push(makeLB(nameArrays.LB[i+2],'OLB',tiers[i<2?0:1]));
  // CB x6
  for (let i=0;i<6;i++) roster.push(makeCB(nameArrays.CB[i], tiers[i<3?0:1]));
  // FS x2
  roster.push(makeSafety(nameArrays.S[0],'FS',tiers[0]), makeSafety(nameArrays.S[1],'FS',tiers[1]));
  // SS x2
  roster.push(makeSafety(nameArrays.S[2],'SS',tiers[0]), makeSafety(nameArrays.S[3],'SS',tiers[1]));
  // K x1
  roster.push(makeK(nameArrays.K[0], tiers[0]));
  // P x1
  roster.push(makeP(nameArrays.P[0], tiers[0]));

  return roster;
}

export function createTeams() {
  const teamA = {
    ...CFG.TEAM_A,
    score: 0,
    timeoutsLeft: 3,
    roster: buildRoster({
      QB:  QB_NAMES.slice(0,3),
      RB:  RB_NAMES.slice(0,4),
      FB:  ['A. Fullerton'],
      WR:  WR_NAMES.slice(0,6),
      TE:  TE_NAMES.slice(0,3),
      OL:  OL_NAMES.slice(0,8),
      DE:  DL_NAMES.slice(0,4),
      DT:  DL_NAMES.slice(4,7),
      LB:  LB_NAMES.slice(0,6),
      CB:  DB_NAMES.slice(0,6),
      S:   DB_NAMES.slice(6,10),
      K:   [K_NAMES[0]],
      P:   [P_NAMES[0]],
    }, [8,6,4]),
  };

  const teamB = {
    ...CFG.TEAM_B,
    score: 0,
    timeoutsLeft: 3,
    roster: buildRoster({
      QB:  QB_NAMES.slice(3,6),
      RB:  RB_NAMES.slice(4,8),
      FB:  ['B. Fuller'],
      WR:  WR_NAMES.slice(6,12),
      TE:  TE_NAMES.slice(3,6),
      OL:  OL_NAMES.slice(7,15),
      DE:  DL_NAMES.slice(0,4).map(n => n.replace('A.','X.').replace('B.','Y.')),
      DT:  DL_NAMES.slice(4,7).map(n => n.replace('A.','X.').replace('B.','Y.')),
      LB:  LB_NAMES.slice(4,10),
      CB:  DB_NAMES.slice(0,6).map(n => n.replace('A.','P.').replace('B.','Q.')),
      S:   DB_NAMES.slice(10,14),
      K:   [K_NAMES[1]],
      P:   [P_NAMES[1]],
    }, [7,5,3]),
  };

  return [teamA, teamB];
}

export function getRosterByPosition(roster, pos) {
  return roster.filter(p => p.pos === pos);
}

export function getStarters(roster) {
  const starters = {};
  const positions = ['QB','RB','FB','WR','TE','LT','LG','C','RG','RT',
                     'DE','DT','MLB','OLB','CB','FS','SS','K','P'];
  const counts = { QB:1, RB:1, FB:1, WR:2, TE:1, LT:1, LG:1, C:1, RG:1, RT:1,
                   DE:2, DT:2, MLB:1, OLB:2, CB:2, FS:1, SS:1, K:1, P:1 };
  for (const pos of positions) {
    const group = roster.filter(p => p.pos === pos && p.active)
      .sort((a,b) => avgStat(b.stats) - avgStat(a.stats));
    starters[pos] = group.slice(0, counts[pos] || 1);
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
    QB:  ['thr','acc','awr','spd','agi'],
    RB:  ['spd','agi','str','ctc','stm'],
    FB:  ['str','blk','stm','spd','agi'],
    WR:  ['spd','ctc','rtr','agi','awr'],
    TE:  ['ctc','blk','str','spd','awr'],
    LT:  ['blk','str','awr','stm','agi'],
    LG:  ['blk','str','awr','stm','agi'],
    C:   ['blk','str','awr','stm','agi'],
    RG:  ['blk','str','awr','stm','agi'],
    RT:  ['blk','str','awr','stm','agi'],
    DE:  ['tck','str','spd','agi','awr'],
    DT:  ['tck','str','blk','stm','awr'],
    MLB: ['tck','awr','str','cvr','spd'],
    OLB: ['tck','spd','cvr','str','agi'],
    CB:  ['cvr','spd','agi','tck','awr'],
    FS:  ['cvr','awr','spd','tck','str'],
    SS:  ['tck','cvr','str','spd','awr'],
    K:   ['kpw','kac','stm','awr','spd'],
    P:   ['kpw','kac','stm','awr','spd'],
  };
  const keys = posWeights[player.pos] || Object.keys(s);
  const weights = [3,3,2,1,1];
  let total = 0, wSum = 0;
  keys.forEach((k,i) => {
    const w = weights[i] || 1;
    total += (s[k] || 5) * w;
    wSum += w;
  });
  return Math.round(total / wSum);
}
