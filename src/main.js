import Phaser from 'phaser';
import { CFG } from './config.js';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { SetupScene } from './scenes/SetupScene.js';
import { GameScene } from './scenes/GameScene.js';
import { PlayCallScene } from './scenes/PlayCallScene.js';
import { HalfTimeScene } from './scenes/HalfTimeScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';

const config = {
  type: Phaser.AUTO,
  width: CFG.WIDTH,
  height: CFG.HEIGHT,
  parent: 'game-container',
  backgroundColor: CFG.COLORS.SKY,
  pixelArt: true,
  antialias: false,
  roundPixels: true,
  scene: [
    BootScene,
    MenuScene,
    SetupScene,
    GameScene,
    PlayCallScene,
    HalfTimeScene,
    GameOverScene,
  ],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: CFG.WIDTH,
    height: CFG.HEIGHT,
  },
  input: {
    activePointers: 4,
  },
  render: {
    pixelArt: true,
    antialias: false,
    antialiasGL: false,
    roundPixels: true,
  },
  dom: {
    createContainer: false,
  },
};

const game = new Phaser.Game(config);

// Prevent default touch events to avoid scroll/zoom on iOS
document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
document.addEventListener('touchstart', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });

// iOS safe area handling
function updateSafeArea() {
  const safeTop = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sat') || 0);
  document.getElementById('game-container').style.paddingTop = `${safeTop}px`;
}
window.addEventListener('resize', updateSafeArea);
updateSafeArea();
