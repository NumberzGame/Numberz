

import { difficultyOfSum, difficultyOfProduct,
    difficultyOfDifference, difficultyOfLongDivision } from "additional_difficulty";

import SYMBOLS from '../../data/symbols.json' with { type: "json" };
import {OPS, INVALID_ARGS } from '../Core';

export const GOAL_MIN = SYMBOLS["GOAL_MIN"];
export const GOAL_MAX = SYMBOLS["GOAL_MAX"];

export type Operand = number;
export type Operands = [number, number];
export type Op = string;
export type Result = number;
export type Grade = number;
export type OpFunc = (x: Operand, y: Operand) => Operand | typeof INVALID_ARGS | null;

export type OpsCacheKey = Operands;
export type OpsCacheVal = Record<Op,[Result, Grade]>;
export type OpsCache = Map<OpsCacheKey, OpsCacheVal>;
export type DifficultyCalculator = (a: Operand, b: Operand) => Grade;
export type DifficultyCalculators = Record<Op, DifficultyCalculator>;

export const opsCache: OpsCache = new Map();


export const DIFFICULTY_CALCULATORS: DifficultyCalculators = {
    "+": difficultyOfSum,
    "*": difficultyOfProduct,
    "-": difficultyOfDifference,
    //  ,'//' : additional_difficulty.division.difficulty_of_long_division
    "//": difficultyOfLongDivision,
}


export function opsCacheKey(a: Operand, b: Operand): OpsCacheKey{
    // Defines the key structure.
    // all ops are commutative so no need
    // to cache both op(a,b) and op(b,a)
    return a <= b ? [a, b] : [b, a];
}


function* opsAndLevelsGen(
    a: Operand,
    b: Operand,
    ops: Record<string, OpFunc> = OPS,
    level_calulators: DifficultyCalculators = DIFFICULTY_CALCULATORS,
    ): IterableIterator<[OpsCacheKey,OpsCacheVal]> {

}


export function opsAndLevelsResults(
    a: Operand,
    b: Operand,
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