import { CFG } from '../config.js';
import { RosterSystem } from '../systems/RosterSystem.js';
import { AISystem } from '../systems/AISystem.js';
import { createFieldTexture } from '../graphics/Sprites.js';
import { getOverall } from '../data/teams.js';

const EZ_W = 120;
const PLAY_W = CFG.FIELD_WORLD_W - EZ_W * 2;
const YARD_W = PLAY_W / 100;

function yardToX(yard) { return EZ_W + yard * YARD_W; }
function xToYard(x)    { return Math.round((x - EZ_W) / YARD_W); }

export class GameScene extends Phaser.Scene {
  constructor() { super({ key: 'GameScene' }); }

  init(data) {
    this.gs = data.gs;
    this.rs = new RosterSystem(this.gs.teams);
    this.ai = new AISystem(this.gs, this.rs);
  }

  create() {
    this._buildField();
    this._buildPlayers();
    this._buildHUD();
    this._buildControls();
    this._setupCamera();

    this.gs.phase = 'COIN_TOSS';
    this._showCoinToss();

    this.input.addPointer(3);
    this.cameras.main.fadeIn(400);
  }

  // ─── FIELD ───────────────────────────────────────────────────────────────
  _buildField() {
    createFieldTexture(this);

    // Yard number labels
    for (let y = 10; y <= 90; y += 10) {
      const label = y <= 50 ? y : 100 - y;
      const x = yardToX(y);
      this.add.text(x, 55, `${label}`, {
        fontSize: '10px', fontFamily: 'monospace', color: '#ffffff', alpha: 0.8,
      }).setOrigin(0.5, 0);
      this.add.text(x, CFG.FIELD_WORLD_H - 55, `${label}`, {
        fontSize: '10px', fontFamily: 'monospace', color: '#ffffff', alpha: 0.8,
      }).setOrigin(0.5, 1);
    }

    // End zone text
    this.add.text(60, CFG.FIELD_WORLD_H/2, this.gs.teams[0].abbr, {
      fontSize: '22px', fontFamily: 'monospace', color: '#ffd700', alpha: 0.6, angle: -90,
    }).setOrigin(0.5);
    this.add.text(CFG.FIELD_WORLD_W - 60, CFG.FIELD_WORLD_H/2, this.gs.teams[1].abbr, {
      fontSize: '22px', fontFamily: 'monospace', color: '#c8c8c8', alpha: 0.6, angle: 90,
    }).setOrigin(0.5);

    // First down marker (line of scrimmage + first down line)
    this.losLine = this.add.rectangle(yardToX(this.gs.ballYard), CFG.FIELD_WORLD_H/2,
      2, CFG.FIELD_WORLD_H - 100, 0xff8800).setOrigin(0.5);
    this.fdLine  = this.add.rectangle(yardToX(this.gs.firstDownYard), CFG.FIELD_WORLD_H/2,
      2, CFG.FIELD_WORLD_H - 100, 0xffff00).setOrigin(0.5);
  }

  _updateFieldMarkers() {
    this.losLine.x = yardToX(this.gs.ballYard);
    this.fdLine.x  = yardToX(this.gs.firstDownYard);
  }

  // ─── PLAYERS ─────────────────────────────────────────────────────────────
  _buildPlayers() {
    this.playerSprites = {};
    this.ballSprite = this.add.ellipse(yardToX(this.gs.ballYard), CFG.FIELD_WORLD_H/2,
      CFG.BALL_W, CFG.BALL_H, CFG.COLORS.BALL).setDepth(10);

    this._controlledSprite = null;
    this._setUpFormation();
  }

  _setUpFormation() {
    // Remove old sprites
    Object.values(this.playerSprites).forEach(s => s?.destroy());
    this.playerSprites = {};

    const offIdx  = this.gs.possession;
    const defIdx  = 1 - this.gs.possession;
    const offTeam = this.gs.teams[offIdx];
    const defTeam = this.gs.teams[defIdx];
    const ballX   = yardToX(this.gs.ballYard);
    const cy      = CFG.FIELD_WORLD_H / 2;

    const offColor  = offTeam.primary;
    const offColor2 = offTeam.secondary;
    const defColor  = defTeam.primary;
    const defColor2 = defTeam.secondary;

    const offFormation = [
      { pos:'C',   dx:0,   dy:0   },
      { pos:'LG',  dx:-20, dy:0   },
      { pos:'RG',  dx:20,  dy:0   },
      { pos:'LT',  dx:-40, dy:0   },
      { pos:'RT',  dx:40,  dy:0   },
      { pos:'QB',  dx:0,   dy:35  },
      { pos:'RB',  dx:10,  dy:65  },
      { pos:'FB',  dx:0,   dy:50  },
      { pos:'TE',  dx:60,  dy:0   },
      { pos:'WR',  dx:110, dy:-15 },
      { pos:'WR',  dx:-110,dy:-15 },
    ];
    const defFormation = [
      { pos:'DT',  dx:-12, dy:0   },
      { pos:'DT',  dx:12,  dy:0   },
      { pos:'DE',  dx:-40, dy:0   },
      { pos:'DE',  dx:40,  dy:0   },
      { pos:'MLB', dx:0,   dy:-30 },
      { pos:'OLB', dx:-50, dy:-25 },
      { pos:'OLB', dx:50,  dy:-25 },
      { pos:'CB',  dx:-110,dy:-50 },
      { pos:'CB',  dx:110, dy:-50 },
      { pos:'FS',  dx:0,   dy:-90 },
      { pos:'SS',  dx:40,  dy:-70 },
    ];

    const playerTeamIsOff = this.gs.playerTeamIdx === offIdx;
    const playerPos = this.gs.playerPos;

    let offPosCount = {};
    for (const slot of offFormation) {
      const count = offPosCount[slot.pos] || 0;
      offPosCount[slot.pos] = count + 1;
      const rosterIdx = count;
      const players = offTeam.roster.filter(p => p.pos === slot.pos)
        .sort((a,b) => getOverall(b) - getOverall(a));
      const player = players[rosterIdx] || players[0];
      if (!player) continue;

      const dir = offIdx === 0 ? 1 : -1;
      const sx = ballX + slot.dx * dir;
      const sy = cy + slot.dy;

      const isControlled = playerTeamIsOff && slot.pos === playerPos && rosterIdx === 0;
      const col = isControlled ? 0x00ffcc : offColor;
      const col2 = offColor2;

      const sprite = this._makePlayerSprite(sx, sy, col, col2, slot.pos, player, isControlled);
      this.playerSprites[`off_${slot.pos}_${rosterIdx}`] = sprite;
      if (isControlled) this._controlledSprite = sprite;
    }

    let defPosCount = {};
    for (const slot of defFormation) {
      const count = defPosCount[slot.pos] || 0;
      defPosCount[slot.pos] = count + 1;
      const rosterIdx = count;
      const players = defTeam.roster.filter(p => p.pos === slot.pos)
        .sort((a,b) => getOverall(b) - getOverall(a));
      const player = players[rosterIdx] || players[0];
      if (!player) continue;

      const dir = defIdx === 0 ? 1 : -1;
      const sx = ballX + slot.dx * dir;
      const sy = cy + slot.dy;

      const isControlled = !playerTeamIsOff && slot.pos === playerPos && rosterIdx === 0;
      const col = isControlled ? 0xff88cc : defColor;

      const sprite = this._makePlayerSprite(sx, sy, col, defColor2, slot.pos, player, isControlled);
      this.playerSprites[`def_${slot.pos}_${rosterIdx}`] = sprite;
      if (isControlled) this._controlledSprite = sprite;
    }

    this.ballSprite.setDepth(10);
    this.ballSprite.x = ballX;
    this.ballSprite.y = cy;
  }

  _makePlayerSprite(x, y, primary, secondary, pos, player, isControlled) {
    const g = this.add.graphics();
    g.setPosition(x, y);
    g.setDepth(5);

    // Body
    g.fillStyle(primary);
    g.fillRect(-6, -9, 12, 18);

    // Helmet
    g.fillStyle(primary);
    g.fillRoundedRect(-6, -14, 12, 8, 2);

    // Facemask
    g.fillStyle(secondary);
    g.fillRect(-4, -10, 8, 2);

    // Stripe
    g.fillStyle(secondary);
    g.fillRect(-6, -6, 12, 2);

    // Shadow
    g.fillStyle(0x000000, 0.3);
    g.fillEllipse(0, 12, 10, 4);

    if (isControlled) {
      // Glow ring
      g.lineStyle(2, 0xffffff, 0.9);
      g.strokeRoundedRect(-8, -16, 16, 30, 2);
    }

    // Position label
    const label = this.add.text(x, y - 20, pos, {
      fontSize: '8px', fontFamily: 'monospace', color: '#ffffff',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(6);

    // Fatigue dot
    const fatDot = this.add.circle(x + 8, y - 16, 3, 0x00ff00).setDepth(6);

    g._label = label;
    g._fatDot = fatDot;
    g._player = player;
    g._posKey = pos;
    g._controlled = isControlled;
    g._vx = 0;
    g._vy = 0;
    g._targetX = x;
    g._targetY = y;

    return g;
  }

  _updatePlayerLabel(sprite) {
    if (!sprite._label) return;
    sprite._label.setPosition(sprite.x, sprite.y - 20);
    sprite._fatDot.setPosition(sprite.x + 8, sprite.y - 16);
    const fatigue = sprite._player?.fatigue || 0;
    const dotColor = fatigue > 70 ? 0xff4444 : fatigue > 40 ? 0xffaa00 : 0x00ff00;
    sprite._fatDot.setFillStyle(dotColor);
  }

  // ─── HUD ─────────────────────────────────────────────────────────────────
  _buildHUD() {
    const { WIDTH } = CFG;
    this._hudCam = this.cameras.add(0, 0, WIDTH, 50).setScroll(0, 0);
    this._hudCam.setBackgroundColor(0x0a0a1a);

    this._hudLayer = this.add.layer();
    this._hudLayer.setDepth(100);

    // Scoreboard
    this._scoreA = this.add.text(10, 10, '', {
      fontSize: '14px', fontFamily: 'monospace', color: '#ffd700',
    }).setScrollFactor(0).setDepth(101);
    this._scoreB = this.add.text(WIDTH - 10, 10, '', {
      fontSize: '14px', fontFamily: 'monospace', color: '#c8c8c8',
    }).setScrollFactor(0).setDepth(101).setOrigin(1, 0);

    this._clockText = this.add.text(WIDTH/2, 8, '', {
      fontSize: '16px', fontFamily: 'monospace', color: '#ffffff',
      stroke: '#000000', strokeThickness: 2,
    }).setScrollFactor(0).setDepth(101).setOrigin(0.5, 0);

    this._downText = this.add.text(WIDTH/2, 26, '', {
      fontSize: '11px', fontFamily: 'monospace', color: '#aaddff',
    }).setScrollFactor(0).setDepth(101).setOrigin(0.5, 0);

    this._quarterText = this.add.text(WIDTH/2 - 80, 8, '', {
      fontSize: '12px', fontFamily: 'monospace', color: '#888888',
    }).setScrollFactor(0).setDepth(101).setOrigin(0.5, 0);

    this._phaseText = this.add.text(WIDTH/2, 44, '', {
      fontSize: '10px', fontFamily: 'monospace', color: '#00ff88',
    }).setScrollFactor(0).setDepth(101).setOrigin(0.5, 0);

    // Timeout indicators
    this._toA = [];
    this._toB = [];
    for (let i = 0; i < 3; i++) {
      this._toA.push(this.add.circle(160 + i * 12, 40, 4, 0xffd700).setScrollFactor(0).setDepth(101));
      this._toB.push(this.add.circle(WIDTH - 160 - i * 12, 40, 4, 0xc8c8c8).setScrollFactor(0).setDepth(101));
    }

    this._updateHUD();
  }

  _updateHUD() {
    const { gs } = this;
    const tA = gs.teams[0], tB = gs.teams[1];
    this._scoreA.setText(`${tA.abbr}  ${tA.score}`);
    this._scoreB.setText(`${tB.score}  ${tB.abbr}`);
    this._clockText.setText(gs.clockString());
    this._downText.setText(`${gs.downString()}  •  Ball: ${gs.ballYard}yd`);
    this._quarterText.setText(`Q${gs.quarter}`);

    const phases = { PLAY_CALL:'CALL YOUR PLAY', PRE_SNAP:'READY TO SNAP', PLAYING:'',
                     RESULT:'PLAY RESULT', KICKOFF:'KICKOFF', COIN_TOSS:'COIN TOSS',
                     HALFTIME:'HALFTIME', GAME_OVER:'GAME OVER' };
    this._phaseText.setText(phases[gs.phase] || '');

    this._toA.forEach((dot, i) => dot.setFillStyle(i < tA.timeoutsLeft ? 0xffd700 : 0x333333));
    this._toB.forEach((dot, i) => dot.setFillStyle(i < tB.timeoutsLeft ? 0xc8c8c8 : 0x333333));
  }

  // ─── CAMERA ──────────────────────────────────────────────────────────────
  _setupCamera() {
    this.cameras.main.setBounds(0, 0, CFG.FIELD_WORLD_W, CFG.FIELD_WORLD_H);
    this.cameras.main.setViewport(0, 50, CFG.WIDTH, CFG.HEIGHT - 50);
    this.cameras.main.scrollX = yardToX(this.gs.ballYard) - CFG.WIDTH / 2;
    this.cameras.main.scrollY = 0;
  }

  _panCameraToball(onComplete) {
    const targetX = yardToX(this.gs.ballYard) - CFG.WIDTH / 2;
    this.tweens.add({
      targets: this.cameras.main,
      scrollX: Math.max(0, Math.min(CFG.FIELD_WORLD_W - CFG.WIDTH, targetX)),
      duration: 600,
      ease: 'Power2',
      onComplete,
    });
  }

  // ─── CONTROLS ────────────────────────────────────────────────────────────
  _buildControls() {
    const { WIDTH, HEIGHT } = CFG;
    const controlY = HEIGHT - 80;
    const controlH = HEIGHT - 50;

    // D-pad (left side)
    const dpadCX = 65, dpadCY = controlH - 60;
    this._dpad = { up:false, down:false, left:false, right:false };

    const dpadBtns = [
      { key:'up',    x:dpadCX,      y:dpadCY-32,  label:'▲' },
      { key:'down',  x:dpadCX,      y:dpadCY+32,  label:'▼' },
      { key:'left',  x:dpadCX-32,   y:dpadCY,     label:'◀' },
      { key:'right', x:dpadCX+32,   y:dpadCY,     label:'▶' },
    ];
    this._dpadBtns = {};
    for (const d of dpadBtns) {
      const btn = this.add.circle(d.x, d.y, 18, 0x222244, 0.8)
        .setScrollFactor(0).setDepth(200).setInteractive();
      const lbl = this.add.text(d.x, d.y, d.label, {
        fontSize: '14px', fontFamily: 'monospace', color: '#aaaacc',
      }).setScrollFactor(0).setDepth(201).setOrigin(0.5);
      btn.on('pointerdown', () => { this._dpad[d.key] = true; btn.setFillStyle(0x4444aa, 0.9); });
      btn.on('pointerup',   () => { this._dpad[d.key] = false; btn.setFillStyle(0x222244, 0.8); });
      btn.on('pointerout',  () => { this._dpad[d.key] = false; btn.setFillStyle(0x222244, 0.8); });
      this._dpadBtns[d.key] = btn;
    }

    // Center button
    this.add.circle(dpadCX, dpadCY, 10, 0x334466, 0.7).setScrollFactor(0).setDepth(200);

    // Action button (right side)
    const abX = WIDTH - 65, abY = controlH - 60;
    this._actionBtn = this.add.circle(abX, abY, 26, 0x8b0000, 0.85)
      .setScrollFactor(0).setDepth(200).setInteractive();
    this._actionBtnLabel = this.add.text(abX, abY, '●', {
      fontSize: '20px', fontFamily: 'monospace', color: '#ff4444',
    }).setScrollFactor(0).setDepth(201).setOrigin(0.5);

    this._actionBtn.on('pointerdown', () => {
      this._actionBtn.setFillStyle(0xcc0000, 1);
      this._onActionPress();
    });
    this._actionBtn.on('pointerup',  () => this._actionBtn.setFillStyle(0x8b0000, 0.85));
    this._actionBtn.on('pointerout', () => this._actionBtn.setFillStyle(0x8b0000, 0.85));

    // Secondary button (B)
    const bbX = WIDTH - 110, bbY = controlH - 35;
    this._secBtn = this.add.circle(bbX, bbY, 18, 0x1a3a8a, 0.8)
      .setScrollFactor(0).setDepth(200).setInteractive();
    this.add.text(bbX, bbY, '▶', {
      fontSize: '12px', fontFamily: 'monospace', color: '#4488ff',
    }).setScrollFactor(0).setDepth(201).setOrigin(0.5);
    this._secBtn.on('pointerdown', () => this._onSecPress());

    // Play call button
    this._playCallBtn = this.add.rectangle(WIDTH/2, controlH - 20, 120, 30, 0x1a1a3a, 0.9)
      .setScrollFactor(0).setDepth(200).setInteractive();
    this._playCallBtn.setStrokeStyle(1, 0x4488ff);
    this._playCallBtnLabel = this.add.text(WIDTH/2, controlH - 20, '▶ PLAY CALL', {
      fontSize: '11px', fontFamily: 'monospace', color: '#aaddff',
    }).setScrollFactor(0).setDepth(201).setOrigin(0.5);
    this._playCallBtn.on('pointerdown', () => this._openPlayCall());
  }

  _onActionPress() {
    const { gs } = this;
    if (gs.phase === 'PRE_SNAP') { this._snap(); return; }
    if (gs.phase === 'PLAYING')  { this._playerAction(); }
  }

  _onSecPress() {
    const { gs } = this;
    if (gs.phase === 'PRE_SNAP') this._snap();
  }

  // ─── GAME FLOW ────────────────────────────────────────────────────────────
  _showCoinToss() {
    const { WIDTH, HEIGHT } = CFG;
    const panel = this.add.image(WIDTH/2, HEIGHT/2, 'panel_md').setScrollFactor(0).setDepth(150);
    const title = this.add.text(WIDTH/2, HEIGHT/2 - 80, 'COIN TOSS', {
      fontSize: '22px', fontFamily: 'monospace', color: '#ffd700',
    }).setScrollFactor(0).setDepth(151).setOrigin(0.5);

    const coin = this.add.text(WIDTH/2, HEIGHT/2 - 20, '🪙', {
      fontSize: '36px',
    }).setScrollFactor(0).setDepth(151).setOrigin(0.5);
    this.tweens.add({ targets: coin, scaleX: 0, duration: 300, yoyo: true, repeat: -1 });

    const prompt = this.add.text(WIDTH/2, HEIGHT/2 + 30, 'CALL THE TOSS:', {
      fontSize: '14px', fontFamily: 'monospace', color: '#ffffff',
    }).setScrollFactor(0).setDepth(151).setOrigin(0.5);

    const headsBtn = this.add.image(WIDTH/2 - 55, HEIGHT/2 + 70, 'btn_small').setScrollFactor(0).setDepth(151).setInteractive();
    this.add.text(WIDTH/2 - 55, HEIGHT/2 + 70, 'HEADS', {
      fontSize: '13px', fontFamily: 'monospace', color: '#ffd700',
    }).setScrollFactor(0).setDepth(152).setOrigin(0.5);

    const tailsBtn = this.add.image(WIDTH/2 + 55, HEIGHT/2 + 70, 'btn_small').setScrollFactor(0).setDepth(151).setInteractive();
    this.add.text(WIDTH/2 + 55, HEIGHT/2 + 70, 'TAILS', {
      fontSize: '13px', fontFamily: 'monospace', color: '#c8c8c8',
    }).setScrollFactor(0).setDepth(152).setOrigin(0.5);

    const resolve = (call) => {
      const flip = Math.random() < 0.5 ? 'HEADS' : 'TAILS';
      const won = flip === call;
      [panel, title, coin, prompt, headsBtn, tailsBtn].forEach(o => o.destroy());
      this._showToast(won ? `${flip}! YOU WIN!\nChoose: Receive or Kick?` : `${flip}! CPU wins!\nYou kick off!`, 2000);
      if (won) {
        this._showReceiveOrKick();
      } else {
        this.gs.possession = 1 - this.gs.playerTeamIdx;
        this._startKickoff();
      }
    };
    headsBtn.on('pointerdown', () => resolve('HEADS'));
    tailsBtn.on('pointerdown', () => resolve('TAILS'));
  }

  _showReceiveOrKick() {
    const { WIDTH, HEIGHT } = CFG;
    const panel = this.add.image(WIDTH/2, HEIGHT/2, 'panel_sm').setScrollFactor(0).setDepth(150);
    const title = this.add.text(WIDTH/2, HEIGHT/2 - 40, 'YOU WON THE TOSS', {
      fontSize: '14px', fontFamily: 'monospace', color: '#ffd700',
    }).setScrollFactor(0).setDepth(151).setOrigin(0.5);

    const recvBtn = this.add.image(WIDTH/2 - 55, HEIGHT/2 + 10, 'btn_small').setScrollFactor(0).setDepth(151).setInteractive();
    this.add.text(WIDTH/2 - 55, HEIGHT/2 + 10, 'RECEIVE', {
      fontSize: '11px', fontFamily: 'monospace', color: '#00ff88',
    }).setScrollFactor(0).setDepth(152).setOrigin(0.5);

    const kickBtn = this.add.image(WIDTH/2 + 55, HEIGHT/2 + 10, 'btn_small').setScrollFactor(0).setDepth(151).setInteractive();
    this.add.text(WIDTH/2 + 55, HEIGHT/2 + 10, 'KICK', {
      fontSize: '11px', fontFamily: 'monospace', color: '#ffcc44',
    }).setScrollFactor(0).setDepth(152).setOrigin(0.5);

    const cleanup = () => [panel, title, recvBtn, kickBtn].forEach(o => o.destroy());

    recvBtn.on('pointerdown', () => {
      cleanup();
      this.gs.possession = this.gs.playerTeamIdx;
      this.gs.ballYard = 25;
      this._updateFieldMarkers();
      this._setUpFormation();
      this._startPlayCall();
    });
    kickBtn.on('pointerdown', () => {
      cleanup();
      this.gs.possession = 1 - this.gs.playerTeamIdx;
      this._startKickoff();
    });
  }

  _startKickoff() {
    const kickingTeam = this.gs.teams[1 - this.gs.possession];
    const returnYard  = this.ai.resolveKickoff(kickingTeam);
    this.gs.ballYard  = returnYard;
    this.gs.down = 1;
    this.gs.yardsToGo = 10;
    this.gs.firstDownYard = Math.min(100, returnYard + 10);
    this._showToast(`KICKOFF → Ball at ${returnYard} yard line`, 1500);
    this.time.delayedCall(1600, () => {
      this._updateFieldMarkers();
      this._setUpFormation();
      this._panCameraToball(() => this._startPlayCall());
    });
  }

  _startPlayCall() {
    this.gs.phase = 'PLAY_CALL';
    this._updateHUD();
    const isPlayerOffense = this.gs.playerTeamIdx === this.gs.possession;
    if (isPlayerOffense) {
      this._openPlayCall();
    } else {
      this.gs.selectedOffPlay = this.ai.chooseOffensePlay();
      this.gs.selectedDefPlay = null;
      this._openDefPlayCall();
    }
  }

  _openPlayCall() {
    if (this.gs.phase !== 'PLAY_CALL') return;
    this.scene.launch('PlayCallScene', {
      gs: this.gs,
      mode: 'OFFENSE',
      onSelect: (play) => {
        this.gs.selectedOffPlay = play;
        const cpuDefPlay = this.ai.chooseDefensePlay(play);
        this.gs.selectedDefPlay = cpuDefPlay;
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
    this._showToast(`${this.gs.selectedOffPlay?.name || 'Play'} vs ${this.gs.selectedDefPlay?.name || 'Defense'}`, 1200);
    this._playCallBtnLabel.setText('● SNAP');
    this._playCallBtn.on('pointerdown', () => this._snap());
  }

  _snap() {
    if (this.gs.phase !== 'PRE_SNAP') return;
    this.gs.phase = 'PLAYING';
    this._updateHUD();
    this._playCallBtnLabel.setText('▶ PLAY CALL');
    this._playCallBtn.off('pointerdown');
    this._playCallBtn.on('pointerdown', () => {});
    this._executePlay();
  }

  _executePlay() {
    const { gs, ai, rs } = this;
    const offTeam = gs.offenseTeam;
    const defTeam = gs.defenseTeam;
    const offPlay = gs.selectedOffPlay;
    const defPlay = gs.selectedDefPlay;

    // Animate players
    this._animatePlayMotion(offPlay, () => {
      const outcome = ai.resolvePlay(offPlay, defPlay, offTeam, defTeam);

      // Auto-rotations
      const rotA = rs.autoRotate(0);
      const rotB = rs.autoRotate(1);

      this._showPlayResult(outcome, rotA.concat(rotB));
    });
  }

  _animatePlayMotion(offPlay, onDone) {
    const sprites = Object.values(this.playerSprites);
    const isRun  = offPlay?.type === 'RUN';
    const isPass = offPlay?.type === 'PASS';
    const ballX  = yardToX(this.gs.ballYard);
    const cy     = CFG.FIELD_WORLD_H / 2;

    const dir = this.gs.possession === 0 ? 1 : -1;

    sprites.forEach((s, i) => {
      if (!s?.active) return;
      let tx = s.x, ty = s.y;
      if (isRun) {
        tx = s.x + dir * (30 + Math.random() * 30);
        ty = s.y + (Math.random() - 0.5) * 20;
      } else if (isPass) {
        const key = Object.keys(this.playerSprites)[i];
        if (key?.startsWith('off_WR') || key?.startsWith('off_TE')) {
          tx = s.x + dir * (60 + Math.random() * 60);
          ty = s.y + (Math.random() - 0.5) * 60;
        } else if (key?.startsWith('off_QB')) {
          tx = s.x + dir * 5;
          ty = s.y + 5;
        } else if (key?.startsWith('def_CB') || key?.startsWith('def_FS') || key?.startsWith('def_SS')) {
          tx = s.x - dir * 20;
          ty = s.y + (Math.random() - 0.5) * 40;
        } else if (key?.startsWith('def_DE') || key?.startsWith('def_DT')) {
          tx = s.x + dir * 15;
        }
      }
      this.tweens.add({ targets: s, x: tx, y: ty, duration: 500, ease: 'Power1' });
    });

    // Ball animation
    if (isPass) {
      const targetX = ballX + dir * (80 + Math.random() * 100);
      const arc = [{ x: ballX + dir * 40, y: cy - 60 }, { x: targetX, y: cy }];
      this.tweens.add({
        targets: this.ballSprite,
        x: targetX, y: cy,
        duration: 500,
        ease: 'Sine.easeOut',
      });
    } else if (isRun) {
      this.tweens.add({
        targets: this.ballSprite,
        x: ballX + dir * 30, y: cy,
        duration: 400,
      });
    }

    this.time.delayedCall(700, onDone);
  }

  _playerAction() {
    if (!this._controlledSprite) return;
    const gs = this.gs;
    const isOffense = gs.playerTeamIdx === gs.possession;
    if (isOffense && gs.selectedOffPlay?.type === 'PASS') {
      this._showToast('Pass away!', 500);
    } else if (!isOffense) {
      this._showToast('Dive tackle!', 500);
    }
  }

  _showPlayResult(outcome, rotations) {
    const { WIDTH, HEIGHT } = CFG;
    const gs = this.gs;

    gs.phase = 'RESULT';
    this._updateHUD();

    // Determine down result
    let downResult = null;
    if (!outcome.isTurnover && outcome.result !== 'INCOMPLETE' &&
        outcome.result !== 'FG_GOOD' && outcome.result !== 'FG_MISS' && outcome.result !== 'PUNT') {
      downResult = gs.nextDown(outcome.yards);
    }

    if (outcome.result === 'FG_GOOD') {
      gs.scorePoints(gs.possession, 3);
      gs.stats[gs.possession].fgMade++;
    }
    if (outcome.result === 'PUNT') {
      gs.stats[gs.possession].punts++;
    }

    // Show result panel
    const panelY = HEIGHT - 140;
    const panel = this.add.image(WIDTH/2, panelY, 'panel_md').setScrollFactor(0).setDepth(150);

    const narrativeText = this.add.text(WIDTH/2, panelY - 60, outcome.narrative || 'Play complete', {
      fontSize: '13px', fontFamily: 'monospace', color: '#ffffff',
      align: 'center', wordWrap: { width: 280 },
    }).setScrollFactor(0).setDepth(151).setOrigin(0.5);

    let resultLine = '';
    let resultColor = '#aaddff';
    if (downResult === 'TOUCHDOWN') {
      resultLine = '🏈 TOUCHDOWN! +6 pts! Extra Point?';
      resultColor = '#ffd700';
      gs.scorePoints(gs.possession, 6);
      gs.stats[gs.possession].tds++;
    } else if (downResult === 'FIRST_DOWN') {
      resultLine = 'FIRST DOWN!';
      resultColor = '#00ff88';
    } else if (downResult === 'TURNOVER_ON_DOWNS') {
      resultLine = 'TURNOVER ON DOWNS';
      resultColor = '#ff4444';
    } else if (outcome.result === 'TURNOVER') {
      resultLine = 'TURNOVER!';
      resultColor = '#ff4444';
      gs.stats[1 - gs.possession].turnovers++;
    } else if (outcome.result === 'FG_GOOD') {
      resultLine = 'FIELD GOAL GOOD! +3 pts';
      resultColor = '#ffd700';
    } else if (outcome.result === 'FG_MISS') {
      resultLine = 'Field Goal No Good';
      resultColor = '#ff8888';
    } else if (outcome.result === 'PUNT') {
      resultLine = `Punt - ${outcome.yards} yards`;
      resultColor = '#aaaacc';
    } else if (outcome.result === 'INCOMPLETE') {
      resultLine = 'Incomplete Pass';
      resultColor = '#888888';
    } else if (outcome.yards > 0) {
      resultLine = `+${outcome.yards} yards → ${gs.downString()}`;
      resultColor = '#aaddff';
    } else if (outcome.yards < 0) {
      resultLine = `${outcome.yards} yards → ${gs.downString()}`;
      resultColor = '#ff8888';
    } else {
      resultLine = `No gain → ${gs.downString()}`;
    }

    this.add.text(WIDTH/2, panelY - 30, resultLine, {
      fontSize: '14px', fontFamily: 'monospace', color: resultColor,
    }).setScrollFactor(0).setDepth(151).setOrigin(0.5);

    // Rotations
    if (rotations.length > 0) {
      const rotText = rotations.slice(0,2).map(r => `↔ ${r.out} → ${r.in}`).join('\n');
      this.add.text(WIDTH/2, panelY + 5, rotText, {
        fontSize: '9px', fontFamily: 'monospace', color: '#888888',
      }).setScrollFactor(0).setDepth(151).setOrigin(0.5);
    }

    // Continue button
    const continueBtn = this.add.image(WIDTH/2, panelY + 65, 'btn_neutral')
      .setScrollFactor(0).setDepth(151).setInteractive({ useHandCursor: true });
    const continueLbl = this.add.text(WIDTH/2, panelY + 65, 'CONTINUE  ▶', {
      fontSize: '14px', fontFamily: 'monospace', color: '#aaddff',
    }).setScrollFactor(0).setDepth(152).setOrigin(0.5);

    const cleanup = [panel, narrativeText, continueBtn, continueLbl];

    // TD extra point
    if (downResult === 'TOUCHDOWN') {
      const epBtn = this.add.image(WIDTH/2, panelY + 95, 'btn_small')
        .setScrollFactor(0).setDepth(151).setInteractive({ useHandCursor: true });
      this.add.text(WIDTH/2, panelY + 95, '+1 PAT', {
        fontSize: '11px', fontFamily: 'monospace', color: '#ffd700',
      }).setScrollFactor(0).setDepth(152).setOrigin(0.5);
      cleanup.push(epBtn);
    }

    continueBtn.on('pointerdown', () => {
      cleanup.forEach(o => o?.destroy());
      this._advanceAfterPlay(outcome, downResult);
    });
  }

  _advanceAfterPlay(outcome, downResult) {
    const { gs } = this;

    // Advance clock
    gs.clock = Math.max(0, gs.clock - (10 + Math.floor(Math.random() * 15)));

    if (gs.clock <= 0) {
      if (gs.quarter < 4) {
        gs.nextQuarter();
        if (gs.quarter === 3) {
          this._showHalftime();
          return;
        }
      } else {
        this._showGameOver();
        return;
      }
    }

    const needsPossessionChange =
      downResult === 'TURNOVER_ON_DOWNS' || outcome.isTurnover ||
      outcome.result === 'FG_GOOD' || outcome.result === 'FG_MISS' || outcome.result === 'PUNT';

    if (needsPossessionChange) {
      if (outcome.result === 'PUNT') {
        const puntYard = Math.max(0, Math.min(95, 100 - gs.ballYard - outcome.yards));
        gs.changePossession(puntYard);
      } else if (outcome.result === 'FG_GOOD' || outcome.result === 'FG_MISS') {
        gs.changePossession(25);
      } else {
        gs.changePossession();
      }
    }

    if (downResult === 'TOUCHDOWN') {
      gs.scorePoints(gs.possession, 1); // PAT auto-succeed
      if (outcome.result !== 'TURNOVER') gs.changePossession(25);
    }

    this._updateHUD();
    this._updateFieldMarkers();
    this._setUpFormation();
    this._panCameraToball(() => this._startPlayCall());
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

  // ─── UTILITY ─────────────────────────────────────────────────────────────
  _showToast(msg, duration) {
    const { WIDTH } = CFG;
    const toast = this.add.text(WIDTH/2, 110, msg, {
      fontSize: '13px', fontFamily: 'monospace', color: '#ffffff',
      stroke: '#000000', strokeThickness: 3, align: 'center',
    }).setScrollFactor(0).setDepth(180).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: toast, alpha: 1, duration: 150 });
    this.time.delayedCall(duration - 200, () => {
      this.tweens.add({ targets: toast, alpha: 0, duration: 200, onComplete: () => toast.destroy() });
    });
  }

  // ─── UPDATE LOOP ─────────────────────────────────────────────────────────
  update(time, delta) {
    if (this.gs.phase !== 'PLAYING' && this.gs.phase !== 'PRE_SNAP') return;

    const controlled = this._controlledSprite;
    if (!controlled || !controlled.active) return;

    const speed = 2.5;
    let mx = 0, my = 0;
    if (this._dpad.left)  mx = -speed;
    if (this._dpad.right) mx =  speed;
    if (this._dpad.up)    my = -speed;
    if (this._dpad.down)  my =  speed;

    if (mx !== 0 || my !== 0) {
      controlled.x = Phaser.Math.Clamp(controlled.x + mx, 20, CFG.FIELD_WORLD_W - 20);
      controlled.y = Phaser.Math.Clamp(controlled.y + my, 55, CFG.FIELD_WORLD_H - 55);
      this._updatePlayerLabel(controlled);
      this.cameras.main.scrollX = controlled.x - CFG.WIDTH / 2;
      this.cameras.main.scrollY = 0;
    }

    // Smooth camera pan to controlled player
    if (controlled && (mx || my)) {
      const targetX = controlled.x - CFG.WIDTH / 2;
      this.cameras.main.scrollX = Phaser.Math.Linear(this.cameras.main.scrollX, targetX, 0.1);
    }
  }
}
