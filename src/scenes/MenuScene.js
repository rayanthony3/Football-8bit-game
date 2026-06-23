import { CFG } from '../config.js';

export class MenuScene extends Phaser.Scene {
  constructor() { super({ key: 'MenuScene' }); }

  create() {
    const { WIDTH, HEIGHT } = CFG;

    // Background gradient via rectangles
    for (let i = 0; i < HEIGHT; i += 4) {
      const t = i / HEIGHT;
      const r = Math.floor(10 + t * 20);
      const g = Math.floor(10 + t * 10);
      const b = Math.floor(30 + t * 50);
      this.add.rectangle(WIDTH/2, i, WIDTH, 4, Phaser.Display.Color.GetColor(r, g, b));
    }

    // Grid lines (8-bit feel)
    for (let x = 0; x < WIDTH; x += 32) {
      this.add.rectangle(x, HEIGHT/2, 1, HEIGHT, 0x1a2a4a, 0.3);
    }
    for (let y = 0; y < HEIGHT; y += 32) {
      this.add.rectangle(WIDTH/2, y, WIDTH, 1, 0x1a2a4a, 0.3);
    }

    // Stars (pixel dots)
    for (let i = 0; i < 60; i++) {
      const sx = Math.random() * WIDTH;
      const sy = Math.random() * HEIGHT * 0.6;
      const bright = Math.random();
      const col = bright > 0.8 ? 0xffffff : bright > 0.5 ? 0xaaaacc : 0x555577;
      this.add.rectangle(sx, sy, 2, 2, col);
    }

    // Stadium crowd (simple pixel art blocks)
    for (let i = 0; i < WIDTH; i += 8) {
      const h = 20 + Math.random() * 30;
      const col = [0x1a3a8a, 0x8b0000, 0x444444, 0x666666][Math.floor(Math.random()*4)];
      this.add.rectangle(i + 4, HEIGHT - h/2, 8, h, col);
    }

    // Field strip at bottom
    this.add.rectangle(WIDTH/2, HEIGHT - 20, WIDTH, 40, CFG.COLORS.FIELD);
    this.add.rectangle(WIDTH/2, HEIGHT - 20, WIDTH, 40, 0xffffff, 0.08);

    // GRIDIRON logo
    this.add.text(WIDTH/2, 90, 'GRIDIRON', {
      fontSize: '52px', fontFamily: 'monospace', color: '#ffd700',
      stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(WIDTH/2, 148, '8  -  B I T', {
      fontSize: '26px', fontFamily: 'monospace', color: '#ffffff',
      stroke: '#000000', strokeThickness: 4, letterSpacing: 6,
    }).setOrigin(0.5);

    // Pixel football
    const ball = this.add.ellipse(WIDTH/2, 195, 28, 18, CFG.COLORS.BALL);
    this.add.text(WIDTH/2, 195, '|', { fontSize: '18px', color: '#ffffff' }).setOrigin(0.5);
    this.tweens.add({ targets: ball, rotation: Math.PI * 2, duration: 1500, repeat: -1 });

    // Tagline
    this.add.text(WIDTH/2, 230, 'CALL THE PLAY. MAKE THE RUN.\nBECOME A LEGEND.', {
      fontSize: '12px', fontFamily: 'monospace', color: '#aaaacc',
      align: 'center', lineSpacing: 6,
    }).setOrigin(0.5);

    // New Game button
    const btnY = 310;
    const newGameBtn = this.add.image(WIDTH/2, btnY, 'btn_primary').setInteractive({ useHandCursor: true });
    const newGameText = this.add.text(WIDTH/2, btnY, 'NEW GAME', {
      fontSize: '18px', fontFamily: 'monospace', color: '#ffd700',
    }).setOrigin(0.5);

    // How To Play
    const howBtn = this.add.image(WIDTH/2, btnY + 58, 'btn_neutral').setInteractive({ useHandCursor: true });
    const howText = this.add.text(WIDTH/2, btnY + 58, 'HOW TO PLAY', {
      fontSize: '14px', fontFamily: 'monospace', color: '#aaddff',
    }).setOrigin(0.5);

    this._addBtnFx(newGameBtn, newGameText);
    this._addBtnFx(howBtn, howText);

    newGameBtn.on('pointerdown', () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.time.delayedCall(300, () => this.scene.start('SetupScene'));
    });

    howBtn.on('pointerdown', () => this._showHowToPlay());

    // Version
    this.add.text(WIDTH - 8, HEIGHT - 8, 'v1.0 DEMO', {
      fontSize: '10px', fontFamily: 'monospace', color: '#444466',
    }).setOrigin(1, 1);

    // Privacy policy
    this.add.text(8, HEIGHT - 8, 'Privacy Policy  |  © 2025 GridIron 8-Bit', {
      fontSize: '9px', fontFamily: 'monospace', color: '#333355',
    }).setOrigin(0, 1);

    // Blinking "PRESS START"
    const pressStart = this.add.text(WIDTH/2, btnY + 130, '▶  TOUCH TO BEGIN', {
      fontSize: '11px', fontFamily: 'monospace', color: '#555577',
    }).setOrigin(0.5);
    this.tweens.add({ targets: pressStart, alpha: 0.2, duration: 700, yoyo: true, repeat: -1 });

    this.cameras.main.fadeIn(400);
  }

  _addBtnFx(btn, label) {
    btn.on('pointerover', () => { btn.setScale(1.04); label.setScale(1.04); });
    btn.on('pointerout',  () => { btn.setScale(1);    label.setScale(1); });
  }

  _showHowToPlay() {
    const { WIDTH, HEIGHT } = CFG;
    const panel = this.add.image(WIDTH/2, HEIGHT/2, 'panel_lg');
    const title = this.add.text(WIDTH/2, HEIGHT/2 - 140, 'HOW TO PLAY', {
      fontSize: '20px', fontFamily: 'monospace', color: '#ffd700',
    }).setOrigin(0.5);

    const lines = [
      '🏈 OFFENSE:  Pick a play → Snap → Move your player',
      '   D-PAD: Move  |  ● Button: Throw / Speed Burst',
      '',
      '🛡 DEFENSE:  Pick a scheme → Control your player',
      '   D-PAD: Move  |  ● Button: Tackle / Dive',
      '',
      '⚙ POSITIONS:  Choose before game starts.',
      '   CPU handles all other players.',
      '',
      '🔄 ROTATIONS:  CPU auto-subs tired players.',
      '   Each player has 1-10 stats & fatigue.',
      '',
      '📋 SCORING:',
      '   Touchdown: 6pts + Extra Point: 1pt',
      '   Field Goal: 3pts  |  Safety: 2pts',
    ];

    const textBlock = this.add.text(WIDTH/2 - 190, HEIGHT/2 - 105, lines.join('\n'), {
      fontSize: '11px', fontFamily: 'monospace', color: '#ccccee', lineSpacing: 5,
    });

    const closeBtn = this.add.image(WIDTH/2, HEIGHT/2 + 140, 'btn_neutral').setInteractive({ useHandCursor: true });
    const closeText = this.add.text(WIDTH/2, HEIGHT/2 + 140, 'CLOSE', {
      fontSize: '14px', fontFamily: 'monospace', color: '#aaddff',
    }).setOrigin(0.5);

    const group = [panel, title, textBlock, closeBtn, closeText];
    closeBtn.on('pointerdown', () => group.forEach(o => o.destroy()));
  }
}
