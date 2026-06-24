const _w = typeof window !== 'undefined' ? window.innerWidth : 896;
const _h = typeof window !== 'undefined' ? window.innerHeight : 720;
const _portrait = _h > _w;
const _mobile = _w < 768;

export const GAME_WIDTH = (_mobile && _portrait) ? 480 : 896;
export const GAME_HEIGHT = (_mobile && _portrait)
  ? Math.round(GAME_WIDTH * (_h / _w) * 0.92)
  : 720;

export const LANE_WIDTH = 64;
export const MEDIAN_WIDTH = 30;

export const ROAD_TOP = 0;
export const ROAD_BOTTOM = GAME_HEIGHT;

// Left curb where the chicken starts
export const CURB_X = 50;

// World scrolls horizontally as chicken crosses
export const WORLD_WIDTH = 3200;

export const VISIBLE_LANES = 20;

// Hop animation in ms — snappy, decisive
export const HOP_DURATION = 250;

// Fraction of hop where chicken is vulnerable (wide window = real danger)
export const DANGER_START = 0.12;
export const DANGER_END = 0.88;

export const STARTING_BALANCE = 1000;

// Gap must be at least this × chicken height (tight but passable)
export const MIN_GAP_FACTOR = 1.15;
