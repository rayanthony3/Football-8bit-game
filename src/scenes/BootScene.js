import { CFG } from '../config.js';
import { createPlayerTexture, createBallTexture, createButtonTexture, createPanelTexture } from '../graphics/Sprites.js';

export class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'BootScene' }); }

  create() {
    const { WIDTH, HEIGHT } = CFG;

    // Background
    this.add.rectangle(WIDTH/2, HEIGHT/2, WIDTH, HEIGHT, CFG.COLORS.SKY);

    // Generate textures
    createPlayerTexture(this, 'player_a', CFG.TEAM_A.primary, CFG.TEAM_A.secondary, 'OFF');
    createPlayerTexture(this, 'player_b', CFG.TEAM_B.primary, CFG.TEAM_B.secondary, 'DEF');
    createPlayerTexture(this, 'player_a_hl', 0x00ffcc, CFG.TEAM_A.secondary, '');
    createPlayerTexture(this, 'player_b_hl', 0xff88cc, CFG.TEAM_B.secondary, '');
    createBallTexture(this);
    createButtonTexture(this, 'btn_primary', 180, 44, 0x1a3a8a, 0xffd700);
    createButtonTexture(this, 'btn_secondary', 180, 44, 0x8b0000, 0xc8c8c8);
    createButtonTexture(this, 'btn_neutral', 160, 40, 0x1e1e3e, 0x4488ff);
    createButtonTexture(this, 'btn_small', 100, 32, 0x1e1e3e, 0x4488ff);
    createButtonTexture(this, 'btn_run', 140, 40, 0x2a4a1a, 0x88cc44);
    createButtonTexture(this, 'btn_pass', 140, 40, 0x1a2a5a, 0x4488ff);
    createButtonTexture(this, 'btn_kick', 140, 40, 0x4a3a0a, 0xffcc44);
    createButtonTexture(this, 'btn_def', 140, 40, 0x4a1a1a, 0xff4444);
    createPanelTexture(this, 'panel_lg', 460, 340);
    createPanelTexture(this, 'panel_md', 320, 220);
    createPanelTexture(this, 'panel_sm', 200, 120);
    createPanelTexture(this, 'hud_panel', CFG.WIDTH, 50);

    // Title card
    const logo = this.add.text(WIDTH/2, HEIGHT/2 - 30, 'GRIDIRON\n8-BIT', {
      fontSize: '40px', fontFamily: 'monospace', color: '#ffd700',
      stroke: '#000000', strokeThickness: 4, align: 'center',
    }).setOrigin(0.5);

    const sub = this.add.text(WIDTH/2, HEIGHT/2 + 50, 'Loading...', {
      fontSize: '16px', fontFamily: 'monospace', color: '#888888',
    }).setOrigin(0.5);

    // Pixel loading bar
    const barW = 200;
    const barBg = this.add.rectangle(WIDTH/2, HEIGHT/2 + 80, barW, 8, 0x333333);
    const bar = this.add.rectangle(WIDTH/2 - barW/2, HEIGHT/2 + 80, 0, 8, 0xffd700).setOrigin(0, 0.5);

    let progress = 0;
    const fill = this.time.addEvent({
      delay: 20,
      repeat: 49,
      callback: () => {
        progress += barW / 50;
        bar.width = progress;
        if (progress >= barW) {
          this.time.delayedCall(200, () => this.scene.start('MenuScene'));
        }
      },
    });
  }
}
