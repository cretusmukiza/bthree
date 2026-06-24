export type LaneDiscipline = 'holds' | 'curb' | 'wanders' | 'weaves';

export interface VehicleConfig {
  key: string;
  localName: string;
  imageKey?: string;     // Phaser texture key (if loaded); takes priority over emoji
  emojiUp: string;       // fallback: facing up (moving bottom→top)
  emojiDown: string;     // fallback: facing down (moving top→bottom)
  size: number;          // sprite/font size as fraction of LANE_WIDTH
  speedBase: number;
  speedJitter: number;   // ±fraction of speedBase for per-vehicle variation
  hitboxWidth: number;
  hitboxHeight: number;
  spawnDensity: number;
  discipline: LaneDiscipline;
  weaveAmplitude: number;
  weaveSpeed: number;
  minDebugLane: number;
}

export const VEHICLE_CONFIGS: Record<string, VehicleConfig> = {
  baiskeli: {
    key: 'baiskeli',
    localName: 'Baiskeli',
    imageKey: 'gari',
    emojiUp: '🚴',
    emojiDown: '🚴',
    size: 1.2,
    speedBase: 175,
    speedJitter: 0.25,
    hitboxWidth: 0.35,
    hitboxHeight: 0.45,
    spawnDensity: 5.0,
    discipline: 'wanders',
    weaveAmplitude: 0.3,
    weaveSpeed: 0.4,
    minDebugLane: 0,
  },
  guta: {
    key: 'guta',
    localName: 'Guta',
    imageKey: 'gari',
    emojiUp: '🛒',
    emojiDown: '🛒',
    size: 1.1,
    speedBase: 145,
    speedJitter: 0.2,
    hitboxWidth: 0.5,
    hitboxHeight: 0.5,
    spawnDensity: 4.0,
    discipline: 'wanders',
    weaveAmplitude: 0.2,
    weaveSpeed: 0.25,
    minDebugLane: 1,
  },
  boda: {
    key: 'boda',
    localName: 'Boda boda',
    imageKey: 'gari',
    emojiUp: '🏍️',
    emojiDown: '🏍️',
    size: 0.9,
    speedBase: 260,
    speedJitter: 0.3,
    hitboxWidth: 0.3,
    hitboxHeight: 0.35,
    spawnDensity: 6.5,
    discipline: 'weaves',
    weaveAmplitude: 0.7,
    weaveSpeed: 1.2,
    minDebugLane: 2,
  },
  bajaji: {
    key: 'bajaji',
    localName: 'Bajaji',
    imageKey: 'bajaji',
    emojiUp: '🛺',
    emojiDown: '🛺',
    size: 1.0,
    speedBase: 190,
    speedJitter: 0.2,
    hitboxWidth: 0.45,
    hitboxHeight: 0.5,
    spawnDensity: 5.0,
    discipline: 'wanders',
    weaveAmplitude: 0.4,
    weaveSpeed: 0.35,
    minDebugLane: 3,
  },
  gari: {
    key: 'gari',
    localName: 'Gari',
    imageKey: 'gari',
    emojiUp: '🚙',
    emojiDown: '🚗',
    size: 1.3,
    speedBase: 240,
    speedJitter: 0.12,
    hitboxWidth: 0.5,
    hitboxHeight: 0.55,
    spawnDensity: 4.5,
    discipline: 'holds',
    weaveAmplitude: 0,
    weaveSpeed: 0,
    minDebugLane: 4,
  },
  daladala: {
    key: 'daladala',
    localName: 'Daladala',
    imageKey: 'daladala',
    emojiUp: '🚌',
    emojiDown: '🚐',
    size: 1.5,
    speedBase: 170,
    speedJitter: 0.25,
    hitboxWidth: 0.6,
    hitboxHeight: 0.7,
    spawnDensity: 3.2,
    discipline: 'curb',
    weaveAmplitude: 0.3,
    weaveSpeed: 0.2,
    minDebugLane: 6,
  },
  lori: {
    key: 'lori',
    localName: 'Lori',
    imageKey: 'gari',
    emojiUp: '🚛',
    emojiDown: '🚚',
    size: 1.8,
    speedBase: 150,
    speedJitter: 0.08,
    hitboxWidth: 0.7,
    hitboxHeight: 0.8,
    spawnDensity: 2.4,
    discipline: 'holds',
    weaveAmplitude: 0,
    weaveSpeed: 0,
    minDebugLane: 8,
  },
};

export const LANE_SEQUENCE: string[] = [
  'baiskeli',
  'guta',
  'boda',
  'bajaji',
  'gari',
  'boda',
  'daladala',
  'gari',
  'lori',
];

export const HARD_POOL: string[] = ['boda', 'gari', 'daladala', 'lori', 'bajaji'];
