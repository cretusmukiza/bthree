import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    this.load.image('gari', '/car-topdown.png');
    this.load.image('bajaji', '/bajaji-topdown.png');
    this.load.image('daladala', '/daladala-topdown.png');
    this.load.image('chicken', '/icons8-chicken-100.png');
  }

  create(): void {
    this.scene.start('GameScene');
  }
}
