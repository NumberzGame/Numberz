// deno run --unstable-sloppy-imports --allow-read --allow-env Schplakork.tsx 
// or:
// deno repl --unstable-sloppy-imports --allow-read --allow-env --eval-file=Schplakork.tsx
import { GameID, Forms, Game, Move, GameState } from './Classes';
import { OPS,SEEDS,GOAL_MIN, GOAL_MAX, MAX_SEEDS, MAX_OPERANDS, MAX_MOVES, MAX_OPS } from './Core';
import { destringifyGameID, stringifyGameID, destringifyGame, stringifyGame, 
         CHUNK_SIZE, chunkify, deChunkify, stringifyCodeUnits, destringifyCodeUnits,
         NO_OP, checkFitsInChunk, gameDataCodeUnits,
         checkItemsFitAndPadIterable } from './Schema'

const [grade, goal, form, index, date, solved, seedIndices, opIndices, moves_data] = [1,100,"2",0,new Date("2024-12-14T11:17:20.726Z"),false,[1,0],[],[]]


const gameID = new GameID(grade, goal, form, index);
const moves: Move[] = [];
// for (const move_args of moves_data) {
//   const move = new Move(...move_args);
//   moves.push(move);
// }
const state = new GameState(solved, moves);

const game = new Game(gameID, date.getTime(), seedIndices, opIndices, state);

const stringified = stringifyGame(game);
const destringifiedGame = destringifyGame(stringified, gameID);
console.log(game);

console.log(destringifiedGame);

// console.log(Array.from(checkItemsFitAndPadIterable([0], MAX_OPS, NO_OP)));
// console.log(stringifyCodeUnits(checkItemsFitAndPadIterable([0], MAX_OPS, NO_OP)));
