import Phaser from 'phaser';
import { LANE_WIDTH, GAME_HEIGHT } from '../constants';
import { VEHICLE_CONFIGS } from '../config/vehicles';
import { LaneData } from '../systems/LaneGenerator';

export class Vehicle extends Phaser.GameObjects.Container {
  private speedPx: number;
  private dir: 1 | -1;
  private laneXCenter: number;
  private weaveAmplitude: number;
  private weaveSpeed: number;
  private weavePhase: number;
  private baseOffsetX: number;

  hitW: number;
  hitH: number;

  constructor(scene: Phaser.Scene, laneData: LaneData, startY: number, vehicleKey?: string) {
    const cfg = VEHICLE_CONFIGS[vehicleKey ?? laneData.vehicleKey];

    super(scene, laneData.xCenter, startY);

    if (cfg.imageKey && scene.textures.exists(cfg.imageKey)) {
      const sprite = scene.add.image(0, 0, cfg.imageKey);
      // Scale so the car's width fills the lane, then apply size multiplier
      const widthScale = (LANE_WIDTH * 0.85) / sprite.width * cfg.size * 0.39;
      sprite.setScale(widthScale);
      this.add(sprite);
    } else {
      const targetSize = Math.round(LANE_WIDTH * cfg.size);
      const emoji = laneData.direction === -1 ? cfg.emojiUp : cfg.emojiDown;
      const text = scene.add.text(0, 0, emoji, {
        fontSize: `${targetSize}px`,
      }).setOrigin(0.5, 0.5);
      this.add(text);
    }

    // Image is top-down, already vertical (faces up by default)
    // dir=-1 (going up) → 0°, dir=1 (going down) → 180°
    if (cfg.imageKey && scene.textures.exists(cfg.imageKey)) {
      this.setAngle(laneData.direction === 1 ? 180 : 0);
    } else {
      // Emoji fallback: rotate to align with vertical travel
      this.setAngle(laneData.direction === 1 ? 90 : -90);
    }

    // Per-vehicle speed variation
    const jitter = 1 + (Math.random() * 2 - 1) * cfg.speedJitter;
    this.speedPx = laneData.speedPx * jitter;

    this.dir = laneData.direction;
    this.laneXCenter = laneData.xCenter;

    // Horizontal weave
    this.weaveAmplitude = cfg.weaveAmplitude * (LANE_WIDTH * 0.28);
    this.weaveSpeed = cfg.weaveSpeed * (0.8 + Math.random() * 0.4);
    this.weavePhase = Math.random() * Math.PI * 2;

    // Lane discipline offset
    const disciplineSpread = cfg.discipline === 'holds' ? 0.08
      : cfg.discipline === 'curb' ? 0.25
      : cfg.discipline === 'wanders' ? 0.2
      : 0.05;
    this.baseOffsetX = (Math.random() * 2 - 1) * LANE_WIDTH * disciplineSpread;

    this.x = this.laneXCenter + this.baseOffsetX;

    this.hitW = cfg.hitboxWidth * LANE_WIDTH;
    this.hitH = cfg.hitboxHeight * LANE_WIDTH;

    this.setSize(this.hitW, this.hitH);
    scene.add.existing(this);
  }

  update(delta: number): void {
    const dt = delta / 1000;
    this.y += this.speedPx * this.dir * dt;

    if (this.weaveAmplitude > 0) {
      const t = (Date.now() / 1000) * this.weaveSpeed * Math.PI * 2 + this.weavePhase;
      this.x = this.laneXCenter + this.baseOffsetX + Math.sin(t) * this.weaveAmplitude;
    }
  }

  isOffScreen(): boolean {
    return this.dir === 1 ? this.y > GAME_HEIGHT + 80 : this.y < -80;
  }

  getHitRect(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(
      this.x - this.hitW / 2,
      this.y - this.hitH / 2,
      this.hitW,
      this.hitH
    );
  }
}
