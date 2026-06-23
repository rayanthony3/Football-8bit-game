import { CFG } from '../config.js';
import { getOverall, getStars, starsStr } from '../data/teams.js';

export class HalfTimeScene extends Phaser.Scene {
  constructor() { super({ key: 'HalfTimeScene' }); }

  init(data) { this.gs = data.gs; }

  create() {
    const { WIDTH, HEIGHT } = CFG;
    const gs = this.gs;

    this.add.rectangle(WIDTH/2, HEIGHT/2, WIDTH, HEIGHT, 0x000000, 0.85).setDepth(300);

    this.add.text(WIDTH/2, 40, '⬛ HALFTIME ⬛', {
      fontSize: '28px', fontFamily: 'monospace', color: '#ffd700',
      stroke: '#000000', strokeThickness: 4,
    }).setDepth(301).setOrigin(0.5);

    // Score
    const tA = gs.teams[0], tB = gs.teams[1];
    this.add.text(WIDTH/2 - 120, 90, `${tA.abbr}  ${tA.score}`, {
      fontSize: '32px', fontFamily: 'monospace',
      color: '#' + tA.secondary.toString(16).padStart(6,'0'),
    }).setDepth(301).setOrigin(0.5);
    this.add.text(WIDTH/2, 90, '—', {
      fontSize: '24px', fontFamily: 'monospace', color: '#888888',
    }).setDepth(301).setOrigin(0.5);
    this.add.text(WIDTH/2 + 120, 90, `${tB.score}  ${tB.abbr}`, {
      fontSize: '32px', fontFamily: 'monospace',
      color: '#' + tB.secondary.toString(16).padStart(6,'0'),
    }).setDepth(301).setOrigin(0.5);

    // Stats
    const statsY = 140;
    const headers = ['STAT', tA.abbr, tB.abbr];
    const statRows = [
      ['Pass Yds', gs.stats[0].passYds, gs.stats[1].passYds],
      ['Rush Yds', gs.stats[0].rushYds, gs.stats[1].rushYds],
      ['Total Yds', gs.stats[0].totalYds, gs.stats[1].totalYds],
      ['TDs', gs.stats[0].tds, gs.stats[1].tds],
      ['FGs', gs.stats[0].fgMade, gs.stats[1].fgMade],
      ['Sacks', gs.stats[0].sacks, gs.stats[1].sacks],
      ['TOVs', gs.stats[0].turnovers, gs.stats[1].turnovers],
    ];

    [headers, ...statRows].forEach((row, i) => {
      const y = statsY + i * 22;
      const isHeader = i === 0;
      const color = isHeader ? '#ffd700' : '#ccccee';
      const size = isHeader ? '12px' : '11px';
      this.add.text(WIDTH/2 - 140, y, row[0], {
        fontSize: size, fontFamily: 'monospace', color,
      }).setDepth(301);
      this.add.text(WIDTH/2 + 20, y, `${row[1]}`, {
        fontSize: size, fontFamily: 'monospace',
        color: '#' + tA.secondary.toString(16).padStart(6,'0'),
      }).setDepth(301).setOrigin(0.5);
      this.add.text(WIDTH/2 + 120, y, `${row[2]}`, {
        fontSize: size, fontFamily: 'monospace',
        color: '#' + tB.secondary.toString(16).padStart(6,'0'),
      }).setDepth(301).setOrigin(0.5);
    });

    // Top performers
    const perfY = 315;
    this.add.text(WIDTH/2, perfY, '── TOP PERFORMERS ──', {
      fontSize: '11px', fontFamily: 'monospace', color: '#888888',
    }).setDepth(301).setOrigin(0.5);

    const allPlayers = [...tA.roster, ...tB.roster];
    const topQBs = allPlayers.filter(p => p.pos === 'QB').sort((a,b) => getOverall(b) - getOverall(a));
    const topRBs = allPlayers.filter(p => p.pos === 'RB').sort((a,b) => getOverall(b) - getOverall(a));
    const topWRs = allPlayers.filter(p => p.pos === 'WR').sort((a,b) => getOverall(b) - getOverall(a));

    const perf = [
      topQBs[0] ? `QB  ${topQBs[0].name}  ${starsStr(getStars(getOverall(topQBs[0])))}` : '',
      topRBs[0] ? `RB  ${topRBs[0].name}  ${starsStr(getStars(getOverall(topRBs[0])))}` : '',
      topWRs[0] ? `WR  ${topWRs[0].name}  ${starsStr(getStars(getOverall(topWRs[0])))}` : '',
    ];
    perf.filter(Boolean).forEach((line, i) => {
      this.add.text(WIDTH/2, perfY + 18 + i * 18, line, {
        fontSize: '10px', fontFamily: 'monospace', color: '#00ff88',
      }).setDepth(301).setOrigin(0.5);
    });

    // Fatigue recovery
    for (const team of gs.teams) {
      for (const player of team.roster) {
        player.fatigue = Math.max(0, player.fatigue - 25);
      }
    }
    this.add.text(WIDTH/2, perfY + 75, '🔄 Players rested. Fatigue reduced.', {
      fontSize: '10px', fontFamily: 'monospace', color: '#888888',
    }).setDepth(301).setOrigin(0.5);

    // Continue
    const btn = this.add.image(WIDTH/2, HEIGHT - 45, 'btn_primary').setDepth(301).setInteractive({ useHandCursor: true });
    this.add.text(WIDTH/2, HEIGHT - 45, 'START 2ND HALF  ▶', {
      fontSize: '14px', fontFamily: 'monospace', color: '#ffd700',
    }).setDepth(302).setOrigin(0.5);
    btn.on('pointerdown', () => {
      gs.quarter = 3;
      gs.clock = CFG.QUARTER_SECONDS;
      this.scene.stop('HalfTimeScene');
      this.scene.resume('GameScene');
    });

    this.cameras.main.fadeIn(300);
  }
}
