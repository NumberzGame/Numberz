
import SYMBOLS from '../../data/symbols.json' with { type: "json" };

export const ALL_SEEDS = SYMBOLS["SEEDS"];
export const SEEDS = Array.from(new Set(ALL_SEEDS));
export const OP_SYMBOLS = SYMBOLS["OPS"];
export const GOAL_MIN = SYMBOLS["GOAL_MIN"];
export const GOAL_MAX = SYMBOLS["GOAL_MAX"];


export const NUM_REQUIRED_OPERANDS = Object.freeze(Object.fromEntries(OP_SYMBOLS.map((op) => [op, 2])));

// export declare const INVALID_ARGS: unique symbol;
// Deno 2.0.2 doesn't like the above
export const INVALID_ARGS = Symbol();

type BINARY_OP = (x: number, y: number) => number | typeof INVALID_ARGS;

const OP_FUNCS: BINARY_OP[] = [
    (x, y) => x+y,
    (x, y) => x*y,
    (x, y) => Math.abs(x-y),
    (x, y) => x % y === 0 ? x / y : 
                y % x === 0 ? y / x : 
                  INVALID_ARGS,
];

export const OPS = Object.freeze(Object.fromEntries(OP_SYMBOLS.map((op, i) => [op, OP_FUNCS[i]])));

