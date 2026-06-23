import { CFG } from '../config.js';
import { GameState } from '../systems/GameState.js';
import { getOverall } from '../data/teams.js';
import { drawStatBar, statColor } from '../graphics/Sprites.js';

export class SetupScene extends Phaser.Scene {
  constructor() { super({ key: 'SetupScene' }); }

  create() {
    this.gs = new GameState();
    this.selectedTeam = 0;
    this.selectedPos  = 'QB';
    this.selectedMode = 'COACH';
    this._step = 'TEAM';

    this._buildBG();
    this._showTeamSelect();
    this.cameras.main.fadeIn(300);
  }

  _buildBG() {
    const { WIDTH, HEIGHT } = CFG;
    this.add.rectangle(WIDTH/2, HEIGHT/2, WIDTH, HEIGHT, CFG.COLORS.SKY);
    for (let x = 0; x < WIDTH; x += 32) this.add.rectangle(x, HEIGHT/2, 1, HEIGHT, 0x1a2a4a, 0.25);
    for (let y = 0; y < HEIGHT; y += 32) this.add.rectangle(WIDTH/2, y, WIDTH, 1, 0x1a2a4a, 0.25);

    this.add.text(WIDTH/2, 22, 'GRIDIRON 8-BIT', {
      fontSize: '18px', fontFamily: 'monospace', color: '#ffd700',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5);
  }

  _clearScene() {
    this._currentGroup?.forEach(o => o?.destroy());
    this._currentGroup = [];
  }

  _track(obj) {
    if (!this._currentGroup) this._currentGroup = [];
    if (Array.isArray(obj)) this._currentGroup.push(...obj.flat());
    else this._currentGroup.push(obj);
    return obj;
  }

  _showTeamSelect() {
    this._clearScene();
    const { WIDTH, HEIGHT } = CFG;

    this._track(this.add.text(WIDTH/2, 58, 'CHOOSE YOUR TEAM', {
      fontSize: '22px', fontFamily: 'monospace', color: '#ffffff',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5));

    const teams = this.gs.teams;
    const cardW = 200, cardH = 260;
    const positions = [WIDTH/2 - 115, WIDTH/2 + 115];

    teams.forEach((team, idx) => {
      const x = positions[idx];
      const y = HEIGHT/2 + 10;

      const card = this._track(this.add.rectangle(x, y, cardW, cardH, team.primary, 0.85));
      card.setStrokeStyle(2, idx === this.selectedTeam ? 0xffd700 : 0x333366);
      card.setInteractive({ useHandCursor: true });

      this._track(this.add.text(x, y - cardH/2 + 18, team.abbr, {
        fontSize: '28px', fontFamily: 'monospace', color: '#' + team.secondary.toString(16).padStart(6,'0'),
        stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5));

      this._track(this.add.text(x, y - cardH/2 + 50, team.city, {
        fontSize: '10px', fontFamily: 'monospace', color: '#ccccff',
      }).setOrigin(0.5));

      this._track(this.add.text(x, y - cardH/2 + 65, team.name, {
        fontSize: '11px', fontFamily: 'monospace',
        color: '#' + team.secondary.toString(16).padStart(6,'0'),
      }).setOrigin(0.5));

      // Jersey preview
      const jerseyPreview = this._track(this.add.rectangle(x, y - 30, 36, 50, team.primary));
      jerseyPreview.setStrokeStyle(2, team.secondary);
      this._track(this.add.text(x, y - 30, team.abbr[0], {
        fontSize: '20px', fontFamily: 'monospace',
        color: '#' + team.secondary.toString(16).padStart(6,'0'),
      }).setOrigin(0.5));

      // Helmet stripe
      this._track(this.add.rectangle(x, y - 56, 36, 8, team.secondary));

      // Overall rating
      const roster = team.roster;
      const avgOVR = Math.round(roster.reduce((a, p) => a + getOverall(p), 0) / roster.length);
      this._track(this.add.text(x, y + 50, `TEAM OVR: ${avgOVR}`, {
        fontSize: '12px', fontFamily: 'monospace', color: '#00ff88',
      }).setOrigin(0.5));

      this._track(this.add.text(x, y + 70, `ROSTER: 52`, {
        fontSize: '11px', fontFamily: 'monospace', color: '#aaaacc',
      }).setOrigin(0.5));

      // Key players
      const qb = roster.find(p => p.pos === 'QB');
      if (qb) {
        this._track(this.add.text(x, y + 90, `QB: ${qb.name}`, {
          fontSize: '10px', fontFamily: 'monospace', color: '#ffee88',
        }).setOrigin(0.5));
        this._track(this.add.text(x, y + 105, `OVR ${getOverall(qb)}`, {
          fontSize: '10px', fontFamily: 'monospace', color: '#' + statColor(getOverall(qb)).toString(16).padStart(6,'0'),
        }).setOrigin(0.5));
      }

      // Select indicator
      if (idx === this.selectedTeam) {
        this._track(this.add.text(x, y + 125, '▼ SELECTED ▼', {
          fontSize: '11px', fontFamily: 'monospace', color: '#ffd700',
        }).setOrigin(0.5));
      }

      card.on('pointerdown', () => {
        this.selectedTeam = idx;
        this._showTeamSelect();
      });
      card.on('pointerover', () => { card.setStrokeStyle(2, 0xffd700); });
      card.on('pointerout', () => { card.setStrokeStyle(2, idx === this.selectedTeam ? 0xffd700 : 0x333366); });
    });

    const nextBtn = this._track(this.add.image(WIDTH/2, HEIGHT - 45, 'btn_primary').setInteractive({ useHandCursor: true }));
    this._track(this.add.text(WIDTH/2, HEIGHT - 45, 'SELECT MODE  ▶', {
      fontSize: '14px', fontFamily: 'monospace', color: '#ffd700',
    }).setOrigin(0.5));
    nextBtn.on('pointerdown', () => {
      this.gs.playerTeamIdx = this.selectedTeam;
      this._step = 'MODE';
      this._showModeSelect();
    });

    const backBtn = this._track(this.add.image(70, HEIGHT - 45, 'btn_small').setInteractive({ useHandCursor: true }));
    this._track(this.add.text(70, HEIGHT - 45, '◀ BACK', {
      fontSize: '12px', fontFamily: 'monospace', color: '#aaddff',
    }).setOrigin(0.5));
    backBtn.on('pointerdown', () => {
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.time.delayedCall(200, () => this.scene.start('MenuScene'));
    });
  }

  _showPositionSelect() {
    this._clearScene();
    const { WIDTH, HEIGHT } = CFG;
    const team = this.gs.teams[this.selectedTeam];

    this._track(this.add.text(WIDTH/2, 58, 'CHOOSE YOUR POSITION', {
      fontSize: '20px', fontFamily: 'monospace', color: '#ffffff',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5));

    this._track(this.add.text(WIDTH/2, 82, `Team: ${team.name}`, {
      fontSize: '12px', fontFamily: 'monospace',
      color: '#' + team.secondary.toString(16).padStart(6,'0'),
    }).setOrigin(0.5));

    // Position grid
    const posGroups = [
      { label: '── OFFENSE ──', positions: ['QB','RB','FB','WR','TE','LT','LG','C','RG','RT'] },
      { label: '── DEFENSE ──', positions: ['DE','DT','MLB','OLB','CB','FS','SS'] },
      { label: '── SPECIAL TEAMS ──', positions: ['K','P'] },
    ];

    let gx = 60, gy = 110;
    for (const group of posGroups) {
      this._track(this.add.text(gx, gy, group.label, {
        fontSize: '10px', fontFamily: 'monospace', color: '#666688',
      }));
      gy += 16;

      let colCount = 0;
      for (const pos of group.positions) {
        const px = gx + colCount * 72;
        const py = gy;
        const isSelected = pos === this.selectedPos;
        const posPlayers = team.roster.filter(p => p.pos === pos);
        const bestPlayer = posPlayers.sort((a,b) => getOverall(b) - getOverall(a))[0];
        const ovr = bestPlayer ? getOverall(bestPlayer) : 5;

        const btn = this._track(this.add.rectangle(px + 30, py + 20, 64, 36,
          isSelected ? team.primary : 0x1e1e2e, 0.9));
        btn.setStrokeStyle(2, isSelected ? team.secondary : 0x334477);
        btn.setInteractive({ useHandCursor: true });

        this._track(this.add.text(px + 30, py + 14, pos, {
          fontSize: '13px', fontFamily: 'monospace',
          color: isSelected ? '#' + team.secondary.toString(16).padStart(6,'0') : '#aaaacc',
        }).setOrigin(0.5));

        const ovrCol = '#' + statColor(ovr).toString(16).padStart(6,'0');
        this._track(this.add.text(px + 30, py + 28, `${ovr}`, {
          fontSize: '10px', fontFamily: 'monospace', color: ovrCol,
        }).setOrigin(0.5));

        btn.on('pointerdown', () => {
          this.selectedPos = pos;
          this._showPositionSelect();
        });
        btn.on('pointerover', () => btn.setStrokeStyle(2, 0xffd700));
        btn.on('pointerout', () => btn.setStrokeStyle(2, isSelected ? team.secondary : 0x334477));

        colCount++;
        if (colCount >= 5) { colCount = 0; gy += 44; }
      }
      if (colCount > 0) gy += 44;
      gy += 10;
    }

    // Selected position detail
    const selPlayer = team.roster.filter(p => p.pos === this.selectedPos)
      .sort((a,b) => getOverall(b) - getOverall(a))[0];
    if (selPlayer) {
      const dX = WIDTH - 160, dY = 180;
      this._track(this.add.image(dX, dY, 'panel_sm'));
      this._track(this.add.text(dX, dY - 45, `${this.selectedPos} - STARTER`, {
        fontSize: '11px', fontFamily: 'monospace', color: '#ffd700',
      }).setOrigin(0.5));
      this._track(this.add.text(dX, dY - 30, selPlayer.name, {
        fontSize: '12px', fontFamily: 'monospace', color: '#ffffff',
      }).setOrigin(0.5));
      this._track(this.add.text(dX, dY - 14, `OVR ${getOverall(selPlayer)}`, {
        fontSize: '11px', fontFamily: 'monospace',
        color: '#' + statColor(getOverall(selPlayer)).toString(16).padStart(6,'0'),
      }).setOrigin(0.5));

      const keyStats = Object.entries(selPlayer.stats).slice(0, 5);
      keyStats.forEach(([key, val], i) => {
        const sy = dY + 5 + i * 18;
        this._track(this.add.text(dX - 60, sy, CFG.STAT_LABELS[key] || key, {
          fontSize: '9px', fontFamily: 'monospace', color: '#888888',
        }));
        this._track(this.add.text(dX + 62, sy + 3, `${val}`, {
          fontSize: '9px', fontFamily: 'monospace',
          color: '#' + statColor(val).toString(16).padStart(6,'0'),
        }).setOrigin(1, 0));
        const bars = drawStatBar(this, dX - 62, sy + 3, val, 10, statColor(val), 80);
        this._track(bars);
      });
    }

    // Next button
    const nextBtn = this._track(this.add.image(WIDTH/2 + 60, HEIGHT - 45, 'btn_primary').setInteractive({ useHandCursor: true }));
    this._track(this.add.text(WIDTH/2 + 60, HEIGHT - 45, 'START GAME  ▶', {
      fontSize: '14px', fontFamily: 'monospace', color: '#ffd700',
    }).setOrigin(0.5));
    nextBtn.on('pointerdown', () => {
      this.gs.playerTeamIdx = this.selectedTeam;
      this.gs.playerPos     = this.selectedPos;
      this.gs.gameMode      = this.selectedMode;
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.time.delayedCall(300, () => this.scene.start('GameScene', { gs: this.gs }));
    });

    const backBtn = this._track(this.add.image(70, HEIGHT - 45, 'btn_small').setInteractive({ useHandCursor: true }));
    this._track(this.add.text(70, HEIGHT - 45, '◀ BACK', {
      fontSize: '12px', fontFamily: 'monospace', color: '#aaddff',
    }).setOrigin(0.5));
    backBtn.on('pointerdown', () => this._showModeSelect());
  }

  _showModeSelect() {
    this._clearScene();
    const { WIDTH, HEIGHT } = CFG;
    const team = this.gs.teams[this.selectedTeam];

    this._track(this.add.text(WIDTH/2, 58, 'CHOOSE GAME MODE', {
      fontSize: '20px', fontFamily: 'monospace', color: '#ffffff',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5));

    this._track(this.add.text(WIDTH/2, 82, `Team: ${team.name}`, {
      fontSize: '12px', fontFamily: 'monospace',
      color: '#' + team.secondary.toString(16).padStart(6,'0'),
    }).setOrigin(0.5));

    const modes = [
      {
        id: 'PLAYER',
        label: 'PLAYER',
        sub: 'Control a player on every play',
        detail: 'Pick your position, get on the field and control your player with the D-pad. Call plays on offense or defense.',
        color: 0x004422,
        border: 0x00ff88,
      },
      {
        id: 'COACH',
        label: 'COACH',
        sub: 'Call plays, watch CPU execute',
        detail: 'Select plays from the playbook on both sides of the ball. CPU players execute your calls automatically.',
        color: 0x001a44,
        border: 0x4488ff,
      },
      {
        id: 'SIM',
        label: 'SIMULATE',
        sub: 'Full CPU simulation — spectate',
        detail: 'Sit back and watch. Both teams are controlled by the CPU. Great for scouting or just enjoying a game.',
        color: 0x220022,
        border: 0xaa44ff,
      },
    ];

    const cardW = 220, cardH = 200;
    const startX = WIDTH / 2 - (modes.length - 1) * (cardW / 2 + 10);

    modes.forEach((m, i) => {
      const cx = WIDTH / 2 + (i - 1) * (cardW + 14);
      const cy = HEIGHT / 2 - 20;
      const isSelected = this.selectedMode === m.id;

      const card = this._track(this.add.rectangle(cx, cy, cardW, cardH, m.color, 0.9));
      card.setStrokeStyle(isSelected ? 3 : 1, isSelected ? m.border : 0x334466);
      card.setInteractive({ useHandCursor: true });

      this._track(this.add.text(cx, cy - cardH/2 + 22, m.label, {
        fontSize: '18px', fontFamily: 'monospace', fontStyle: 'bold',
        color: '#' + m.border.toString(16).padStart(6,'0'),
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5));

      this._track(this.add.text(cx, cy - cardH/2 + 46, m.sub, {
        fontSize: '9px', fontFamily: 'monospace', color: '#aaaacc',
        align: 'center', wordWrap: { width: cardW - 20 },
      }).setOrigin(0.5));

      this._track(this.add.text(cx, cy + 10, m.detail, {
        fontSize: '9px', fontFamily: 'monospace', color: '#888899',
        align: 'center', wordWrap: { width: cardW - 24 },
      }).setOrigin(0.5));

      if (isSelected) {
        this._track(this.add.text(cx, cy + cardH/2 - 16, '▼ SELECTED ▼', {
          fontSize: '10px', fontFamily: 'monospace',
          color: '#' + m.border.toString(16).padStart(6,'0'),
        }).setOrigin(0.5));
      }

      card.on('pointerdown', () => {
        this.selectedMode = m.id;
        this._showModeSelect();
      });
      card.on('pointerover', () => card.setStrokeStyle(3, m.border));
      card.on('pointerout',  () => card.setStrokeStyle(isSelected ? 3 : 1, isSelected ? m.border : 0x334466));
    });

    // If PLAYER mode, next goes to position select; otherwise go straight to game
    const isPlayerMode = this.selectedMode === 'PLAYER';
    const nextLabel = isPlayerMode ? 'SELECT POSITION  ▶' : 'START GAME  ▶';

    const nextBtn = this._track(this.add.image(WIDTH/2, HEIGHT - 45, 'btn_primary').setInteractive({ useHandCursor: true }));
    this._track(this.add.text(WIDTH/2, HEIGHT - 45, nextLabel, {
      fontSize: '14px', fontFamily: 'monospace', color: '#ffd700',
    }).setOrigin(0.5));
    nextBtn.on('pointerdown', () => {
      this.gs.gameMode = this.selectedMode;
      if (isPlayerMode) {
        this._step = 'POSITION';
        this._showPositionSelect();
      } else {
        this.gs.playerTeamIdx = this.selectedTeam;
        this.gs.playerPos     = this.selectedPos;
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.time.delayedCall(300, () => this.scene.start('GameScene', { gs: this.gs }));
      }
    });

    const backBtn = this._track(this.add.image(70, HEIGHT - 45, 'btn_small').setInteractive({ useHandCursor: true }));
    this._track(this.add.text(70, HEIGHT - 45, '◀ BACK', {
      fontSize: '12px', fontFamily: 'monospace', color: '#aaddff',
    }).setOrigin(0.5));
    backBtn.on('pointerdown', () => this._showTeamSelect());
  }
}
