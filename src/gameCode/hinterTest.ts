
import { argv } from 'node:process';
import { SEEDS, MAX_MOVES } from './Core';
import { Game, GameState, CustomGameID, Move, Hint, HINT_UNDO} from './Classes';


function playGameFromGoalAndSeedsFollowingHints(goal: number, seeds: number[]): boolean {
  //   console.log(`Goal: ${goal}, seeds: ${seeds}`);
  const seedIndices = seeds.map((seed) => SEEDS.indexOf(seed));
  const customGameID = new CustomGameID(goal, seedIndices);
  const game = Game.fromCustomGameID(customGameID);
  const state = game.state;

  let hint: Hint;
  for (let i = 0; i < MAX_MOVES; i++) {
    hint = game.addHint();
    if (hint === HINT_UNDO){
      console.log(`Hit HINT_UNDO after following hints, game: ${game}`);
      
      console.log(game.currentOperandsDisplayOrder());
      return false;
    }
    state.currentMove = hint as Move;
    state.submitLatestMove();
    if (game.solved()) {
      return true;
    }
  }
  return false;
}


let puzzles;
if (argv.slice(2).length >= 2) {
  
    // Use with:
    // deno run --unstable-sloppy-imports hinterTest.ts  915 50 8 6 5 1 1
    const [goal, ...seeds] = argv.slice(2).map((s) => parseInt(s, 10));
    puzzles = [[goal, seeds]];
} else {
  puzzles = [
    [100, [9,6,4,1]],
    [860, [9, 9, 7, 7, 5, 4]]
  ];
}
for (const [goal, seeds] of puzzles) {
  if (!playGameFromGoalAndSeedsFollowingHints(goal as number, seeds as number[])) {
    throw new Error(`Following hints did not solve: ${goal}, ${seeds}`);
  }
}
console.log("All games were solved by following the hints!");