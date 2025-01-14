// ## After test failures:
// ```
// cd src\components\NumbersGame
// deno repl --unstable-sloppy-imports --allow-read --allow-env --eval-file=Schema.ts
// ```

import fc from 'fast-check';
import { expect, test } from 'vitest';
import { CustomGameID, Game, GameState, GradedGameID, Move } from './Classes';
import {
  FORMS,
  GOAL_MAX,
  GOAL_MIN,
  MAX_MOVES,
  MAX_OPERANDS,
  MAX_OPS,
  MAX_SEEDS,
  OP_SYMBOLS,
  SEEDS,
} from './Core';
import {
  CHUNK_SIZE,
  chunkify,
  deChunkify,
  destringifyCodeUnits,
  destringifyGame,
  destringifyGameID,
  stringifyCodeUnits,
  stringifyGame,
  stringifyGameID,
} from './Schema';

// const [destringifyGameID, stringifyGameID, destringifyGame, stringifyGame] = stringifiersAndGetters();

test('for all arrays of positive 15-bit integers, stringifyCodeUnits should roundtrip with Array.from(destringifyCodeUnits)', () => {
  fc.assert(
    fc.property(fc.array(fc.nat({ max: 32767 })), (UTF16codeUnits) => {
      const stringified = stringifyCodeUnits(UTF16codeUnits);
      const destringified = Array.from(destringifyCodeUnits(stringified));
      expect(destringified).toStrictEqual(UTF16codeUnits);
    })
  );
});

test('for all positiveintegers, chunkify should roundtrip with deChunkify', () => {
  fc.assert(
    fc.property(fc.nat(), (x) => {
      const bits = x.toString(2);
      const chunkified = chunkify(x, Math.ceil(bits.length / CHUNK_SIZE));
      const dechunkified = deChunkify(chunkified);
      expect(dechunkified).toStrictEqual(x);
    })
  );
});

test('for each GradedGameID, stringifyGameID should roundtrip with destringifyGameID', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 1, max: 246 }),
      fc.integer({ min: GOAL_MIN, max: GOAL_MAX }),
      fc.constantFrom(...FORMS),
      fc.nat({ max: 781176 }),
      (grade, goal, form, index) => {
        const gameID = new GradedGameID(grade, goal, form, index);
        const stringified = stringifyGameID(gameID);
        const destringifiedGameID = destringifyGameID(stringified);
        expect(gameID).toStrictEqual(destringifiedGameID);
      }
    )
  );
});

test('for each CustomGameID, stringifyGameID should roundtrip with destringifyGameID', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: GOAL_MIN, max: GOAL_MAX }),
      fc.array(seedIndex(), { maxLength: MAX_SEEDS }),
      fc.option(fc.integer({ min: 1, max: 246 })),
      fc.option(fc.constantFrom(...FORMS)),
      (goal, seedIndices, grade, form) => {
        const gameID = new CustomGameID(goal, seedIndices, grade, form);
        const stringified = stringifyGameID(gameID);
        const destringifiedGameID = destringifyGameID(stringified);
        expect(gameID).toStrictEqual(destringifiedGameID);
      }
    )
  );
});

const opIndex = () => fc.nat({ max: OP_SYMBOLS.length - 1 });
const seedIndex = () => fc.nat({ max: SEEDS.length - 1 });
// const operand = () => fc.nat({ max: SEEDS.length - 1 });

test('for each Game with a Graded GameID, stringifyGame should roundtrip with destringifyGame', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 1, max: 246 }),
      fc.integer({ min: GOAL_MIN, max: GOAL_MAX }),
      fc.constantFrom(...FORMS),
      fc.nat({ max: 781176 }),
      // A millisecond later than the max, is 2**45 miliseconds since 1970
      fc.date({ min: new Date(Date.now()), max: new Date('3084-12-12T12:41:28.831Z') }),
      fc.boolean(),
      fc.array(seedIndex(), { maxLength: MAX_SEEDS }),
      fc.array(opIndex(), { maxLength: MAX_OPS }),
      fc.array(
        fc.tuple(
          fc.nat({ max: OP_SYMBOLS.length - 1 }),
          fc.boolean(),
          fc.array(fc.nat({ max: MAX_SEEDS - 1 }), { maxLength: MAX_OPERANDS })
        ),
        { minLength: 1, maxLength: MAX_MOVES }
      ),
      (grade, goal, form, index, date, solved, seedIndices, opIndices, moves_data) => {
        const gameID = new GradedGameID(grade, goal, form, index);
        const moves = [];
        for (const move_args of moves_data) {
          const [opIndex, submitted, operandIndices] = move_args;
          const move = new Move(opIndex, submitted, operandIndices);
          moves.push(move);
        }
        const state = new GameState(solved, moves);

        const game = new Game(gameID, date.getTime(), seedIndices, opIndices, state);

        const stringified = stringifyGame(game);
        const destringifiedGame = destringifyGame(stringified, gameID);

        expect(game).toStrictEqual(destringifiedGame);
      }
    )
  );
});
