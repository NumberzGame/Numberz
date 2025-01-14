import {
  difficultyOfDifference,
  difficultyOfLongDivision,
  difficultyOfProduct,
  difficultyOfSum,
} from 'additional_difficulty';
import SYMBOLS from '../../data/symbols.json' with { type: 'json' };
import { HashTable, INVALID_ARGS, MAX_SEEDS, OPS } from '../Core';

export type ValueOf<T> = T[keyof T];

export const GOAL_MIN = SYMBOLS.GOAL_MIN;
export const GOAL_MAX = SYMBOLS.GOAL_MAX;

export type Seed = number;
export type OperandT = number;
export type OperandsT = [number, number];
export type Op = string;
export type Result = number;
export type Goal = Result;
export type Grade = number;
export type SolutionForm = number | [SolutionForm, SolutionForm] | [];
export type OpFunc = (x: OperandT, y: OperandT) => OperandT | typeof INVALID_ARGS | null;
type Counter = Record<string, number>;

export type OpsCacheKeyT = OperandsT;
export type OpsCacheValT = Record<Op, [Result, Grade]>;
export type OpsCacheT = HashTable<OpsCacheKeyT, OpsCacheValT>;
export type DifficultyCalculator = (a: OperandT, b: OperandT) => Grade;
export type DifficultyCalculators = Record<Op, DifficultyCalculator>;

export type ResultsAndGradesCacheT = Record<Result, HashTable<OpsCacheKeyT, Record<Op, Grade>>>;
export type AllDepthsCacheT = Record<number, ResultsAndGradesCacheT>;
export type ResultsAndGradesCachesT = { forward: AllDepthsCacheT; reverse: AllDepthsCacheT };

export interface GOALS_T extends Iterable<Goal> {
  length: number;
}

export const GOALS = Object.freeze({
  *[Symbol.iterator]() {
    for (let goal = GOAL_MIN; goal <= GOAL_MAX; goal++) {
      yield goal;
    }
  },
  length: GOAL_MAX - GOAL_MIN + 1,
});

export const opsCache: OpsCacheT = new HashTable<OpsCacheKeyT, OpsCacheValT>();
export const resultsAndGradesCaches: ResultsAndGradesCachesT = { forward: {}, reverse: {} };

export const DIFFICULTY_CALCULATORS: DifficultyCalculators = {
  '+': difficultyOfSum,
  '*': difficultyOfProduct,
  '-': difficultyOfDifference,
  //  ,'//' : additional_difficulty.division.difficulty_of_long_division
  '/': difficultyOfLongDivision,
};

// "Normal", as in unexceptional
export const normalInverses: Record<Op, Op> = {
  '+': '-', // we know goal >= 0 so goal == a-b == |a-b|
  '*': '/',
  '-': '+',
  '/': '*', // if a // b is not None
};

export function opsCacheKey(a: OperandT, b: OperandT): OpsCacheKeyT {
  // Defines the key structure.
  // all ops are commutative so no need
  // to cache both op(a,b) and op(b,a)
  return a <= b ? [a, b] : [b, a];
}

function makeCounter(arr: OperandT[]): Counter {
  const obj: Counter = {};
  arr.forEach((x) => {
    const s = x.toString();
    obj[s] ??= 0;
    obj[s] += 1;
  });
  return obj;
}

export function enoughSeeds(operands: OperandT[], seeds: OperandT[]): boolean {
  const operandsCounter = makeCounter(operands);
  const seedsCounter = makeCounter(seeds);
  return operands.every((num) => operandsCounter[num.toString()] <= seedsCounter[num.toString()]);
}

function* opsAndLevelsGen(
  a: OperandT,
  b: OperandT,
  ops: Record<string, OpFunc> = OPS,
  level_calulators: DifficultyCalculators = DIFFICULTY_CALCULATORS
): IterableIterator<[Op, [Result, Grade]]> {
  // Yields the not-null and not-INVALID_ARGS results of applying all ops to a and b."""

  for (const [symbol, op] of Object.entries(ops)) {
    const level_calulator = level_calulators[symbol];
    const result = op(a, b);

    // # Skip division with non-zero remainders, and x-x == 0
    if (result === INVALID_ARGS || result === null) {
      continue;
    }

    const level = level_calulator(a, b);

    yield [symbol, [result, level]];
  }
}

export function opsAndLevelsResults(
  a: OperandT,
  b: OperandT,
  cache: OpsCacheT = opsCache
): OpsCacheValT {
  //Memoises ops_and_levels_gen using, or updating the cache provided.
  //Returns the not None results of applying all ops to a and b.

  const key = opsCacheKey(a, b);
  let results: OpsCacheValT;

  if (cache.has(key)) {
    results = cache.get(key)!;
  } else {
    results = Object.fromEntries(opsAndLevelsGen(a, b));
    cache.set(key, results);
  }

  // Adds 2 + 2 == 4 as well as 2 * 2 == 4
  return results;
}

export function inverseOp(symbol: Op, operand: OperandT, goal: Result): Op {
  // sub_goal == goal symbol seed,
  //
  // symbol in our special commutative versions of (+, -, *, //)
  // in core.OPS

  // # E.g.  if the goal (e.g. key in reverse caches[2]) is 4, and we
  // # also have an operand of 140, we could reach 136 == |4 - 140|as a sub goal.
  // #  To invert this in a solution expr equal to 4 however,
  // # Needs the order of operands swapping, and the same op, as:
  // # 4 = |140-136|
  if (symbol === '-' && goal < operand) {
    return '-';
    // switch the order to support validation via eval.
  }

  // # E.g. if the goal is 2, and we have an operand of 16,
  // # we could reach 8 == 2 -//- 16.  But the inverse op
  // # needed to construct a sol expr for 2 then comes from
  // # 2 == 8 -//- 16 == 16 // 8
  if (symbol === '/' && operand % goal === 0) {
    return '/';
    // switch the order even though our ops are commutative, as above.
  }

  return normalInverses[symbol];
}

export function default_max_num(max_num: number | null, max_: number | null = null): number {
  let cap = max_num;
  if (cap === null) {
    cap = MAX_SEEDS;
  }
  if (max_ === null) {
    return cap;
  }
  return Math.min(max_, cap);
}

export function* combinations<T>(n: number, arr: T[]): IterableIterator<T[]> {
  if (n > arr.length) {
    throw new Error(`Not enough items in: ${arr} for combinations of length: ${n}.`);
  }

  if (n === 1) {
    for (const x of arr) {
      yield [x];
    }
    return;
  }

  for (let i = 0; i < arr.length + 1 - n; i++) {
    for (const combination of combinations<T>(n - 1, arr.slice(i + 1))) {
      yield [arr[i], ...combination];
    }
  }
}

export function* permutations<T>(n: number, arr: T[]): IterableIterator<T[]> {
  if (n > arr.length) {
    throw new Error(`Not enough items in: ${arr} for permutations of length: ${n}.`);
  }

  if (n === 1) {
    for (const x of arr) {
      yield [x];
    }
    return;
  }

  for (let i = 0; i < arr.length; i++) {
    const first = arr[i];
    const rest = arr.toSpliced(i, 1);

    for (const permutation of permutations<T>(n - 1, rest)) {
      yield [first, ...permutation];
    }
  }
}
