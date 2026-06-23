import { CFG } from '../config.js';

// ─── Player sprite (Hoopland/90s style, 3/4 elevated view) ───────────────
export function drawPlayerSprite(g, primary, secondary, isControlled, isBallCarrier) {
  const w = CFG.PLAYER_W, h = CFG.PLAYER_H;

  // Drop shadow
  g.fillStyle(0x000000, 0.28);
  g.fillEllipse(0, h * 0.5, w * 1.1, h * 0.18);

  // Cleats
  g.fillStyle(0x111111);
  g.fillRoundedRect(-w * 0.28, h * 0.36, w * 0.22, h * 0.14, 1);
  g.fillRoundedRect(w * 0.06,  h * 0.36, w * 0.22, h * 0.14, 1);

  // Pants
  g.fillStyle(secondary);
  g.fillRect(-w * 0.28, h * 0.14, w * 0.56, h * 0.26);

  // Pant stripe
  g.fillStyle(primary, 0.6);
  g.fillRect(-w * 0.28, h * 0.22, w * 0.56, h * 0.05);

  // Jersey body
  g.fillStyle(primary);
  g.fillRoundedRect(-w * 0.38, -h * 0.1, w * 0.76, h * 0.28, 3);

  // Shoulder stripe
  g.fillStyle(secondary);
  g.fillRect(-w * 0.38, -h * 0.1, w * 0.76, h * 0.06);
  g.fillRect(-w * 0.38, -h * 0.1, w * 0.07, h * 0.28);
  g.fillRect(w * 0.31,  -h * 0.1, w * 0.07, h * 0.28);

  // Arms
  g.fillStyle(primary);
  g.fillRoundedRect(-w * 0.52, -h * 0.07, w * 0.16, h * 0.22, 2);  // left
  g.fillRoundedRect(w * 0.36,  -h * 0.07, w * 0.16, h * 0.22, 2);  // right

  // Hand stubs
  g.fillStyle(CFG.COLORS.SKIN);
  g.fillCircle(-w * 0.44, h * 0.12, w * 0.1);
  g.fillCircle(w * 0.44,  h * 0.12, w * 0.1);

  // Neck
  g.fillStyle(CFG.COLORS.SKIN);
  g.fillRect(-w * 0.1, -h * 0.2, w * 0.2, h * 0.12);

  // Helmet shell
  g.fillStyle(primary);
  g.fillEllipse(0, -h * 0.32, w * 0.72, h * 0.44);

  // Helmet stripe (single down center)
  g.fillStyle(secondary);
  g.fillRect(-w * 0.04, -h * 0.54, w * 0.08, h * 0.26);

  // Ear holes
  g.fillStyle(secondary, 0.5);
  g.fillCircle(-w * 0.33, -h * 0.30, w * 0.1);
  g.fillCircle(w * 0.33,  -h * 0.30, w * 0.1);

  // Facemask (horizontal bars)
  g.lineStyle(2, secondary);
  g.beginPath(); g.moveTo(-w * 0.26, -h * 0.14); g.lineTo(w * 0.26, -h * 0.14); g.strokePath();
  g.beginPath(); g.moveTo(-w * 0.22, -h * 0.22); g.lineTo(w * 0.22, -h * 0.22); g.strokePath();
  // Vertical bars
  g.beginPath(); g.moveTo(-w * 0.22, -h * 0.08); g.lineTo(-w * 0.22, -h * 0.28); g.strokePath();
  g.beginPath(); g.moveTo(w * 0.22,  -h * 0.08); g.lineTo(w * 0.22,  -h * 0.28); g.strokePath();
  g.beginPath(); g.moveTo(0,          -h * 0.1);  g.lineTo(0,         -h * 0.28); g.strokePath();

  // Chin strap
  g.lineStyle(1, 0x333333);
  g.beginPath(); g.moveTo(-w * 0.2, -h * 0.1); g.lineTo(-w * 0.1, -h * 0.06); g.strokePath();
  g.beginPath(); g.moveTo(w * 0.2,  -h * 0.1); g.lineTo(w * 0.1,  -h * 0.06); g.strokePath();

  // Ball (carried in left arm)
  if (isBallCarrier) {
    g.fillStyle(CFG.COLORS.BALL);
    g.fillEllipse(-w * 0.56, h * 0.05, w * 0.36, h * 0.2);
    g.lineStyle(1, CFG.COLORS.BALL_STRIPE, 0.9);
    g.beginPath(); g.moveTo(-w * 0.56, -h * 0.04); g.lineTo(-w * 0.56, h * 0.14); g.strokePath();
    g.beginPath(); g.moveTo(-w * 0.68, h * 0.05);  g.lineTo(-w * 0.44, h * 0.05); g.strokePath();
  }

  // Controlled player: cyan ring on helmet
  if (isControlled) {
    g.lineStyle(2, 0x00ffff, 0.95);
    g.strokeEllipse(0, -h * 0.32, w * 0.78, h * 0.5);
  }
}

// ─── Field background (render texture) ───────────────────────────────────
export function createFieldTexture(scene, teamColors = {}) {
  const fw = CFG.FIELD_WORLD_W;
  const fh = CFG.FIELD_WORLD_H;
  const rt = scene.add.renderTexture(0, 0, fw, fh);
  const g  = scene.make.graphics({ x: 0, y: 0, add: false });

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

  // Upper stadium concrete
  g.fillStyle(0x1e1e28);
  g.fillRect(0, 0, fw, FAR_Y);

  // Upper stands — far crowd fills entire concrete strip above field
  _drawCrowd(g, fw, 2, FAR_Y - 4, homeP, homeS, 0.72);

  // Alternating green stripes (10-yard sections)
  for (let s = 0; s < 10; s++) {
    const x = EZ_W + s * YW * 10;
    g.fillStyle(s % 2 === 0 ? CFG.COLORS.FIELD : CFG.COLORS.FIELD_ALT);
    g.fillRect(x, FAR_Y, YW * 10, NEAR_Y - FAR_Y);
  }

  // End zones
  g.fillStyle(CFG.COLORS.ENDZONE_A);
  g.fillRect(0, FAR_Y, EZ_W, NEAR_Y - FAR_Y);
  g.fillStyle(CFG.COLORS.ENDZONE_B);
  g.fillRect(fw - EZ_W, FAR_Y, EZ_W, NEAR_Y - FAR_Y);

  // Sidelines
  g.lineStyle(3, CFG.COLORS.LINE);
  g.strokeRect(EZ_W, FAR_Y, PLAY_W, NEAR_Y - FAR_Y);

  // Goal lines (bright yellow)
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

  // Hash marks (far and near)
  g.lineStyle(2, CFG.COLORS.HASH, 0.8);
  for (let y = 1; y < 100; y++) {
    const x = EZ_W + y * YW;
    g.beginPath(); g.moveTo(x - 2, FAR_H);  g.lineTo(x + 2, FAR_H);  g.strokePath();
    g.beginPath(); g.moveTo(x - 2, NEAR_H); g.lineTo(x + 2, NEAR_H); g.strokePath();
  }

  // Yard numbers
  _drawYardNumbers(scene, rt, g, EZ_W, YW, FAR_Y, NEAR_Y);

  // Goal posts (right end zone)
  _drawGoalPost(g, fw - EZ_W + 12, (FAR_Y + NEAR_Y) / 2);

  // Perspective depth lines on field (subtle)
  g.lineStyle(1, 0x000000, 0.06);
  for (let i = 0; i < 20; i++) {
    const t = i / 20;
    const y = FAR_Y + t * (NEAR_Y - FAR_Y);
    g.beginPath(); g.moveTo(0, y); g.lineTo(fw, y); g.strokePath();
  }

  rt.draw(g, 0, 0);
  g.destroy();
  return rt;
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

function _drawYardNumbers(scene, rt, g, EZ_W, YW, FAR_Y, NEAR_Y) {
  const nums = [10,20,30,40,50,40,30,20,10];
  nums.forEach((n, i) => {
    const x = EZ_W + (i + 1) * 10 * YW;
    // Draw text by creating a temp text and drawing to rt
    const t1 = scene.add.text(x, FAR_Y + 10, `${n}`, {
      fontSize: '12px', fontFamily: 'monospace', color: '#ffffff',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5, 0).setAlpha(0.9);
    const t2 = scene.add.text(x, NEAR_Y - 10, `${n}`, {
      fontSize: '12px', fontFamily: 'monospace', color: '#ffffff',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5, 1).setAlpha(0.9);
    rt.draw(t1); rt.draw(t2);
    t1.destroy(); t2.destroy();
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
