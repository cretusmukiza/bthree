export type DifficultyKey = 'rahisi' | 'wastani' | 'ngumu' | 'hatari';

export interface DifficultyConfig {
  key: DifficultyKey;
  label: string;          // Swahili name
  multiplierFactor: number;
  speedScale: number;     // multiplied against vehicle speedBase
  densityScale: number;   // multiplied against spawnDensity (higher = tighter gaps)
  color: number;          // Phaser hex color for UI accent
}

export const DIFFICULTIES: Record<DifficultyKey, DifficultyConfig> = {
  rahisi: {
    key: 'rahisi',
    label: 'Rahisi',
    multiplierFactor: 1.12,
    speedScale: 0.80,
    densityScale: 0.7,
    color: 0x4ade80,
  },
  wastani: {
    key: 'wastani',
    label: 'Wastani',
    multiplierFactor: 1.30,
    speedScale: 1.00,
    densityScale: 1.0,
    color: 0xfacc15,
  },
  ngumu: {
    key: 'ngumu',
    label: 'Ngumu',
    multiplierFactor: 1.55,
    speedScale: 1.30,
    densityScale: 1.4,
    color: 0xf97316,
  },
  hatari: {
    key: 'hatari',
    label: 'Hatari',
    multiplierFactor: 2.00,
    speedScale: 1.62,
    densityScale: 1.9,
    color: 0xef4444,
  },
};

export const DIFFICULTY_ORDER: DifficultyKey[] = ['rahisi', 'wastani', 'ngumu', 'hatari'];
