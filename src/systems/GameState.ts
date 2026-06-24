import { DifficultyKey } from '../config/difficulty';
import { STARTING_BALANCE } from '../constants';

export type RoundPhase = 'IDLE' | 'ACTIVE' | 'HOPPING' | 'ENDED';
export type RoundResult = 'win' | 'loss' | null;

export interface GameState {
  balance: number;
  stake: number;
  difficulty: DifficultyKey;
  phase: RoundPhase;
  multiplier: number;
  lanesCleared: number;
  lastResult: RoundResult;
  lastPayout: number;
}

export function createInitialState(): GameState {
  return {
    balance: STARTING_BALANCE,
    stake: 10,
    difficulty: 'wastani',
    phase: 'IDLE',
    multiplier: 1.0,
    lanesCleared: 0,
    lastResult: null,
    lastPayout: 0,
  };
}

export function potentialPayout(state: GameState): number {
  return Math.floor(state.stake * state.multiplier);
}

export function nextMultiplier(state: GameState, factor: number): number {
  return Math.round(state.multiplier * factor * 100) / 100;
}
