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
const date = new Date("2024-12-06T10:34:48.793Z");
const datetime_ms = date.getTime();
const game =  new Game(gameID, datetime_ms, [], state);

console.log(game);
console.log(stringifyGame(game));
