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
    createFieldTexture(this);
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

    // Ball — placed on ball carrier or at LOS center
    if (!this._ball) {
      this._ball = this.add.graphics().setDepth(200);
    }
    this._updateBallPos();
  }

  _updateBallPos() {
    if (!this._ball) return;
    const carrier = this._sprites[this._ballCarrierKey];
    this._ball.clear();
    // Only show floating ball if no carrier is visible
    if (!carrier || this._ballCarrierKey === null) {
      const bx = yardToX(this.gs.ballYard);
      const by = this._fieldYToScreenY(0);
      this._ball.fillStyle(CFG.COLORS.BALL);
      this._ball.fillEllipse(bx, by, CFG.BALL_W, CFG.BALL_H);
      this._ball.lineStyle(1, CFG.COLORS.BALL_STRIPE, 0.8);
      this._ball.beginPath(); this._ball.moveTo(bx, by - 3); this._ball.lineTo(bx, by + 3); this._ball.strokePath();
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
    ).setOrigin(0.5).setDepth(4);

    this._fdLine = this.add.rectangle(
      yardToX(this.gs.firstDownYard), (CFG.FIELD_FAR_Y + CFG.FIELD_NEAR_Y) / 2,
      2, fieldH, 0xffff00, 0.7
    ).setOrigin(0.5).setDepth(4);
  }

  _updateFieldMarkers() {
    this._buildFieldMarkers();
  }

  // ─── 90s SCOREBUG ────────────────────────────────────────────────────────
  _buildHUD() {
    const W = CFG.WIDTH;
    this._hudDepth = 300;

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
    this.cameras.main.setViewport(0, 56, CFG.WIDTH, CFG.HEIGHT - 56);
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
      .setScrollFactor(0).setDepth(250).setInteractive({ useHandCursor: true });
    this._snapBtn.setStrokeStyle(1, 0x4488ff);
    this._snapBtnLabel = this.add.text(W/2, H - 22, '▶ PLAY CALL', {
      fontSize: '13px', fontFamily: 'monospace', color: '#aaddff',
    }).setScrollFactor(0).setDepth(251).setOrigin(0.5);
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
        .setScrollFactor(0).setDepth(250).setInteractive();
      btn.setStrokeStyle(1, 0x334466);
      this.add.text(d.x, d.y, d.label, {
        fontSize: '14px', fontFamily: 'monospace', color: '#6688aa',
      }).setScrollFactor(0).setDepth(251).setOrigin(0.5);
      btn.on('pointerdown', () => { this._dpad[d.key] = true;  btn.setFillStyle(0x3344aa, 0.9); });
      btn.on('pointerup',   () => { this._dpad[d.key] = false; btn.setFillStyle(0x1a1a3a, 0.85); });
      btn.on('pointerout',  () => { this._dpad[d.key] = false; btn.setFillStyle(0x1a1a3a, 0.85); });
    });
    this.add.circle(cx, cy, 12, 0x2a2a44, 0.7).setScrollFactor(0).setDepth(250);
  }

  _buildActionBtn(x, y) {
    this._actionBtn = this.add.circle(x, y, 28, 0x6b0000, 0.9)
      .setScrollFactor(0).setDepth(250).setInteractive();
    this._actionBtn.setStrokeStyle(2, 0xee2222);
    this.add.text(x, y, 'A', {
      fontSize: '18px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ff4444',
    }).setScrollFactor(0).setDepth(251).setOrigin(0.5);
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
    const panel = this._addOverlay(this.add.image(W/2, H/2, 'panel_md').setScrollFactor(0).setDepth(350));
    this._addOverlay(this.add.text(W/2, H/2 - 80, 'COIN TOSS', {
      fontSize: '24px', fontFamily: 'monospace', color: '#ffd700', stroke:'#000',strokeThickness:3,
    }).setScrollFactor(0).setDepth(351).setOrigin(0.5));

    const coin = this._addOverlay(this.add.text(W/2, H/2 - 18, '🪙', { fontSize:'40px' })
      .setScrollFactor(0).setDepth(351).setOrigin(0.5));
    this.tweens.add({ targets: coin, scaleX: 0, duration: 400, yoyo: true, repeat: -1 });

    this._addOverlay(this.add.text(W/2, H/2 + 28, 'CALL THE TOSS:', {
      fontSize:'13px', fontFamily:'monospace', color:'#cccccc',
    }).setScrollFactor(0).setDepth(351).setOrigin(0.5));

    const headsBtn = this._addOverlay(this.add.image(W/2 - 60, H/2 + 70, 'btn_small').setScrollFactor(0).setDepth(351).setInteractive({ useHandCursor:true }));
    this._addOverlay(this.add.text(W/2 - 60, H/2 + 70, 'HEADS', {
      fontSize:'13px', fontFamily:'monospace', color:'#ffd700',
    }).setScrollFactor(0).setDepth(352).setOrigin(0.5));

    const tailsBtn = this._addOverlay(this.add.image(W/2 + 60, H/2 + 70, 'btn_small').setScrollFactor(0).setDepth(351).setInteractive({ useHandCursor:true }));
    this._addOverlay(this.add.text(W/2 + 60, H/2 + 70, 'TAILS', {
      fontSize:'13px', fontFamily:'monospace', color:'#c8c8c8',
    }).setScrollFactor(0).setDepth(352).setOrigin(0.5));

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
    this._addOverlay(this.add.image(W/2, H/2, 'panel_sm').setScrollFactor(0).setDepth(350));
    this._addOverlay(this.add.text(W/2, H/2 - 42, 'YOU WIN THE TOSS', {
      fontSize:'14px', fontFamily:'monospace', color:'#ffd700',
    }).setScrollFactor(0).setDepth(351).setOrigin(0.5));

    const recvBtn = this._addOverlay(this.add.image(W/2 - 56, H/2 + 10, 'btn_small')
      .setScrollFactor(0).setDepth(351).setInteractive({ useHandCursor:true }));
    this._addOverlay(this.add.text(W/2 - 56, H/2 + 10, 'RECEIVE', {
      fontSize:'11px', fontFamily:'monospace', color:'#00ff88',
    }).setScrollFactor(0).setDepth(352).setOrigin(0.5));

    const kickBtn = this._addOverlay(this.add.image(W/2 + 56, H/2 + 10, 'btn_small')
      .setScrollFactor(0).setDepth(351).setInteractive({ useHandCursor:true }));
    this._addOverlay(this.add.text(W/2 + 56, H/2 + 10, 'KICK', {
      fontSize:'11px', fontFamily:'monospace', color:'#ffcc44',
    }).setScrollFactor(0).setDepth(352).setOrigin(0.5));

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

    this._animatePlayMotion(offPlay, () => {
      const outcome  = ai.resolvePlay(offPlay, defPlay, gs.offenseTeam, gs.defenseTeam);
      const rotA     = rs.autoRotate(0);
      const rotB     = rs.autoRotate(1);
      this.time.delayedCall(400, () => this._showPlayResult(outcome, rotA.concat(rotB)));
    });
  }

  _animatePlayMotion(offPlay, onDone) {
    const ms     = CFG.PLAY_ANIM_MS;
    const offDir = this.gs.possession === 0 ? 1 : -1;
    const isRun  = offPlay?.type === 'RUN';
    const isPass = offPlay?.type === 'PASS';

    for (const [key, s] of Object.entries(this._sprites)) {
      if (!s?.active) continue;
      let tx = s.x, ty = s.y;
      const isOff = key.startsWith('off_');
      const isDef = key.startsWith('def_');
      const isBall = s._isBallCarrier;

      if (isRun) {
        if (isOff) {
          const surge = isBall ? 120 : 50 + Math.random() * 40;
          tx = s.x + offDir * surge;
          ty = s.y + (Math.random() - 0.5) * 30;
        } else {
          tx = s.x + offDir * (25 + Math.random() * 30);
          ty = s.y + (Math.random() - 0.5) * 25;
        }
      } else if (isPass) {
        const pos = s._posKey;
        if (pos === 'WR' || pos === 'TE') {
          tx = s.x + offDir * (90 + Math.random() * 80);
          ty = s.y + (Math.random() - 0.5) * 70;
        } else if (pos === 'QB') {
          tx = s.x - offDir * 8;
        } else if (isDef && (pos === 'CB' || pos === 'FS' || pos === 'SS')) {
          tx = s.x - offDir * 30;
          ty = s.y + (Math.random() - 0.5) * 50;
        } else if (isDef && (pos === 'DE' || pos === 'DT')) {
          tx = s.x + offDir * 20;
        }
      }

      const newScale = screenYToScale ? screenYToScale(ty) : s.scale;
      this.tweens.add({
        targets: s,
        x: tx, y: ty, scale: newScale,
        duration: ms,
        ease: 'Sine.easeInOut',
        onUpdate: () => this._syncLabel(s),
      });
    }

    // Ball arc (pass)
    if (isPass && this._ball) {
      const targetX = yardToX(this.gs.ballYard) + offDir * (80 + Math.random() * 100);
      const targetY = this._fieldYToScreenY((Math.random() - 0.5) * 0.6);
      this.tweens.add({
        targets: this._ball,
        x: targetX, y: targetY - 30,
        duration: ms * 0.6,
        ease: 'Sine.easeOut',
        onUpdate: () => {
          this._ball.clear();
          this._ball.fillStyle(CFG.COLORS.BALL);
          this._ball.fillEllipse(this._ball.x, this._ball.y, CFG.BALL_W, CFG.BALL_H);
        },
      });
    }

    this.time.delayedCall(ms + 200, onDone);
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
      .setScrollFactor(0).setDepth(350));

    this._addOverlay(this.add.text(W/2, panelY - 68, outcome.narrative || 'Play complete', {
      fontSize: '13px', fontFamily: 'monospace', color: '#ffffff',
      align: 'center', wordWrap: { width: 290 },
    }).setScrollFactor(0).setDepth(351).setOrigin(0.5));

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
    }).setScrollFactor(0).setDepth(351).setOrigin(0.5));

    // Updated scorebug scores
    this._updateHUD();

    // Rotations display
    if (rotations.length > 0) {
      const rotLine = rotations.slice(0, 3).map(r => `↔ ${r.pos}: ${r.out} → ${r.in}`).join('  ');
      this._addOverlay(this.add.text(W/2, panelY - 8, rotLine, {
        fontSize: '9px', fontFamily: 'monospace', color: '#666688',
      }).setScrollFactor(0).setDepth(351).setOrigin(0.5));
    }

    // Auto-advance after linger, or show continue button for player
    const linger = CFG.RESULT_LINGER_MS;
    const continueBtn = this._addOverlay(
      this.add.image(W/2, panelY + 62, 'btn_neutral')
        .setScrollFactor(0).setDepth(351).setInteractive({ useHandCursor: true })
    );
    this._addOverlay(this.add.text(W/2, panelY + 62, 'CONTINUE  ▶', {
      fontSize: '13px', fontFamily: 'monospace', color: '#aaddff',
    }).setScrollFactor(0).setDepth(352).setOrigin(0.5));

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
            .setScrollFactor(0).setDepth(351).setInteractive({ useHandCursor: true })
        );
        this._addOverlay(this.add.text(W/2, panelY + 96, '+ PAT', {
          fontSize: '11px', fontFamily: 'monospace', color: '#ffd700',
        }).setScrollFactor(0).setDepth(352).setOrigin(0.5));
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
    this._updateFieldMarkers();
    this._setUpFormation();
    this._panToYard(gs.ballYard, true);
    this.time.delayedCall(CFG.BETWEEN_PLAY_MS, () => this._startPlayCall());
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
    }).setScrollFactor(0).setDepth(400).setOrigin(0.5).setAlpha(0);
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
