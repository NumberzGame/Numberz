import {
  difficultyOfDifference,
  difficultyOfLongDivision,
  difficultyOfProduct,
  difficultyOfSum,
} from 'additional_difficulty';

// Works in Deno
import SYMBOLS from '../data/symbols.json' with { type: 'json' };

// Works in Vite / ESBuild:
// import SYMBOLS from '../data/symbols.json';

// An import declaration can only be used at the top level of a namespace or module,
// so this doesn't work either:
// let SYMBOLS;
// if ("Deno" in window) {
// import SYMBOLS from '../../data/symbols.json' with { type: "json" };
// } else {
//   import SYMBOLS from '../../data/symbols.json';
// }

// export type Enumerate<N extends number, Acc extends number[] = []> = Acc['length'] extends N
//   ? Acc[number]
//   : Enumerate<N, [...Acc, Acc['length']]>;

// export type Range<F extends number, T extends number> = Exclude<Enumerate<T>, Enumerate<F>>;

export const MAX_SEEDS = 6;
export const MAX_OPS = MAX_SEEDS - 1;
export const MAX_MOVES = MAX_OPS;
export const MAX_OPERANDS = 2;
export const NO_MOVE = 0xd7fc;

// const SYMBOLS = {
//     SEEDS: [1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,25,50,75,100],
//     OPS : ["+", "*", "-", "/"],
//     GOAL_MIN : 100,
//     GOAL_MAX : 999
//    };

export const ALL_SEEDS: number[] = SYMBOLS.SEEDS;
export const SEEDS = Array.from(new Set(ALL_SEEDS));
export const OP_SYMBOLS: string[] = SYMBOLS.OPS;
export const GOAL_MIN = SYMBOLS.GOAL_MIN;
export const GOAL_MAX = SYMBOLS.GOAL_MAX;
export const FORMS = SYMBOLS.FORMS;

export const NUM_REQUIRED_OPERANDS = Object.freeze(
  Object.fromEntries(OP_SYMBOLS.map((op) => [op, 2]))
);

// export declare const INVALID_ARGS: unique symbol;
// Deno 2.0.2 doesn't like the above
export const INVALID_ARGS = Symbol();

export type OP_RESULT = number | typeof INVALID_ARGS | null;

export type BINARY_OP = (x: number, y: number) => OP_RESULT;

const OP_FUNCS: BINARY_OP[] = [
  (x, y) => x + y,
  (x, y) => x * y,
  (x, y) => Math.abs(x - y),
  (x, y) => (x === 0 ? INVALID_ARGS :
             y === 0 ? INVALID_ARGS :
             x % y === 0 ? x / y : 
             y % x === 0 ? y / x : 
             INVALID_ARGS
            ),
];

export const OPS = Object.freeze(Object.fromEntries(OP_SYMBOLS.map((op, i) => [op, OP_FUNCS[i]])));

export type GRADER = (x: number, y: number, r?: number, c?: number) => number;

const GRADERS_LIST: GRADER[] = [
  difficultyOfSum,
  difficultyOfProduct,
  difficultyOfDifference,
  difficultyOfLongDivision,
];

export const GRADERS = Object.freeze(Object.fromEntries(OP_SYMBOLS.map((op, i) => [op, GRADERS_LIST[i]])));
export class Operand {
  readonly val: number;
  readonly expr: string;

  constructor(val: number, expr: string | null = null) {
    this.val = val;
    this.expr = expr ?? val.toString(10);
  }
}

export const randomPositiveInteger = function (lessThan: number): number {
  return Math.floor(Math.random() * Math.floor(lessThan));
};

export function* takeNextN<T>(
  N: number,
  iterator: IterableIterator<T>,
  errorMessage: string | null = null
): IterableIterator<T> {
  // Iterator.prototype.take is not supported on Safari (as of 10 Dec 2024)
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Iterator/take
  // const NResults = codeUnitsIterator.take(N);

  const errorStr =
    errorMessage ??
    `iterator: ${iterator} exhausted. Too few items yielded for required number: N=${N}`;

  for (let i = 0; i < N; i++) {
    const result = iterator.next();
    if (result.done) {
      throw new Error(errorStr);
    }
    yield result.value;
  }
}

export class HashTable<K, V> {
  // A wrapper for Map, that behaves like a Python dict (that supports 
  // non-hashable keys as we don't have tuples in JS).
  // i.e. hashTable([1,2]) === hashTable([1,2])
  // Otherwise in JS, map([1,2]) != map([1,2]), due to the SameValueZero 
  // implementation (Sets have a similar gotcha with non-primitives).
  map: Map<string, V>;
  constructor() {
    this.map = new Map<string, V>();
  }
  makeKey(key: K): string {
    return JSON.stringify(key);
  }
  get(key: K): V | undefined {
    return this.map.get(this.makeKey(key));
  }
  set(key: K, val: V) {
    this.map.set(this.makeKey(key), val);
  }
  has(key: K): boolean {
    return this.map.has(this.makeKey(key));
  }
  size(): number {
    return this.map.size;
  }
  keys(): K[] {
    return Array.from(this.map.keys()).map((s) => JSON.parse(s));
  }
  entries(): [K, V][] {
    return Array.from(this.map.entries().map(([s, v]) => [JSON.parse(s), v]));
  }
  values(): V[] {
    return Array.from(this.map.values());
  }
  
  toStringKeyedObject(): Record<string,V> {
    return Object.fromEntries(this.map.entries());
  }
  // Doesn't support nested maps, and is not likely to work on anything complicated.
  toJSON(): string {
    return JSON.stringify(this.toStringKeyedObject());
  }
}