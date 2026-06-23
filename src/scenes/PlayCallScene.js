import { CFG } from '../config.js';

export class PlayCallScene extends Phaser.Scene {
  constructor() { super({ key: 'PlayCallScene' }); }

  init(data) {
    this.gs = data.gs;
    this.mode = data.mode;
    this.onSelect = data.onSelect;
  }

  create() {
    const { WIDTH, HEIGHT } = CFG;
    const plays = this.mode === 'OFFENSE' ? CFG.OFFENSE_PLAYS : CFG.DEFENSE_PLAYS;

    // Darken overlay
    this.add.rectangle(WIDTH/2, HEIGHT/2, WIDTH, HEIGHT, 0x000000, 0.6)
      .setScrollFactor(0).setDepth(200);

    // Panel
    const panelH = Math.min(380, plays.length * 46 + 100);
    const panel = this.add.image(WIDTH/2, HEIGHT/2, 'panel_lg').setScrollFactor(0).setDepth(201);

    const title = this.add.text(WIDTH/2, HEIGHT/2 - panelH/2 + 24,
      this.mode === 'OFFENSE' ? '📋 PLAY CALL — OFFENSE' : '🛡 PLAY CALL — DEFENSE', {
        fontSize: '16px', fontFamily: 'monospace', color: '#ffd700',
      }).setScrollFactor(0).setDepth(202).setOrigin(0.5);

    // Team indicator
    const team = this.gs.teams[this.gs.playerTeamIdx];
    this.add.text(WIDTH/2, HEIGHT/2 - panelH/2 + 44, `${team.name}  |  ${this.gs.downString()}`, {
      fontSize: '11px', fontFamily: 'monospace', color: '#888888',
    }).setScrollFactor(0).setDepth(202).setOrigin(0.5);

    // Play list
    const startY = HEIGHT/2 - panelH/2 + 80;
    const colW = 220;

    const groupColors = { RUN: 0x2a4a1a, PASS: 0x1a2a5a, KICK: 0x4a3a0a, COVERAGE: 0x1a2a4a, BLITZ: 0x4a1a1a, FRONT: 0x2a1a4a };
    const groupBorder = { RUN: 0x88cc44, PASS: 0x4488ff, KICK: 0xffcc44, COVERAGE: 0x4488cc, BLITZ: 0xff4444, FRONT: 0xaa44ff };

    // Split into two columns
    const col1 = plays.slice(0, Math.ceil(plays.length / 2));
    const col2 = plays.slice(Math.ceil(plays.length / 2));

    [col1, col2].forEach((col, colIdx) => {
      const cx = WIDTH/2 - 105 + colIdx * 215;
      col.forEach((play, i) => {
        const py = startY + i * 46;
        const bgColor = groupColors[play.type] || 0x1e1e2e;
        const borderColor = groupBorder[play.type] || 0x444466;

        const btn = this.add.rectangle(cx, py, 205, 38, bgColor, 0.95)
          .setScrollFactor(0).setDepth(202).setInteractive({ useHandCursor: true });
        btn.setStrokeStyle(1, borderColor);

        const nameLabel = this.add.text(cx - 94, py - 8, play.name, {
          fontSize: '12px', fontFamily: 'monospace', color: '#ffffff',
        }).setScrollFactor(0).setDepth(203);

        const descLabel = this.add.text(cx - 94, py + 6, play.desc, {
          fontSize: '9px', fontFamily: 'monospace', color: '#888888',
        }).setScrollFactor(0).setDepth(203);

        const typePill = this.add.text(cx + 82, py, play.type, {
          fontSize: '8px', fontFamily: 'monospace',
          color: '#' + borderColor.toString(16).padStart(6,'0'),
        }).setScrollFactor(0).setDepth(203).setOrigin(1, 0.5);

        btn.on('pointerover', () => {
          btn.setStrokeStyle(2, 0xffd700);
          nameLabel.setColor('#ffd700');
        });
        btn.on('pointerout', () => {
          btn.setStrokeStyle(1, borderColor);
          nameLabel.setColor('#ffffff');
        });
        btn.on('pointerdown', () => {
          this.scene.stop('PlayCallScene');
          this.onSelect(play);
        });
      });
    });

    // Diagram area (right side)
    this._drawPlayDiagram(WIDTH/2 + 140, HEIGHT/2, this.mode);

    // Cancel (if applicable)
    this.input.keyboard?.on('keydown-ESC', () => this.scene.stop('PlayCallScene'));
  }

  _drawPlayDiagram(cx, cy, mode) {
    const g = this.add.graphics().setScrollFactor(0).setDepth(202);
    const w = 110, h = 130;

    g.fillStyle(CFG.COLORS.FIELD, 0.9);
    g.fillRect(cx - w/2, cy - h/2, w, h);
    g.lineStyle(1, CFG.COLORS.LINE, 0.5);
    g.strokeRect(cx - w/2, cy - h/2, w, h);

    // Line of scrimmage
    g.lineStyle(1, 0xff8800);
    g.beginPath();
    g.moveTo(cx - w/2, cy + 10);
    g.lineTo(cx + w/2, cy + 10);
    g.strokePath();

    if (mode === 'OFFENSE') {
      // O-line
      for (let i = -2; i <= 2; i++) {
        g.fillStyle(0x1a3a8a);
        g.fillCircle(cx + i * 14, cy + 10, 6);
      }
      // QB
      g.fillStyle(0x00ccff);
      g.fillCircle(cx, cy + 28, 6);
      // RB
      g.fillStyle(0x1a3a8a, 0.8);
      g.fillCircle(cx + 10, cy + 44, 5);
      // WRs
      g.fillStyle(0x4488ff, 0.9);
      g.fillCircle(cx - 48, cy + 10, 5);
      g.fillCircle(cx + 48, cy + 10, 5);
      // Routes
      g.lineStyle(1, 0x00ff88, 0.9);
      g.beginPath(); g.moveTo(cx - 48, cy + 10); g.lineTo(cx - 48, cy - 40); g.strokePath();
      g.beginPath(); g.moveTo(cx + 48, cy + 10); g.lineTo(cx + 48, cy - 40); g.lineTo(cx + 20, cy - 30); g.strokePath();
      g.lineStyle(1, 0xffcc44, 0.8);
      g.beginPath(); g.moveTo(cx, cy + 28); g.lineTo(cx + 10, cy - 20); g.strokePath();

      this.add.text(cx, cy - h/2 - 12, 'OFFENSE SET', {
        fontSize: '8px', fontFamily: 'monospace', color: '#888888',
      }).setScrollFactor(0).setDepth(203).setOrigin(0.5);
    } else {
      // Defensive formation
      const defPos = [
        { x: cx - 20, y: cy + 10 }, { x: cx + 20, y: cy + 10 },
        { x: cx - 42, y: cy + 10 }, { x: cx + 42, y: cy + 10 },
      ];
      defPos.forEach(p => { g.fillStyle(0x8b0000); g.fillCircle(p.x, p.y, 6); });
      // LBs
      g.fillStyle(0xcc3333);
      g.fillCircle(cx - 24, cy - 14, 5);
      g.fillCircle(cx + 24, cy - 14, 5);
      g.fillCircle(cx, cy - 22, 5);
      // DBs
      g.fillStyle(0xff6666, 0.9);
      g.fillCircle(cx - 45, cy - 40, 5);
      g.fillCircle(cx + 45, cy - 40, 5);
      g.fillCircle(cx, cy - 55, 5);
      g.fillCircle(cx + 20, cy - 46, 5);

      this.add.text(cx, cy - h/2 - 12, 'DEFENSE SET', {
        fontSize: '8px', fontFamily: 'monospace', color: '#888888',
      }).setScrollFactor(0).setDepth(203).setOrigin(0.5);
    }
  }
}
