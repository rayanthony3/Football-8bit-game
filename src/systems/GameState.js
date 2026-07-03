import { CFG } from '../config.js';
import { createTeams } from '../data/teams.js';

export class GameState {
  constructor(teamA, teamB) {
    this._initTeams = (teamA && teamB) ? [teamA, teamB] : null;
    this.reset();
  }

  reset() {
    this.teams = this._initTeams || createTeams();
    this.playerTeamIdx = 0;
    this.playerPos = 'QB';
    this.gameMode = 'COACH';

    this.quarter = 1;
    this.clock = CFG.QUARTER_SECONDS;
    this.playClock = CFG.PLAY_CLOCK;
    this.clockRunning = false;

    this.possession = 0;
    this.ballYard = 25;
    this.down = 1;
    this.yardsToGo = 10;
    this.firstDownYard = 35;

    this.selectedOffPlay = null;
    this.selectedDefPlay = null;
    this.phase = 'SETUP';

    this.driveLog = [];
    this.stats = {
      0: { passYds:0, rushYds:0, totalYds:0, tds:0, fgMade:0, punts:0, turnovers:0, sacks:0 },
      1: { passYds:0, rushYds:0, totalYds:0, tds:0, fgMade:0, punts:0, turnovers:0, sacks:0 },
    };
  }

  get offenseTeam() { return this.teams[this.possession]; }
  get defenseTeam()  { return this.teams[1 - this.possession]; }

  changePossession(newBallYard) {
    this.possession = 1 - this.possession;
    this.down = 1;
    this.yardsToGo = 10;
    if (newBallYard !== undefined) this.ballYard = newBallYard;
    // ballYard is a unified field coordinate (0=left EZ, 100=right EZ). Don't flip it.
    const offDir = this.possession === 0 ? 1 : -1;
    this.firstDownYard = Math.min(100, Math.max(0, this.ballYard + 10 * offDir));
  }

  nextDown(yardsGained) {
    // offDir: team 0 goes toward yard 100 (right), team 1 toward yard 0 (left)
    const offDir = this.possession === 0 ? 1 : -1;
    this.stats[this.possession].totalYds += yardsGained;
    const newYard = this.ballYard + yardsGained * offDir;

    if (offDir === 1 && newYard >= 100) { this.ballYard = 100; return 'TOUCHDOWN'; }
    if (offDir === -1 && newYard <= 0)  { this.ballYard = 0;   return 'TOUCHDOWN'; }

    this.ballYard   = Math.min(100, Math.max(0, newYard));
    this.yardsToGo  = Math.max(0, this.yardsToGo - yardsGained);

    if (this.yardsToGo <= 0) {
      this.down = 1;
      this.yardsToGo = 10;
      this.firstDownYard = Math.min(100, Math.max(0, this.ballYard + 10 * offDir));
      return 'FIRST_DOWN';
    }
    if (this.down >= 4) {
      return 'TURNOVER_ON_DOWNS';
    }
    this.down++;
    return 'NEXT_DOWN';
  }

  scorePoints(teamIdx, points) {
    this.teams[teamIdx].score += points;
  }

  nextQuarter() {
    this.quarter++;
    this.clock = CFG.QUARTER_SECONDS;
    if (this.quarter === 3) {
      this.possession = 1 - this.possession;
      this.down = 1;
      this.yardsToGo = 10;
      // Place ball at the new offense's own 25 in unified field coordinates
      const offDir = this.possession === 0 ? 1 : -1;
      this.ballYard      = offDir === 1 ? 25 : 75;
      this.firstDownYard = offDir === 1 ? 35 : 65;
    }
  }

  isGameOver() { return this.quarter > 4; }

  downString() {
    const sfx = ['','st','nd','rd','th'];
    const d = this.down;
    return `${d}${sfx[d] || 'th'} & ${this.yardsToGo}`;
  }

  clockString() {
    const m = Math.floor(this.clock / 60);
    const s = this.clock % 60;
    return `${m}:${s.toString().padStart(2,'0')}`;
  }
}
