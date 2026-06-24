import Phaser from 'phaser';
import {
  GAME_WIDTH, GAME_HEIGHT, LANE_WIDTH, MEDIAN_WIDTH,
  CURB_X, WORLD_WIDTH, VISIBLE_LANES,
} from '../constants';
import { Chicken } from '../entities/Chicken';
import { Vehicle } from '../entities/Vehicle';
import { generateLane, laneXCenter, medianXCenter, jitteredSpawnInterval, pickRandomVehicle, LaneData } from '../systems/LaneGenerator';
// medianXCenter still used for chicken hop targets
import { DIFFICULTIES, DifficultyKey } from '../config/difficulty';
import {
  GameState, createInitialState, potentialPayout, nextMultiplier,
} from '../systems/GameState';
import { UIScene } from './UIScene';
import { MusicSystem } from '../systems/MusicSystem';

const ROAD_BG = 0x1e2340;
const LANE_COLOR = 0x2a3050;
const MEDIAN_COLOR = 0x1a1e38;
const DASH_COLOR = 0xffffff;
const CLEARED_COIN_COLOR = 0xf59e0b;
const UPCOMING_BADGE_COLOR = 0x374160;
const UPCOMING_BADGE_ACTIVE = 0x3b82f6;

export class GameScene extends Phaser.Scene {
  state!: GameState;

  private chicken!: Chicken;
  private vehicles: Vehicle[] = [];

  private lanes: LaneData[] = [];
  private spawnTimers: Map<number, number> = new Map();
  private chickenLaneIndex = -1;

  private roadGraphics!: Phaser.GameObjects.Graphics;
  private laneBadges: Phaser.GameObjects.Container[] = [];
  private music = new MusicSystem();

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.state = createInitialState();

    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, GAME_HEIGHT);

    this.drawRoad();
    this.buildLanes();
    this.buildLaneBadges();
    this.spawnChickenOnCurb();
    this.setupCamera();
    this.setupInput();

    this.scene.launch('UIScene', { gameScene: this });

    this.preFillTraffic();
  }

  // ─── Camera ──────────────────────────────────────────────────────────────────

  private setupCamera(): void {
    this.cameras.main.scrollX = 0;
    this.cameras.main.startFollow(this.chicken, true, 0.08, 0);
    this.cameras.main.setFollowOffset(-GAME_WIDTH * 0.35, 0);
  }

  // ─── Road visuals ─────────────────────────────────────────────────────────────

  private drawRoad(): void {
    this.roadGraphics = this.add.graphics();
    const g = this.roadGraphics;

    const blockW = LANE_WIDTH + MEDIAN_WIDTH;

    // Full background
    g.fillStyle(ROAD_BG);
    g.fillRect(0, 0, WORLD_WIDTH, GAME_HEIGHT);

    // Left curb / sidewalk
    g.fillStyle(0x161a30);
    g.fillRect(0, 0, CURB_X, GAME_HEIGHT);

    // Curb edge line
    g.fillStyle(DASH_COLOR, 0.15);
    g.fillRect(CURB_X - 2, 0, 2, GAME_HEIGHT);

    for (let i = 0; i < VISIBLE_LANES; i++) {
      const xLane = CURB_X + MEDIAN_WIDTH + i * blockW;
      const xMedian = CURB_X + i * blockW;

      // Median strip (dark gap between lanes)
      g.fillStyle(MEDIAN_COLOR);
      g.fillRect(xMedian, 0, MEDIAN_WIDTH, GAME_HEIGHT);

      // Tarmac lane
      g.fillStyle(LANE_COLOR);
      g.fillRect(xLane, 0, LANE_WIDTH, GAME_HEIGHT);

      // Dashed centre line (vertical)
      g.fillStyle(DASH_COLOR, 0.2);
      for (let dy = 10; dy < GAME_HEIGHT; dy += 36) {
        g.fillRect(xLane + LANE_WIDTH / 2 - 1.5, dy, 3, 20);
      }

      // Subtle lane edge lines
      g.fillStyle(DASH_COLOR, 0.06);
      g.fillRect(xLane, 0, 1.5, GAME_HEIGHT);
      g.fillRect(xLane + LANE_WIDTH - 1.5, 0, 1.5, GAME_HEIGHT);
    }

    // Final median after last lane
    const lastMedianX = CURB_X + VISIBLE_LANES * blockW;
    g.fillStyle(MEDIAN_COLOR);
    g.fillRect(lastMedianX, 0, MEDIAN_WIDTH, GAME_HEIGHT);
  }

  // ─── Lane badges (multiplier shown in the center of each lane) ─────────────────

  private buildLaneBadges(): void {
    this.laneBadges.forEach(c => c.destroy());
    this.laneBadges = [];

    const diff = DIFFICULTIES[this.state.difficulty];
    let mult = 1.0;

    for (let i = 0; i < VISIBLE_LANES; i++) {
      // Badge sits at the center of the lane itself
      const lx = laneXCenter(i);
      const ly = GAME_HEIGHT / 2;

      const container = this.add.container(lx, ly);

      // Multiplier you earn by surviving this lane
      mult = Math.round(mult * diff.multiplierFactor * 100) / 100;

      const badge = this.add.graphics();
      badge.fillStyle(UPCOMING_BADGE_COLOR, 0.9);
      badge.fillCircle(0, 0, 22);
      badge.lineStyle(2, DASH_COLOR, 0.15);
      badge.strokeCircle(0, 0, 22);

      const label = this.add.text(0, 0, `${mult.toFixed(2)}×`, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#9ca3af',
        fontStyle: 'bold',
      }).setOrigin(0.5, 0.5);

      container.add([badge, label]);
      container.setData('laneIndex', i);
      container.setData('multiplier', mult);
      container.setData('badge', badge);
      container.setData('label', label);

      this.laneBadges.push(container);
    }
  }

  /**
   * Update lane badges: cleared → gold coin, crossing → highlighted, upcoming → grey.
   */
  private updateLaneBadges(): void {
    for (const container of this.laneBadges) {
      const badge = container.getData('badge') as Phaser.GameObjects.Graphics;
      const label = container.getData('label') as Phaser.GameObjects.Text;
      const laneIdx = container.getData('laneIndex') as number;

      if (!badge || !label) continue;

      badge.clear();

      if (laneIdx <= this.chickenLaneIndex) {
        // Already crossed — gold coin
        badge.fillStyle(CLEARED_COIN_COLOR, 0.95);
        badge.fillCircle(0, 0, 20);
        badge.lineStyle(3, 0xd97706);
        badge.strokeCircle(0, 0, 20);
        badge.lineStyle(1.5, 0xfbbf24, 0.6);
        badge.strokeCircle(0, 0, 13);
        label.setText('✓').setColor('#78350f').setFontSize(16);
      } else if (laneIdx === this.chickenLaneIndex + 1) {
        // Next lane to cross — bright highlight
        badge.fillStyle(UPCOMING_BADGE_ACTIVE, 0.95);
        badge.fillCircle(0, 0, 24);
        badge.lineStyle(2.5, 0x60a5fa, 0.8);
        badge.strokeCircle(0, 0, 24);
        const mult = container.getData('multiplier') as number;
        label.setText(`${mult.toFixed(2)}×`).setColor('#ffffff').setFontSize(12);
      } else if (laneIdx === this.chickenLaneIndex + 2) {
        // Lane after next — slightly highlighted
        badge.fillStyle(0x3b4970, 0.9);
        badge.fillCircle(0, 0, 22);
        badge.lineStyle(2, 0x60a5fa, 0.4);
        badge.strokeCircle(0, 0, 22);
        const mult = container.getData('multiplier') as number;
        label.setText(`${mult.toFixed(2)}×`).setColor('#cbd5e1').setFontSize(11);
      } else {
        // Further ahead — dim
        badge.fillStyle(UPCOMING_BADGE_COLOR, 0.85);
        badge.fillCircle(0, 0, 20);
        badge.lineStyle(1.5, DASH_COLOR, 0.1);
        badge.strokeCircle(0, 0, 20);
        const mult = container.getData('multiplier') as number;
        label.setText(`${mult.toFixed(2)}×`).setColor('#64748b').setFontSize(10);
      }
    }
  }

  // ─── Lane generation ─────────────────────────────────────────────────────────

  private buildLanes(): void {
    this.lanes = [];
    this.spawnTimers.clear();
    const diff = DIFFICULTIES[this.state.difficulty];

    for (let i = 0; i < VISIBLE_LANES; i++) {
      const lane = generateLane(i, diff);
      this.lanes.push(lane);
      this.spawnTimers.set(i, Math.random() * lane.spawnInterval * 0.5);
    }
  }

  private preFillTraffic(): void {
    for (const lane of this.lanes) {
      const calculated = Math.ceil(GAME_HEIGHT / (lane.spawnInterval / 1000 * lane.speedPx)) + 1;
      const count = Math.max(calculated, 5);
      const spacing = GAME_HEIGHT / count;
      for (let j = 0; j < count; j++) {
        const y = spacing * j + Math.random() * spacing * 0.4;
        const v = new Vehicle(this, lane, y, pickRandomVehicle(lane.vehiclePool));
        this.vehicles.push(v);
      }
    }
  }

  private rebuildLanesForDifficulty(): void {
    this.vehicles.forEach(v => v.destroy());
    this.vehicles = [];
    this.buildLanes();
    this.buildLaneBadges();
    this.preFillTraffic();
  }

  // ─── Chicken ─────────────────────────────────────────────────────────────────

  private spawnChickenOnCurb(): void {
    const x = CURB_X / 2;
    const y = GAME_HEIGHT / 2;

    if (!this.chicken) {
      this.chicken = new Chicken(this, x, y);
    } else {
      this.chicken.resetTo(x, y);
    }

    this.chickenLaneIndex = -1;
    this.updateLaneBadges();
  }

  // ─── Input ───────────────────────────────────────────────────────────────────

  private setupInput(): void {
    // Touch/click is handled by UIScene to avoid stealing taps from buttons
    this.input.keyboard?.on('keydown-SPACE', () => this.handleHopInput());
    this.input.keyboard?.on('keydown-RIGHT', () => this.handleHopInput());
  }

  handleHopInput(): void {
    const { phase } = this.state;

    if (phase === 'IDLE') {
      this.startRound();
      return;
    }

    if (phase === 'ACTIVE' && this.chicken.chickenState === 'resting') {
      this.hop();
    }
  }

  handleToa(): void {
    if (this.state.phase !== 'ACTIVE') return;
    if (this.state.multiplier <= 1) return;
    this.cashOut();
  }

  // ─── Round lifecycle ─────────────────────────────────────────────────────────

  private startRound(): void {
    const { balance, stake } = this.state;
    if (stake < 1 || stake > balance) return;

    this.state.balance -= stake;
    this.state.multiplier = 1.0;
    this.state.lanesCleared = 0;
    this.state.lastResult = null;
    this.state.lastPayout = 0;

    this.rebuildLanesForDifficulty();

    // Reset chicken off-screen, then animate entrance
    const x = CURB_X / 2;
    const y = GAME_HEIGHT / 2;
    if (!this.chicken) {
      this.chicken = new Chicken(this, x, y);
    } else {
      this.chicken.resetTo(x, y);
    }
    this.chickenLaneIndex = -1;

    this.cameras.main.startFollow(this.chicken, true, 0.08, 0);
    this.cameras.main.setFollowOffset(-GAME_WIDTH * 0.35, 0);

    this.state.phase = 'ACTIVE';
    this.updateLaneBadges();
    this.emitStateUpdate();

    if (!this.music.playing) this.music.start();
  }

  private showCountdown(onDone: () => void): void {
    const labels = ['3', '2', '1', 'ANZA!'];
    let i = 0;

    const showNext = () => {
      if (i >= labels.length) {
        onDone();
        return;
      }

      const txt = this.add.text(this.chicken.x, GAME_HEIGHT / 2 - 60, labels[i], {
        fontFamily: 'monospace',
        fontSize: i < 3 ? '52px' : '36px',
        fontStyle: 'bold',
        color: i < 3 ? '#ffffff' : '#4ade80',
      }).setOrigin(0.5, 0.5).setAlpha(0);

      this.tweens.add({
        targets: txt,
        alpha: 1,
        scaleX: { from: 2, to: 1 },
        scaleY: { from: 2, to: 1 },
        duration: 200,
        ease: 'Back.easeOut',
        onComplete: () => {
          this.tweens.add({
            targets: txt,
            alpha: 0,
            scaleX: 0.5,
            scaleY: 0.5,
            duration: 200,
            delay: 250,
            ease: 'Power2',
            onComplete: () => {
              txt.destroy();
              i++;
              showNext();
            },
          });
        },
      });
    };

    showNext();
  }

  private hop(): void {
    if (this.state.phase !== 'ACTIVE') return;
    if (this.chicken.chickenState !== 'resting') return;

    const nextLaneIdx = this.chickenLaneIndex + 1;
    if (nextLaneIdx >= this.lanes.length) return;

    const targetX = medianXCenter(nextLaneIdx + 1);

    this.state.phase = 'HOPPING';
    this.emitStateUpdate();

    this.chicken.hopTo(
      targetX,
      () => { /* danger zone — collision checked in update() */ },
      () => this.onLandedOnMedian(nextLaneIdx)
    );
  }

  private onLandedOnMedian(laneIndex: number): void {
    this.chickenLaneIndex = laneIndex;
    const diff = DIFFICULTIES[this.state.difficulty];

    this.state.multiplier = nextMultiplier(this.state, diff.multiplierFactor);
    this.state.lanesCleared += 1;
    this.state.phase = 'ACTIVE';

    this.music.playLaneClear();
    this.updateLaneBadges();
    this.emitStateUpdate();
  }

  private cashOut(): void {
    const payout = potentialPayout(this.state);
    this.state.balance += payout;
    this.state.lastResult = 'win';
    this.state.lastPayout = payout;
    this.state.phase = 'ENDED';
    this.music.stop();
    this.music.playCashOutFanfare();
    this.emitStateUpdate();
  }

  private crash(): void {
    this.chicken.die();
    this.state.lastResult = 'loss';
    this.state.lastPayout = 0;
    this.state.phase = 'ENDED';
    this.music.stop();
    this.music.playCrashSting();

    // Screen shake
    this.cameras.main.shake(400, 0.015);

    // Red flash overlay
    const flash = this.add.graphics();
    flash.fillStyle(0xff0000, 0.35);
    flash.fillRect(
      this.cameras.main.scrollX,
      this.cameras.main.scrollY,
      GAME_WIDTH + 200,
      GAME_HEIGHT
    );
    flash.setDepth(100);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 500,
      ease: 'Power2',
      onComplete: () => flash.destroy(),
    });

    // Reveal all hidden lane vehicles so player sees what hit them
    for (const v of this.vehicles) {
      if (v.alpha < 1) {
        this.tweens.add({
          targets: v,
          alpha: 1,
          duration: 200,
        });
      }
    }

    this.emitStateUpdate();
    // Stay on ENDED — player must tap to continue
  }

  /** Called from UIScene when player taps "continue" after a crash or cash-out */
  returnToIdle(): void {
    if (this.state.phase !== 'ENDED') return;
    this.state.phase = 'IDLE';
    this.state.multiplier = 1.0;
    this.spawnChickenOnCurb();
    this.cameras.main.startFollow(this.chicken, true, 0.08, 0);
    this.cameras.main.setFollowOffset(-GAME_WIDTH * 0.35, 0);
    this.emitStateUpdate();
  }

  // ─── Controls ────────────────────────────────────────────────────────────────

  setStake(value: number): void {
    if (this.state.phase !== 'IDLE') return;
    this.state.stake = Math.max(1, Math.min(value, this.state.balance));
    this.emitStateUpdate();
  }

  setDifficulty(key: DifficultyKey): void {
    if (this.state.phase !== 'IDLE') return;
    this.state.difficulty = key;
    this.rebuildLanesForDifficulty();
    this.emitStateUpdate();
  }

  topUp(): void {
    this.state.balance = 1000;
    this.emitStateUpdate();
  }

  toggleMusic(): void {
    this.music.toggle();
  }

  // ─── Vehicle spawning ─────────────────────────────────────────────────────────

  private updateVehicleSpawns(delta: number): void {
    for (const lane of this.lanes) {
      const remaining = (this.spawnTimers.get(lane.index) ?? 0) - delta;
      if (remaining <= 0) {
        this.spawnVehicle(lane);
        this.spawnTimers.set(lane.index, jitteredSpawnInterval(lane.spawnInterval) + remaining);
      } else {
        this.spawnTimers.set(lane.index, remaining);
      }
    }
  }

  private spawnVehicle(lane: LaneData): void {
    const startY = lane.direction === 1 ? -60 : GAME_HEIGHT + 60;
    const v = new Vehicle(this, lane, startY, pickRandomVehicle(lane.vehiclePool));
    this.vehicles.push(v);
  }

  // ─── Collision ────────────────────────────────────────────────────────────────

  private checkCollision(): void {
    if (!this.chicken.inDanger) return;

    // Only check vehicles in the lane the chicken is currently crossing
    const crossingIdx = this.chickenLaneIndex + 1;
    if (crossingIdx < 0 || crossingIdx >= this.lanes.length) return;

    const crossingLane = this.lanes[crossingIdx];
    const laneCX = crossingLane.xCenter;

    const cx = this.chicken.x;
    const cy = this.chicken.y;
    const hw = 13;
    const hh = 13;
    const chickenBounds = new Phaser.Geom.Rectangle(cx - hw, cy - hh, hw * 2, hh * 2);

    for (const v of this.vehicles) {
      // Only vehicles belonging to the lane being crossed
      if (Math.abs(v.x - laneCX) > LANE_WIDTH * 0.8) continue;
      if (Phaser.Geom.Rectangle.Overlaps(chickenBounds, v.getHitRect())) {
        this.crash();
        return;
      }
    }
  }

  // ─── Update loop ──────────────────────────────────────────────────────────────

  update(_time: number, delta: number): void {
    this.updateVehicleSpawns(delta);

    // The lane the chicken will cross next — always hidden
    const hiddenLaneIdx = this.chickenLaneIndex + 1;
    const hiddenLaneCX = hiddenLaneIdx >= 0 && hiddenLaneIdx < this.lanes.length
      ? this.lanes[hiddenLaneIdx].xCenter
      : -9999;

    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const v = this.vehicles[i];
      v.update(delta);

      // Hide vehicles in the current target lane — always blind
      if (Math.abs(v.x - hiddenLaneCX) < LANE_WIDTH * 0.8) {
        v.setAlpha(0);
      } else {
        v.setAlpha(1);
      }

      if (v.isOffScreen()) {
        v.destroy();
        this.vehicles.splice(i, 1);
      }
    }

    if (this.state.phase === 'HOPPING') {
      this.checkCollision();
    }
  }

  // ─── State broadcast ──────────────────────────────────────────────────────────

  emitStateUpdate(): void {
    const ui = this.scene.get('UIScene') as UIScene | null;
    if (ui) ui.onStateUpdate(this.state);
  }
}
