import { GAME_HEIGHT, LANE_WIDTH, MIN_GAP_FACTOR, CURB_X, MEDIAN_WIDTH } from '../constants';
import { VEHICLE_CONFIGS, LANE_SEQUENCE, HARD_POOL, VehicleConfig } from '../config/vehicles';
import { DifficultyConfig } from '../config/difficulty';

export interface LaneData {
  index: number;
  vehicleKey: string;       // primary vehicle type (used for speed/density calc)
  vehiclePool: string[];    // all types that can spawn in this lane
  direction: 1 | -1;       // 1 = top→bottom, -1 = bottom→top
  speedPx: number;          // pixels per second vertically
  spawnInterval: number;    // ms between vehicle spawns
  xCenter: number;          // world X of lane center
}

function vehicleForLane(laneIndex: number): VehicleConfig {
  if (laneIndex < LANE_SEQUENCE.length) {
    return VEHICLE_CONFIGS[LANE_SEQUENCE[laneIndex]];
  }
  const key = HARD_POOL[laneIndex % HARD_POOL.length];
  return VEHICLE_CONFIGS[key];
}

export function laneXCenter(laneIndex: number): number {
  // Each lane block: median + lane
  // Layout: [CURB_X] [median] [lane0] [median] [lane1] ...
  const blockWidth = LANE_WIDTH + MEDIAN_WIDTH;
  return CURB_X + MEDIAN_WIDTH + laneIndex * blockWidth + LANE_WIDTH / 2;
}

export function medianXCenter(laneIndex: number): number {
  // Median sits between lane (laneIndex-1) and lane (laneIndex)
  // For laneIndex=0, it's the curb-side median
  const blockWidth = LANE_WIDTH + MEDIAN_WIDTH;
  return CURB_X + laneIndex * blockWidth + MEDIAN_WIDTH / 2;
}

const ALL_VEHICLE_KEYS = Object.keys(VEHICLE_CONFIGS);

function buildVehiclePool(laneIndex: number, primaryKey: string): string[] {
  const others = ALL_VEHICLE_KEYS.filter(k => k !== primaryKey);
  // More variety as lanes get deeper
  const mixCount = Math.min(others.length, 1 + Math.floor(laneIndex / 3));
  const shuffled = others.sort(() => Math.random() - 0.5);
  return [primaryKey, ...shuffled.slice(0, mixCount)];
}

export function pickRandomVehicle(pool: string[]): string {
  // 45% chance of primary (index 0), rest split evenly among others
  if (pool.length === 1 || Math.random() < 0.45) return pool[0];
  return pool[1 + Math.floor(Math.random() * (pool.length - 1))];
}

export function generateLane(laneIndex: number, difficulty: DifficultyConfig): LaneData {
  const cfg = vehicleForLane(laneIndex);

  const depthSpeedScale = 1 + laneIndex * 0.07;
  const depthDensityScale = 1 + laneIndex * 0.05;

  const speedPx = cfg.speedBase * difficulty.speedScale * depthSpeedScale;
  const adjustedDensity = cfg.spawnDensity * difficulty.densityScale * depthDensityScale;

  const vehicleH = cfg.hitboxHeight * LANE_WIDTH;
  const chickenH = 30;
  const minGap = chickenH * MIN_GAP_FACTOR;

  const baseSlot = GAME_HEIGHT / Math.max(adjustedDensity, 0.3);
  const guaranteedSlot = Math.max(baseSlot, vehicleH + minGap);

  const spawnInterval = Math.max(180, Math.round((guaranteedSlot / speedPx) * 1000));

  const direction: 1 | -1 = laneIndex % 2 === 0 ? 1 : -1;

  return {
    index: laneIndex,
    vehicleKey: cfg.key,
    vehiclePool: buildVehiclePool(laneIndex, cfg.key),
    direction,
    speedPx,
    spawnInterval,
    xCenter: laneXCenter(laneIndex),
  };
}

/**
 * Randomize a spawn interval to create unpredictable traffic patterns.
 * Returns a jittered interval between 50% and 150% of the base,
 * with occasional burst spawns (very short interval).
 */
export function jitteredSpawnInterval(baseInterval: number): number {
  const burstRoll = Math.random();
  if (burstRoll < 0.12) {
    // ~12% chance of burst: spawn very quickly after last vehicle
    return Math.max(120, baseInterval * (0.2 + Math.random() * 0.25));
  }
  if (burstRoll < 0.22) {
    // ~10% chance of lull: bigger gap, gives false sense of safety
    return baseInterval * (1.6 + Math.random() * 0.8);
  }
  // Normal: ±40% jitter
  const jitter = 0.6 + Math.random() * 0.8;
  return Math.max(150, Math.round(baseInterval * jitter));
}
