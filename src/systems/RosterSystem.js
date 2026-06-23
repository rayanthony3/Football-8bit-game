import { getOverall } from '../data/teams.js';

const FATIGUE_PER_PLAY = { QB:8, RB:15, FB:12, WR:6, TE:8,
  LT:10, LG:10, C:10, RG:10, RT:10,
  DE:14, DT:12, MLB:10, OLB:10, CB:6, FS:5, SS:8, K:2, P:2 };

const FATIGUE_THRESHOLD = 60;

export class RosterSystem {
  constructor(teams) {
    this.teams = teams;
  }

  applyFatigue(teamIdx, playType) {
    const team = this.teams[teamIdx];
    const involvedPos = this._getInvolvedPositions(playType, teamIdx === 0);
    for (const player of team.roster) {
      if (involvedPos.includes(player.pos)) {
        player.fatigue = Math.min(100, player.fatigue + (FATIGUE_PER_PLAY[player.pos] || 8));
      }
    }
  }

  recoverFatigue(teamIdx) {
    const team = this.teams[teamIdx];
    for (const player of team.roster) {
      if (player.fatigue > 0) {
        player.fatigue = Math.max(0, player.fatigue - 5);
      }
    }
  }

  _getInvolvedPositions(playType, isOffense) {
    if (isOffense) {
      if (playType === 'RUN') return ['QB','RB','FB','LT','LG','C','RG','RT','TE'];
      if (playType === 'PASS') return ['QB','WR','TE','RB','LT','LG','C','RG','RT'];
      return ['QB','RB'];
    } else {
      if (playType === 'RUN') return ['DE','DT','MLB','OLB'];
      if (playType === 'PASS') return ['DE','DT','MLB','OLB','CB','FS','SS'];
      return ['DE','DT'];
    }
  }

  autoRotate(teamIdx) {
    const team = this.teams[teamIdx];
    const positions = [...new Set(team.roster.map(p => p.pos))];
    const rotations = [];

    for (const pos of positions) {
      const group = team.roster.filter(p => p.pos === pos);
      if (group.length < 2) continue;

      const starters = group.filter(p => p.fatigue < FATIGUE_THRESHOLD);
      const tiredPlayers = group.filter(p => p.fatigue >= FATIGUE_THRESHOLD);
      const freshBackups = group.filter(p => p.fatigue < 30);

      for (const tired of tiredPlayers) {
        const backup = freshBackups.find(b => b !== tired);
        if (backup) {
          rotations.push({ out: tired.name, in: backup.name, pos });
        }
      }
    }

    return rotations;
  }

  getActiveStarter(team, pos) {
    const group = team.roster
      .filter(p => p.pos === pos)
      .sort((a, b) => {
        const aScore = getOverall(a) - a.fatigue * 0.5;
        const bScore = getOverall(b) - b.fatigue * 0.5;
        return bScore - aScore;
      });
    return group[0] || null;
  }

  getEffectiveRating(player) {
    const fatiguePenalty = player.fatigue / 20;
    return Math.max(1, getOverall(player) - fatiguePenalty);
  }

  getOnFieldUnit(team, formation) {
    const unit = [];
    const posSlots = this._getFormationSlots(formation);
    for (const [pos, count] of Object.entries(posSlots)) {
      const eligible = team.roster
        .filter(p => p.pos === pos)
        .sort((a, b) => this.getEffectiveRating(b) - this.getEffectiveRating(a));
      unit.push(...eligible.slice(0, count));
    }
    return unit;
  }

  _getFormationSlots(formation) {
    const formations = {
      'OFFENSE_BASE':   { QB:1, RB:1, FB:1, WR:2, TE:1, LT:1, LG:1, C:1, RG:1, RT:1 },
      'OFFENSE_SPREAD': { QB:1, RB:1, WR:4, TE:1, LT:1, LG:1, C:1, RG:1, RT:1 },
      'OFFENSE_HEAVY':  { QB:1, RB:2, FB:1, WR:1, TE:2, LT:1, LG:1, C:1, RG:1, RT:1 },
      'DEFENSE_BASE':   { DE:2, DT:2, MLB:1, OLB:2, CB:2, FS:1, SS:1 },
      'DEFENSE_NICKEL': { DE:2, DT:2, MLB:1, OLB:1, CB:3, FS:1, SS:1 },
      'DEFENSE_DIME':   { DE:2, DT:2, OLB:1, CB:4, FS:1, SS:1 },
    };
    return formations[formation] || formations['OFFENSE_BASE'];
  }
}
