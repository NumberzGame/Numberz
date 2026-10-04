
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

if (argv.slice(2).length >= 2) {
  playGameSpecifiedOnCommandLineFollowingHints();
}