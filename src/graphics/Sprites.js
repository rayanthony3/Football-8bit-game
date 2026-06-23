import { CFG } from '../config.js';

export function createPlayerTexture(scene, key, primary, secondary, label) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  const w = CFG.PLAYER_W, h = CFG.PLAYER_H;

  // Shadow
  g.fillStyle(0x000000, 0.35);
  g.fillEllipse(w/2 + 1, h + 2, w - 2, 4);

  // Body
  g.fillStyle(primary);
  g.fillRect(2, 6, w - 4, h - 6);

  // Helmet
  g.fillStyle(primary);
  g.fillRoundedRect(1, 0, w - 2, 9, 2);

  // Facemask
  g.fillStyle(secondary);
  g.fillRect(3, 4, w - 6, 2);
  g.fillRect(3, 7, 2, 3);
  g.fillRect(w - 5, 7, 2, 3);

  // Jersey stripe
  g.fillStyle(secondary);
  g.fillRect(2, 8, w - 4, 2);

  // Arms
  g.fillStyle(primary);
  g.fillRect(0, 8, 2, 5);
  g.fillRect(w - 2, 8, 2, 5);

  // Pants
  g.fillStyle(secondary);
  g.fillRect(2, h - 5, w - 4, 5);

  // Feet
  g.fillStyle(0x333333);
  g.fillRect(2, h - 2, 3, 2);
  g.fillRect(w - 5, h - 2, 3, 2);

  g.generateTexture(key, w, h);
  g.destroy();
}

export function createBallTexture(scene) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  const w = CFG.BALL_W, h = CFG.BALL_H;

  g.fillStyle(CFG.COLORS.BALL);
  g.fillEllipse(w / 2, h / 2, w, h);

  g.lineStyle(1, CFG.COLORS.BALL_STRIPE);
  g.beginPath();
  g.moveTo(w / 2, 0);
  g.lineTo(w / 2, h);
  g.strokePath();
  g.beginPath();
  g.moveTo(2, h / 2 - 1);
  g.lineTo(w - 2, h / 2 - 1);
  g.strokePath();

  g.generateTexture('ball', w, h);
  g.destroy();
}

export function createFieldTexture(scene) {
  const fw = CFG.FIELD_WORLD_W;
  const fh = CFG.FIELD_WORLD_H;
  const rt = scene.add.renderTexture(0, 0, fw, fh);

  const g = scene.make.graphics({ x: 0, y: 0, add: false });

  // Sky/sideline bar
  g.fillStyle(CFG.COLORS.SKY);
  g.fillRect(0, 0, fw, fh);

  // Alternating field stripes (10-yard sections)
  const EZ_W = 120;
  const PLAY_W = fw - EZ_W * 2;
  const YARD_W = PLAY_W / 100;

  for (let y = 0; y < 10; y++) {
    const dark = y % 2 === 0;
    g.fillStyle(dark ? CFG.COLORS.FIELD : CFG.COLORS.FIELD_ALT);
    g.fillRect(EZ_W + y * YARD_W * 10, 50, YARD_W * 10, fh - 100);
  }

  // End zones
  g.fillStyle(CFG.COLORS.ENDZONE_A);
  g.fillRect(0, 50, EZ_W, fh - 100);
  g.fillStyle(CFG.COLORS.ENDZONE_B);
  g.fillRect(fw - EZ_W, 50, EZ_W, fh - 100);

  // Sidelines
  g.lineStyle(3, CFG.COLORS.LINE);
  g.strokeRect(EZ_W, 50, PLAY_W, fh - 100);

  // Yard lines (every 10)
  for (let y = 10; y <= 90; y += 10) {
    const x = EZ_W + y * YARD_W;
    g.lineStyle(2, CFG.COLORS.LINE);
    g.beginPath();
    g.moveTo(x, 50);
    g.lineTo(x, fh - 50);
    g.strokePath();
  }

  // Yard numbers
  const numStyle = { fontSize: '14px', fontFamily: 'monospace', color: '#ffffff', stroke: '#000000', strokeThickness: 2 };

  // Hash marks (every yard)
  g.lineStyle(1, CFG.COLORS.HASH, 0.6);
  for (let y = 5; y < 100; y += 5) {
    const x = EZ_W + y * YARD_W;
    g.beginPath(); g.moveTo(x, 50); g.lineTo(x, fh - 50); g.strokePath();
  }

  // Goal line markers
  g.lineStyle(3, 0xffff00);
  g.beginPath(); g.moveTo(EZ_W, 50); g.lineTo(EZ_W, fh - 50); g.strokePath();
  g.beginPath(); g.moveTo(fw - EZ_W, 50); g.lineTo(fw - EZ_W, fh - 50); g.strokePath();

  // Goal posts (right side)
  g.lineStyle(3, 0xffd700);
  const gpX = fw - EZ_W + 8;
  const gpY = fh / 2;
  g.beginPath(); g.moveTo(gpX, gpY - 30); g.lineTo(gpX, gpY + 30); g.strokePath();
  g.beginPath(); g.moveTo(gpX, gpY); g.lineTo(gpX + 30, gpY - 30); g.strokePath();
  g.beginPath(); g.moveTo(gpX, gpY); g.lineTo(gpX + 30, gpY + 30); g.strokePath();
  g.beginPath(); g.moveTo(gpX, gpY - 30); g.lineTo(gpX + 18, gpY - 40); g.strokePath();

  rt.draw(g, 0, 0);
  g.destroy();
  return rt;
}

export function createButtonTexture(scene, key, w, h, color, borderColor) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(color);
  g.fillRoundedRect(0, 0, w, h, 4);
  g.lineStyle(2, borderColor || 0xffffff);
  g.strokeRoundedRect(0, 0, w, h, 4);
  g.generateTexture(key, w, h);
  g.destroy();
}

export function createPanelTexture(scene, key, w, h) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(0x0a0a1a, 0.95);
  g.fillRoundedRect(0, 0, w, h, 6);
  g.lineStyle(2, 0x334477);
  g.strokeRoundedRect(0, 0, w, h, 6);
  g.generateTexture(key, w, h);
  g.destroy();
}

export function drawStatBar(scene, x, y, value, maxVal, color, width) {
  const bw = width || 60;
  const bh = 6;
  const bg = scene.add.rectangle(x, y, bw, bh, 0x222222).setOrigin(0, 0.5);
  const pct = value / (maxVal || 10);
  const fill = scene.add.rectangle(x, y, bw * pct, bh, color).setOrigin(0, 0.5);
  return [bg, fill];
}

export function statColor(val) {
  if (val >= 9) return 0x00ff88;
  if (val >= 7) return 0x88ff00;
  if (val >= 5) return 0xffff00;
  if (val >= 3) return 0xff8800;
  return 0xff4444;
}
