// deno run --unstable-sloppy-imports --allow-read --allow-env RoundtripStringifyGame.tsx
// or:
// deno repl --unstable-sloppy-imports --allow-read --allow-env --eval-file=RoundtripStringifyGame.tsx
import { Game, GameState, GradedGameID, Move } from './Classes';
import { destringifyGame, stringifyGame } from './Schema';

const [grade, goal, form, index, date, solved, seedIndices, opIndices, moves_data] = [
  1,
  100,
  '2',
  0,
  new Date('2024-12-14T16:51:16.779Z'),
  false,
  [],
  [],
  [
    [0, false, []],
    [0, false, []],
  ],
];

const gameID = new GradedGameID(grade, goal, form, index);
const moves: Move[] = [];
for (const move_args of moves_data) {
  const opIndex: number = move_args[0] as number;
  const submitted: boolean = move_args[1] as boolean;
  const operandIndices: number[] = move_args[2] as number[];
  const move = new Move(opIndex, operandIndices);
  moves.push(move);
}
const state = new GameState(solved, moves);

const game = new Game(gameID, date.getTime(), seedIndices, opIndices, state);

// eslint-disable-next-line no-console
console.log(game);
const stringified = stringifyGame(game);
const destringifiedGame = destringifyGame(stringified, gameID);

// eslint-disable-next-line no-console
console.log(destringifiedGame);

// console.log(Array.from(checkItemsFitAndPadIterable([0], MAX_OPS, NO_OP)));
// console.log(stringifyCodeUnits(checkItemsFitAndPadIterable([0], MAX_OPS, NO_OP)));
