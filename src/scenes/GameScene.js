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
      // destroy all tracked children
      s._label?.destroy();
      s._fatDot?.destroy();
      s._shadow?.destroy();
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
    g.setDepth(Math.round(sy));    // y-sort depth

    drawPlayerSprite(g, primary, secondary, isControlled, isBallCarrier);

    // Position label
    const label = this.add.text(sx, sy - 26 * scale, pos, {
      fontSize: '8px', fontFamily: 'monospace', color: '#ffffff',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(Math.round(sy) + 1);

    // Fatigue dot
    const fatigue = player?.fatigue || 0;
    const dotCol  = fatigue > 70 ? 0xff4444 : fatigue > 40 ? 0xffaa00 : 0x44ff88;
    const fatDot  = this.add.circle(sx + 12 * scale, sy - 22 * scale, 3, dotCol)
      .setDepth(Math.round(sy) + 1);

    g._label    = label;
    g._fatDot   = fatDot;
    g._player   = player;
    g._posKey   = pos;
    g._controlled  = isControlled;
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
    s._fatDot?.setPosition(s.x + 12 * sc, s.y - 22 * sc);
    s.setDepth(Math.round(s.y));
    s._label?.setDepth(Math.round(s.y) + 1);
    s._fatDot?.setDepth(Math.round(s.y) + 1);
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
      this.gs.ballYard   = 25;
      this.gs.firstDownYard = 35;
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
    this.gs.ballYard  = returnYard;
    this.gs.down = 1; this.gs.yardsToGo = 10;
    this.gs.firstDownYard = Math.min(100, returnYard + 10);
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
      this._showToast(`CPU: ${this.gs.selectedOffPlay.name} vs ${this.gs.selectedDefPlay.name}`, 1400);
      this.time.delayedCall(1600, () => this._goPreSnap());
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
      // Auto-snap after a beat
      this.time.delayedCall(2000, () => {
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
    for (const [,s] of defLBs) {
      this.tweens.add({ targets: s, x: s.x + offDir * (12 + Math.random() * 14),
        duration: 450, delay: 80, ease: 'Power1', onUpdate: () => this._syncLabel(s) });
    }

    // ── Snap: ball centre → QB ───────────────────────────────────────────────
    this.tweens.add({ targets: this._ball, x: qbX, y: qbY, duration: 180, ease: 'Power2' });

    if (isRun) {
      const isSneak   = offPlay?.id === 'qk';
      const carrierS  = isSneak ? qbS : (rbS ?? qbS);

      // Handoff 200ms: ball QB → RB
      this.time.delayedCall(200, () => {
        if (!isSneak && carrierS && carrierS !== qbS) {
          this.tweens.add({ targets: this._ball, x: carrierS.x, y: carrierS.y,
            duration: 260, ease: 'Power2' });
        }
      });

      // Run 500ms: carrier moves exactly outcome yards
      this.time.delayedCall(500, () => {
        if (!carrierS) { onDone(); return; }
        const finalX = Phaser.Math.Clamp(
          carrierS.x + offDir * yards * YW, CFG.EZ_W + 5, CFG.FIELD_WORLD_W - CFG.EZ_W - 5);
        const finalY = Phaser.Math.Clamp(
          carrierS.y + (Math.random() - 0.5) * 38, CFG.FIELD_FAR_Y + 5, CFG.FIELD_NEAR_Y - 5);

        this.tweens.add({
          targets: carrierS, x: finalX, y: finalY, scale: screenYToScale(finalY),
          duration: 850, ease: 'Sine.easeInOut',
          onUpdate: () => {
            this._syncLabel(carrierS);
            if (this._ball.visible) this._ball.setPosition(carrierS.x, carrierS.y);
          },
          onComplete: () => this._animateTackle(carrierS, allDef, onDone),
        });

        // FB lead block on power play
        if (fbE?.[1] && offPlay?.id === 'pw') {
          const fbS = fbE[1];
          this.tweens.add({ targets: fbS, x: finalX - offDir * 14, y: finalY,
            scale: screenYToScale(finalY), duration: 800, ease: 'Sine.easeInOut',
            onUpdate: () => this._syncLabel(fbS) });
        }
        // OL surge forward
        for (const [,s] of offLine) {
          this.tweens.add({ targets: s, x: s.x + offDir * (16 + Math.random() * 18),
            duration: 680, delay: 140, ease: 'Power1', onUpdate: () => this._syncLabel(s) });
        }
      });

    } else if (isPass) {
      // QB drops back
      const dropX = isSack ? qbX + offDir * yards * YW : qbX - offDir * 22;
      if (qbS) {
        this.tweens.add({
          targets: qbS, x: dropX, y: qbY + 5,
          duration: isSack ? 620 : 380, ease: 'Power1',
          onUpdate: () => {
            this._syncLabel(qbS);
            if (!isSack) this._ball.setPosition(qbS.x, qbS.y);
          },
          onComplete: () => { if (isSack) this._animateTackle(qbS, allDef, onDone); },
        });
      }

      // WR routes
      const wrTargets = {};
      for (const [k, wrS] of offWRs) {
        const dm  = offPlay?.id === 'fl' ? 2.0 : offPlay?.id === 'ps' ? 1.5 :
                    offPlay?.id === 'sl' ? 0.7 : 1.0;
        const yd  = Math.max(3, (Math.abs(yards) + 5) * dm);
        const tx  = Phaser.Math.Clamp(wrS.x + offDir * yd * YW, CFG.EZ_W + 5, CFG.FIELD_WORLD_W - CFG.EZ_W - 5);
        const ty  = Phaser.Math.Clamp(wrS.y + (Math.random() - 0.5) * 95, CFG.FIELD_FAR_Y + 5, CFG.FIELD_NEAR_Y - 5);
        wrTargets[k] = { x: tx, y: ty };
        this.tweens.add({ targets: wrS, x: tx, y: ty, scale: screenYToScale(ty),
          duration: 860, delay: 130, ease: 'Sine.easeInOut', onUpdate: () => this._syncLabel(wrS) });
      }

      // Man coverage: each DB shadows nearest WR
      if (isManCov) {
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
            paired.add(best[0]);
            this.tweens.add({ targets: best[1], x: tgt.x - offDir * 10, y: tgt.y,
              scale: screenYToScale(tgt.y), duration: 860, delay: 190, ease: 'Sine.easeInOut',
              onUpdate: () => this._syncLabel(best[1]) });
          }
        }
        for (const [dk, dbS] of defDBs) {
          if (!paired.has(dk)) {
            this.tweens.add({ targets: dbS, x: dbS.x + offDir * 36, y: dbS.y,
              duration: 580, ease: 'Power2', onUpdate: () => this._syncLabel(dbS) });
          }
        }
      } else {
        // Zone drop
        for (const [,dbS] of defDBs) {
          this.tweens.add({ targets: dbS, x: dbS.x - offDir * (12 + Math.random() * 18),
            y: dbS.y + (Math.random()-0.5)*30, duration: 600, ease: 'Power1',
            onUpdate: () => this._syncLabel(dbS) });
        }
      }

      // Ball throw at 660ms (unless sacked)
      if (!isSack) {
        this.time.delayedCall(660, () => {
          const candidates = offWRs.filter(([k]) => wrTargets[k]);
          const chosen  = candidates[Math.floor(Math.random() * candidates.length)];
          const chosenS = chosen?.[1];
          const dest    = chosen ? wrTargets[chosen[0]] : { x: qbX + offDir * 80, y: qbY };

          this._ball.setPosition(qbS?.x ?? qbX, qbS?.y ?? qbY).setVisible(true);

          // Arced pass: two-part tween
          const midX    = (this._ball.x + dest.x) / 2;
          const peakY   = Math.min(this._ball.y, dest.y) - 44;
          this.tweens.add({
            targets: this._ball, x: midX, y: peakY,
            duration: 280, ease: 'Sine.easeOut',
            onComplete: () => {
              this.tweens.add({
                targets: this._ball, x: dest.x, y: dest.y,
                duration: 290, ease: 'Sine.easeIn',
                onComplete: () => {
                  if (isInterception) {
                    const intDB = defDBs[0]?.[1];
                    if (intDB) this.tweens.add({ targets: this._ball, x: intDB.x, y: intDB.y,
                      duration: 200, onComplete: () => { this._ball.setVisible(false); onDone(); } });
                    else { this._ball.setVisible(false); onDone(); }
                  } else if (result === 'INCOMPLETE') {
                    this.tweens.add({ targets: this._ball, y: dest.y + 22, alpha: 0,
                      duration: 200, ease: 'Power2.easeIn',
                      onComplete: () => { this._ball.setAlpha(1).setVisible(false); onDone(); } });
                  } else {
                    this._ball.setVisible(false);
                    if (chosenS) this._animateTackle(chosenS, [...defDBs, ...defLBs], onDone);
                    else onDone();
                  }
                },
              });
            },
          });
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

  _animateTackle(carrierS, defenders, onDone) {
    if (!carrierS?.active) { onDone?.(); return; }
    let nearestS = null, nearestD = Infinity;
    for (const [, dS] of defenders) {
      if (!dS?.active) continue;
      const d = Math.hypot(dS.x - carrierS.x, dS.y - carrierS.y);
      if (d < nearestD) { nearestD = d; nearestS = dS; }
    }
    const doFlash = () => {
      const flash = this.add.circle(carrierS.x, carrierS.y, 14, 0xffffff, 0.85).setDepth(650);
      this.tweens.add({ targets: flash, alpha: 0, scaleX: 3.5, scaleY: 3.5,
        duration: 320, ease: 'Power2',
        onComplete: () => { flash.destroy(); onDone?.(); } });
      // Small shake on carrier
      this.tweens.add({ targets: carrierS, x: carrierS.x + 6,
        duration: 40, yoyo: true, repeat: 4 });
    };

    if (nearestS && nearestD < 280) {
      this.tweens.add({ targets: nearestS,
        x: carrierS.x + (Math.random()-0.5)*10, y: carrierS.y + (Math.random()-0.5)*8,
        duration: 180, ease: 'Power3',
        onUpdate: () => this._syncLabel(nearestS),
        onComplete: doFlash });
    } else {
      doFlash();
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

    const W = CFG.WIDTH, H = CFG.HEIGHT;
    const panelY = H - 150;

    const panel = this._addOverlay(this.add.image(W/2, panelY, 'panel_md')
      .setScrollFactor(0).setDepth(850));

    this._addOverlay(this.add.text(W/2, panelY - 68, outcome.narrative || 'Play complete', {
      fontSize: '13px', fontFamily: 'monospace', color: '#ffffff',
      align: 'center', wordWrap: { width: 290 },
    }).setScrollFactor(0).setDepth(851).setOrigin(0.5));

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

    this._addOverlay(this.add.text(W/2, panelY - 36, resultLine, {
      fontSize: '15px', fontFamily: 'monospace', fontStyle: 'bold', color: resultColor,
    }).setScrollFactor(0).setDepth(851).setOrigin(0.5));

    // Updated scorebug scores
    this._updateHUD();

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
    // Auto-advance for Coach/Sim after linger time
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

    const changePoss =
      downResult === 'TURNOVER_ON_DOWNS' || outcome.isTurnover ||
      outcome.result === 'FG_GOOD' || outcome.result === 'FG_MISS' || outcome.result === 'PUNT';

    if (changePoss) {
      const puntYard = outcome.result === 'PUNT'
        ? Math.max(0, Math.min(95, 100 - gs.ballYard - outcome.yards))
        : 25;
      gs.changePossession(changePoss && outcome.result === 'PUNT' ? puntYard : undefined);
    }

    if (downResult === 'TOUCHDOWN') {
      gs.scorePoints(gs.possession, 1); // PAT
      gs.changePossession(25);
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
        s._fatDot?.setAlpha(0);
        this.tweens.add({ targets: s, x: destX, y: destY, scale: screenYToScale(destY),
          duration: 520, delay: Math.random() * 160, ease: 'Power2.easeOut',
          onUpdate: () => this._syncLabel(s),
          onComplete: () => { s._label?.setAlpha(1); s._fatDot?.setAlpha(1); } });
      }
      this.time.delayedCall(780, () => onDone?.());
    });
  }

  // ─── HALFTIME / GAMEOVER ──────────────────────────────────────────────────
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
    if (this.mode !== CFG.GAME_MODES.PLAYER) return;
    if (this.gs.phase !== 'PLAYING' && this.gs.phase !== 'PRE_SNAP') return;

    const s = this._sprites[this._controlledKey];
    if (!s?.active || !this._dpad) return;

    const speed = 2.8;
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
      this._panToYard(Math.round((s.x - CFG.EZ_W) / YW), false);
    }
  }
}
