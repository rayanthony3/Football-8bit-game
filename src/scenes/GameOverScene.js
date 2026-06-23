import { CFG } from '../config.js';
import { getOverall } from '../data/teams.js';

export class GameOverScene extends Phaser.Scene {
  constructor() { super({ key: 'GameOverScene' }); }

  init(data) { this.gs = data.gs; }

  create() {
    const { WIDTH, HEIGHT } = CFG;
    const gs = this.gs;
    const tA = gs.teams[0], tB = gs.teams[1];
    const playerTeam = gs.teams[gs.playerTeamIdx];
    const opponentTeam = gs.teams[1 - gs.playerTeamIdx];
    const playerWon = playerTeam.score > opponentTeam.score;
    const tie = tA.score === tB.score;

    // Background
    for (let i = 0; i < HEIGHT; i += 4) {
      const t = i / HEIGHT;
      const r = playerWon ? Math.floor(5 + t * 20) : Math.floor(20 + t * 10);
      const g = playerWon ? Math.floor(20 + t * 20) : Math.floor(5 + t * 5);
      const b = Math.floor(30 + t * 40);
      this.add.rectangle(WIDTH/2, i, WIDTH, 4, Phaser.Display.Color.GetColor(r, g, b));
    }

    // Pixel confetti (if won)
    if (playerWon) {
      for (let i = 0; i < 80; i++) {
        const cx = Math.random() * WIDTH;
        const cy = Math.random() * HEIGHT;
        const colors = [0xffd700, 0x00ff88, 0xff4488, 0x4488ff, 0xffcc44];
        const col = colors[Math.floor(Math.random() * colors.length)];
        const dot = this.add.rectangle(cx, cy, 4 + Math.random() * 4, 4 + Math.random() * 4, col);
        this.tweens.add({ targets: dot, y: dot.y + HEIGHT + 20, duration: 2000 + Math.random() * 2000, repeat: -1, delay: Math.random() * 2000 });
      }
    }

    // Result text
    const resultMsg = tie ? 'TIE GAME!' : playerWon ? 'VICTORY!' : 'DEFEAT';
    const resultColor = tie ? '#ffcc44' : playerWon ? '#ffd700' : '#ff4444';
    this.add.text(WIDTH/2, 55, resultMsg, {
      fontSize: '44px', fontFamily: 'monospace', color: resultColor,
      stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5);

    // Final score
    const scoreColor_A = '#' + tA.secondary.toString(16).padStart(6,'0');
    const scoreColor_B = '#' + tB.secondary.toString(16).padStart(6,'0');

    this.add.text(WIDTH/2, 118, 'FINAL SCORE', {
      fontSize: '13px', fontFamily: 'monospace', color: '#888888',
    }).setOrigin(0.5);

    this.add.text(WIDTH/2 - 90, 148, tA.abbr, {
      fontSize: '20px', fontFamily: 'monospace', color: scoreColor_A,
    }).setOrigin(0.5);
    this.add.text(WIDTH/2 - 90, 172, `${tA.score}`, {
      fontSize: '36px', fontFamily: 'monospace', color: scoreColor_A,
    }).setOrigin(0.5);

    this.add.text(WIDTH/2, 160, '—', {
      fontSize: '28px', fontFamily: 'monospace', color: '#444466',
    }).setOrigin(0.5);

    this.add.text(WIDTH/2 + 90, 148, tB.abbr, {
      fontSize: '20px', fontFamily: 'monospace', color: scoreColor_B,
    }).setOrigin(0.5);
    this.add.text(WIDTH/2 + 90, 172, `${tB.score}`, {
      fontSize: '36px', fontFamily: 'monospace', color: scoreColor_B,
    }).setOrigin(0.5);

    // Stats box
    this.add.image(WIDTH/2, 290, 'panel_md');

    const statsData = [
      ['', tA.abbr, tB.abbr],
      ['Pass Yds', gs.stats[0].passYds, gs.stats[1].passYds],
      ['Rush Yds', gs.stats[0].rushYds, gs.stats[1].rushYds],
      ['Total Yds', gs.stats[0].totalYds, gs.stats[1].totalYds],
      ['TDs', gs.stats[0].tds, gs.stats[1].tds],
      ['FGs Made', gs.stats[0].fgMade, gs.stats[1].fgMade],
      ['Sacks', gs.stats[0].sacks, gs.stats[1].sacks],
      ['Turnovers', gs.stats[0].turnovers, gs.stats[1].turnovers],
    ];

    statsData.forEach((row, i) => {
      const y = 220 + i * 20;
      const isHeader = i === 0;
      this.add.text(WIDTH/2 - 110, y, `${row[0]}`, {
        fontSize: isHeader ? '11px' : '10px', fontFamily: 'monospace',
        color: isHeader ? '#ffd700' : '#ccccee',
      });
      this.add.text(WIDTH/2 + 30, y, `${row[1]}`, {
        fontSize: '10px', fontFamily: 'monospace', color: scoreColor_A,
      }).setOrigin(0.5);
      this.add.text(WIDTH/2 + 90, y, `${row[2]}`, {
        fontSize: '10px', fontFamily: 'monospace', color: scoreColor_B,
      }).setOrigin(0.5);
    });

    // MVP
    const allP = [...tA.roster, ...tB.roster];
    const mvp = allP.reduce((best, p) => getOverall(p) > getOverall(best) ? p : best, allP[0]);
    this.add.text(WIDTH/2, HEIGHT - 120, `🏆 MVP: ${mvp.name}  (${mvp.pos})  OVR ${getOverall(mvp)}`, {
      fontSize: '12px', fontFamily: 'monospace', color: '#ffd700',
    }).setOrigin(0.5);

    // Play again
    const playAgainBtn = this.add.image(WIDTH/2 - 65, HEIGHT - 55, 'btn_primary').setInteractive({ useHandCursor: true });
    this.add.text(WIDTH/2 - 65, HEIGHT - 55, 'PLAY AGAIN', {
      fontSize: '13px', fontFamily: 'monospace', color: '#ffd700',
    }).setOrigin(0.5);
    playAgainBtn.on('pointerdown', () => {
      this.cameras.main.fadeOut(300);
      this.time.delayedCall(300, () => this.scene.start('SetupScene'));
    });

    // Main Menu
    const menuBtn = this.add.image(WIDTH/2 + 75, HEIGHT - 55, 'btn_neutral').setInteractive({ useHandCursor: true });
    this.add.text(WIDTH/2 + 75, HEIGHT - 55, 'MAIN MENU', {
      fontSize: '12px', fontFamily: 'monospace', color: '#aaddff',
    }).setOrigin(0.5);
    menuBtn.on('pointerdown', () => {
      this.cameras.main.fadeOut(300);
      this.time.delayedCall(300, () => this.scene.start('MenuScene'));
    });

    this.cameras.main.fadeIn(500);
  }
}
