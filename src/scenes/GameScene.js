import { CFG } from '../config.js';
import { RosterSystem } from '../systems/RosterSystem.js';
import { AISystem } from '../systems/AISystem.js';
import { createFieldTexture, drawPlayerSprite, fieldYToScreenY, screenYToScale } from '../graphics/Sprites.js';
import { getOverall } from '../data/teams.js';

const EZ_W  = CFG.EZ_W;
const YW    = (CFG.FIELD_WORLD_W - EZ_W * 2) / 100;

function yardToX(yard) { return EZ_W + yard * YW; }

export class GameScene extends Phaser.Scene {
  constructor() { super({ key: 'GameScene' }); }

  init(data) {
    this.gs      = data.gs;
    this.rs      = new RosterSystem(this.gs.teams);
    this.ai      = new AISystem(this.gs, this.rs);
    this.mode    = data.gs.gameMode || CFG.GAME_MODES.COACH;
    this._sprites  = {};    // keyed sprite containers
    this._overlays = [];    // temp UI objects
    this._ballCarrierKey = null;
  }

  create() {
    const t = this.gs.teams;
    createFieldTexture(this, {
      homePrimary:   t[0].primary,   homeSecondary: t[0].secondary,
      awayPrimary:   t[1].primary,   awaySecondary: t[1].secondary,
    });
    this._buildHUD();
    this._buildControls();
    this._setupCamera();
    this._showCoinToss();
    this.input.addPointer(3);
    this.cameras.main.fadeIn(400);
    // Resume from halftime
    this.events.on('resume', this._onResume, this);
  }

  // ─── COORDINATE HELPERS ──────────────────────────────────────────────────
  _fieldYToScreenY(fieldY) { return fieldYToScreenY(fieldY); }

  _playerScreenPos(yardOffset, fieldY) {
    const offDir = this.gs.possession === 0 ? 1 : -1;
    const sx = yardToX(this.gs.ballYard) + yardOffset * YW * offDir;
    const sy = this._fieldYToScreenY(fieldY);
    return { x: sx, y: sy };
  }

  // ─── SPRITES ─────────────────────────────────────────────────────────────
  _clearSprites() {
    for (const key of Object.keys(this._sprites)) {
      const s = this._sprites[key];
      if (!s) continue;
      s._label?.destroy();
      s._fatDot?.destroy();
      s._shadow?.destroy();
      s._numLabel?.destroy();
      s.destroy();
    }
    this._sprites = {};
    this._ballCarrierKey = null;
  }

  _spawnPlayer(key, sx, sy, primary, secondary, pos, player, isControlled, isBallCarrier) {
    const scale = screenYToScale(sy);

    const g = this.add.graphics();
    g.setPosition(sx, sy);
    g.setScale(scale);
    g.setDepth(Math.round(sy));

    drawPlayerSprite(g, primary, secondary, isControlled, isBallCarrier);
    g._primary   = primary;
    g._secondary = secondary;

    // Position label (pos abbreviation above helmet)
    const label = this.add.text(sx, sy - 26 * scale, pos, {
      fontSize: '8px', fontFamily: 'monospace', color: '#ffffff',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(Math.round(sy) + 1);

    // Jersey number on body
    const secHex = '#' + secondary.toString(16).padStart(6, '0');
    const numLabel = this.add.text(sx, sy + 2 * scale, player?.num !== undefined ? String(player.num) : '', {
      fontSize: '7px', fontFamily: 'monospace', fontStyle: 'bold',
      color: secHex, stroke: '#000000', strokeThickness: 1,
    }).setOrigin(0.5).setDepth(Math.round(sy) + 2);

    // Fatigue dot
    const fatigue = player?.fatigue || 0;
    const dotCol  = fatigue > 70 ? 0xff4444 : fatigue > 40 ? 0xffaa00 : 0x44ff88;
    const fatDot  = this.add.circle(sx + 12 * scale, sy - 22 * scale, 3, dotCol)
      .setDepth(Math.round(sy) + 1);

    g._label    = label;
    g._numLabel = numLabel;
    g._fatDot   = fatDot;
    g._player   = player;
    g._posKey   = pos;
    g._controlled    = isControlled;
    g._isBallCarrier = isBallCarrier;
    g._fieldY   = 0;
    g._vx = 0; g._vy = 0;
    g._baseX = sx; g._baseY = sy;

    this._sprites[key] = g;
    if (isControlled) this._controlledKey = key;
    return g;
  }

  _syncLabel(s) {
    if (!s?.active) return;
    const sc = s.scale;
    s._label?.setPosition(s.x, s.y - 26 * sc);
    s._numLabel?.setPosition(s.x, s.y + 2 * sc);
    s._fatDot?.setPosition(s.x + 12 * sc, s.y - 22 * sc);
    s.setDepth(Math.round(s.y));
    s._label?.setDepth(Math.round(s.y) + 1);
    s._numLabel?.setDepth(Math.round(s.y) + 2);
    s._fatDot?.setDepth(Math.round(s.y) + 1);
  }

  _setCarrierBall(s) {
    if (!s?.active) return;
    s.clear();
    drawPlayerSprite(s, s._primary, s._secondary, s._controlled, true);
  }

  _setUpFormation() {
    this._clearSprites();

    const offIdx  = this.gs.possession;
    const defIdx  = 1 - offIdx;
    const offTeam = this.gs.teams[offIdx];
    const defTeam = this.gs.teams[defIdx];

    const offColor  = offTeam.primary;
    const offColor2 = offTeam.secondary;
    const defColor  = defTeam.primary;
    const defColor2 = defTeam.secondary;

    const playerIsOff  = this.gs.playerTeamIdx === offIdx;
    const playerPos    = this.gs.playerPos;
    const isPlayerMode = this.mode === CFG.GAME_MODES.PLAYER;

    // Determine who carries the ball (QB for pass, RB for run)
    const playType    = this.gs.selectedOffPlay?.type;
    const ballCarrierPos = playType === 'RUN' ? 'RB' : 'QB';

    let offPosCount = {};
    for (const slot of CFG.OFF_FORMATION) {
      const idx = offPosCount[slot.pos] || 0;
      offPosCount[slot.pos] = idx + 1;

      const players = offTeam.roster
        .filter(p => p.pos === slot.pos)
        .sort((a, b) => getOverall(b) - getOverall(a));
      const player = players[idx] || players[0];
      if (!player) continue;

      const { x, y } = this._playerScreenPos(slot.yardOff, slot.fieldY);
      const isControlled = isPlayerMode && playerIsOff && slot.pos === playerPos && idx === 0;
      const isBallCarrier = slot.pos === ballCarrierPos && idx === 0;
      const key = `off_${slot.pos}_${idx}`;

      this._spawnPlayer(key, x, y, offColor, offColor2, slot.pos, player, isControlled, isBallCarrier);
      if (isBallCarrier) this._ballCarrierKey = key;
    }

    let defPosCount = {};
    for (const slot of CFG.DEF_FORMATION) {
      const idx = defPosCount[slot.pos] || 0;
      defPosCount[slot.pos] = idx + 1;

      const players = defTeam.roster
        .filter(p => p.pos === slot.pos)
        .sort((a, b) => getOverall(b) - getOverall(a));
      const player = players[idx] || players[0];
      if (!player) continue;

      const { x, y } = this._playerScreenPos(slot.yardOff, slot.fieldY);
      const isControlled = isPlayerMode && !playerIsOff && slot.pos === playerPos && idx === 0;
      const key = `def_${slot.pos}_${idx}`;

      this._spawnPlayer(key, x, y, defColor, defColor2, slot.pos, player, isControlled, false);
    }

    // Ball graphic — drawn at (0,0) local; position set via setPosition()
    if (!this._ball) {
      const b = this.add.graphics().setDepth(500);
      b.fillStyle(CFG.COLORS.BALL);
      b.fillEllipse(0, 0, CFG.BALL_W * 1.4, CFG.BALL_H * 1.6);
      b.lineStyle(1.5, CFG.COLORS.BALL_STRIPE, 0.9);
      b.beginPath(); b.moveTo(0, -3); b.lineTo(0, 3); b.strokePath();
      b.beginPath(); b.moveTo(-3, 0); b.lineTo(3, 0); b.strokePath();
      this._ball = b;
    }
    this._updateBallPos();
  }

  _updateBallPos() {
    if (!this._ball) return;
    const carrier = this._sprites[this._ballCarrierKey];
    if (carrier?.active && this._ballCarrierKey) {
      this._ball.setVisible(false);
    } else {
      const bx = yardToX(this.gs.ballYard);
      const by = this._fieldYToScreenY(0);
      this._ball.setPosition(bx, by).setVisible(true);
    }
  }

  // ─── FIELD MARKERS ───────────────────────────────────────────────────────
  _buildFieldMarkers() {
    if (this._losLine) this._losLine.destroy();
    if (this._fdLine)  this._fdLine.destroy();

    const fieldH = CFG.FIELD_NEAR_Y - CFG.FIELD_FAR_Y;
    this._losLine = this.add.rectangle(
      yardToX(this.gs.ballYard), (CFG.FIELD_FAR_Y + CFG.FIELD_NEAR_Y) / 2,
      3, fieldH, 0xff8800, 0.85
    ).setOrigin(0.5).setDepth(460);

    this._fdLine = this.add.rectangle(
      yardToX(this.gs.firstDownYard), (CFG.FIELD_FAR_Y + CFG.FIELD_NEAR_Y) / 2,
      2, fieldH, 0xffff00, 0.7
    ).setOrigin(0.5).setDepth(460);
  }

  _updateFieldMarkers() {
    this._buildFieldMarkers();
  }

  // ─── 90s SCOREBUG ────────────────────────────────────────────────────────
  _buildHUD() {
    const W = CFG.WIDTH;
    this._hudDepth = 700;

    // Main scorebug background strip
    const bugH = 52;
    const bugBg = this.add.rectangle(W/2, bugH/2, W, bugH, 0x050508)
      .setScrollFactor(0).setDepth(this._hudDepth);
    const divider = this.add.rectangle(W/2, bugH, W, 2, 0x334477)
      .setScrollFactor(0).setDepth(this._hudDepth);

    const tA = this.gs.teams[0], tB = this.gs.teams[1];

    // Team A box (left)
    this.add.rectangle(70, bugH/2, 120, bugH, tA.primary)
      .setScrollFactor(0).setDepth(this._hudDepth);
    this.add.rectangle(70, bugH/2, 120, bugH, 0x000000, 0.2)
      .setScrollFactor(0).setDepth(this._hudDepth);
    this._scoreA_name = this.add.text(22, 8, tA.abbr, {
      fontSize: '16px', fontFamily: 'monospace', fontStyle: 'bold',
      color: '#' + tA.secondary.toString(16).padStart(6, '0'),
    }).setScrollFactor(0).setDepth(this._hudDepth + 1);
    this._scoreA_num = this.add.text(22, 28, '0', {
      fontSize: '20px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffffff',
    }).setScrollFactor(0).setDepth(this._hudDepth + 1);

    // TO dots (Team A)
    this._toA = [];
    for (let i = 0; i < 3; i++) {
      this._toA.push(
        this.add.circle(106 + i * 10, 42, 3, tA.secondary)
          .setScrollFactor(0).setDepth(this._hudDepth + 1)
      );
    }

    // Team B box (right)
    this.add.rectangle(W - 70, bugH/2, 120, bugH, tB.primary)
      .setScrollFactor(0).setDepth(this._hudDepth);
    this.add.rectangle(W - 70, bugH/2, 120, bugH, 0x000000, 0.2)
      .setScrollFactor(0).setDepth(this._hudDepth);
    this._scoreB_name = this.add.text(W - 22, 8, tB.abbr, {
      fontSize: '16px', fontFamily: 'monospace', fontStyle: 'bold',
      color: '#' + tB.secondary.toString(16).padStart(6, '0'),
    }).setScrollFactor(0).setDepth(this._hudDepth + 1).setOrigin(1, 0);
    this._scoreB_num = this.add.text(W - 22, 28, '0', {
      fontSize: '20px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffffff',
    }).setScrollFactor(0).setDepth(this._hudDepth + 1).setOrigin(1, 0);

    // TO dots (Team B)
    this._toB = [];
    for (let i = 0; i < 3; i++) {
      this._toB.push(
        this.add.circle(W - 106 - i * 10, 42, 3, tB.secondary)
          .setScrollFactor(0).setDepth(this._hudDepth + 1)
      );
    }

    // Center: Quarter + Clock
    this.add.rectangle(W/2, bugH/2, 180, bugH, 0x0a0a18)
      .setScrollFactor(0).setDepth(this._hudDepth);
    this._quarterText = this.add.text(W/2, 8, 'Q1', {
      fontSize: '12px', fontFamily: 'monospace', color: '#888888',
    }).setScrollFactor(0).setDepth(this._hudDepth + 1).setOrigin(0.5, 0);
    this._clockText = this.add.text(W/2, 22, '2:00', {
      fontSize: '18px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffffff',
    }).setScrollFactor(0).setDepth(this._hudDepth + 1).setOrigin(0.5, 0);

    // Down & distance strip
    this._downText = this.add.text(W/2, 42, '1st & 10', {
      fontSize: '10px', fontFamily: 'monospace', color: '#aaddff',
    }).setScrollFactor(0).setDepth(this._hudDepth + 1).setOrigin(0.5, 0);

    // Phase indicator (small label above clock area)
    this._phaseText = this.add.text(W/2, 2, '', {
      fontSize: '8px', fontFamily: 'monospace', color: '#ffcc44',
    }).setScrollFactor(0).setDepth(this._hudDepth + 1).setOrigin(0.5, 0);

    // Mode badge
    const modeName = { PLAYER: 'PLAYER', COACH: 'COACH', SIM: 'SIM' }[this.mode];
    this.add.text(W/2, bugH + 4, `▪ ${modeName} MODE`, {
      fontSize: '8px', fontFamily: 'monospace', color: '#444466',
    }).setScrollFactor(0).setDepth(this._hudDepth + 1).setOrigin(0.5, 0);

    this._updateHUD();
  }

  _updateHUD() {
    const gs = this.gs;
    const tA = gs.teams[0], tB = gs.teams[1];

    this._scoreA_num.setText(`${tA.score}`);
    this._scoreB_num.setText(`${tB.score}`);
    this._clockText.setText(gs.clockString());
    this._quarterText.setText(`Q${gs.quarter}`);
    this._downText.setText(`${gs.downString()}  ·  ${gs.ballYard}yd`);

    const phases = {
      PLAY_CALL: 'CALL PLAY', PRE_SNAP: '◀ SNAP ▶', PLAYING: '▶ PLAY',
      RESULT: '', KICKOFF: 'KICKOFF', COIN_TOSS: 'COIN TOSS',
      HALFTIME: 'HALFTIME', GAME_OVER: 'FINAL',
    };
    this._phaseText.setText(phases[gs.phase] || '');

    this._toA.forEach((d, i) => d.setFillStyle(i < tA.timeoutsLeft ? tA.secondary : 0x333333));
    this._toB.forEach((d, i) => d.setFillStyle(i < tB.timeoutsLeft ? tB.secondary : 0x333333));
  }

  // ─── CAMERA ──────────────────────────────────────────────────────────────
  _setupCamera() {
    this.cameras.main.setBounds(0, 0, CFG.FIELD_WORLD_W, CFG.FIELD_WORLD_H);
    this._panToYard(this.gs.ballYard, false);
  }

  _panToYard(yard, animate = true) {
    const targetX = Math.max(0, Math.min(CFG.FIELD_WORLD_W - CFG.WIDTH, yardToX(yard) - CFG.WIDTH / 2));
    if (animate) {
      this.tweens.add({
        targets: this.cameras.main,
        scrollX: targetX,
        duration: 700,
        ease: 'Power2',
      });
    } else {
      this.cameras.main.scrollX = targetX;
    }
  }

  // ─── CONTROLS ────────────────────────────────────────────────────────────
  _buildControls() {
    const W = CFG.WIDTH, H = CFG.HEIGHT;
    const ctrlY = H - 90;

    if (this.mode === CFG.GAME_MODES.PLAYER) {
      this._buildDpad(65, ctrlY + 30);
      this._buildActionBtn(W - 65, ctrlY + 30);
    }

    // Snap / Play Call button (center bottom)
    this._snapBtn = this.add.rectangle(W/2, H - 22, 160, 36, 0x0a0a1e, 0.92)
      .setScrollFactor(0).setDepth(710).setInteractive({ useHandCursor: true });
    this._snapBtn.setStrokeStyle(1, 0x4488ff);
    this._snapBtnLabel = this.add.text(W/2, H - 22, '▶ PLAY CALL', {
      fontSize: '13px', fontFamily: 'monospace', color: '#aaddff',
    }).setScrollFactor(0).setDepth(711).setOrigin(0.5);
    this._snapBtn.on('pointerdown', () => this._onSnapBtnPress());
    this._snapBtn.on('pointerover', () => this._snapBtn.setStrokeStyle(2, 0xffd700));
    this._snapBtn.on('pointerout',  () => this._snapBtn.setStrokeStyle(1, 0x4488ff));
  }

  _buildDpad(cx, cy) {
    this._dpad = { up:false, down:false, left:false, right:false };
    const dirs = [
      { key:'up',    x:cx,    y:cy-36, label:'▲' },
      { key:'down',  x:cx,    y:cy+36, label:'▼' },
      { key:'left',  x:cx-36, y:cy,    label:'◀' },
      { key:'right', x:cx+36, y:cy,    label:'▶' },
    ];
    dirs.forEach(d => {
      const btn = this.add.circle(d.x, d.y, 20, 0x1a1a3a, 0.85)
        .setScrollFactor(0).setDepth(710).setInteractive();
      btn.setStrokeStyle(1, 0x334466);
      this.add.text(d.x, d.y, d.label, {
        fontSize: '14px', fontFamily: 'monospace', color: '#6688aa',
      }).setScrollFactor(0).setDepth(711).setOrigin(0.5);
      btn.on('pointerdown', () => { this._dpad[d.key] = true;  btn.setFillStyle(0x3344aa, 0.9); });
      btn.on('pointerup',   () => { this._dpad[d.key] = false; btn.setFillStyle(0x1a1a3a, 0.85); });
      btn.on('pointerout',  () => { this._dpad[d.key] = false; btn.setFillStyle(0x1a1a3a, 0.85); });
    });
    this.add.circle(cx, cy, 12, 0x2a2a44, 0.7).setScrollFactor(0).setDepth(710);
  }

  _buildActionBtn(x, y) {
    this._actionBtn = this.add.circle(x, y, 28, 0x6b0000, 0.9)
      .setScrollFactor(0).setDepth(710).setInteractive();
    this._actionBtn.setStrokeStyle(2, 0xee2222);
    this.add.text(x, y, 'A', {
      fontSize: '18px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ff4444',
    }).setScrollFactor(0).setDepth(711).setOrigin(0.5);
    this._actionBtn.on('pointerdown', () => {
      this._actionBtn.setFillStyle(0xaa0000, 1);
      this._onActionPress();
    });
    this._actionBtn.on('pointerup',  () => this._actionBtn.setFillStyle(0x6b0000, 0.9));
    this._actionBtn.on('pointerout', () => this._actionBtn.setFillStyle(0x6b0000, 0.9));
  }

  _onSnapBtnPress() {
    if (this.gs.phase === 'PLAY_CALL') this._openPlayCall();
    else if (this.gs.phase === 'PRE_SNAP') this._snap();
  }

  _onActionPress() {
    if (this.gs.phase === 'PRE_SNAP') this._snap();
    else if (this.gs.phase === 'PLAYING') { /* player action handled in update */ }
  }

  // ─── GAME FLOW ────────────────────────────────────────────────────────────
  _showCoinToss() {
    this.gs.phase = 'COIN_TOSS';
    this._updateHUD();
    const W = CFG.WIDTH, H = CFG.HEIGHT;

    const overlay = this._makeOverlay();
    const panel = this._addOverlay(this.add.image(W/2, H/2, 'panel_md').setScrollFactor(0).setDepth(850));
    this._addOverlay(this.add.text(W/2, H/2 - 80, 'COIN TOSS', {
      fontSize: '24px', fontFamily: 'monospace', color: '#ffd700', stroke:'#000',strokeThickness:3,
    }).setScrollFactor(0).setDepth(851).setOrigin(0.5));

    const coin = this._addOverlay(this.add.text(W/2, H/2 - 18, '🪙', { fontSize:'40px' })
      .setScrollFactor(0).setDepth(851).setOrigin(0.5));
    this.tweens.add({ targets: coin, scaleX: 0, duration: 400, yoyo: true, repeat: -1 });

    this._addOverlay(this.add.text(W/2, H/2 + 28, 'CALL THE TOSS:', {
      fontSize:'13px', fontFamily:'monospace', color:'#cccccc',
    }).setScrollFactor(0).setDepth(851).setOrigin(0.5));

    const headsBtn = this._addOverlay(this.add.image(W/2 - 60, H/2 + 70, 'btn_small').setScrollFactor(0).setDepth(851).setInteractive({ useHandCursor:true }));
    this._addOverlay(this.add.text(W/2 - 60, H/2 + 70, 'HEADS', {
      fontSize:'13px', fontFamily:'monospace', color:'#ffd700',
    }).setScrollFactor(0).setDepth(852).setOrigin(0.5));

    const tailsBtn = this._addOverlay(this.add.image(W/2 + 60, H/2 + 70, 'btn_small').setScrollFactor(0).setDepth(851).setInteractive({ useHandCursor:true }));
    this._addOverlay(this.add.text(W/2 + 60, H/2 + 70, 'TAILS', {
      fontSize:'13px', fontFamily:'monospace', color:'#c8c8c8',
    }).setScrollFactor(0).setDepth(852).setOrigin(0.5));

    const resolve = (call) => {
      const flip = Math.random() < 0.5 ? 'HEADS' : 'TAILS';
      const won  = flip === call;
      this._clearOverlays();
      if (won) {
        this._showToast(`${flip}! YOU WIN THE TOSS!`, 1800);
        this.time.delayedCall(1900, () => this._showReceiveOrKick());
      } else {
        this._showToast(`${flip}! CPU wins — You kick off.`, 1800);
        this.time.delayedCall(1900, () => {
          this.gs.possession = 1 - this.gs.playerTeamIdx;
          this._startKickoff();
        });
      }
    };
    headsBtn.on('pointerdown', () => resolve('HEADS'));
    tailsBtn.on('pointerdown', () => resolve('TAILS'));
  }

  _showReceiveOrKick() {
    const W = CFG.WIDTH, H = CFG.HEIGHT;
    this._addOverlay(this.add.image(W/2, H/2, 'panel_sm').setScrollFactor(0).setDepth(850));
    this._addOverlay(this.add.text(W/2, H/2 - 42, 'YOU WIN THE TOSS', {
      fontSize:'14px', fontFamily:'monospace', color:'#ffd700',
    }).setScrollFactor(0).setDepth(851).setOrigin(0.5));

    const recvBtn = this._addOverlay(this.add.image(W/2 - 56, H/2 + 10, 'btn_small')
      .setScrollFactor(0).setDepth(851).setInteractive({ useHandCursor:true }));
    this._addOverlay(this.add.text(W/2 - 56, H/2 + 10, 'RECEIVE', {
      fontSize:'11px', fontFamily:'monospace', color:'#00ff88',
    }).setScrollFactor(0).setDepth(852).setOrigin(0.5));

    const kickBtn = this._addOverlay(this.add.image(W/2 + 56, H/2 + 10, 'btn_small')
      .setScrollFactor(0).setDepth(851).setInteractive({ useHandCursor:true }));
    this._addOverlay(this.add.text(W/2 + 56, H/2 + 10, 'KICK', {
      fontSize:'11px', fontFamily:'monospace', color:'#ffcc44',
    }).setScrollFactor(0).setDepth(852).setOrigin(0.5));

    recvBtn.on('pointerdown', () => {
      this._clearOverlays();
      this.gs.possession = this.gs.playerTeamIdx;
      const offDir = this.gs.possession === 0 ? 1 : -1;
      this.gs.ballYard = offDir === 1 ? 25 : 75;
      this.gs.firstDownYard = offDir === 1 ? 35 : 65;
      this._updateFieldMarkers();
      this._setUpFormation();
      this._panToYard(this.gs.ballYard, true);
      this.time.delayedCall(800, () => this._startPlayCall());
    });
    kickBtn.on('pointerdown', () => {
      this._clearOverlays();
      this.gs.possession = 1 - this.gs.playerTeamIdx;
      this._startKickoff();
    });
  }

  _startKickoff() {
    const kickingTeam = this.gs.teams[1 - this.gs.possession];
    const returnYard  = this.ai.resolveKickoff(kickingTeam);
    const offDir = this.gs.possession === 0 ? 1 : -1;
    this.gs.ballYard = offDir === 1 ? returnYard : (100 - returnYard);
    this.gs.down = 1; this.gs.yardsToGo = 10;
    this.gs.firstDownYard = Math.min(100, Math.max(0, this.gs.ballYard + 10 * offDir));
    this._showToast(`KICKOFF → Ball at the ${returnYard} yard line`, 1800);
    this.time.delayedCall(2000, () => {
      this._updateFieldMarkers();
      this._setUpFormation();
      this._panToYard(this.gs.ballYard, true);
      this.time.delayedCall(900, () => this._startPlayCall());
    });
  }

  _startPlayCall() {
    this.gs.phase = 'PLAY_CALL';
    this._updateHUD();
    this._buildFieldMarkers();

    if (this.mode === CFG.GAME_MODES.SIM) {
      // Full sim: CPU calls both sides
      this.gs.selectedOffPlay = this.ai.chooseOffensePlay();
      this.gs.selectedDefPlay = this.ai.chooseDefensePlay(this.gs.selectedOffPlay);
      this._showToast(`CPU: ${this.gs.selectedOffPlay.name} vs ${this.gs.selectedDefPlay.name}`, 700);
      this.time.delayedCall(800, () => this._goPreSnap());
      return;
    }

    const playerIsOff = this.gs.playerTeamIdx === this.gs.possession;

    if (playerIsOff) {
      // Player calls offense play
      this._snapBtnLabel.setText('▶ PLAY CALL');
    } else {
      // CPU calls offense, player calls defense
      this.gs.selectedOffPlay = this.ai.chooseOffensePlay();
      this._openDefPlayCall();
    }
  }

  _openPlayCall() {
    if (this.gs.phase !== 'PLAY_CALL') return;
    const playerIsOff = this.gs.playerTeamIdx === this.gs.possession;
    if (!playerIsOff) { this._openDefPlayCall(); return; }

    this.scene.launch('PlayCallScene', {
      gs: this.gs,
      mode: 'OFFENSE',
      onSelect: (play) => {
        this.gs.selectedOffPlay = play;
        this.gs.selectedDefPlay = this.ai.chooseDefensePlay(play);
        this._goPreSnap();
      },
    });
  }

  _openDefPlayCall() {
    this.scene.launch('PlayCallScene', {
      gs: this.gs,
      mode: 'DEFENSE',
      onSelect: (play) => {
        this.gs.selectedDefPlay = play;
        this._goPreSnap();
      },
    });
  }

  _goPreSnap() {
    this.gs.phase = 'PRE_SNAP';
    this._updateHUD();
    this._setUpFormation();

    const offPlayName = this.gs.selectedOffPlay?.name || '—';
    const defPlayName = this.gs.selectedDefPlay?.name || '—';
    this._showToast(`${offPlayName}  vs  ${defPlayName}`, 1400);
    this._snapBtnLabel.setText('▶ SNAP');

    if (this.mode !== CFG.GAME_MODES.PLAYER) {
      const snapDelay = this.mode === CFG.GAME_MODES.SIM ? 600 : 2000;
      this.time.delayedCall(snapDelay, () => {
        if (this.gs.phase === 'PRE_SNAP') this._snap();
      });
    }
  }

  _snap() {
    if (this.gs.phase !== 'PRE_SNAP') return;
    this.gs.phase = 'PLAYING';
    this._updateHUD();
    this._snapBtnLabel.setText('');
    this._executePlay();
  }

  _executePlay() {
    const { gs, ai, rs } = this;
    const offPlay = gs.selectedOffPlay;
    const defPlay = gs.selectedDefPlay;

    // Resolve first so animation distance matches actual outcome
    const outcome = ai.resolvePlay(offPlay, defPlay, gs.offenseTeam, gs.defenseTeam);
    const rotA    = rs.autoRotate(0);
    const rotB    = rs.autoRotate(1);

    this._animatePlayMotion(offPlay, outcome, () => {
      this.time.delayedCall(300, () => this._showPlayResult(outcome, rotA.concat(rotB)));
    });
  }

  _animatePlayMotion(offPlay, outcome, onDone) {
    const offDir   = this.gs.possession === 0 ? 1 : -1;
    const defPlay  = this.gs.selectedDefPlay;
    const isRun    = offPlay?.type === 'RUN';
    const isPass   = offPlay?.type === 'PASS';
    const isManCov = defPlay?.id === 'c1' || defPlay?.type === 'BLITZ';
    const { yards, isSack, isInterception, result } = outcome;

    const allE      = Object.entries(this._sprites);
    const offLine   = allE.filter(([k,s]) => k.startsWith('off_') && ['LT','LG','C','RG','RT'].includes(s._posKey));
    const defLine   = allE.filter(([k,s]) => k.startsWith('def_') && ['DE','DT'].includes(s._posKey));
    const offWRs    = allE.filter(([k,s]) => k.startsWith('off_') && ['WR','TE'].includes(s._posKey));
    const defDBs    = allE.filter(([k,s]) => k.startsWith('def_') && ['CB','FS','SS'].includes(s._posKey));
    const defLBs    = allE.filter(([k,s]) => k.startsWith('def_') && ['MLB','OLB'].includes(s._posKey));
    const allDef    = [...defLine, ...defLBs, ...defDBs];

    const qbE = allE.find(([k,s]) => k.startsWith('off_') && s._posKey === 'QB');
    const rbE = allE.find(([k,s]) => k.startsWith('off_') && s._posKey === 'RB');
    const fbE = allE.find(([k,s]) => k.startsWith('off_') && s._posKey === 'FB');
    const cE  = allE.find(([k,s]) => k.startsWith('off_') && s._posKey === 'C');
    const qbS = qbE?.[1], rbS = rbE?.[1], cS = cE?.[1];

    const qbX  = qbS?.x ?? yardToX(this.gs.ballYard);
    const qbY  = qbS?.y ?? this._fieldYToScreenY(0);
    const snapX = cS?.x ?? qbX;

    // Show ball at snap position
    this._ball.setPosition(snapX, qbY).setVisible(true);

    // ── Phase 0: Linemen engage immediately ─────────────────────────────────
    this._animateLinemenStruggle(this._pairLinemen(offLine, defLine), offDir);

    // ── Snap: ball centre → QB ───────────────────────────────────────────────
    this.tweens.add({ targets: this._ball, x: qbX, y: qbY, duration: 180, ease: 'Power2' });

    if (isRun) {
      const isSneak  = offPlay?.id === 'qk';
      const carrierS = isSneak ? qbS : (rbS ?? qbS);

      const startX = carrierS?.x ?? yardToX(this.gs.ballYard);
      const startY = carrierS?.y ?? this._fieldYToScreenY(0);
      const finalX = Phaser.Math.Clamp(
        startX + offDir * yards * YW, EZ_W + 5, CFG.FIELD_WORLD_W - EZ_W - 5);
      const finalY = Phaser.Math.Clamp(
        startY + (Math.random() - 0.5) * 38, CFG.FIELD_FAR_Y + 5, CFG.FIELD_NEAR_Y - 5);

      // ── DL breakthrough: strength vs OL blocking × fatigue ───────────────
      const allPairs   = this._pairLinemen(offLine, defLine);
      const runBreaks  = new Set();
      for (const [oS, dS] of allPairs) {
        if (!oS?._player || !dS?._player) continue;
        const oBlk    = oS._player.stats?.blk ?? 5;
        const dStr    = dS._player.stats?.str ?? 5;
        const fatigue = oS._player.fatigue ?? 0;
        const fatMod  = Math.max(0.40, 1 - fatigue / 180);
        if (dStr > oBlk * fatMod + Math.random() * 4) runBreaks.add(dS);
      }

      // Locked pairs (DL that don't break through) do the normal struggle
      this._animateLinemenStruggle(allPairs.filter(([, dS]) => !runBreaks.has(dS)), offDir);

      // Breakaway DL: short push then rush carrier
      for (const dS of runBreaks) {
        const sp = dS._player?.stats?.spd ?? 5;
        const ag = dS._player?.stats?.agi ?? 5;
        this.tweens.add({
          targets: dS, x: dS.x + offDir * 9, y: dS.y,
          duration: 230, ease: 'Power2.easeIn', onUpdate: () => this._syncLabel(dS),
          onComplete: () => {
            const rx  = Phaser.Math.Clamp(finalX + (Math.random()-0.5)*30, EZ_W+5, CFG.FIELD_WORLD_W-EZ_W-5);
            const ry  = Phaser.Math.Clamp(finalY + (Math.random()-0.5)*24, CFG.FIELD_FAR_Y+5, CFG.FIELD_NEAR_Y-5);
            const d   = Math.hypot(dS.x - rx, dS.y - ry);
            const dur = Math.max(270, Math.min(850, d / (0.20 + (sp+ag)/20 * 0.32)));
            this.tweens.add({
              targets: dS, x: rx, y: ry, scale: screenYToScale(ry),
              duration: dur, ease: 'Power2.easeIn', onUpdate: () => this._syncLabel(dS),
            });
          },
        });
      }

      // LBs and DBs react at the snap — step forward toward LOS to show pursuit intent
      // (they do NOT pre-run to the carrier destination; _animatePursuit handles the actual chase)
      for (const [, s] of [...defLBs, ...defDBs]) {
        const sp = s._player?.stats?.spd ?? 6;
        const ag = s._player?.stats?.agi ?? 6;
        const rushX = Phaser.Math.Clamp(s.x + offDir * (18 + Math.random() * 32), EZ_W+5, CFG.FIELD_WORLD_W-EZ_W-5);
        const rushY = Phaser.Math.Clamp(s.y + (Math.random()-0.5)*22, CFG.FIELD_FAR_Y+5, CFG.FIELD_NEAR_Y-5);
        const rushDur = Math.max(340, Math.min(680, 560 - (sp + ag) / 2 * 18));
        this.tweens.add({
          targets: s, x: rushX, y: rushY, scale: screenYToScale(rushY),
          duration: rushDur, delay: 110 + Math.random() * 160,
          ease: 'Power2.easeIn', onUpdate: () => this._syncLabel(s),
        });
      }

      // Handoff 200ms: ball QB → RB
      this.time.delayedCall(200, () => {
        if (!isSneak && carrierS && carrierS !== qbS) {
          this.tweens.add({ targets: this._ball, x: carrierS.x, y: carrierS.y,
            duration: 260, ease: 'Power2' });
        }
      });

      // Carrier runs at 500ms — ball drawn in sprite, separate ball hidden
      this.time.delayedCall(500, () => {
        if (!carrierS) { onDone(); return; }
        this._setCarrierBall(carrierS);
        this._ball.setVisible(false);

        this.tweens.add({
          targets: carrierS, x: finalX, y: finalY, scale: screenYToScale(finalY),
          duration: 850, ease: 'Sine.easeInOut',
          onUpdate: () => this._syncLabel(carrierS),
          onComplete: () => this._animatePursuit(carrierS, allDef, onDone),
        });

        // FB lead block on power play
        if (fbE?.[1] && offPlay?.id === 'pw') {
          const fbS = fbE[1];
          this.tweens.add({ targets: fbS, x: finalX - offDir * 14, y: finalY,
            scale: screenYToScale(finalY), duration: 800, ease: 'Sine.easeInOut',
            onUpdate: () => this._syncLabel(fbS) });
        }
        // OL surge forward
        for (const [, s] of offLine) {
          this.tweens.add({ targets: s, x: s.x + offDir * (16 + Math.random() * 18),
            duration: 680, delay: 140, ease: 'Power1', onUpdate: () => this._syncLabel(s) });
        }
      });

    } else if (isPass) {
      // ── QB drop-back ─────────────────────────────────────────────────────
      const dropX = isSack
        ? Phaser.Math.Clamp(qbX + offDir * yards * YW, EZ_W + 5, CFG.FIELD_WORLD_W - EZ_W - 5)
        : qbX - offDir * 34;

      if (qbS) {
        this.tweens.add({
          targets: qbS, x: dropX, y: qbY + 10,
          duration: isSack ? 900 : 540, ease: 'Power2.easeOut',
          onUpdate: () => { this._syncLabel(qbS); if (!isSack) this._ball.setPosition(qbS.x, qbS.y); },
          onComplete: () => { if (isSack) this._animatePursuit(qbS, allDef, onDone); },
        });
      }

      // ── WR route paths ────────────────────────────────────────────────────
      const wrTargets = {};
      for (const [k, wrS] of offWRs) {
        const wrSpd = wrS._player?.stats?.spd ?? 6;
        const dm    = offPlay?.id === 'fl' ? 2.2 : offPlay?.id === 'ps' ? 1.6 :
                      offPlay?.id === 'sl' ? 0.8 : offPlay?.id === 'cr' ? 1.1 : 1.0;
        const yd    = Math.max(3, (Math.abs(yards) + 5) * dm);
        const tx    = Phaser.Math.Clamp(wrS.x + offDir * yd * YW, EZ_W + 5, CFG.FIELD_WORLD_W - EZ_W - 5);
        // Route cut direction based on play type
        let tyOff = (Math.random() - 0.5) * 70;
        if (offPlay?.id === 'sl') tyOff = (wrS.y < this._fieldYToScreenY(0) ? 55 : -55);
        if (offPlay?.id === 'cr') tyOff = (wrS.y < this._fieldYToScreenY(0) ? 85 : -85);
        const ty = Phaser.Math.Clamp(wrS.y + tyOff, CFG.FIELD_FAR_Y + 5, CFG.FIELD_NEAR_Y - 5);
        wrTargets[k] = { x: tx, y: ty };
        const routeDur = Math.max(980, 1320 - (wrSpd - 5) * 60);
        this.tweens.add({ targets: wrS, x: tx, y: ty, scale: screenYToScale(ty),
          duration: routeDur, delay: 160, ease: 'Sine.easeInOut',
          onUpdate: () => this._syncLabel(wrS) });
      }

      // ── Pass-rush: DL who beat blockers converge on QB ───────────────────
      for (const [oS, dS] of this._pairLinemen(offLine, defLine)) {
        if (!oS?._player || !dS?._player) continue;
        const oBlk    = oS._player.stats?.blk ?? 5;
        const dStr    = dS._player.stats?.str ?? 5;
        const fatigue = oS._player.fatigue ?? 0;
        const fatMod  = Math.max(0.40, 1 - fatigue / 180);
        if (dStr > oBlk * fatMod + Math.random() * 3) {
          const breakTime = 550 + Math.random() * 500;
          this.time.delayedCall(breakTime, () => {
            if (!dS?.active) return;
            const rx  = Phaser.Math.Clamp(dropX + (Math.random()-0.5)*18, EZ_W+5, CFG.FIELD_WORLD_W-EZ_W-5);
            const ry  = Phaser.Math.Clamp(qbY  + (Math.random()-0.5)*14, CFG.FIELD_FAR_Y+5, CFG.FIELD_NEAR_Y-5);
            const sp  = dS._player?.stats?.spd ?? 5;
            const d   = Math.hypot(dS.x - rx, dS.y - ry);
            const dur = Math.max(250, Math.min(700, d / (0.22 + sp / 20 * 0.30)));
            this.tweens.add({
              targets: dS, x: rx, y: ry, scale: screenYToScale(ry),
              duration: dur, ease: 'Power3.easeIn', onUpdate: () => this._syncLabel(dS),
            });
          });
        }
      }

      // ── Coverage ──────────────────────────────────────────────────────────
      if (isManCov) {
        // Man: each DB shadows the WR they're aligned on
        const paired = new Set();
        for (const [wk, wrS] of offWRs) {
          const tgt = wrTargets[wk]; if (!tgt) continue;
          let best = null, bestD = Infinity;
          for (const [dk, dbS] of defDBs) {
            if (paired.has(dk)) continue;
            const d = Math.hypot(dbS.x - wrS.x, dbS.y - wrS.y);
            if (d < bestD) { bestD = d; best = [dk, dbS]; }
          }
          if (best) {
            const dbSpd = best[1]._player?.stats?.spd ?? 6;
            // DB runs the same route a half-step behind
            const covDur = Math.max(1060, 1400 - (dbSpd - 5) * 55);
            paired.add(best[0]);
            this.tweens.add({ targets: best[1], x: tgt.x - offDir * 10, y: tgt.y,
              scale: screenYToScale(tgt.y), duration: covDur, delay: 220,
              ease: 'Sine.easeInOut', onUpdate: () => this._syncLabel(best[1]) });
          }
        }
        // Unassigned DBs rotate toward play side
        for (const [dk, dbS] of defDBs) {
          if (!paired.has(dk)) {
            this.tweens.add({ targets: dbS, x: dbS.x + offDir * 48, y: dbS.y,
              duration: 720, ease: 'Power2', onUpdate: () => this._syncLabel(dbS) });
          }
        }
      } else {
        // Zone: drop back, then pick up any WR who enters the zone radius
        const zoneRadius = 100;
        for (const [, dbS] of defDBs) {
          const dbSpd = dbS._player?.stats?.spd ?? 6;
          const zx = dbS.x - offDir * (14 + Math.random() * 22);
          const zy = dbS.y + (Math.random() - 0.5) * 30;
          this.tweens.add({
            targets: dbS, x: zx, y: zy, duration: 740, ease: 'Power1',
            onUpdate: () => this._syncLabel(dbS),
            onComplete: () => {
              // Pick up nearest WR whose route enters this zone
              let closestDest = null, closestD = Infinity;
              for (const [wk] of offWRs) {
                const dest = wrTargets[wk]; if (!dest) continue;
                const d = Math.hypot(zx - dest.x, zy - dest.y);
                if (d < zoneRadius && d < closestD) { closestD = d; closestDest = dest; }
              }
              if (closestDest) {
                const pickDur = Math.max(460, 860 - (dbSpd - 5) * 36);
                this.tweens.add({
                  targets: dbS, x: closestDest.x - offDir * 8, y: closestDest.y,
                  scale: screenYToScale(closestDest.y), duration: pickDur, ease: 'Sine.easeIn',
                  onUpdate: () => this._syncLabel(dbS),
                });
              }
            },
          });
        }
      }

      // ── LBs: blitz toward QB or hook zone ────────────────────────────────
      for (const [, lbS] of defLBs) {
        if (defPlay?.type === 'BLITZ') {
          const sp  = lbS._player?.stats?.spd ?? 6;
          const d   = Math.hypot(lbS.x - dropX, lbS.y - qbY);
          const dur = Math.max(440, Math.min(980, d / (0.20 + sp / 20 * 0.30)));
          this.tweens.add({
            targets: lbS, x: dropX + (Math.random()-0.5)*24, y: qbY + (Math.random()-0.5)*20,
            scale: screenYToScale(qbY), duration: dur, delay: 90 + Math.random()*110,
            ease: 'Power2.easeIn', onUpdate: () => this._syncLabel(lbS),
          });
        } else {
          this.tweens.add({
            targets: lbS, x: lbS.x - offDir * (6 + Math.random()*12),
            y: lbS.y + (Math.random()-0.5)*24, duration: 640, delay: 150,
            ease: 'Power1', onUpdate: () => this._syncLabel(lbS),
          });
        }
      }

      // ── QB reads and throws / scrambles ──────────────────────────────────
      if (!isSack) {
        const throwDelay = 900 + Math.random() * 380;
        this.time.delayedCall(throwDelay, () => {

          if (outcome.isScramble) {
            const scrX = Phaser.Math.Clamp(
              (qbS?.x ?? dropX) + offDir * yards * YW, EZ_W+5, CFG.FIELD_WORLD_W-EZ_W-5);
            const scrY = Phaser.Math.Clamp(
              (qbS?.y ?? qbY) + (Math.random()-0.5)*30, CFG.FIELD_FAR_Y+5, CFG.FIELD_NEAR_Y-5);
            if (qbS) {
              this._setCarrierBall(qbS);
              this._ball.setVisible(false);
              this.tweens.add({
                targets: qbS, x: scrX, y: scrY, scale: screenYToScale(scrY),
                duration: 820, ease: 'Sine.easeInOut',
                onUpdate: () => this._syncLabel(qbS),
                onComplete: () => this._animatePursuit(qbS, allDef, onDone),
              });
            } else onDone();

          } else {
            // QB intelligently targets most-open receiver (most separation from DBs)
            let chosen = null, bestSep = -Infinity;
            for (const [wk, wrS] of offWRs) {
              const dest = wrTargets[wk]; if (!dest) continue;
              let minDB = Infinity;
              for (const [, dbS] of defDBs) {
                if (!dbS?.active) continue;
                const d = Math.hypot(dbS.x - dest.x, dbS.y - dest.y);
                if (d < minDB) minDB = d;
              }
              const sep = minDB + (Math.random() * 16 - 8); // add QB-read noise
              if (sep > bestSep) { bestSep = sep; chosen = [wk, wrS]; }
            }
            const candidates = offWRs.filter(([k]) => wrTargets[k]);
            if (!chosen && candidates.length) chosen = candidates[Math.floor(Math.random() * candidates.length)];

            const chosenS = chosen?.[1];
            const dest    = chosen ? wrTargets[chosen[0]] : { x: (qbS?.x ?? dropX) + offDir * 80, y: qbY };

            this._ball.setPosition(qbS?.x ?? dropX, qbS?.y ?? qbY).setVisible(true);

            const midX  = (this._ball.x + dest.x) / 2;
            const peakY = Math.min(this._ball.y, dest.y) - 56;

            this.tweens.add({
              targets: this._ball, x: midX, y: peakY, duration: 285, ease: 'Sine.easeOut',
              onComplete: () => {
                this.tweens.add({
                  targets: this._ball, x: dest.x, y: dest.y, duration: 275, ease: 'Sine.easeIn',
                  onComplete: () => {
                    if (isInterception) {
                      const intDB = defDBs[0]?.[1];
                      if (intDB) this.tweens.add({ targets: this._ball, x: intDB.x, y: intDB.y,
                        duration: 220, onComplete: () => { this._ball.setVisible(false); onDone(); } });
                      else { this._ball.setVisible(false); onDone(); }

                    } else if (result === 'INCOMPLETE') {
                      this.tweens.add({ targets: this._ball, y: dest.y + 28, alpha: 0,
                        duration: 240, ease: 'Power2.easeIn',
                        onComplete: () => { this._ball.setAlpha(1).setVisible(false); onDone(); } });

                    } else {
                      // Catch: check if a DB is right on the receiver
                      let nearestDB = Infinity;
                      for (const [, dbS] of defDBs) {
                        if (!dbS?.active) continue;
                        nearestDB = Math.min(nearestDB, Math.hypot(dbS.x - dest.x, dbS.y - dest.y));
                      }
                      const ctc = chosenS?._player?.stats?.ctc ?? 7;
                      // Drops are very rare — only when DB is right on the receiver
                      if (nearestDB < 36 && Math.random() > Math.min(0.96, ctc / 10)) {
                        this.tweens.add({ targets: this._ball, y: dest.y + 28, alpha: 0,
                          duration: 240, ease: 'Power2.easeIn',
                          onComplete: () => { this._ball.setAlpha(1).setVisible(false); onDone(); } });
                        return;
                      }

                      // Clean catch — ball goes into receiver's hands visually
                      this._ball.setVisible(false);
                      if (chosenS?.active && chosen) {
                        this._setCarrierBall(chosenS);
                        this._ballCarrierKey = chosen[0];
                      }

                      const wrSpd = chosenS?._player?.stats?.spd ?? 6;
                      const wrAgi = chosenS?._player?.stats?.agi ?? 6;
                      const yacYards = Math.max(0, Math.round((wrSpd + wrAgi - 8) / 3 + Math.random() * 3));

                      if (chosenS && yacYards > 0) {
                        const yacX = Phaser.Math.Clamp(dest.x + offDir * yacYards * YW, EZ_W+5, CFG.FIELD_WORLD_W-EZ_W-5);
                        const yacY = Phaser.Math.Clamp(dest.y + (Math.random()-0.5)*22, CFG.FIELD_FAR_Y+5, CFG.FIELD_NEAR_Y-5);
                        this.tweens.add({
                          targets: chosenS, x: yacX, y: yacY, scale: screenYToScale(yacY),
                          duration: 310 + yacYards * 35, ease: 'Sine.easeOut',
                          onUpdate: () => this._syncLabel(chosenS),
                          onComplete: () => this._animatePursuit(chosenS, [...defDBs, ...defLBs], onDone),
                        });
                      } else {
                        if (chosenS) this._animatePursuit(chosenS, [...defDBs, ...defLBs], onDone);
                        else onDone();
                      }
                    }
                  },
                });
              },
            });
          }
        });
      }

    } else {
      // Kick: simple timed fallback
      this.time.delayedCall(CFG.PLAY_ANIM_MS, onDone);
    }
  }

  _pairLinemen(offLine, defLine) {
    const pairs = [], used = new Set();
    for (const [, oS] of offLine) {
      let best = null, bestD = Infinity;
      for (const [dk, dS] of defLine) {
        if (used.has(dk)) continue;
        const d = Math.abs(oS.y - dS.y);
        if (d < bestD) { bestD = d; best = [dk, dS]; }
      }
      if (best) { used.add(best[0]); pairs.push([oS, best[1]]); }
    }
    return pairs;
  }

  _animateLinemenStruggle(pairs, offDir) {
    for (const [oS, dS] of pairs) {
      const meetX = (oS.x + dS.x) / 2;
      const meetY = (oS.y + dS.y) / 2;
      // OL drives toward DL
      this.tweens.add({ targets: oS, x: meetX - offDir * 4, y: meetY,
        duration: 300, ease: 'Power2.easeIn', onUpdate: () => this._syncLabel(oS),
        onComplete: () => {
          this.tweens.add({ targets: oS, x: meetX + offDir * 4, y: meetY,
            duration: 180, yoyo: true, repeat: 4, ease: 'Sine.easeInOut',
            onUpdate: () => this._syncLabel(oS) });
        } });
      // DL pushes back
      this.tweens.add({ targets: dS, x: meetX + offDir * 4, y: meetY,
        duration: 300, ease: 'Power2.easeIn', onUpdate: () => this._syncLabel(dS),
        onComplete: () => {
          this.tweens.add({ targets: dS, x: meetX - offDir * 4, y: meetY,
            duration: 180, yoyo: true, repeat: 4, ease: 'Sine.easeInOut',
            onUpdate: () => this._syncLabel(dS) });
        } });
    }
  }

  _animatePursuit(carrierS, defenders, onDone) {
    if (!carrierS?.active) { onDone?.(); return; }

    const doFlash = () => {
      const flash = this.add.circle(carrierS.x, carrierS.y, 14, 0xffffff, 0.85).setDepth(650);
      this.tweens.add({ targets: flash, alpha: 0, scaleX: 3.5, scaleY: 3.5,
        duration: 320, ease: 'Power2',
        onComplete: () => { flash.destroy(); onDone?.(); } });
      this.tweens.add({ targets: carrierS, x: carrierS.x + 6, duration: 40, yoyo: true, repeat: 4 });
    };

    // Sort by distance to carrier
    const sorted = defenders
      .filter(([, dS]) => dS?.active)
      .map(([, dS]) => {
        const dist = Math.hypot(dS.x - carrierS.x, dS.y - carrierS.y);
        const spd  = dS._player?.stats?.spd ?? 6;
        const agi  = dS._player?.stats?.agi ?? 6;
        return { dS, dist, spd, agi };
      })
      .sort((a, b) => a.dist - b.dist);

    if (sorted.length === 0) { doFlash(); return; }

    // Primary tackler arrives first
    const { dS: tackler, dist, spd, agi } = sorted[0];
    const pxPerMs = 0.22 + (spd + agi) / 20 * 0.38;
    const dur = Math.max(380, Math.min(820, dist / pxPerMs));
    this.tweens.add({
      targets: tackler,
      x: carrierS.x + (Math.random() - 0.5) * 8,
      y: carrierS.y + (Math.random() - 0.5) * 6,
      duration: dur, ease: 'Power2.easeIn',
      onUpdate: () => this._syncLabel(tackler),
      onComplete: doFlash,
    });

    // Secondary pursuers converge slightly behind
    for (let i = 1; i < Math.min(sorted.length, 4); i++) {
      const { dS, dist: d, spd: sp, agi: ag } = sorted[i];
      if (d > 520) continue;
      const sp2 = 0.22 + (sp + ag) / 20 * 0.38;
      const d2  = Math.max(350, Math.min(900, d / sp2));
      this.tweens.add({
        targets: dS,
        x: carrierS.x + (Math.random() - 0.5) * 26,
        y: carrierS.y + (Math.random() - 0.5) * 20,
        duration: d2, delay: 30 + i * 45, ease: 'Power2.easeIn',
        onUpdate: () => this._syncLabel(dS),
      });
    }
  }

  // ─── RESULT ───────────────────────────────────────────────────────────────
  _showPlayResult(outcome, rotations) {
    const { gs } = this;
    gs.phase = 'RESULT';
    this._updateHUD();

    let downResult = null;
    if (!outcome.isTurnover &&
        outcome.result !== 'INCOMPLETE' &&
        outcome.result !== 'FG_GOOD' &&
        outcome.result !== 'FG_MISS' &&
        outcome.result !== 'PUNT') {
      downResult = gs.nextDown(outcome.yards);
    }

    if (outcome.result === 'FG_GOOD')  { gs.scorePoints(gs.possession, 3); gs.stats[gs.possession].fgMade++; }
    if (outcome.result === 'PUNT')     { gs.stats[gs.possession].punts++; }
    if (outcome.result === 'TURNOVER') { gs.stats[1 - gs.possession].turnovers++; }

    // ── Compute result text ─────────────────────────────────────────────────
    let resultLine = '', resultColor = '#aaddff';

    if (downResult === 'TOUCHDOWN') {
      gs.scorePoints(gs.possession, 6); gs.stats[gs.possession].tds++;
      resultLine  = 'TOUCHDOWN!  +6 pts';
      resultColor = '#ffd700';
    } else if (downResult === 'FIRST_DOWN') {
      resultLine  = 'FIRST DOWN!';
      resultColor = '#00ff88';
    } else if (downResult === 'TURNOVER_ON_DOWNS') {
      resultLine  = 'TURNOVER ON DOWNS';
      resultColor = '#ff4444';
    } else if (outcome.result === 'TURNOVER') {
      resultLine  = 'TURNOVER!';
      resultColor = '#ff4444';
    } else if (outcome.result === 'FG_GOOD') {
      resultLine  = 'FIELD GOAL!  +3 pts';
      resultColor = '#ffd700';
    } else if (outcome.result === 'FG_MISS') {
      resultLine  = 'No Good';
      resultColor = '#ff8888';
    } else if (outcome.result === 'PUNT') {
      resultLine  = `Punt — ${outcome.yards} yards`;
      resultColor = '#aaaacc';
    } else if (outcome.result === 'INCOMPLETE') {
      resultLine  = 'Incomplete Pass';
      resultColor = '#888888';
    } else if (outcome.yards > 0) {
      resultLine  = `+${outcome.yards} yards  →  ${gs.downString()}`;
    } else if (outcome.yards < 0) {
      resultLine  = `${outcome.yards} yards  →  ${gs.downString()}`;
      resultColor = '#ff8888';
    } else {
      resultLine  = `No gain  →  ${gs.downString()}`;
      resultColor = '#888888';
    }

    this._updateHUD();

    // ── SIM mode: quick floating text, no panel ─────────────────────────────
    if (this.mode === CFG.GAME_MODES.SIM) {
      const W = CFG.WIDTH;
      const simNarr = this.add.text(W/2, 88, outcome.narrative || 'Play complete', {
        fontSize: '12px', fontFamily: 'monospace', color: '#ffffff',
        stroke: '#000000', strokeThickness: 3, align: 'center', wordWrap: { width: 340 },
      }).setScrollFactor(0).setDepth(900).setOrigin(0.5).setAlpha(0);
      const simRes = this.add.text(W/2, 114, resultLine, {
        fontSize: '14px', fontFamily: 'monospace', fontStyle: 'bold', color: resultColor,
        stroke: '#000000', strokeThickness: 3,
      }).setScrollFactor(0).setDepth(900).setOrigin(0.5).setAlpha(0);
      this.tweens.add({ targets: [simNarr, simRes], alpha: 1, duration: 150 });
      this.time.delayedCall(950, () => {
        this.tweens.add({ targets: [simNarr, simRes], alpha: 0, duration: 200,
          onComplete: () => { simNarr.destroy(); simRes.destroy(); } });
      });
      this.time.delayedCall(1200, () => this._advanceAfterPlay(outcome, downResult));
      return;
    }

    // ── Full panel (COACH / PLAYER) ─────────────────────────────────────────
    const W = CFG.WIDTH, H = CFG.HEIGHT;
    const panelY = H - 150;

    const panel = this._addOverlay(this.add.image(W/2, panelY, 'panel_md')
      .setScrollFactor(0).setDepth(850));

    this._addOverlay(this.add.text(W/2, panelY - 68, outcome.narrative || 'Play complete', {
      fontSize: '13px', fontFamily: 'monospace', color: '#ffffff',
      align: 'center', wordWrap: { width: 290 },
    }).setScrollFactor(0).setDepth(851).setOrigin(0.5));

    this._addOverlay(this.add.text(W/2, panelY - 36, resultLine, {
      fontSize: '15px', fontFamily: 'monospace', fontStyle: 'bold', color: resultColor,
    }).setScrollFactor(0).setDepth(851).setOrigin(0.5));

    // Rotations display
    if (rotations.length > 0) {
      const rotLine = rotations.slice(0, 3).map(r => `↔ ${r.pos}: ${r.out} → ${r.in}`).join('  ');
      this._addOverlay(this.add.text(W/2, panelY - 8, rotLine, {
        fontSize: '9px', fontFamily: 'monospace', color: '#666688',
      }).setScrollFactor(0).setDepth(851).setOrigin(0.5));
    }

    // Auto-advance after linger, or show continue button for player
    const linger = CFG.RESULT_LINGER_MS;
    const continueBtn = this._addOverlay(
      this.add.image(W/2, panelY + 62, 'btn_neutral')
        .setScrollFactor(0).setDepth(851).setInteractive({ useHandCursor: true })
    );
    this._addOverlay(this.add.text(W/2, panelY + 62, 'CONTINUE  ▶', {
      fontSize: '13px', fontFamily: 'monospace', color: '#aaddff',
    }).setScrollFactor(0).setDepth(852).setOrigin(0.5));

    let advanced = false;
    const doAdvance = () => {
      if (advanced) return;
      advanced = true;
      this._clearOverlays();
      this._advanceAfterPlay(outcome, downResult);
    };

    continueBtn.on('pointerdown', doAdvance);
    if (this.mode !== CFG.GAME_MODES.PLAYER) {
      this.time.delayedCall(linger, doAdvance);
    }

    // TD extra point prompt
    if (downResult === 'TOUCHDOWN') {
      this.time.delayedCall(200, () => {
        const epBtn = this._addOverlay(
          this.add.image(W/2, panelY + 96, 'btn_small')
            .setScrollFactor(0).setDepth(851).setInteractive({ useHandCursor: true })
        );
        this._addOverlay(this.add.text(W/2, panelY + 96, '+ PAT', {
          fontSize: '11px', fontFamily: 'monospace', color: '#ffd700',
        }).setScrollFactor(0).setDepth(852).setOrigin(0.5));
        epBtn.on('pointerdown', () => {
          gs.scorePoints(gs.possession, 1);
          this._updateHUD();
        });
      });
    }
  }

  _advanceAfterPlay(outcome, downResult) {
    const { gs } = this;

    // Tick clock
    gs.clock = Math.max(0, gs.clock - (12 + Math.floor(Math.random() * 14)));

    if (gs.clock <= 0) {
      if (gs.quarter < 4) {
        gs.nextQuarter();
        if (gs.quarter === 3) { this._showHalftime(); return; }
      } else {
        this._showGameOver(); return;
      }
    }

    const offDir = gs.possession === 0 ? 1 : -1;
    const changePoss =
      downResult === 'TURNOVER_ON_DOWNS' || outcome.isTurnover ||
      outcome.result === 'FG_GOOD' || outcome.result === 'FG_MISS' || outcome.result === 'PUNT';

    if (downResult === 'TOUCHDOWN') {
      gs.scorePoints(gs.possession, 1); // PAT
      const newPoss = 1 - gs.possession;
      const newDir  = newPoss === 0 ? 1 : -1;
      gs.changePossession(newDir === 1 ? 25 : 75);
    } else if (changePoss) {
      if (outcome.result === 'PUNT') {
        const puntLanding = Phaser.Math.Clamp(gs.ballYard + offDir * outcome.yards, 5, 95);
        gs.changePossession(puntLanding);
      } else if (outcome.result === 'FG_GOOD') {
        const newPoss = 1 - gs.possession;
        const newDir  = newPoss === 0 ? 1 : -1;
        gs.changePossession(newDir === 1 ? 25 : 75);
      } else {
        gs.changePossession(); // turnover / FG_MISS — ball stays at current yard
      }
    }

    this._updateHUD();
    this._buildFieldMarkers();
    this._panToYard(gs.ballYard, true);
    this._animateHuddle(() => this._startPlayCall());
  }

  _animateHuddle(onDone) {
    const gs     = this.gs;
    const offDir = gs.possession === 0 ? 1 : -1;
    const midY   = this._fieldYToScreenY(0);
    const hScale = screenYToScale(midY);

    // Offense huddles BEHIND LOS; defense huddles AHEAD of LOS
    const offHuddleX = Phaser.Math.Clamp(
      yardToX(gs.ballYard) - offDir * 5 * YW, CFG.EZ_W + 20, CFG.FIELD_WORLD_W - CFG.EZ_W - 20);
    const defHuddleX = Phaser.Math.Clamp(
      yardToX(gs.ballYard) + offDir * 7 * YW, CFG.EZ_W + 20, CFG.FIELD_WORLD_W - CFG.EZ_W - 20);

    for (const [key, s] of Object.entries(this._sprites)) {
      if (!s?.active) continue;
      const isOff = key.startsWith('off_');
      const hx = isOff ? offHuddleX : defHuddleX;
      s._label?.setAlpha(0);
      s._numLabel?.setAlpha(0);
      s._fatDot?.setAlpha(0);
      this.tweens.add({ targets: s,
        x: hx + (Math.random()-0.5)*26, y: midY + (Math.random()-0.5)*18,
        scale: hScale, duration: 440, ease: 'Power2.easeIn' });
    }
    if (this._ball) this.tweens.add({ targets: this._ball, x: offHuddleX, y: midY, duration: 440 });

    this._showToast('HUDDLE', 680);

    this.time.delayedCall(760, () => {
      this._showToast('BREAK!', 380);
      this._clearSprites();
      this._setUpFormation();

      for (const [key, s] of Object.entries(this._sprites)) {
        if (!s?.active) continue;
        const isOff = key.startsWith('off_');
        const hx = isOff ? offHuddleX : defHuddleX;
        const destX = s._baseX, destY = s._baseY;
        s.setPosition(hx + (Math.random()-0.5)*22, midY + (Math.random()-0.5)*14);
        s._label?.setAlpha(0);
        s._numLabel?.setAlpha(0);
        s._fatDot?.setAlpha(0);
        this.tweens.add({ targets: s, x: destX, y: destY, scale: screenYToScale(destY),
          duration: 520, delay: Math.random() * 160, ease: 'Power2.easeOut',
          onUpdate: () => this._syncLabel(s),
          onComplete: () => { s._label?.setAlpha(1); s._numLabel?.setAlpha(1); s._fatDot?.setAlpha(1); } });
      }
      this.time.delayedCall(780, () => onDone?.());
    });
  }

  // ─── HALFTIME / GAMEOVER ──────────────────────────────────────────────────
  _onResume() {
    // Fired when HalfTimeScene resumes this scene
    this._clearOverlays();
    this._buildFieldMarkers();
    this._panToYard(this.gs.ballYard, false);
    this.cameras.main.fadeIn(300);
    this.time.delayedCall(500, () => this._animateHuddle(() => this._startPlayCall()));
  }

  _showHalftime() {
    this.scene.launch('HalfTimeScene', { gs: this.gs });
    this.scene.pause('GameScene');
  }

  _showGameOver() {
    this.cameras.main.fadeOut(400);
    this.time.delayedCall(400, () => {
      this.scene.stop('GameScene');
      this.scene.start('GameOverScene', { gs: this.gs });
    });
  }

  // ─── OVERLAY HELPERS ─────────────────────────────────────────────────────
  _makeOverlay() { return []; }

  _addOverlay(obj) {
    this._overlays.push(obj);
    return obj;
  }

  _clearOverlays() {
    this._overlays.forEach(o => o?.destroy());
    this._overlays = [];
  }

  _showToast(msg, duration) {
    const W = CFG.WIDTH;
    const t = this.add.text(W/2, 100, msg, {
      fontSize: '13px', fontFamily: 'monospace', color: '#ffffff',
      stroke: '#000000', strokeThickness: 3, align: 'center',
    }).setScrollFactor(0).setDepth(900).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, duration: 180 });
    this.time.delayedCall(duration - 250, () => {
      this.tweens.add({ targets: t, alpha: 0, duration: 220,
        onComplete: () => t.destroy() });
    });
  }

  // ─── UPDATE LOOP ─────────────────────────────────────────────────────────
  update(time, delta) {
    // Camera smoothly follows ball carrier / ball during live play
    if (this.gs.phase === 'PLAYING') {
      const carrier = this._sprites[this._ballCarrierKey];
      let trackX = null;
      if (carrier?.active) {
        trackX = carrier.x;
      } else if (this._ball?.visible) {
        trackX = this._ball.x;
      }
      if (trackX != null) {
        const target = Phaser.Math.Clamp(trackX - CFG.WIDTH / 2, 0, CFG.FIELD_WORLD_W - CFG.WIDTH);
        this.cameras.main.scrollX += (target - this.cameras.main.scrollX) * 0.08;
      }
    }

    if (this.mode !== CFG.GAME_MODES.PLAYER) return;
    if (this.gs.phase !== 'PLAYING' && this.gs.phase !== 'PRE_SNAP') return;

    const s = this._sprites[this._controlledKey];
    if (!s?.active || !this._dpad) return;

    // Speed from player stats
    const spd   = s._player?.stats?.spd ?? 6;
    const agi   = s._player?.stats?.agi ?? 6;
    const speed = 1.6 + (spd + agi) / 20 * 3.2;

    let mx = 0, my = 0;
    if (this._dpad.left)  mx = -speed;
    if (this._dpad.right) mx =  speed;
    if (this._dpad.up)    my = -speed;
    if (this._dpad.down)  my =  speed;

    if (mx || my) {
      s.x = Phaser.Math.Clamp(s.x + mx, 20, CFG.FIELD_WORLD_W - 20);
      s.y = Phaser.Math.Clamp(s.y + my, CFG.FIELD_FAR_Y + 5, CFG.FIELD_NEAR_Y - 5);
      s.setScale(screenYToScale(s.y));
      s.setDepth(Math.round(s.y));
      this._syncLabel(s);
      // Smooth camera follow during pre-snap movement
      if (this.gs.phase === 'PRE_SNAP') {
        const target = Phaser.Math.Clamp(s.x - CFG.WIDTH / 2, 0, CFG.FIELD_WORLD_W - CFG.WIDTH);
        this.cameras.main.scrollX += (target - this.cameras.main.scrollX) * 0.1;
      }
    }
  }
}
