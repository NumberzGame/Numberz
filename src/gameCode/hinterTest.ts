
import { argv } from 'node:process';
import { SEEDS } from './Core';
import { Game, GameState, CustomGameID } from './Classes';


function playGameSpecifiedOnCommandLineFollowingHints(): void {
  // Use with:
  // deno run --unstable-sloppy-imports hinterTest.ts  915 50 8 6 5 1 1
  const [goal, ...seeds] = argv.slice(2).map((s) => parseInt(s, 10));
  //   console.log(`Goal: ${goal}, seeds: ${seeds}`);
  const seedIndices = seeds.map((seed) => SEEDS.indexOf(seed));
  const customGameID = new CustomGameID(goal, seedIndices);
  const game = Game.fromCustomGameID(customGameID);
}

// if (argv.slice(2).length >= 2) {
//   playGameSpecifiedOnCommandLineFollowingHints();
// }

// import { Game, GameState, CustomGameID } from './Classes';
const goal = 100
const seeds = [9,6,4,1];
// import SYMBOLS from '../data/symbols.json' with { type: 'json' };
// const SEEDS = SYMBOLS.SEEDS
const indices = seeds.map((x) => SEEDS.indexOf(x));
const gameID = new CustomGameID(goal, indices)
const game = Game.fromCustomGameID(gameID);

console.log(game.currentOperandsDisplayOrder());