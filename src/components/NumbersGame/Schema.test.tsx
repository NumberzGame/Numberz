import { expect, test } from 'vitest'
import fc from 'fast-check';

import { OPS,SEEDS,GOAL_MIN, GOAL_MAX } from './Core';
import { GameID, Forms, Game, Move, GameState } from './Classes';
import { destringifyGameID, stringifyGameID, destringifyGame, 
         stringifyGame, MAX_SEEDS, MAX_OPERANDS, MAX_MOVES,
         CHUNK_SIZE, chunkify, deChunkify,
         stringifyCodeUnits, destringifyCodeUnits, } from './Schema';

// const [destringifyGameID, stringifyGameID, destringifyGame, stringifyGame] = stringifiersAndGetters();

test('for all arrays of positive 15-bit integers, stringifyCodeUnits should roundtrip with Array.from(destringifyCodeUnits)', () => {
  fc.assert(
    fc.property(fc.array(fc.nat({max:32767})),
                (UTF16codeUnits) => {
      const stringified = stringifyCodeUnits(UTF16codeUnits);
      const destringified = Array.from(destringifyCodeUnits(stringified));
      expect(destringified).toStrictEqual(UTF16codeUnits);
    }),
  );
});

test('for all positiveintegers, chunkify should roundtrip with deChunkify', () => {
  fc.assert(
    fc.property(fc.nat(),
                (x) => {
      const bits = x.toString(2);
      const chunkified = chunkify(x, Math.ceil(bits.length / CHUNK_SIZE));
      const dechunkified = deChunkify(chunkified);
      expect(dechunkified).toStrictEqual(x);
    }),
  );
});

test('for each GameID, stringifyGameID should roundtrip with destringifyGameID', () => {
    fc.assert(
      fc.property(fc.integer({min: 1, max: 223}),
                  fc.integer({min: GOAL_MIN, max: GOAL_MAX}),
                  fc.constantFrom(...Forms),
                  fc.nat({max: 781176}),
                  (grade, goal, form, index) => {
        const gameID = new GameID(grade, goal, form, index);
        const stringified = stringifyGameID(gameID);
        const destringifiedGameID = destringifyGameID(stringified);
        expect(gameID).toStrictEqual(destringifiedGameID);
      }),
    );
  });


const seedIndex = () => fc.nat({max: SEEDS.length-1 });
const operand = () => fc.nat({max: SEEDS.length-1 });

test('for each Game, stringifyGame should roundtrip with destringifyGame', () => {
  fc.assert(
    fc.property(fc.integer({min: 1, max: 223}),
                fc.integer({min: GOAL_MIN, max: GOAL_MAX}),
                fc.constantFrom(...Forms),
                fc.nat({max: 781176}),
                // A millisecond later than the max, is 2**45 miliseconds since 1970
                fc.date({min: new Date(Date.now()), max: new Date("3084-12-12T12:41:28.831Z")}),
                fc.boolean(), 
                fc.array(seedIndex(), {maxLength: MAX_SEEDS }),
                fc.array(fc.tuple(fc.nat({max:OPS.length-1}),
                                  fc.array(fc.nat({max:MAX_SEEDS-1}),
                                           {maxLength: MAX_OPERANDS})),
                        {maxLength: MAX_MOVES }
                ),
                (grade, goal, form, index, date, solved,seedIndices, moves_data) => {
      const gameID = new GameID(grade, goal, form, index);
      const moves = [];
      for (const move_args of moves_data) {
        const [opIndex, operandIndices] = move_args; 
        const move = new Move(opIndex, operandIndices);
        moves.push(move);
      }
      const state = new GameState(solved, moves);

      const game = new Game(gameID, date.getTime(), seedIndices, state);

      const stringified = stringifyGame(game);
      const destringifiedGame = destringifyGame(stringified, gameID);

      expect(game).toStrictEqual(destringifiedGame);
    }),
  );
});