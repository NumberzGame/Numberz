
import SYMBOLS from '../../data/symbols.json' with { type: "json" };

export const ALL_SEEDS = SYMBOLS["SEEDS"];
export const SEEDS = Array.from(new Set(ALL_SEEDS));
export const OPS = SYMBOLS["OPS"];
export const GOAL_MIN = SYMBOLS["GOAL_MIN"];
export const GOAL_MAX = SYMBOLS["GOAL_MAX"];