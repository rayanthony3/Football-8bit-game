import { CFG } from '../config.js';

export class AISystem {
  constructor(gameState, rosterSystem) {
    this.gs = gameState;
    this.rs = rosterSystem;
  }

  chooseOffensePlay() {
    const gs = this.gs;
    const plays = CFG.OFFENSE_PLAYS.filter(p => p.type !== 'KICK');
    const kickPlays = CFG.OFFENSE_PLAYS.filter(p => p.type === 'KICK');
    const { down, yardsToGo, ballYard, quarter, clock } = gs;
    const offDir = gs.possession === 0 ? 1 : -1;
    const yardsFromOppEnd = offDir === 1 ? (100 - ballYard) : ballYard;

    if (down === 4) {
      const fg = yardsFromOppEnd <= 35;
      const punt = yardsFromOppEnd > 55 && !(quarter === 4 && clock < 90);
      if (fg) return kickPlays.find(p => p.id === 'fg') || plays[0];
      if (punt) return kickPlays.find(p => p.id === 'pu') || plays[0];
    }

    const needBig = yardsToGo >= 8 || (quarter === 4 && clock < 60 && gs.defenseTeam.score > gs.offenseTeam.score);
    const runFavorable = yardsToGo <= 3 || (down === 1 && Math.random() < 0.45);

    if (runFavorable && !needBig) {
      const runPlays = plays.filter(p => p.type === 'RUN');
      return runPlays[Math.floor(Math.random() * runPlays.length)];
    }
    const passPlays = plays.filter(p => p.type === 'PASS');
    return passPlays[Math.floor(Math.random() * passPlays.length)];
  }

  chooseDefensePlay(offPlay) {
    const defPlays = CFG.DEFENSE_PLAYS;
    const gs = this.gs;
    const { down, yardsToGo, ballYard } = gs;

    if (!offPlay) {
      return defPlays[Math.floor(Math.random() * defPlays.length)];
    }

    if (offPlay.type === 'RUN') {
      const opts = defPlays.filter(p => p.type === 'BLITZ' || p.id === 'gl');
      return opts[Math.floor(Math.random() * opts.length)] || defPlays[0];
    }
    if (offPlay.type === 'PASS') {
      if (yardsToGo >= 10) {
        const opts = defPlays.filter(p => p.type === 'COVERAGE');
        return opts[Math.floor(Math.random() * opts.length)] || defPlays[0];
      }
      const opts = defPlays.filter(p => p.type === 'BLITZ' || p.type === 'COVERAGE');
      return opts[Math.floor(Math.random() * opts.length)] || defPlays[0];
    }
    return defPlays[Math.floor(Math.random() * defPlays.length)];
  }

  resolvePlay(offPlay, defPlay, offTeam, defTeam) {
    const offQB   = this.rs.getActiveStarter(offTeam, 'QB');
    const offRB   = this.rs.getActiveStarter(offTeam, 'RB');
    const offWR   = this.rs.getActiveStarter(offTeam, 'WR');
    const offOL   = this._avgRating(offTeam, ['LT','LG','C','RG','RT']);
    const defLine = this._avgRating(defTeam, ['DE','DT']);
    const defLB   = this._avgRating(defTeam, ['MLB','OLB']);
    const defDB   = this._avgRating(defTeam, ['CB','FS','SS']);

    const gs = this.gs;
    let yards = 0;
    let result = 'INCOMPLETE';
    let narrative = '';
    let isTurnover = false;
    let isSack = false;
    let isInterception = false;
    let isScramble = false;

    const blitzBonus = defPlay?.type === 'BLITZ' ? 2 : 0;
    const coverageBonus = defPlay?.type === 'COVERAGE' ? 2 : 0;
    const preventBonus = defPlay?.id === 'c4' ? 3 : 0;

    if (offPlay.type === 'RUN') {
      const offRating = offRB ? this.rs.getEffectiveRating(offRB) + offOL * 0.5 : 5;
      const defRating = defLine * 0.6 + defLB * 0.4 + blitzBonus;
      const roll = Math.random() * 20 - 10;
      yards = Math.round((offRating - defRating) + roll);
      yards = Math.max(-5, Math.min(20, yards));

      if (yards >= 10) narrative = `${offRB?.name || 'RB'} BREAKS FREE! ${yards} yards!`;
      else if (yards > 0) narrative = `${offRB?.name || 'RB'} gains ${yards} yard${yards!==1?'s':''}`;
      else if (yards === 0) narrative = 'No gain on the run';
      else narrative = `${offRB?.name || 'RB'} stopped for ${Math.abs(yards)} yard loss`;

      if (Math.random() < 0.02) {
        narrative = `FUMBLE! Defense recovers!`;
        isTurnover = true;
        yards = 0;
      }
      result = 'GAIN';
      this.rs.applyFatigue(gs.possession, 'RUN');
      this.rs.applyFatigue(1 - gs.possession, 'RUN');

    } else if (offPlay.type === 'PASS') {
      const qbRating   = offQB ? this.rs.getEffectiveRating(offQB) : 5;
      const wrRating   = offWR ? this.rs.getEffectiveRating(offWR) : 5;
      const sackChance = Math.max(0.05, (defLine + blitzBonus - offOL) / 30);
      const intChance  = Math.max(0.03, (defDB + coverageBonus + preventBonus - qbRating) / 35);
      const compChance = Math.max(0.3, Math.min(0.85, (qbRating + wrRating) / 22 - coverageBonus * 0.05));

      const qbMobility = offQB?.stats?.spd ?? 5;
      const scrambleChance = Math.max(0, (qbMobility - 4) / 14) * 0.15;

      const rand = Math.random();
      if (rand < sackChance) {
        yards = -(Math.floor(Math.random() * 8) + 2);
        narrative = `SACK! ${offQB?.name || 'QB'} goes down for ${Math.abs(yards)} yards!`;
        isSack = true;
        result = 'GAIN';
        gs.stats[1 - gs.possession].sacks++;
      } else if (rand < sackChance + intChance) {
        narrative = `INTERCEPTED! ${offQB?.name || 'QB'}'s pass picked off!`;
        isInterception = true;
        isTurnover = true;
        yards = 0;
        result = 'TURNOVER';
      } else if (rand < sackChance + intChance + scrambleChance) {
        const scrYards = Math.max(0, Math.min(16, Math.round(1 + Math.random() * (qbMobility + 2))));
        yards = scrYards;
        narrative = yards >= 8
          ? `${offQB?.name || 'QB'} takes off! Scrambles ${yards} yards!`
          : `${offQB?.name || 'QB'} scrambles for ${yards} yards`;
        isScramble = true;
        result = 'GAIN';
        gs.stats[gs.possession].rushYds += yards;
      } else if (rand < sackChance + intChance + scrambleChance + (1 - compChance)) {
        narrative = `Incomplete pass by ${offQB?.name || 'QB'}`;
        yards = 0;
        result = 'INCOMPLETE';
      } else {
        const depthMod = offPlay.id === 'fl' ? 1.8 : offPlay.id === 'ps' ? 1.5 :
                         offPlay.id === 'sl' ? 0.7 : offPlay.id === 'sc' ? 0.6 : 1.0;
        const baseYards = (qbRating + wrRating) / 2 * depthMod;
        yards = Math.round(baseYards + (Math.random() * 10 - 5) - coverageBonus - preventBonus);
        yards = Math.max(0, Math.min(offPlay.id === 'fl' ? 60 : 35, yards));
        if (yards >= 20) narrative = `${offQB?.name || 'QB'} AIRS IT OUT! ${offWR?.name || 'WR'} hauls in ${yards} yards!`;
        else if (yards > 0) narrative = `Completed to ${offWR?.name || 'WR'} for ${yards} yards`;
        result = 'GAIN';
        gs.stats[gs.possession].passYds += yards;
      }
      this.rs.applyFatigue(gs.possession, 'PASS');
      this.rs.applyFatigue(1 - gs.possession, 'PASS');

    } else if (offPlay.type === 'KICK') {
      const kicker = this.rs.getActiveStarter(offTeam, 'K') ||
                     this.rs.getActiveStarter(offTeam, 'P');
      const kRating = kicker ? this.rs.getEffectiveRating(kicker) : 5;
      if (offPlay.id === 'fg') {
        const offDir2 = gs.possession === 0 ? 1 : -1;
        const ydsFromEnd = offDir2 === 1 ? (100 - gs.ballYard) : gs.ballYard;
        const distance = ydsFromEnd + 17;
        const maxRange = kRating * 5 + 25;
        if (distance > maxRange) {
          narrative = `Field goal attempt from ${distance} yards... NO GOOD! Out of range!`;
          result = 'FG_MISS';
        } else {
          const chance = Math.max(0.3, 1 - (distance - 20) / (maxRange - 20) * 0.7);
          if (Math.random() < chance) {
            narrative = `Field goal from ${distance} yards... IT'S GOOD!`;
            result = 'FG_GOOD';
          } else {
            narrative = `Field goal from ${distance} yards... NO GOOD!`;
            result = 'FG_MISS';
          }
        }
      } else {
        const puntYards = Math.round(kRating * 4 + 20 + Math.random() * 10);
        narrative = `Punt travels ${puntYards} yards downfield`;
        yards = puntYards;
        result = 'PUNT';
      }
    }

    if (offPlay.type === 'RUN' && result === 'GAIN') {
      gs.stats[gs.possession].rushYds += Math.max(0, yards);
    }

    return { yards, result, narrative, isTurnover, isSack, isInterception, isScramble };
  }

  _avgRating(team, positions) {
    let total = 0, count = 0;
    for (const pos of positions) {
      const p = this.rs.getActiveStarter(team, pos);
      if (p) { total += this.rs.getEffectiveRating(p); count++; }
    }
    return count ? total / count : 5;
  }

  resolveKickoff(kickingTeam) {
    const kicker = this.rs.getActiveStarter(kickingTeam, 'K');
    const kRating = kicker ? this.rs.getEffectiveRating(kicker) : 5;
    const baseYard = Math.round(kRating * 3 + 10 + Math.random() * 15);
    return Math.min(35, Math.max(15, baseYard));
  }
}
