// deno run --unstable-sloppy-imports Solver.test.mts

import { argv } from 'node:process';
import { INVALID_ARGS, OPS, takeNextN } from '../Core';
import { makeCaches } from './Cachebuilder';
import { AllDepthsCacheT, inverseOp, Op, Seed, SolutionForm } from './Core';
import PUZZLES from './PUZZLES.json' with { type: 'json' };
import {
  get_op_symbols_from_encodable_sol_expr,
  get_seeds_from_encodable_sol_expr,
} from './SolutionInfo';
import { find_solutions } from './Solver';

function investigate_140_1_1_1_1_25_10(): void {
  const seeds = [25, 10, 1, 1, 1, 1];
  const goal = 140;

  console.log(inverseOp('-', 13, 14));
  console.log(inverseOp('/', 10, 140));

  const fwd: AllDepthsCacheT = {};
  const rev: AllDepthsCacheT = {};

  makeCaches(seeds, [goal], 6, fwd, rev);

  console.log(rev[1]);

  for (const solution of find_solutions(seeds, goal, 'all')) {
    console.log(solution);
  }
}

// investigate_140_1_1_1_1_25_10()

function eval_encodable(
  form: SolutionForm,
  seeds: IterableIterator<Seed>,
  ops: IterableIterator<Op>
): number {
  // "Evaluates encoded solutions using the commutative extentions of - and //"

  const seeds_it = seeds[Symbol.iterator]();
  const ops_it = ops[Symbol.iterator]();

  if (typeof form === 'number') {
    let retval = seeds_it.next().value;
    // console.log(`Retval at start: ${retval}`)
    for (const op_symbol of takeNextN<string>(form - 1, ops_it, `Not enough Ops in ${ops}`)) {
      const op = OPS[op_symbol];
      // console.log(`op: ${op}`);
      const seed = seeds_it.next().value;
      const result = op(retval, seed);
      if (result === null || result === INVALID_ARGS) {
        throw new Error(
          `Invalid encoded solution: result: ${String(result)}, ${form} ${seeds}, ${ops}`
        );
      }
      // console.log(`Result: ${result} after ${op_symbol} for int form: ${retval}`);
      retval = result;
    }
    return retval;
  }

  // assert isinstance(form, tuple), f"{type(form)=}, {form=}"
  // assert len(form) == 2, f"{len(form)=}, {form=}"

  if (!(form.length === 2)) {
    throw new Error(`form must be a number of a nested length 2 array of numbers.  Got: ${form}`);
  }

  const sub_result_1 = eval_encodable(form[0], seeds_it, ops_it);
  // # print(f'{sub_result_1=}')
  const op = OPS[ops_it.next().value];
  const sub_result_2 = eval_encodable(form[1], seeds_it, ops_it);
  // # print(f'{sub_result_2=}')

  const result = op(sub_result_1, sub_result_2);
  if (result === null || result === INVALID_ARGS) {
    throw new Error(
      `Invalid encoded solution.  Error calculating: ${op} on ${sub_result_1} ${sub_result_2}. ` +
        ` Form: ${form} seeds:${seeds}, ops:${ops}`
    );
  }
  return result;
}

function testPUZZLESjson() {
  for (const [seeds, goal] of PUZZLES.slice(2)) {
    console.log(`Testing: ${seeds}, goal: ${goal}`);
    const solutions = Array.from(
      find_solutions(seeds as number[], goal as number, 'all', null, {}, {})
    );
    if (solutions.length === 0) {
      console.log('No sols found :( ');
    }
    for (const solution of solutions) {
      const encodable = solution.encodable;
      const solSeeds = get_seeds_from_encodable_sol_expr(encodable);
      const ops = get_op_symbols_from_encodable_sol_expr(encodable);
      let result;
      try {
        result = eval_encodable(solution.form, solSeeds, ops);
      } catch (e) {
        console.log(e);
        console.log(`Error calculating: ${encodable}`);
        throw e;
      }
      if (result !== goal) {
        throw new Error(
          `Could not validate result: ${result} !== ${goal}. Puzzle: ${seeds}, goal: ${goal}, ${solution}`
        );
      }
      console.log(`Evaluated: ${encodable} (using commutative - & /) to ${result}`);
    }
  }
}

function solveAndGradePuzzleFromCommandLine(): void {
  // Use with:
  // deno run --unstable-sloppy-imports Solver.test.mts 10 1 2 3 4
  // deno run --unstable-sloppy-imports Solver.test.mts 140 1 1 1 1 10 25
  // deno run --unstable-sloppy-imports Solver.test.mts 958 75 100 25 4 8 4
  // deno run --unstable-sloppy-imports Solver.test.mts 110 10 6 1 5 2
  // deno run --unstable-sloppy-imports Solver.test.mts  386 50 100 75 6 1 3
  const [goal, ...seeds] = argv.slice(2).map((s) => parseInt(s));

  makeCaches(seeds, [goal], seeds.length);

  const solutions = find_solutions(seeds, goal, 'all');

  for (const solution of solutions) {
    console.log(`${solution.expression}  Grade: ${solution.grade}`);
  }
}

if (argv.slice(2).length === 0) {
  testPUZZLESjson();
} else {
  solveAndGradePuzzleFromCommandLine();
}
