import { CFG } from '../config.js';

// ─── Player sprite (2.5D elevated 3/4 view) ──────────────────────────────
export function drawPlayerSprite(g, primary, secondary, isControlled, isBallCarrier) {
  const W = CFG.PLAYER_W, H = CFG.PLAYER_H;

  // ── Ground shadow ─────────────────────────────────────────────────────────
  g.fillStyle(0x000000, 0.22);
  g.fillEllipse(1, H * 0.53, W * 1.45, H * 0.10);

  // ── BACK LEG (far = smaller for depth) ───────────────────────────────────
  g.fillStyle(secondary);
  g.fillRoundedRect(-W * 0.29, H * 0.16, W * 0.23, H * 0.30, 4);
  // pant stripe
  g.fillStyle(primary, 0.50);
  g.fillRect(-W * 0.29, H * 0.26, W * 0.23, H * 0.06);
  // back cleat
  g.fillStyle(0x111111);
  g.fillRoundedRect(-W * 0.31, H * 0.44, W * 0.26, H * 0.07, 2);

  // ── FRONT LEG (near = larger for depth) ──────────────────────────────────
  g.fillStyle(secondary);
  g.fillRoundedRect(W * 0.06, H * 0.13, W * 0.27, H * 0.34, 4);
  // pant stripe
  g.fillStyle(primary, 0.50);
  g.fillRect(W * 0.06, H * 0.23, W * 0.27, H * 0.06);
  // front sock
  g.fillStyle(0xdddddd);
  g.fillRect(W * 0.06, H * 0.40, W * 0.27, H * 0.07);
  // front cleat
  g.fillStyle(0x111111);
  g.fillRoundedRect(W * 0.04, H * 0.45, W * 0.30, H * 0.07, 2);

  // ── SHOULDER PADS (wide, 2.5D volume) ────────────────────────────────────
  g.fillStyle(primary);
  g.fillRoundedRect(-W * 0.54, -H * 0.26, W * 1.08, H * 0.18, 7);
  // pad top highlight
  g.fillStyle(0xffffff, 0.10);
  g.fillRoundedRect(-W * 0.52, -H * 0.26, W * 0.60, H * 0.08, 5);
  // pad bottom shadow
  g.fillStyle(0x000000, 0.20);
  g.fillRoundedRect(W * 0.16, -H * 0.26, W * 0.36, H * 0.18, 5);

  // ── JERSEY BODY ───────────────────────────────────────────────────────────
  g.fillStyle(primary);
  g.fillRoundedRect(-W * 0.37, -H * 0.20, W * 0.74, H * 0.42, 5);
  // jersey right-side depth shadow
  g.fillStyle(0x000000, 0.18);
  g.fillRoundedRect(W * 0.15, -H * 0.20, W * 0.22, H * 0.42, 5);
  // jersey chest stripe
  g.fillStyle(secondary);
  g.fillRect(-W * 0.37, -H * 0.17, W * 0.74, H * 0.08);
  // side stripes (vertical)
  g.fillRect(-W * 0.52, -H * 0.26, W * 0.10, H * 0.18);
  g.fillRect(W * 0.42,  -H * 0.26, W * 0.10, H * 0.18);
  // number area (light box)
  g.fillStyle(secondary, 0.28);
  g.fillRect(-W * 0.15, -H * 0.06, W * 0.30, H * 0.18);

  // ── BACK ARM ──────────────────────────────────────────────────────────────
  g.fillStyle(primary);
  g.fillRoundedRect(-W * 0.58, -H * 0.20, W * 0.18, H * 0.28, 4);
  g.fillStyle(0x1c1c1c);
  g.fillRoundedRect(-W * 0.58, H * 0.04, W * 0.18, H * 0.14, 3);

  // ── NECK ──────────────────────────────────────────────────────────────────
  g.fillStyle(CFG.COLORS.SKIN);
  g.fillRoundedRect(-W * 0.11, -H * 0.36, W * 0.22, H * 0.17, 3);

  // ── HELMET SHELL ──────────────────────────────────────────────────────────
  g.fillStyle(primary);
  g.fillEllipse(0, -H * 0.52, W * 0.82, H * 0.54);
  // 3D top-left highlight
  g.fillStyle(0xffffff, 0.13);
  g.fillEllipse(-W * 0.16, -H * 0.64, W * 0.40, H * 0.26);
  // right-side depth shadow
  g.fillStyle(0x000000, 0.26);
  g.fillEllipse(W * 0.22, -H * 0.50, W * 0.30, H * 0.44);
  // helmet stripe
  g.fillStyle(secondary);
  g.fillRect(-W * 0.055, -H * 0.79, W * 0.11, H * 0.34);

  // ── EAR HOLES ─────────────────────────────────────────────────────────────
  g.fillStyle(0x000000, 0.62);
  g.fillCircle(-W * 0.35, -H * 0.47, W * 0.095);
  g.fillCircle(W * 0.35,  -H * 0.47, W * 0.095);

  // ── FACEMASK (solid bars for volume) ─────────────────────────────────────
  g.fillStyle(secondary);
  // horizontal bars
  g.fillRoundedRect(-W * 0.31, -H * 0.37, W * 0.64, H * 0.068, 3);
  g.fillRoundedRect(-W * 0.29, -H * 0.22, W * 0.60, H * 0.068, 3);
  // vertical bars
  g.fillRoundedRect(-W * 0.28, -H * 0.37, W * 0.068, H * 0.22, 3);
  g.fillRoundedRect(-W * 0.02, -H * 0.37, W * 0.068, H * 0.22, 3);
  g.fillRoundedRect(W * 0.22,  -H * 0.37, W * 0.068, H * 0.22, 3);
  // visor tint (subtle blue)
  g.fillStyle(0x99bbff, 0.10);
  g.fillRect(-W * 0.25, -H * 0.35, W * 0.50, H * 0.19);

  // chin strap
  g.lineStyle(1.5, 0x222222, 0.85);
  g.beginPath(); g.moveTo(-W * 0.22, -H * 0.21); g.lineTo(-W * 0.10, -H * 0.15); g.strokePath();
  g.beginPath(); g.moveTo(W * 0.22,  -H * 0.21); g.lineTo(W * 0.10,  -H * 0.15); g.strokePath();

  // ── FRONT ARM (drawn last so it's on top) ────────────────────────────────
  g.fillStyle(primary);
  g.fillRoundedRect(W * 0.42, -H * 0.20, W * 0.18, H * 0.28, 4);
  g.fillStyle(0x1c1c1c);
  g.fillRoundedRect(W * 0.42, H * 0.04, W * 0.18, H * 0.14, 3);

  // ── BALL (tucked under front arm when carrying) ───────────────────────────
  if (isBallCarrier) {
    g.fillStyle(CFG.COLORS.BALL);
    g.fillEllipse(W * 0.58, H * 0.10, W * 0.40, H * 0.24);
    // laces
    g.fillStyle(0xffffff, 0.78);
    g.fillRect(W * 0.49, H * 0.05, W * 0.038, H * 0.10);
    g.fillRect(W * 0.57, H * 0.05, W * 0.038, H * 0.10);
    g.fillRect(W * 0.65, H * 0.05, W * 0.038, H * 0.10);
    g.fillRect(W * 0.47, H * 0.09, W * 0.26, H * 0.026);
    // ball underside shadow
    g.fillStyle(0x000000, 0.16);
    g.fillEllipse(W * 0.58, H * 0.20, W * 0.36, H * 0.07);
  }

  // ── CONTROLLED PLAYER — ground halo ──────────────────────────────────────
  if (isControlled) {
    g.lineStyle(2.5, 0x00ffff, 0.92);
    g.strokeEllipse(1, H * 0.53, W * 1.45, H * 0.10);
  }
}

// ─── Field background (direct graphics — more reliable than render texture) ──
export function createFieldTexture(scene, teamColors = {}) {
  const fw = CFG.FIELD_WORLD_W;
  const fh = CFG.FIELD_WORLD_H;
  const g  = scene.add.graphics().setDepth(0);

  const EZ_W   = CFG.EZ_W;
  const PLAY_W = fw - EZ_W * 2;
  const YW     = PLAY_W / 100;
  const FAR_Y  = CFG.FIELD_FAR_Y;
  const NEAR_Y = CFG.FIELD_NEAR_Y;
  const FAR_H  = CFG.FIELD_FAR_HASH_Y;
  const NEAR_H = CFG.FIELD_NEAR_HASH_Y;

  const homeP = teamColors.homePrimary   ?? 0x1a3a8a;
  const homeS = teamColors.homeSecondary ?? 0xffd700;
  const awayP = teamColors.awayPrimary   ?? 0x8b0000;
  const awayS = teamColors.awaySecondary ?? 0xc8c8c8;

  // Full world background
  g.fillStyle(0x1a1a24);
  g.fillRect(0, 0, fw, fh);

  // Far crowd strip
  _drawCrowd(g, fw, 2, FAR_Y - 4, homeP, homeS, 0.72);

  // Alternating green stripes (10-yard sections)
  for (let s = 0; s < 10; s++) {
    const x = EZ_W + s * YW * 10;
    g.fillStyle(s % 2 === 0 ? CFG.COLORS.FIELD : CFG.COLORS.FIELD_ALT);
    g.fillRect(x, FAR_Y, YW * 10, NEAR_Y - FAR_Y);
  }

  // End zones — team colors
  g.fillStyle(homeP);
  g.fillRect(0, FAR_Y, EZ_W, NEAR_Y - FAR_Y);
  g.fillStyle(awayP);
  g.fillRect(fw - EZ_W, FAR_Y, EZ_W, NEAR_Y - FAR_Y);

  // Sidelines
  g.lineStyle(3, CFG.COLORS.LINE);
  g.strokeRect(EZ_W, FAR_Y, PLAY_W, NEAR_Y - FAR_Y);

  // Goal lines
  g.lineStyle(3, 0xffee00);
  g.beginPath(); g.moveTo(EZ_W, FAR_Y); g.lineTo(EZ_W, NEAR_Y); g.strokePath();
  g.beginPath(); g.moveTo(fw - EZ_W, FAR_Y); g.lineTo(fw - EZ_W, NEAR_Y); g.strokePath();

  // Yard lines (every 5)
  for (let y = 5; y < 100; y += 5) {
    const x = EZ_W + y * YW;
    const isTen = y % 10 === 0;
    g.lineStyle(isTen ? 2 : 1, CFG.COLORS.LINE, isTen ? 1.0 : 0.45);
    g.beginPath(); g.moveTo(x, FAR_Y); g.lineTo(x, NEAR_Y); g.strokePath();
  }

  // Hash marks
  g.lineStyle(2, CFG.COLORS.HASH, 0.8);
  for (let y = 1; y < 100; y++) {
    const x = EZ_W + y * YW;
    g.beginPath(); g.moveTo(x - 2, FAR_H);  g.lineTo(x + 2, FAR_H);  g.strokePath();
    g.beginPath(); g.moveTo(x - 2, NEAR_H); g.lineTo(x + 2, NEAR_H); g.strokePath();
  }

  // Goal posts
  _drawGoalPost(g, fw - EZ_W + 12, (FAR_Y + NEAR_Y) / 2);

  // Perspective depth lines (subtle)
  g.lineStyle(1, 0x000000, 0.06);
  for (let i = 0; i < 20; i++) {
    const t = i / 20;
    const y = FAR_Y + t * (NEAR_Y - FAR_Y);
    g.beginPath(); g.moveTo(0, y); g.lineTo(fw, y); g.strokePath();
  }

  // Yard numbers as live text objects (depth 1 to sit above field graphics)
  _drawYardNumbers(scene, EZ_W, YW, FAR_Y, NEAR_Y);

  return g;
}

function _drawCrowd(g, fw, startY, h, primaryColor, secondaryColor, homeFraction) {
  // Bleacher rows
  const rowH = 9, rows = Math.floor(h / rowH);
  for (let row = 0; row < rows; row++) {
    const ry = startY + row * rowH;
    // Concrete riser
    g.fillStyle(0x2a2a38);
    g.fillRect(0, ry + rowH - 2, fw, 2);

    for (let x = 0; x < fw; x += 9) {
      // Seat
      g.fillStyle(0x18181f);
      g.fillRect(x + 1, ry + 5, 7, 4);

      // Fan jersey — weighted toward home team color
      const r = Math.random();
      let jerseyColor;
      if (r < homeFraction)        jerseyColor = primaryColor;
      else if (r < homeFraction + 0.15) jerseyColor = secondaryColor;
      else if (r < homeFraction + 0.22) jerseyColor = 0x888888; // neutral
      else                         jerseyColor = 0x222222;  // empty seat

      g.fillStyle(jerseyColor, 0.88);
      g.fillRect(x + 1, ry + 2, 7, 5);

      // Head (skin)
      const skinTones = [0xd4a574, 0xc8925a, 0xe8c89a, 0x8b5c3a];
      g.fillStyle(skinTones[(x >> 2) % skinTones.length], 0.7);
      g.fillCircle(x + 4, ry, 3);
    }
  }
}

function _drawGoalPost(g, x, cy) {
  g.lineStyle(3, 0xffd700);
  g.beginPath(); g.moveTo(x, cy - 36); g.lineTo(x, cy + 36); g.strokePath();
  g.beginPath(); g.moveTo(x, cy);      g.lineTo(x + 36, cy - 36); g.strokePath();
  g.beginPath(); g.moveTo(x, cy);      g.lineTo(x + 36, cy + 36); g.strokePath();
  g.lineStyle(1.5, 0xffd700, 0.5);
  g.beginPath(); g.moveTo(x, cy - 36); g.lineTo(x + 22, cy - 50); g.strokePath();
}

function _drawYardNumbers(scene, EZ_W, YW, FAR_Y, NEAR_Y) {
  const nums = [10,20,30,40,50,40,30,20,10];
  nums.forEach((n, i) => {
    const x = EZ_W + (i + 1) * 10 * YW;
    scene.add.text(x, FAR_Y + 10, `${n}`, {
      fontSize: '12px', fontFamily: 'monospace', color: '#ffffff',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5, 0).setAlpha(0.9).setDepth(1);
    scene.add.text(x, NEAR_Y - 10, `${n}`, {
      fontSize: '12px', fontFamily: 'monospace', color: '#ffffff',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5, 1).setAlpha(0.9).setDepth(1);
  });
}

// ─── Button/panel helpers ─────────────────────────────────────────────────
export function createButtonTexture(scene, key, w, h, color, borderColor) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(color);
  g.fillRoundedRect(0, 0, w, h, 5);
  g.lineStyle(2, borderColor || 0xffffff);
  g.strokeRoundedRect(0, 0, w, h, 5);
  g.generateTexture(key, w, h);
  g.destroy();
}

export function createPanelTexture(scene, key, w, h) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(0x080814, 0.97);
  g.fillRoundedRect(0, 0, w, h, 7);
  g.lineStyle(2, 0x2a3a6a);
  g.strokeRoundedRect(0, 0, w, h, 7);
  g.generateTexture(key, w, h);
  g.destroy();
}

export function drawStatBar(scene, x, y, value, maxVal, color, width) {
  const bw = width || 60, bh = 6;
  const bg   = scene.add.rectangle(x, y, bw, bh, 0x222222).setOrigin(0, 0.5);
  const fill = scene.add.rectangle(x, y, bw * (value / (maxVal || 10)), bh, color).setOrigin(0, 0.5);
  return [bg, fill];
}

export function statColor(val) {
  if (val >= 9) return 0x00ff88;
  if (val >= 7) return 0x88ff00;
  if (val >= 5) return 0xffff00;
  if (val >= 3) return 0xff8800;
  return 0xff4444;
}

// ─── Perspective helpers ──────────────────────────────────────────────────
export function fieldYToScreenY(fieldY) {
  // fieldY: -1 = far sideline, +1 = near sideline
  const mid   = (CFG.FIELD_FAR_Y + CFG.FIELD_NEAR_Y) / 2;
  const range = (CFG.FIELD_NEAR_Y - CFG.FIELD_FAR_Y) / 2;
  const persp = 1 + fieldY * 0.04; // subtle perspective curve
  return mid + fieldY * range * persp;
}

export function screenYToScale(screenY) {
  const t = (screenY - CFG.FIELD_FAR_Y) / (CFG.FIELD_NEAR_Y - CFG.FIELD_FAR_Y);
  const clamped = Math.max(0, Math.min(1, t));
  return CFG.SCALE_FAR + clamped * (CFG.SCALE_NEAR - CFG.SCALE_FAR);
}
