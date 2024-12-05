import { expect, test } from 'vitest'
import fc from 'fast-check';

import { GOAL_MIN, GOAL_MAX } from './Core';
import { GameID, Forms } from './Classes';
import { getGameID, stringifyGameID } from './Schema';

// const [getGameID, stringifyGameID, getGame, stringifyGame] = stringifiersAndGetters();

test('for each GameID, stringifyGameID should roundtrip with getGameID', () => {
    fc.assert(
      fc.property(fc.integer({min: 1, max: 223}),
                  fc.integer({min: GOAL_MIN, max: GOAL_MAX}),
                  fc.constantFrom(...Forms),
                  fc.nat({max: 781176}),
                  (grade, goal, form, index) => {
        const gameID = new GameID(grade, goal, form, index);
        const stringified = stringifyGameID(gameID);
        const destringifiedGameID = getGameID(stringified);
        expect(gameID.grade).toStrictEqual(destringifiedGameID.grade);
        expect(gameID.goal).toStrictEqual(destringifiedGameID.goal);
        expect(gameID.form).toStrictEqual(destringifiedGameID.form);
        expect(gameID.index).toStrictEqual(destringifiedGameID.index);
      }),
    );
  });