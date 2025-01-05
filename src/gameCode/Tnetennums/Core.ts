

import { difficultyOfSum, difficultyOfProduct,
    difficultyOfDifference, difficultyOfLongDivision } from "additional_difficulty";

import SYMBOLS from '../../data/symbols.json' with { type: "json" };
import {OPS, INVALID_ARGS } from '../Core';

export type ValueOf<T> = T[keyof T];

export const GOAL_MIN = SYMBOLS["GOAL_MIN"];
export const GOAL_MAX = SYMBOLS["GOAL_MAX"];

export type OperandT = number;
export type OperandsT = [number, number];
export type Op = string;
export type Result = number;
export type Grade = number;
export type OpFunc = (x: OperandT, y: OperandT) => OperandT | typeof INVALID_ARGS | null;
type Counter = Record<string, number>;

export type OpsCacheKey = OperandsT;
export type OpsCacheVal = Record<Op,[Result, Grade]>;
export type OpsCache = Map<OpsCacheKey, OpsCacheVal>;
export type DifficultyCalculator = (a: OperandT, b: OperandT) => Grade;
export type DifficultyCalculators = Record<Op, DifficultyCalculator>;

export const opsCache: OpsCache = new Map();


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

export function opsCacheKey(a: OperandT, b: OperandT): OpsCacheKey{
    // Defines the key structure.
    // all ops are commutative so no need
    // to cache both op(a,b) and op(b,a)
    return a <= b ? [a, b] : [b, a];
}


function makeCounter<T>(arr: OperandT[]): Counter {
    const obj: Counter = {};
    arr.forEach((x) => {const s = x.toString(); obj[s] = (obj[s] ?? 0) + 1;});
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
    ): IterableIterator<[keyof OpsCacheVal, ValueOf<OpsCacheVal>]> {
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
    cache: OpsCache = opsCache,
) : OpsCacheVal {
    //Memoises ops_and_levels_gen using, or updating the cache provided.
    //Returns the not None results of applying all ops to a and b.
    
    const key = opsCacheKey(a, b);
    let results: OpsCacheVal;

    if (cache.has(key)) {
        results = cache.get(key)!;
    } else {
        results = Object.fromEntries(opsAndLevelsGen(a, b));
        cache.set(key, results);
    }

    // Adds 2 + 2 == 4 as well as 2 * 2 == 4
    return results;
}


export function inverse_op(symbol: Op, operand: OperandT, goal: Result): Op{
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