import Phaser from 'phaser';
import { HOP_DURATION, DANGER_START, DANGER_END, LANE_WIDTH } from '../constants';

export type ChickenState = 'resting' | 'hopping' | 'dead';

const CHICKEN_DISPLAY_SIZE = 36;

export class Chicken extends Phaser.GameObjects.Image {
  chickenState: ChickenState = 'resting';
  inDanger = false;

  private hopTween: Phaser.Tweens.Tween | null = null;
  private hopStartX = 0;
  private hopTargetX = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'chicken');
    this.setOrigin(0.5, 0.5);
    this.setDisplaySize(CHICKEN_DISPLAY_SIZE, CHICKEN_DISPLAY_SIZE);
    scene.add.existing(this);
  }

  hopTo(
    targetX: number,
    onDanger: () => void,
    onComplete: () => void
  ): void {
    if (this.chickenState !== 'resting') return;

    this.chickenState = 'hopping';
    this.inDanger = false;
    this.hopStartX = this.x;
    this.hopTargetX = targetX;

    const startY = this.y;
    const scene = this.scene;
    let dangerFired = false;

    this.hopTween = scene.tweens.add({
      targets: this,
      x: targetX,
      duration: HOP_DURATION,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        const totalDist = this.hopTargetX - this.hopStartX;
        const progress = totalDist !== 0
          ? (this.x - this.hopStartX) / totalDist
          : 1;

        if (!dangerFired && progress >= DANGER_START) {
          this.inDanger = true;
          dangerFired = true;
          onDanger();
        }
        if (this.inDanger && progress > DANGER_END) {
          this.inDanger = false;
        }

        const arcProgress = Math.sin(progress * Math.PI);
        this.y = startY - arcProgress * (LANE_WIDTH * 0.25);
      },
      onComplete: () => {
        this.y = startY;
        this.chickenState = 'resting';
        this.inDanger = false;
        this.hopTween = null;
        onComplete();
      },
    });

    // Squash-stretch
    scene.tweens.add({
      targets: this,
      scaleX: 0.85,
      scaleY: 1.2,
      duration: HOP_DURATION / 2,
      yoyo: true,
      ease: 'Sine.easeInOut',
    });
  }

  die(): void {
    this.chickenState = 'dead';
    this.inDanger = false;
    if (this.hopTween) {
      this.hopTween.stop();
      this.hopTween = null;
    }

    const scene = this.scene;

    // Flash white then red
    this.setTint(0xffffff);
    scene.time.delayedCall(80, () => this.setTint(0xff4444));
    scene.time.delayedCall(200, () => this.clearTint());

    // Flatten + spin out
    scene.tweens.add({
      targets: this,
      scaleX: 2.0,
      scaleY: 0.3,
      angle: 720,
      alpha: 0,
      duration: 600,
      ease: 'Power3',
    });

    // Feather particles (text-based)
    for (let i = 0; i < 8; i++) {
      const feather = scene.add.text(this.x, this.y, '🪶', { fontSize: '14px' })
        .setOrigin(0.5, 0.5);
      const angle = (i / 8) * Math.PI * 2;
      const dist = 40 + Math.random() * 30;
      scene.tweens.add({
        targets: feather,
        x: this.x + Math.cos(angle) * dist,
        y: this.y + Math.sin(angle) * dist,
        alpha: 0,
        angle: Math.random() * 360,
        scaleX: 0.3,
        scaleY: 0.3,
        duration: 500 + Math.random() * 300,
        ease: 'Power2',
        onComplete: () => feather.destroy(),
      });
    }
  }

  /** Entrance animation: chicken drops in from above */
  enterFromAbove(finalY: number, onComplete?: () => void): void {
    this.y = finalY - 120;
    this.setAlpha(0);
    this.setScale(0.4);
    this.chickenState = 'resting';

    this.scene.tweens.add({
      targets: this,
      y: finalY,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 400,
      ease: 'Bounce.easeOut',
      onComplete: () => {
        if (onComplete) onComplete();
      },
    });
  }

  resetTo(x: number, y: number): void {
    this.chickenState = 'resting';
    this.inDanger = false;
    this.setPosition(x, y);
    this.setAngle(0);
    this.setAlpha(1);
    this.setDisplaySize(CHICKEN_DISPLAY_SIZE, CHICKEN_DISPLAY_SIZE);
    this.clearTint();
  }
}
