// deno run --unstable-sloppy-imports Schplakork.tsx 
import { GameID, Forms, Game, Move, GameState } from './Classes';
import { OPS,SEEDS,GOAL_MIN, GOAL_MAX } from './Core';
import { destringifyGameID, stringifyGameID, destringifyGame, stringifyGame, 
         CHUNK_SIZE, chunkify, deChunkify, stringifyCodeUnits, destringifyCodeUnits,
         MAX_SEEDS, MAX_OPERANDS, MAX_MOVES, checkFitsInChunk, gameDataCodeUnits } from './Schema'
const grade=1;
const goal=100;
const form="2";
const index=0;
const gameID = new GameID(grade, goal, form, index);
const state = new GameState(false, []);
const date = new Date("2024-12-10T18:54:53.328Z");
const datetime_ms = date.getTime();
const game =  new Game(gameID, datetime_ms, [], [0],state);

console.log(game);

const stringified = stringifyGame(game);
console.log(stringified);
const destringifiedGame = destringifyGame(stringified, gameID);
console.log(destringifiedGame);
