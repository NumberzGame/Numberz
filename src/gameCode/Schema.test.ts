// ## After test failures:
// ```
// cd src\components\NumbersGame
// deno repl --unstable-sloppy-imports --allow-read --allow-env --eval-file=Schema.ts
// ```

import fc from 'fast-check';
import { expect, test } from 'vitest';
import { Game, GameState } from './Classes';
import { UTF16codeUnits, gradedGameIDs, customGameIDs, seedIndex, opIndex, moves, hints } from './Classes.test';
import {
  MAX_OPS,
  MAX_SEEDS,
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
    fc.property(UTF16codeUnits, (UTF16codeUnits) => {
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
    fc.property(gradedGameIDs, (gameID) => {
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
        customGameIDs,
        (gameID) => {
        const stringified = stringifyGameID(gameID);
        const destringifiedGameID = destringifyGameID(stringified);
        expect(gameID).toStrictEqual(destringifiedGameID);
      }
    )
  );
});

// const hints = [];
// for (const hint_args of hintsData) {
//   const [opIndex, operandIndices] = hint_args;
//   const hint = new Move(opIndex, operandIndices, false);
//   hints.push(hint);
// }

test('for each Game with a Graded GameID, stringifyGame should roundtrip with destringifyGame', () => {
  fc.assert(
    fc.property(
      gradedGameIDs,
      // A millisecond later than the max, is 2**45 miliseconds since 1970
      fc.date({ min: new Date(Date.now()), max: new Date('3084-12-12T12:41:28.831Z') }),
      fc.boolean(),
      fc.array(seedIndex, { maxLength: MAX_SEEDS }),
      fc.array(opIndex, { maxLength: MAX_OPS }),
      moves,
      hints,
      (gameID, date, solved, seedIndices, opIndices, moves, hints) => {
        const state = new GameState(solved, moves, hints);

        const game = new Game(gameID, date.getTime(), seedIndices, opIndices, state);

        const stringified = stringifyGame(game);
        const destringifiedGame = destringifyGame(stringified, gameID);

        expect(game).toStrictEqual(destringifiedGame);
      }
    )
  );
});
