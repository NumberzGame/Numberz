
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { CustomGameID, GameState, GradedGameID, Move } from './Classes';
import {
  FORMS,
  GOAL_MAX,
  GOAL_MIN,
  MAX_MOVES,
  MAX_OPERANDS,
  MAX_SEEDS,
  OP_SYMBOLS,
  SEEDS,
} from './Core';



export const UTF16codeUnits = fc.array(fc.nat({ max: 32767 }))

export const grade = fc.integer({ min: 1, max: 246 });
export const goal = fc.integer({ min: GOAL_MIN, max: GOAL_MAX });
export const form = fc.constantFrom(...FORMS);
export const opIndex = fc.nat({ max: OP_SYMBOLS.length - 1 });
export const seedIndex = fc.nat({ max: SEEDS.length - 1 });

export const gradedGameIDs = fc.tuple(
  grade,
  goal,
  form,
  fc.nat({ max: 781176 }),
  ).map(
  ([grade, goal, form, index]) => new GradedGameID(grade, goal, form, index));

  
export const customGameIDs = fc.tuple(
  goal,
  fc.array(seedIndex, { maxLength: MAX_SEEDS }),
  fc.option(grade),
  form,
  ).map(
  ([goal, seedIndices, grade, form]) => new CustomGameID(goal, seedIndices, grade, form));
  

export const move = fc.tuple(
  fc.nat({ max: OP_SYMBOLS.length - 1 }),
  fc.array(fc.nat({ max: MAX_SEEDS - 1 }), { maxLength: MAX_OPERANDS }),
  fc.boolean(),
  fc.option(grade),
).map(([opIndex, operandIndices, submitted, grade]) => new Move(opIndex, operandIndices, submitted));

export const moves = fc.array(
  move,
  { minLength: 1, maxLength: MAX_MOVES },
)

export const hints = fc.array(
  fc.tuple(moves,move),
  { maxLength: MAX_MOVES}
).map((arr) => {
    const hintsObj: Record<string, Move> = {};
    for (const [moves, hint] of arr) {
        hintsObj[GameState._makeHintKey(moves)] = hint;
    }
    return hintsObj;
});


test('Move.codeUnit roundtrips with Move.fromCodeUnit',() => {
  fc.assert(
    fc.property(move, (move) => {
    const moveCodeUnit = move.codeUnit();
    const moveFromCodeUnit = Move.fromCodeUnit(moveCodeUnit, move.grade);
    expect(moveFromCodeUnit).toStrictEqual(move);
    })  
  )
});