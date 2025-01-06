

import { difficultyOfSum, difficultyOfProduct,
    difficultyOfDifference, difficultyOfLongDivision } from "additional_difficulty";

import SYMBOLS from '../../data/symbols.json' with { type: "json" };
import {OPS, INVALID_ARGS } from '../Core';

export type ValueOf<T> = T[keyof T];

export const GOAL_MIN = SYMBOLS["GOAL_MIN"];
export const GOAL_MAX = SYMBOLS["GOAL_MAX"];

export type Seed= number;
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
export type OpsCacheValT = Record<Op,[Result, Grade]>;
export type OpsCacheT = Map<OpsCacheKeyT, OpsCacheValT>;
export type DifficultyCalculator = (a: OperandT, b: OperandT) => Grade;
export type DifficultyCalculators = Record<Op, DifficultyCalculator>;

export type ResultsAndGradesCacheT = Record<Result,Map<OpsCacheKeyT,Record<Op,Grade>>>;
export type AllDepthsCacheT = Record<number,ResultsAndGradesCacheT>
export type ResultsAndGradesCachesT = {"forward": AllDepthsCacheT,
                                       "reverse": AllDepthsCacheT,
                                      };

export interface GOALS_T extends Iterable<Goal> {
    length: number
}

export const GOALS = Object.freeze({
    *[Symbol.iterator]() {
        for (let goal = GOAL_MIN; goal <= GOAL_MAX; goal++) {
            yield goal;
        } 
    },
    "length" : GOAL_MAX - GOAL_MIN + 1,
    });
                                        
export const opsCache: OpsCacheT = new Map();
export const resultsAndGradesCaches: ResultsAndGradesCachesT = {"forward": {}, "reverse": {}};


export const DIFFICULTY_CALCULATORS: DifficultyCalculators = {
    "+": difficultyOfSum,
    "*": difficultyOfProduct,
    "-": difficultyOfDifference,
    //  ,'//' : additional_difficulty.division.difficulty_of_long_division
    "//": difficultyOfLongDivision,
}

// Normal as in unexceptional
export const normalInverses: Record<Op, Op> = {
    "+": "-",  // we know goal >= 0 so goal == a-b == |a-b|
    "*": "//",
    "-": "+",
    "//": "*",  // if a // b is not None
}

export function opsCacheKey(a: OperandT, b: OperandT): OpsCacheKeyT{
    // Defines the key structure.
    // all ops are commutative so no need
    // to cache both op(a,b) and op(b,a)
    return a <= b ? [a, b] : [b, a];
}


function makeCounter<T>(arr: OperandT[]): Counter {
    const obj: Counter = {};
    arr.forEach((x) => {const s = x.toString(); 
                        obj[s] ??= 0;
                        obj[s] += 1;
                       }
               );
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
    level_calulators: DifficultyCalculators = DIFFICULTY_CALCULATORS,
    ): IterableIterator<[Op, [Result, Grade]]> {
    // Yields the not-null and not-INVALID_ARGS results of applying all ops to a and b."""

    for (const [symbol, op] of Object.entries(ops)){
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
    cache: OpsCacheT = opsCache,
) : OpsCacheValT {
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


export function inverseOp(symbol: Op, operand: OperandT, goal: Result): Op{
    // sub_goal == goal symbol seed,
    //
    // symbol in our special commutative versions of (+, -, *, //)
    // in core.OPS

    if ((symbol === "-") && (goal < operand)){
        return "-";
        // switch the order to support validation via eval.
    } else if ((symbol === "//") && (operand % goal === 0)){
        return "//";
        // switch the order even though our ops are commutative, as above.
    } else {
        return normalInverses[symbol];
    }
}


export function* combinations<T>(n: number, arr: T[]): IterableIterator<T[]> {

    if (n > arr.length) {
        throw new Error(`Not enough items in: ${arr} for combinations of length: ${n}.`);
    }

    if (n===1) {
        for (const x of arr) {
            yield [x];
        }
        return;
    }

    for (let i = 0; i < arr.length+1-n; i++) {

        for (const combination of combinations(n-1, arr.slice(i+1))) {
            yield [arr[i], ...combination];
        }
    }
}