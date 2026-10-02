
import { argv } from 'node:process';
import { Game, GameState } from './Classes';


function playGameSpecifiedOnCommandLineFollowingHints(): void {
  // Use with:
  // deno run --unstable-sloppy-imports hinterTest.ts  915 50 8 6 5 1 1
  const [goal, ...seeds] = argv.slice(2).map((s) => parseInt(s, 10));
//   console.log(`Goal: ${goal}, seeds: ${seeds}`);
}

if (argv.slice(2).length >= 2) {
  playGameSpecifiedOnCommandLineFollowingHints();
}