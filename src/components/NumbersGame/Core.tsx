
// import SYMBOLS from '../../data/symbols.json' with { type: "json" };

export const MAX_SEEDS = 6;
export const MAX_OPS = MAX_SEEDS - 1;
export const MAX_MOVES = MAX_OPS;
export const MAX_OPERANDS = 2;

const SYMBOLS = {
    SEEDS: [1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,25,50,75,100],
    OPS : ["+", "*", "-", "//"],
    GOAL_MIN : 100,
    GOAL_MAX : 999
   };


export const ALL_SEEDS: number[] = SYMBOLS["SEEDS"];
export const SEEDS = Array.from(new Set(ALL_SEEDS));
export const OP_SYMBOLS: string[] = SYMBOLS["OPS"];
export const GOAL_MIN = SYMBOLS["GOAL_MIN"];
export const GOAL_MAX = SYMBOLS["GOAL_MAX"];


export const NUM_REQUIRED_OPERANDS = Object.freeze(Object.fromEntries(OP_SYMBOLS.map((op) => [op, 2])));

// export declare const INVALID_ARGS: unique symbol;
// Deno 2.0.2 doesn't like the above
export const INVALID_ARGS = Symbol();

export type OP_RESULT = number | typeof INVALID_ARGS;

export type BINARY_OP = (x: number, y: number) => OP_RESULT;

const OP_FUNCS: BINARY_OP[] = [
    (x, y) => x+y,
    (x, y) => x*y,
    (x, y) => Math.abs(x-y),
    (x, y) => x % y === 0 ? x / y : 
                y % x === 0 ? y / x : 
                  INVALID_ARGS,
];

export const OPS = Object.freeze(Object.fromEntries(OP_SYMBOLS.map((op, i) => [op, OP_FUNCS[i]])));

