
import { argv, env } from 'node:process';
import fc from 'fast-check';
// import { expect, test } from 'vitest';
import { SEEDS, MAX_MOVES } from './Core';
import { customGamefromGoalAndSeeds, Game, GameState, CustomGameID, Move, Hint, HINT_UNDO} from './Classes';

const isVitest = env.VITEST === 'true';

function playGameFromGoalAndSeedsFollowingHints(goal: number, seeds: number[]): boolean {
  //   console.log(`Goal: ${goal}, seeds: ${seeds}`);
  const game = customGamefromGoalAndSeeds(goal, seeds);
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


function followFirstTwoHints860_997754(): [number, number[], Game, Hint, Hint] {
  const [goal, seeds] = [860, [9, 9, 7, 7, 5, 4]];
  const game = customGamefromGoalAndSeeds(goal, seeds);
  const state = game.state;
  
  console.log(game.currentOperandsDisplayOrder());
  const hint0 = game.addHint();
  state.currentMove = hint0 as Move;
  state.submitLatestMove();
  
  console.log(game.currentOperandsDisplayOrder());
  const hint1 = game.addHint();
  return [goal, seeds, game, hint0, hint1];
}

function reproduceRepeatedSeedHintDoomLoop860_997754() {
  const [goal, seeds, game, hint0, hint1] = followFirstTwoHints860_997754();
  if (isVitest) {
    test.fails("Following hints solves game", ()  => {
      expect(hint1).not.toBe(HINT_UNDO);
    });
    return;
  }
  if (hint1 === HINT_UNDO) {
    throw new Error(`Doom loop entered after two hints: ${String(hint0)}, ${String(hint1)} (${goal}, ${seeds}) `)
  }
  console.log(`Doom loop not found after two hints: ${goal}, ${seeds} `)
}

function generalHintFollowingTests() {
  let puzzles;
  if (argv.slice(2).length >= 2) {
    
      // Use with:
      // deno run --unstable-sloppy-imports hinterTest.ts  915 50 8 6 5 1 1
      const [goal, ...seeds] = argv.slice(2).map((s) => parseInt(s, 10));
      puzzles = [[goal, seeds]];
  } else {
    puzzles = [
      [100, [9,6,4,1], false],
      [915, [50, 8, 6, 5, 1, 1], true],
      [860, [9, 9, 7, 7, 5, 4], true]
    ];
  }
  let doTest;
  for (const [goal, seeds, xfail] of puzzles) {
    const gameSolved = playGameFromGoalAndSeedsFollowingHints(goal as number, seeds as number[]);
    if (isVitest) {
      doTest = xfail ? test.fails : test
      doTest(`Following hints solves game: ${goal}, ${seeds}`, () => {
        expect(gameSolved).toBeTruthy();
      });
      continue;
    }
    if (!gameSolved) {
      throw new Error(`Following hints did not solve: ${goal}, ${seeds}`);
    }
  }
  console.log("All games were solved by following the hints!");
}

reproduceRepeatedSeedHintDoomLoop860_997754();
// generalHintFollowingTests();
// export const [goal, seeds, game, hint0, hint1] = followFirstTwoHints860_997754();
