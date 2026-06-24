import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './constants';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#1e2340',
  parent: 'game-container',
  scene: [BootScene, GameScene, UIScene],
  scale: {
    mode: Phaser.Scale.ENVELOP,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    expandParent: true,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  input: {
    touch: true,
    activePointers: 2,
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: true,
  },
};

new Phaser.Game(config);
