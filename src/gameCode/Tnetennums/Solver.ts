import { SEEDS, takeNextN } from '../Core';
import { makeCaches } from './Cachebuilder';
import {
  AllDepthsCacheT,
  combinations,
  default_max_num,
  enoughSeeds,
  GOAL_MAX,
  GOAL_MIN,
  Grade,
  OperandT,
  Result,
  resultsAndGradesCaches,
  Seed,
  SolutionForm,
} from './Core';
import { SolutionInfo } from './SolutionInfo';

function* forward_solutions(
  seeds: Seed[],
  goal: Result,
  n: number,
  forward_cache: AllDepthsCacheT,
  grade_so_far: Grade = 0,
  strict: boolean = false
): IterableIterator<SolutionInfo> {
  // """Solutions that can be constructed by only using the forward cache,
  // using precisely n from seeds.  n<= 5
  // """

  // # Assumes forward_cache is exhaustive.
  if (n === 1) {
    if (seeds.includes(goal)) {
      yield SolutionInfo.get_trivial(goal);
    }
    return;
  }

  // # Need to have caches built first.
  if (!(goal in (forward_cache[n] ?? {}))) {
    return;
  }
  // eslint-disable-next-line prefer-const
  for (let [[a, b], symbols_and_grades] of (forward_cache[n]?.[goal] ?? new Map()).entries()) {
    // # can't use a in core.SEEDS and b in core.SEEDS as this
    // # doesn't account for multiplicities
    if ((n === 2 || !strict) && enoughSeeds([a, b], seeds)) {
      const sol_a = SolutionInfo.get_trivial(a);
      yield* sol_a.get_solutions_extended_by_seed(goal, b, symbols_and_grades);
    } else if ((seeds.includes(a) || seeds.includes(b)) && n >= 3) {
      function* solutions_extended_by_seed(seed: Seed, sub_goal: OperandT) {
        const nums_left = Array.from(seeds);
        const index = nums_left.indexOf(seed);
        if (index !== -1) {
          nums_left.splice(index, 1);
        }
        // # for sub_solution, grade, sub_form in forward_solutions(
        for (const sub_sol of forward_solutions(
          nums_left,
          sub_goal,
          n - 1,
          forward_cache,
          grade_so_far,
          strict
        )) {
          yield* sub_sol.get_solutions_extended_by_seed(goal, seed, symbols_and_grades);
        }
      }

      if (!seeds.includes(a)) {
        [a, b] = [b, a];
      } else if (strict && seeds.includes(b)) {
        yield* solutions_extended_by_seed(b, a);
      }

      yield* solutions_extended_by_seed(a, b);
      // # b may still be in seeds too (with insufficient multiplicity
      // # e.g. a = b = 100, seeds.count(100) == 1).
      // #
      // # A List comprehension [seed for seed in seeds if seed != a]
      // # will remove all occurences of a.  We want to only remove the first.
    } else if (n >= 4 && n <= 5) {
      // Neither a, nor b is in seeds

      // # for partition_size in range(n // 2, n - 1):
      for (let partition_size = Math.ceil(n / 2); partition_size < n - 1; partition_size++) {
        // # Split seeds into all non-singleton partitions:
        // # n = 4 -> (2,2)
        // # n = 5 -> (3,2)
        // # n = 6 -> (3,3), (4, 2)
        // # so e.g. for len(seeds) = 5 we split into all those of sizes
        // # 2 and 3 so don't need to consider those of sizes 3 and 2
        for (const some_nums of combinations(partition_size, seeds)) {
          const rest_of_nums = Array.from(seeds);
          for (const num of some_nums) {
            const index = rest_of_nums.indexOf(num);
            if (index !== -1) {
              rest_of_nums.splice(index, 1);
            }
          }

          for (const sol_a of forward_solutions(
            some_nums,
            a,
            partition_size,
            forward_cache,
            grade_so_far,
            strict
          )) {
            for (const sol_b of forward_solutions(
              rest_of_nums,
              b,
              n - partition_size,
              forward_cache,
              grade_so_far,
              strict
            )) {
              yield* sol_a.get_solutions_extended_by_sub_sol(goal, sol_b, symbols_and_grades);
            }
          }
        }
      }
    }
  }
}

function* quadruple_pairs_and_pair_pair_pairs(
  seeds: Seed[],
  goal: Result,
  forward_cache: AllDepthsCacheT = resultsAndGradesCaches.forward,
  reverse_cache: AllDepthsCacheT = resultsAndGradesCaches.reverse
): IterableIterator<SolutionInfo> {
  // # from quadruples and pair-pairs.

  // eslint-disable-next-line prefer-const
  for (let [[quad_or_pair_pair, pair], symbols_and_grades] of (
    reverse_cache[2]?.[goal] ?? new Map()
  ).entries()) {
    if (!(pair in forward_cache[2])) {
      [quad_or_pair_pair, pair] = [pair, quad_or_pair_pair];
    }
    if (!(pair in forward_cache[2])) {
      continue;
    }
    for (const [[a, b], pair_symbols_and_grades] of (
      forward_cache[2]?.[pair] ?? new Map()
    ).entries()) {
      if (!enoughSeeds([a, b], seeds)) {
        continue;
      }

      const four_seeds = Array.from(seeds);
      for (const seed of [a, b]) {
        const index = four_seeds.indexOf(seed);
        if (index !== -1) {
          four_seeds.splice(index, 1);
        }
      }
      // four_seeds.remove(a)
      // four_seeds.remove(b)

      for (const sol of forward_solutions(
        four_seeds,
        quad_or_pair_pair,
        4,
        forward_cache,
        0,
        true
      )) {
        for (const pair_sol of SolutionInfo.get_pairs(pair, a, b, pair_symbols_and_grades)) {
          yield* sol.get_solutions_extended_by_sub_sol(goal, pair_sol, symbols_and_grades);
        }
      }
    }
  }
}

function* triple_triples_from_reverse_cache(
  seeds: Seed[],
  goal: Result,
  forward_cache: AllDepthsCacheT = resultsAndGradesCaches.forward,
  reverse_cache: AllDepthsCacheT = resultsAndGradesCaches.reverse
): IterableIterator<SolutionInfo> {
  const reverse_cache_3_seeds_items = (reverse_cache[3]?.[goal] ?? new Map()).entries();
  for (const [
    [triple_goal, maybe_triple_goal],
    symbols_and_grades,
  ] of reverse_cache_3_seeds_items) {
    if (!(maybe_triple_goal in forward_cache[3])) {
      continue;
    }
    for (const triple_sol of forward_solutions(seeds, triple_goal, 3, forward_cache, 0, true)) {
      const seeds_left = Array.from(seeds);
      for (const seed of triple_sol.seeds) {
        const index = seeds_left.indexOf(seed);
        if (index !== -1) {
          seeds_left.splice(index, 1);
        }
      }
      if (seeds_left.length + 3 !== seeds.length) {
        throw new Error(
          `seeds_left: ${seeds_left} should have three fewer seeds than seeds: ${seeds}`
        );
      }

      for (const other_triple_sol of forward_solutions(
        seeds_left,
        maybe_triple_goal,
        3,
        forward_cache,
        0,
        true
      )) {
        yield* SolutionInfo.getCombinedFromSubSolutions(
          goal,
          triple_sol,
          other_triple_sol,
          symbols_and_grades
        );
      }
    }
  }
}

function* reverse_solutions(
  seeds: Seed[],
  goal: Result,
  forward_cache: AllDepthsCacheT = resultsAndGradesCaches.forward,
  reverse_cache: AllDepthsCacheT = resultsAndGradesCaches.reverse,
  max_num_seeds_cap: number | null = null
): IterableIterator<SolutionInfo> {
  const max_num_seeds = default_max_num(max_num_seeds_cap, seeds.length);

  if (
    max_num_seeds <= 4 ||
    (max_num_seeds === 5 && !(goal in (reverse_cache[1] ?? {}))) ||
    (max_num_seeds === 6 && [1, 2, 3, 4].every((i) => !(goal in (reverse_cache[i] ?? {}))))
  ) {
    // console.log(`No cached solutions in reverse_caches for ${goal} and ${max_num_seeds}`);
    return;
  }
  if (max_num_seeds >= 5 && GOAL_MIN <= goal && goal <= GOAL_MAX) {
    // # assert goal in reverse_caches[1]
    const reverse_cache_1_seed = reverse_cache[1]?.[goal] ?? new Map();
    // eslint-disable-next-line prefer-const
    for (let [[sub_goal, seed], symbols_and_grades] of reverse_cache_1_seed.entries()) {
      // # sub_goal symbol operand == goal, symbol in ('+', '|-|', '*', '//')

      if (!SEEDS.includes(seed)) {
        [sub_goal, seed] = [seed, sub_goal];
      }
      if (!seeds.includes(seed)) {
        continue;
      }

      // # A list comp: [other for other in seeds if other != seed]
      // # will filter out all repeated occurences of seed
      // # instead of just the first
      const other_seeds = Array.from(seeds);
      const index = other_seeds.indexOf(seed);
      if (index !== -1) {
        other_seeds.splice(index, 1);
      }

      // # Search for possible quintuples from cached quadruples.
      // # and seed-pair-pairs from pair-pairs
      // # for sub_solution, grade, sub_form in forward_solutions(
      for (const sub_sol of forward_solutions(
        other_seeds, // # len 4 || 5
        sub_goal,
        4,
        forward_cache,
        0,
        true
      )) {
        yield* sub_sol.get_solutions_extended_by_seed(goal, seed, symbols_and_grades);
      }

      if (max_num_seeds >= 6) {
        // # Search for (triple op pair) op seed)s as there are too many
        // # quintuples to cache.  Quintuples were searched already
        // # from quadruples (and are too numerous to cache) so this
        // # does not yield sextuples.
        // # for sub_solution, grade, sub_form in forward_solutions(
        for (const sub_sol of forward_solutions(other_seeds, sub_goal, 5, forward_cache, 0, true)) {
          // # Uses "Split seeds into all non-singleton partitions:
          // # n = 5 -> (2,3)"

          yield* sub_sol.get_solutions_extended_by_seed(goal, seed, symbols_and_grades);
        }

        // # Find sextuples and pair-pair-op-ops from quadruples.
        // # for (next_goal, next_seed), next_symbol_str in reverse_cache[2][sub_goal].items():
        
        // eslint-disable-next-line prefer-const
        for (let [[next_goal, next_seed], next_symbols_and_grades] of (
          reverse_cache[2][sub_goal] ?? new Map()
        ).entries()) {
          if (!SEEDS.includes(next_seed)) {
            [next_goal, next_seed] = [next_seed, next_goal];
          }

          const last_seeds = Array.from(other_seeds);

          const index = last_seeds.indexOf(next_seed);
          if (index !== -1) {
            last_seeds.splice(index, 1);
          } else {
            continue;
          }

          // # for sub_solution_2, sub_grade, sub_form in forward_solutions(
          // # Quadruples and pair-pairs
          for (const sub_sol of forward_solutions(
            last_seeds,
            next_goal,
            4,
            forward_cache,
            0,
            true
          )) {
            for (const extended_sol of sub_sol.get_solutions_extended_by_seed(
              next_goal,
              next_seed,
              next_symbols_and_grades
            )) {
              yield* extended_sol.get_solutions_extended_by_seed(goal, seed, symbols_and_grades);
            }
          }
        }
      }
    }
  }

  if (max_num_seeds >= 6) {
    yield* quadruple_pairs_and_pair_pair_pairs(seeds, goal, forward_cache, reverse_cache);
  }

  if (max_num_seeds >= 6) {
    yield* triple_triples_from_reverse_cache(seeds, goal, forward_cache, reverse_cache);
  }
}

function* forward_and_reverse_solutions(
  seeds: Seed[],
  goal: Result,
  forward_cache: AllDepthsCacheT = resultsAndGradesCaches.forward,
  reverse_cache: AllDepthsCacheT = resultsAndGradesCaches.reverse,
  max_num_seeds_cap: number | null = null
): IterableIterator<SolutionInfo> {
  const max_num_seeds = default_max_num(max_num_seeds_cap, seeds.length);

  for (const nStr of ['1', ...Object.keys(forward_cache)]) {
    const n = parseInt(nStr, 10);
    if (n <= max_num_seeds) {
      yield* forward_solutions(seeds, goal, n, forward_cache, 0, true);
    }
    // # caches[5] contains (triple op pair)s
  }

  yield* reverse_solutions(seeds, goal, forward_cache, reverse_cache, max_num_seeds);
}

export function* find_solutions(
  nums: number[],
  goal: number,
  number_to_seek: number | 'all' = 1,
  max_num_seeds_cap: number | null = null,
  forward_cache: AllDepthsCacheT = resultsAndGradesCaches.forward,
  reverse_cache: AllDepthsCacheT = resultsAndGradesCaches.reverse
): IterableIterator<SolutionInfo> {
  const max_num_seeds = default_max_num(max_num_seeds_cap, nums.length);

  if (Object.keys(forward_cache).length === 0 || Object.keys(reverse_cache).length === 0) {
    makeCaches(nums, [goal], max_num_seeds, forward_cache, reverse_cache);
  }

  let solutions = forward_and_reverse_solutions(
    nums,
    goal,
    forward_cache,
    reverse_cache,
    max_num_seeds
  );
  if (number_to_seek !== 'all') {
    // #
    solutions = takeNextN(number_to_seek as number, solutions);
  }
  yield* solutions;
}

export function easiestSolution(
  nums: number[],
  goal: number,
  forward_cache: AllDepthsCacheT = resultsAndGradesCaches.forward,
  reverse_cache: AllDepthsCacheT = resultsAndGradesCaches.reverse
): SolutionInfo | null {
  let easiestSolution = null;
  const solutions = find_solutions(nums, goal, 'all', null, forward_cache, reverse_cache);
  for (const solution of solutions) {
    if (easiestSolution === null || solution.grade < easiestSolution.grade) {
      easiestSolution = solution;
    }
  }

  return easiestSolution;
}

export function stringifyForm(form: SolutionForm): string {
  return JSON.stringify(form).replaceAll('[', '(').replaceAll(']', ')');
}
