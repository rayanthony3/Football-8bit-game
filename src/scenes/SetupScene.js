import { CFG } from '../config.js';
import { GameState } from '../systems/GameState.js';
import { createAllTeams, getOverall, getTeamStars, starsStr } from '../data/teams.js';
import { drawStatBar, statColor } from '../graphics/Sprites.js';

export class SetupScene extends Phaser.Scene {
  constructor() { super({ key: 'SetupScene' }); }

  create() {
    this.allTeams    = createAllTeams();
    this.selectedMode = 'COACH';
    this.homeIdx     = 0;   // "your" team
    this.awayIdx     = 1;   // opponent
    this.selectedPos = 'QB';
    this._group      = [];

    this._buildBG();
    this._showModeSelect();
    this.cameras.main.fadeIn(300);
  }

  _buildBG() {
    const { WIDTH, HEIGHT } = CFG;
    this.add.rectangle(WIDTH/2, HEIGHT/2, WIDTH, HEIGHT, CFG.COLORS.SKY);
    for (let x = 0; x < WIDTH; x += 32) this.add.rectangle(x, HEIGHT/2, 1, HEIGHT, 0x1a2a4a, 0.25);
    for (let y = 0; y < HEIGHT; y += 32) this.add.rectangle(WIDTH/2, y, WIDTH, 1, 0x1a2a4a, 0.25);
    this.add.text(WIDTH/2, 22, 'GRIDIRON 8-BIT', {
      fontSize:'18px', fontFamily:'monospace', color:'#ffd700',
      stroke:'#000000', strokeThickness:3,
    }).setOrigin(0.5);
  }

  _clear() { this._group.forEach(o => o?.destroy()); this._group = []; }
  _add(obj) {
    if (Array.isArray(obj)) this._group.push(...obj.flat());
    else this._group.push(obj);
    return obj;
  }

  // ─── STEP 1: Mode select ─────────────────────────────────────────────────
  _showModeSelect() {
    this._clear();
    const { WIDTH, HEIGHT } = CFG;

    this._add(this.add.text(WIDTH/2, 58, 'CHOOSE GAME MODE', {
      fontSize:'20px', fontFamily:'monospace', color:'#ffffff',
      stroke:'#000000', strokeThickness:3,
    }).setOrigin(0.5));

    const modes = [
      { id:'SIM',    label:'SIMULATE', sub:'Full CPU — spectate',
        detail:'Both teams CPU-controlled. Watch a full game unfold.', color:0x220022, border:0xaa44ff },
      { id:'COACH',  label:'COACH',    sub:'Call plays, CPU executes',
        detail:'Select plays from your playbook. CPU players run them.', color:0x001a44, border:0x4488ff },
      { id:'PLAYER', label:'PLAYER',   sub:'Control your player',
        detail:'Pick a position and control that player on every snap.', color:0x004422, border:0x00ff88 },
    ];

    modes.forEach((m, i) => {
      const cx = WIDTH/2 + (i-1) * 234;
      const cy = HEIGHT/2 - 20;
      const isSel = this.selectedMode === m.id;
      const cw = 214, ch = 200;

      const card = this._add(this.add.rectangle(cx, cy, cw, ch, m.color, 0.9));
      card.setStrokeStyle(isSel ? 3 : 1, isSel ? m.border : 0x334466);
      card.setInteractive({ useHandCursor:true });

      this._add(this.add.text(cx, cy - ch/2 + 22, m.label, {
        fontSize:'18px', fontFamily:'monospace', fontStyle:'bold',
        color:'#'+m.border.toString(16).padStart(6,'0'), stroke:'#000',strokeThickness:2,
      }).setOrigin(0.5));
      this._add(this.add.text(cx, cy - ch/2 + 44, m.sub, {
        fontSize:'9px', fontFamily:'monospace', color:'#aaaacc', align:'center', wordWrap:{width:cw-20},
      }).setOrigin(0.5));
      this._add(this.add.text(cx, cy + 8, m.detail, {
        fontSize:'9px', fontFamily:'monospace', color:'#888899', align:'center', wordWrap:{width:cw-24},
      }).setOrigin(0.5));
      if (isSel) this._add(this.add.text(cx, cy + ch/2 - 16, '▼ SELECTED ▼', {
        fontSize:'10px', fontFamily:'monospace', color:'#'+m.border.toString(16).padStart(6,'0'),
      }).setOrigin(0.5));

      card.on('pointerdown', () => { this.selectedMode = m.id; this._showModeSelect(); });
      card.on('pointerover', () => card.setStrokeStyle(3, m.border));
      card.on('pointerout',  () => card.setStrokeStyle(isSel?3:1, isSel?m.border:0x334466));
    });

    const next = this._add(this.add.image(WIDTH/2, HEIGHT-42, 'btn_primary').setInteractive({useHandCursor:true}));
    this._add(this.add.text(WIDTH/2, HEIGHT-42, 'SELECT TEAMS  ▶', {
      fontSize:'14px', fontFamily:'monospace', color:'#ffd700',
    }).setOrigin(0.5));
    next.on('pointerdown', () => this._showTeamSelect('home'));

    const back = this._add(this.add.image(70, HEIGHT-42, 'btn_small').setInteractive({useHandCursor:true}));
    this._add(this.add.text(70, HEIGHT-42, '◀ BACK', {
      fontSize:'12px', fontFamily:'monospace', color:'#aaddff',
    }).setOrigin(0.5));
    back.on('pointerdown', () => {
      this.cameras.main.fadeOut(200,0,0,0);
      this.time.delayedCall(200, () => this.scene.start('MenuScene'));
    });
  }

  // ─── STEP 2: Team select (phase = 'home' | 'away') ───────────────────────
  _showTeamSelect(phase) {
    this._clear();
    const { WIDTH, HEIGHT } = CFG;
    const isHome = phase === 'home';
    const modeLabel = this.selectedMode === 'SIM' ? (isHome ? 'HOME TEAM' : 'AWAY TEAM')
                                                   : (isHome ? 'YOUR TEAM' : 'OPPONENT');

    this._add(this.add.text(WIDTH/2, 44, `SELECT ${modeLabel}`, {
      fontSize:'18px', fontFamily:'monospace', color:'#ffffff',
      stroke:'#000',strokeThickness:3,
    }).setOrigin(0.5));

    // If selecting away team, show chosen home team at top
    if (!isHome) {
      const ht = this.allTeams[this.homeIdx];
      const ts = getTeamStars(ht);
      this._add(this.add.text(22, 64, `YOUR TEAM:`, {
        fontSize:'9px', fontFamily:'monospace', color:'#666688',
      }));
      this._add(this.add.rectangle(90, 68, 10, 14, ht.primary));
      this._add(this.add.text(98, 64, `${ht.abbr}  ${ht.name}  ${starsStr(ts.overall)}`, {
        fontSize:'10px', fontFamily:'monospace',
        color:'#'+ht.secondary.toString(16).padStart(6,'0'),
      }));
    }

    const listTop  = isHome ? 62 : 82;
    const rowH     = 36;
    const listLeft = 10;

    this.allTeams.forEach((team, idx) => {
      const isSelected = isHome ? (idx === this.homeIdx) : (idx === this.awayIdx);
      const isHome2    = idx === this.homeIdx;
      const ry = listTop + idx * rowH;
      const ts = getTeamStars(team);

      // Row bg
      const rowBg = this._add(this.add.rectangle(WIDTH/2, ry + rowH/2, WIDTH - 20, rowH - 2,
        isSelected ? team.primary : 0x111122, isSelected ? 0.9 : 0.7));
      rowBg.setStrokeStyle(isSelected ? 2 : 1, isSelected ? team.secondary : 0x222244);

      // Color stripe
      this._add(this.add.rectangle(listLeft + 6, ry + rowH/2, 10, rowH - 4, team.primary));

      // Abbr
      this._add(this.add.text(listLeft + 22, ry + rowH/2, team.abbr, {
        fontSize:'11px', fontFamily:'monospace', fontStyle:'bold',
        color:'#'+team.secondary.toString(16).padStart(6,'0'),
      }).setOrigin(0, 0.5));

      // Name + city
      this._add(this.add.text(listLeft + 68, ry + rowH/2 - 5, team.name, {
        fontSize:'10px', fontFamily:'monospace', color:'#ffffff',
      }).setOrigin(0, 0.5));
      this._add(this.add.text(listLeft + 68, ry + rowH/2 + 7, team.city, {
        fontSize:'8px', fontFamily:'monospace', color:'#666688',
      }).setOrigin(0, 0.5));

      // Team stars
      this._add(this.add.text(listLeft + 230, ry + rowH/2, starsStr(ts.overall), {
        fontSize:'12px', fontFamily:'monospace',
        color: ts.overall >= 4 ? '#ffd700' : ts.overall >= 3 ? '#00ff88' : '#888888',
      }).setOrigin(0, 0.5));

      // Off / Def breakdown
      this._add(this.add.text(listLeft + 315, ry + rowH/2 - 5, `Off ${starsStr(Math.round(ts.off))}`, {
        fontSize:'8px', fontFamily:'monospace', color:'#4488ff',
      }).setOrigin(0, 0.5));
      this._add(this.add.text(listLeft + 315, ry + rowH/2 + 6, `Def ${starsStr(Math.round(ts.def))}`, {
        fontSize:'8px', fontFamily:'monospace', color:'#ff4444',
      }).setOrigin(0, 0.5));

      // ST tag
      this._add(this.add.text(listLeft + 465, ry + rowH/2, `ST ${starsStr(Math.round(ts.st))}`, {
        fontSize:'8px', fontFamily:'monospace', color:'#ffcc44',
      }).setOrigin(0, 0.5));

      // YOU / OPPONENT badge
      if (!isHome && isHome2) {
        this._add(this.add.text(WIDTH - 90, ry + rowH/2, 'YOU', {
          fontSize:'9px', fontFamily:'monospace', color:'#ffd700',
        }).setOrigin(0.5));
      } else if (isSelected) {
        this._add(this.add.text(WIDTH - 90, ry + rowH/2, '✓ PICK', {
          fontSize:'9px', fontFamily:'monospace', color:'#'+team.secondary.toString(16).padStart(6,'0'),
        }).setOrigin(0.5));
      }

      // Make interactive (disable the already-selected home team when picking away)
      if (isHome || idx !== this.homeIdx) {
        const hitZone = this._add(this.add.rectangle(WIDTH/2, ry + rowH/2, WIDTH - 20, rowH - 2, 0x000000, 0)
          .setInteractive({useHandCursor:true}));
        hitZone.on('pointerdown', () => {
          if (isHome) { this.homeIdx = idx; this._showTeamSelect('home'); }
          else { this.awayIdx = idx; this._showTeamSelect('away'); }
        });
        hitZone.on('pointerover', () => rowBg.setStrokeStyle(2, team.secondary));
        hitZone.on('pointerout',  () => rowBg.setStrokeStyle(isSelected?2:1, isSelected?team.secondary:0x222244));
      }
    });

    // Buttons
    const nextLabel = (!isHome && this.selectedMode === 'PLAYER') ? 'SELECT POSITION  ▶' : 'START GAME  ▶';
    const next = this._add(this.add.image(WIDTH/2 + 50, HEIGHT - 10, 'btn_primary').setInteractive({useHandCursor:true}));
    this._add(this.add.text(WIDTH/2 + 50, HEIGHT - 10, nextLabel, {
      fontSize:'13px', fontFamily:'monospace', color:'#ffd700',
    }).setOrigin(0.5));
    next.on('pointerdown', () => {
      if (isHome) { this._showTeamSelect('away'); return; }
      if (this.homeIdx === this.awayIdx) {
        // Auto-pick different away team
        this.awayIdx = this.homeIdx === 0 ? 1 : 0;
      }
      if (this.selectedMode === 'PLAYER') { this._showPositionSelect(); return; }
      this._startGame();
    });

    const back = this._add(this.add.image(70, HEIGHT - 10, 'btn_small').setInteractive({useHandCursor:true}));
    this._add(this.add.text(70, HEIGHT - 10, '◀ BACK', {
      fontSize:'12px', fontFamily:'monospace', color:'#aaddff',
    }).setOrigin(0.5));
    back.on('pointerdown', () => {
      if (isHome) this._showModeSelect();
      else this._showTeamSelect('home');
    });
  }

  // ─── STEP 3: Position select (PLAYER mode only) ───────────────────────────
  _showPositionSelect() {
    this._clear();
    const { WIDTH, HEIGHT } = CFG;
    const team = this.allTeams[this.homeIdx];

    this._add(this.add.text(WIDTH/2, 50, 'CHOOSE YOUR POSITION', {
      fontSize:'18px', fontFamily:'monospace', color:'#ffffff',
      stroke:'#000',strokeThickness:3,
    }).setOrigin(0.5));
    this._add(this.add.text(WIDTH/2, 72, `${team.name}`, {
      fontSize:'10px', fontFamily:'monospace',
      color:'#'+team.secondary.toString(16).padStart(6,'0'),
    }).setOrigin(0.5));

    const posGroups = [
      { label:'── OFFENSE ──', positions:['QB','RB','FB','WR','TE','LT','LG','C','RG','RT'] },
      { label:'── DEFENSE ──', positions:['DE','DT','MLB','OLB','CB','FS','SS'] },
      { label:'── ST ──',      positions:['K','P'] },
    ];

    let gx = 52, gy = 88;
    for (const group of posGroups) {
      this._add(this.add.text(gx, gy, group.label, {
        fontSize:'9px', fontFamily:'monospace', color:'#666688',
      }));
      gy += 14;
      let col = 0;
      for (const pos of group.positions) {
        const px = gx + col * 68, py = gy;
        const isSel = pos === this.selectedPos;
        const best  = team.roster.filter(p => p.pos === pos).sort((a,b) => getOverall(b)-getOverall(a))[0];
        const ovr   = best ? getOverall(best) : 5;
        const { getStars: gs2 } = { getStars: (o) => o >= 9?5:o>=7?4:o>=5?3:o>=3?2:1 };
        const stars = gs2(ovr);

        const btn = this._add(this.add.rectangle(px+30, py+18, 62, 32, isSel?team.primary:0x1e1e2e, 0.9));
        btn.setStrokeStyle(2, isSel?team.secondary:0x334477);
        btn.setInteractive({useHandCursor:true});

        this._add(this.add.text(px+30, py+12, pos, {
          fontSize:'12px', fontFamily:'monospace',
          color: isSel?'#'+team.secondary.toString(16).padStart(6,'0'):'#aaaacc',
        }).setOrigin(0.5));
        this._add(this.add.text(px+30, py+24, starsStr(stars), {
          fontSize:'8px', fontFamily:'monospace',
          color: stars>=4?'#ffd700':stars>=3?'#00ff88':'#888888',
        }).setOrigin(0.5));

        btn.on('pointerdown', () => { this.selectedPos = pos; this._showPositionSelect(); });
        btn.on('pointerover', () => btn.setStrokeStyle(2, 0xffd700));
        btn.on('pointerout',  () => btn.setStrokeStyle(2, isSel?team.secondary:0x334477));

        col++;
        if (col >= 5) { col = 0; gy += 40; }
      }
      if (col > 0) gy += 40;
      gy += 8;
    }

    // Starter detail panel
    const best = team.roster.filter(p => p.pos === this.selectedPos)
      .sort((a,b) => getOverall(b)-getOverall(a))[0];
    if (best) {
      const dx = WIDTH - 135, dy = 180;
      this._add(this.add.image(dx, dy, 'panel_sm'));
      const ovr = getOverall(best);
      const stars = ovr>=9?5:ovr>=7?4:ovr>=5?3:ovr>=3?2:1;
      this._add(this.add.text(dx, dy-42, this.selectedPos+' STARTER', {fontSize:'10px',fontFamily:'monospace',color:'#ffd700'}).setOrigin(0.5));
      this._add(this.add.text(dx, dy-28, best.name, {fontSize:'11px',fontFamily:'monospace',color:'#ffffff'}).setOrigin(0.5));
      this._add(this.add.text(dx, dy-14, starsStr(stars), {
        fontSize:'12px', fontFamily:'monospace',
        color: stars>=4?'#ffd700':stars>=3?'#00ff88':'#888888',
      }).setOrigin(0.5));
      Object.entries(best.stats).slice(0,5).forEach(([key,val],i) => {
        const sy = dy + 4 + i * 17;
        this._add(this.add.text(dx-54, sy, CFG.STAT_LABELS[key]||key, {fontSize:'8px',fontFamily:'monospace',color:'#888888'}));
        this._add(this.add.text(dx+56, sy+2, `${val}`, {fontSize:'8px',fontFamily:'monospace',color:'#'+statColor(val).toString(16).padStart(6,'0')}).setOrigin(1,0));
        this._add(drawStatBar(this, dx-56, sy+3, val, 10, statColor(val), 76));
      });
    }

    const next = this._add(this.add.image(WIDTH/2+50, HEIGHT-42, 'btn_primary').setInteractive({useHandCursor:true}));
    this._add(this.add.text(WIDTH/2+50, HEIGHT-42, 'START GAME  ▶', {
      fontSize:'14px', fontFamily:'monospace', color:'#ffd700',
    }).setOrigin(0.5));
    next.on('pointerdown', () => this._startGame());

    const back = this._add(this.add.image(70, HEIGHT-42, 'btn_small').setInteractive({useHandCursor:true}));
    this._add(this.add.text(70, HEIGHT-42, '◀ BACK', {fontSize:'12px',fontFamily:'monospace',color:'#aaddff'}).setOrigin(0.5));
    back.on('pointerdown', () => this._showTeamSelect('away'));
  }

  // ─── Launch game ─────────────────────────────────────────────────────────
  _startGame() {
    const home = this.allTeams[this.homeIdx];
    const away = this.awayIdx === this.homeIdx
      ? this.allTeams[this.homeIdx === 0 ? 1 : 0]
      : this.allTeams[this.awayIdx];

    // Reset game state on selected teams
    home.score = 0; home.timeoutsLeft = 3;
    away.score = 0; away.timeoutsLeft = 3;

    const gs = new GameState(home, away);
    gs.playerTeamIdx = 0;   // home team is always "player's" team
    gs.playerPos     = this.selectedPos;
    gs.gameMode      = this.selectedMode;

    this.cameras.main.fadeOut(300,0,0,0);
    this.time.delayedCall(300, () => this.scene.start('GameScene', { gs }));
  }
}
