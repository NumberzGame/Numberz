

import {Grade, Op, OperandT, OperandsT, Result, Seed, SolutionForm,
        opsAndLevelsResults, ResultsAndGradesCacheT, AllDepthsCacheT,
        combinations, enoughSeeds, resultsAndGradesCaches,
        GOAL_MIN, GOAL_MAX, default_max_num } from './Core';

import {SEEDS, takeNextN, OP_SYMBOLS} from '../Core';

import { makeCaches } from './Cachebuilder';


export const SOLUTION_FMT_STRING = "([arg_1] [op_symbol] [arg_2])"

// see also EXPR_PATTERN in solverDFS.ts.  They're all escaped in that.
export const OPS_PATTERN = OP_SYMBOLS.map((c) => `\\${c}`).join('|');
export const OPS_REGEXP = new RegExp(OPS_PATTERN,'g');
export const DIGITS_REGEXP = new RegExp('\\d+','g');
// "|".join(re.escape(op) for op in core.OPS)

export function* get_op_symbols_from_encodable_sol_expr(expr: string): IterableIterator<string>{
    for (const match of expr.matchAll(OPS_REGEXP)) {
        yield match[0];
    }
}


export function* get_seeds_from_encodable_sol_expr(expr: string): IterableIterator<number>{
    for (const match of expr.matchAll(DIGITS_REGEXP)) {
        const digits = match[0];
        yield parseInt(digits);
    }
}


function opStr(a: number | string, b: number | string, symbol: string): string{
    if ((typeof a === 'number') && (typeof b === 'number') && a < b) {
        [a, b] = [b, a]
    }
    return (SOLUTION_FMT_STRING.replace("[arg_1]", `${a}`)
                               .replace("[op_symbol]",symbol)
                               .replace("[arg_2]", `${b}`)
           )
}


function getCombinedSolutionForm(
    subForm1: SolutionForm, subForm2: SolutionForm
): SolutionForm {
    if (typeof subForm1 === 'number' && typeof subForm2 ==='number') {
        // # seed op seed => pair
        // # pair op seed => triple
        // # triple op seed => quadruple
        // # quadruple op seed => quintuple
        // # quintuple op seed => sextuple
        // # etc.
        if (subForm1 === 1 || subForm2 === 1) {
            return subForm1 + subForm2
        }

        if (subForm1 <= 0 || subForm2 <= 0) {
            throw new Error(
                `Integer sub solution forms must be >= 1. `
                +`Got: ${subForm1}, ${subForm2}`
            )
        }
    }

    return [subForm1, subForm2];
}



export class SolutionInfo {
    goal: Result;
    expression: string;
    grade: Grade;
    form: SolutionForm;
    seeds: Seed[];
    encodable: string;


    constructor(
        goal: Result,
        expression: string,
        grade: Grade,
        form: SolutionForm,
        seeds: Iterable<Seed>,
        encodable: string | null = null,
    ) {
        this.goal = goal

        // # eval-able, with pairs swapped
        // # s.t. - & // are the same as our commutative ops.
        this.expression = expression

        // # Assumed to be encodable i.e. (10 + 1) _-_ 29 == 18 etc.
        // # Not validated here.
        this.encodable = encodable || expression;

        this.grade = grade
        this.form = form
        this.seeds = Array.from(seeds).sort().reverse();
    
    }


    
    static *getCombinedFromSubSolutions(
        goal: Result,
        sub_sol_1: SolutionInfo,
        sub_sol_2: SolutionInfo,
        symbols_and_grades: Record<Op, Grade>,
    ): IterableIterator<SolutionInfo>{
        // # if sub_sol_1.goal < sub_sol_2.goal:
        // #     sub_sol_1, sub_sol_2 = sub_sol_2, sub_sol_1
        for (const [symbol, grade_of_op] of Object.entries(symbols_and_grades)) {
            // # Not needed, as this.get_solutions_extended_by_seed calls this
            // # with sub_sol_2 == trivial?
            // # if sub_sol_1.form == 1 and sub_sol_2.form != 1:
            // #     sub_sol_1, sub_sol_2 = sub_sol_2, sub_sol_1
            // #     print(f'Switcheroo 1! {sub_sol_2=}')

            const encodable = opStr(sub_sol_1.encodable, sub_sol_2.encodable, symbol);

            // # Ensure seeds and values of sub_expressions are in descending order,
            // # So that the normal Python operators will have the same value on the
            // # ordered pair, as our special commutative invertible operators
            // # have on the pair.
            let expression: string
            if (sub_sol_1.goal >= sub_sol_2.goal) {
                expression = opStr(sub_sol_1.expression, sub_sol_2.expression, symbol);
            } else {
                expression = opStr(sub_sol_2.expression, sub_sol_1.expression, symbol);
            }
                // # print(f'Switcheroo 2! {encodable=} {sub_sol_1=}, {sub_sol_2=}')

            const inst = new SolutionInfo(
                goal,
                expression,
                sub_sol_1.grade + sub_sol_2.grade + grade_of_op,
                getCombinedSolutionForm(sub_sol_1.form, sub_sol_2.form),
                sub_sol_1.seeds.concat(sub_sol_2.seeds),
                encodable,
            );
            yield inst;
            // # yield op_str(a, b, symbol), grade_so_far + grade_of_op
        }
    }

    *get_solutions_extended_by_sub_sol(
        goal: Result, sub_sol: SolutionInfo, symbols_and_grades: Record<Op, Grade>
    ): IterableIterator<SolutionInfo> {
        yield* SolutionInfo.getCombinedFromSubSolutions(
            goal, this, sub_sol, symbols_and_grades
        );
    }

    *get_solutions_extended_by_seed(
        goal: Result, seed: Seed, symbols_and_grades: Record<Op, Grade>
    ): IterableIterator<SolutionInfo> {
        const trivial = SolutionInfo.get_trivial(seed)
        yield* this.get_solutions_extended_by_sub_sol(
            goal, trivial, symbols_and_grades
        );
    }

    static get_trivial(seed: Seed): SolutionInfo{
        return new SolutionInfo(
            seed,
            seed.toString(),
            0,  //# Easiest possible.  Ready solved.
            1,  //# Just one seed.  No ops.
            [seed],
        )
    }

    static *get_pairs(
        goal: Result, a: Seed, b: Seed, symbols_and_grades: Record<Op, Grade>
    ): IterableIterator<SolutionInfo> {
        const trivial_a = SolutionInfo.get_trivial(a);
        yield* trivial_a.get_solutions_extended_by_seed(goal, b, symbols_and_grades);
    }

    static *get_triples(three_seeds: Seed[]): IterableIterator<SolutionInfo> {
        // """Yields all the triples that can be made from three_seeds
        // using ops.

        // This is an optimisation to search for sextuples of the form (triple op triple).

        // Iterating over every possible triple in
        // forward_cache[3] and calling forward_solutions(n=3,...) which would iterate
        // over the combinations of the other 21 seeds (and testing for validity from
        // the known 6 seeds) would be much slower.
        // """
        if (three_seeds.length !== 3) {
            throw new Error(`three_seeds must be length 3.  Got: ${three_seeds}`);
        }
        for (const two_seeds of combinations(2, three_seeds)) {
            const other_seed_list = Array.from(three_seeds);
            for (const seed of two_seeds) {
                const index = other_seed_list.indexOf(seed);
                if (index === -1) {
                    continue;
                }
                other_seed_list.splice(index,1)
            }
            const other_seed = other_seed_list[0]
            const [pair_seed_a, pair_seed_b] = two_seeds
            for (const [pair_symbol, [pair_result, pair_level]] of 
                        Object.entries(opsAndLevelsResults(pair_seed_a, pair_seed_b))){  //# pair = op(*two_seeds)
                const pair_sol = SolutionInfo.get_pairs(
                        pair_result,
                        two_seeds[0],
                        two_seeds[1],
                        {pair_symbol: pair_level},
                    ).next().value!;

                for (const [triple_symbol, [triple_result, triple_level]] of 
                        Object.entries(opsAndLevelsResults(other_seed, pair_result))) {
                    yield* pair_sol.get_solutions_extended_by_seed(
                        triple_result,
                        other_seed,
                        {triple_symbol: triple_level},
                    )
                }
            }
        }
    }

    toString() {
        let retval = (
            `SolutionInfo(${this.goal}, `
            +`${this.expression}, ${this.grade}, `
            +`${this.form}, ${this.seeds}`
        )
        if (this.expression !== this.encodable) {
            retval += `, ${this.encodable}`
        }
        retval += ")"
        return retval;
    }

}



class Impossible {
    grade = Infinity;
}



function* forward_solutions(
    seeds: Seed[],
    goal: Result,
    n: number,
    forward_cache: AllDepthsCacheT,
    grade_so_far: Grade = 0,
    strict: boolean = false,
): IterableIterator<SolutionInfo> {
    // """Solutions that can be constructed by only using the forward cache,
    // using precisely n from seeds.  n<= 5
    // """

    // # Assumes forward_cache is exhaustive.
    if (n === 1){
        if (seeds.includes(goal)){
            yield SolutionInfo.get_trivial(goal);
        }
        return;
    }

    // # Need to have caches built first.
    if (!(goal in (forward_cache[n] ?? {}))) {
        return;
    }

    for (let [[a, b], symbols_and_grades] of (forward_cache[n]?.[goal] ?? new Map()).entries()){

        // # can't use a in core.SEEDS and b in core.SEEDS as this
        // # doesn't account for multiplicities
        if ((n == 2 || !strict) && enoughSeeds([a, b], seeds)){

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
                    nums_left, sub_goal, n - 1, forward_cache, grade_so_far, strict
                )) {
                    yield* sub_sol.get_solutions_extended_by_seed(
                        goal, seed, symbols_and_grades
                    )
                }
            }

            if (!seeds.includes(a)){
                [a, b] = [b, a];
            } else if (strict && seeds.includes(b)) {
                yield* solutions_extended_by_seed(b, a)
            }

            yield* solutions_extended_by_seed(a, b)
            // # b may still be in seeds too (with insufficient multiplicity
            // # e.g. a = b = 100, seeds.count(100) == 1).
            // #
            // # A List comprehension [seed for seed in seeds if seed != a]
            // # will remove all occurences of a.  We want to only remove the first.

        } else if ((4 <= n) && (n <= 5)) {
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
                        strict,
                    )){
                        for (const sol_b of forward_solutions(
                            rest_of_nums,
                            b,
                            n - partition_size,
                            forward_cache,
                            grade_so_far,
                            strict,
                        )){
                            yield* sol_a.get_solutions_extended_by_sub_sol(
                                goal, sol_b, symbols_and_grades
                            )
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
    reverse_cache: AllDepthsCacheT = resultsAndGradesCaches.reverse,
): IterableIterator<SolutionInfo>{
    // # from quadruples and pair-pairs.

    for (let [[quad_or_pair_pair, pair], symbols_and_grades] of 
                    (reverse_cache[2]?.[goal] ?? new Map()).entries()) {
        if (!(pair in forward_cache[2])){
            [quad_or_pair_pair, pair] = [pair, quad_or_pair_pair];
        }
        if (!(pair in forward_cache[2])){
            continue;
        }
        for (const [[a, b], pair_symbols_and_grades] of (forward_cache[2]?.[pair] ?? new Map()).entries()){
            if (!enoughSeeds([a, b], seeds)){
                continue;
            }

            const four_seeds = Array.from(seeds);
            for (const seed of [a,b]) {
                const index = four_seeds.indexOf(seed);
                if (index !== -1) {
                    four_seeds.splice(index,1);
                }
            }
            // four_seeds.remove(a)
            // four_seeds.remove(b)

            for (const sol of forward_solutions(
                four_seeds, quad_or_pair_pair, 4, forward_cache, 0, true
            )){
                for (const pair_sol of SolutionInfo.get_pairs(
                    pair, a, b, pair_symbols_and_grades
                )){
                    yield* sol.get_solutions_extended_by_sub_sol(
                        goal, pair_sol, symbols_and_grades
                    )
                }
            }
        }
    }
}




function* triple_triples_from_reverse_cache(
    seeds: Seed[],
    goal: Result,
    forward_cache: AllDepthsCacheT = resultsAndGradesCaches.forward,
    reverse_cache: AllDepthsCacheT = resultsAndGradesCaches.reverse,
): IterableIterator<SolutionInfo>{
    
    const reverse_cache_3_seeds_items = (reverse_cache[3]?.[goal] ?? new Map()).entries()
    for (const [[
        triple_goal,
        maybe_triple_goal,
    ], symbols_and_grades] of reverse_cache_3_seeds_items){
        if (!(maybe_triple_goal in forward_cache[3])){
            continue;
        }
        for (const triple_sol of forward_solutions(
            seeds, triple_goal, 3, forward_cache, 0, true
        )) {
            const seeds_left = Array.from(seeds)
            for (const seed of triple_sol.seeds){
                const index = seeds_left.indexOf(seed);
                if (index !== -1) {
                    seeds_left.splice(index,1);
                }
            }
            if (seeds_left.length + 3 !== seeds.length) {
                throw new Error(`seeds_left: ${seeds_left} should have three fewer seeds than seeds: ${seeds}`);
            }

            for (const other_triple_sol of forward_solutions(
                seeds_left, maybe_triple_goal, 3, forward_cache, 0, true
            )){
                yield* SolutionInfo.getCombinedFromSubSolutions(
                    goal,
                    triple_sol,
                    other_triple_sol,
                    symbols_and_grades,
                )
            }
        }
    }
}                



function* reverse_solutions(
    seeds: Seed[],
    goal: Result,
    forward_cache: AllDepthsCacheT = resultsAndGradesCaches.forward,
    reverse_cache: AllDepthsCacheT = resultsAndGradesCaches.reverse,
    max_num_seeds: number | null = null,
): IterableIterator<SolutionInfo>{

    max_num_seeds = default_max_num(max_num_seeds, seeds.length)

    if (
        max_num_seeds <= 4
        || (max_num_seeds == 5 && !(goal in (reverse_cache[1] ?? {})))
        || (
            max_num_seeds === 6
            && [1,2,3,4].every(i => !(goal in (reverse_cache[i] ?? {}))))
        ) {
        
        // console.log(`No cached solutions in reverse_caches for ${goal} and ${max_num_seeds}`);
        return;
    }
    if (max_num_seeds >= 5 && GOAL_MIN <= goal && goal <= GOAL_MAX){
        // # assert goal in reverse_caches[1]
        const reverse_cache_1_seed = reverse_cache[1]?.[goal] ?? new Map()
        for (let [[sub_goal, seed], symbols_and_grades] of reverse_cache_1_seed.entries()){
            // # sub_goal symbol operand == goal, symbol in ('+', '|-|', '*', '//')

            if (!SEEDS.includes(seed)){
                [sub_goal, seed] = [seed, sub_goal];
            }
            if (!seeds.includes(seed)){
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
                other_seeds,  // # len 4 || 5
                sub_goal,
                4,
                forward_cache,
                0,
                true,
            )){
                yield* sub_sol.get_solutions_extended_by_seed(
                    goal, seed, symbols_and_grades
                )
            }

            if (max_num_seeds >= 6) {
                // # Search for (triple op pair) op seed)s as there are too many
                // # quintuples to cache.  Quintuples were searched already
                // # from quadruples (and are too numerous to cache) so this
                // # does not yield sextuples.
                // # for sub_solution, grade, sub_form in forward_solutions(
                for (const sub_sol of forward_solutions(
                    other_seeds, sub_goal, 5, forward_cache, 0, true
                )) {
                    // # Uses "Split seeds into all non-singleton partitions:
                    // # n = 5 -> (2,3)"

                    yield* sub_sol.get_solutions_extended_by_seed(
                        goal, seed, symbols_and_grades
                    )
                }

                // # Find sextuples and pair-pair-op-ops from quadruples.
                // # for (next_goal, next_seed), next_symbol_str in reverse_cache[2][sub_goal].items():
                for (let [[next_goal, next_seed], next_symbols_and_grades] of
                    (reverse_cache[2][sub_goal] ?? new Map()).entries()
                ){
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
                        last_seeds, next_goal, 4, forward_cache, 0, true
                    )) {
                        for (const extended_sol of sub_sol.get_solutions_extended_by_seed(
                            next_goal, next_seed, next_symbols_and_grades
                        )){
                            yield* extended_sol.get_solutions_extended_by_seed(
                                goal, seed, symbols_and_grades
                            )
                        }
                    }
                }
            }
        }
    }

    if (max_num_seeds >= 6){
        yield* quadruple_pairs_and_pair_pair_pairs(
            seeds,
            goal,
            forward_cache,
            reverse_cache,
        )
    }

    if (max_num_seeds >= 6){
        yield* triple_triples_from_reverse_cache(
            seeds,
            goal,
            forward_cache,
            reverse_cache,
        )
    }
}


function* forward_and_reverse_solutions(
    seeds: Seed[],
    goal: Result,
    forward_cache: AllDepthsCacheT = resultsAndGradesCaches.forward,
    reverse_cache: AllDepthsCacheT = resultsAndGradesCaches.reverse,
    max_num_seeds: number | null = null,
): IterableIterator<SolutionInfo> {

    max_num_seeds = default_max_num(max_num_seeds, seeds.length);

    for (const nStr of ["1", ...Object.keys(forward_cache)]){
        const n = parseInt(nStr)
        if (n <= max_num_seeds) {
            yield* forward_solutions(seeds, goal, n, forward_cache, 0, true)
        }
            // # caches[5] contains (triple op pair)s
    }

    yield* reverse_solutions(
        seeds,
        goal,
        forward_cache,
        reverse_cache,
        max_num_seeds,
    )
}



export function* find_solutions(
    nums: number[],
    goal: number,
    number_to_seek: number | "all" = 1,
    max_num_seeds: number | null = null,
    forward_cache: AllDepthsCacheT = resultsAndGradesCaches.forward,
    reverse_cache: AllDepthsCacheT = resultsAndGradesCaches.reverse,
): IterableIterator<SolutionInfo> {

    max_num_seeds = default_max_num(max_num_seeds, nums.length)

    if (Object.keys(forward_cache).length === 0 || Object.keys(reverse_cache).length === 0) {
        makeCaches(nums, [goal], max_num_seeds, forward_cache, reverse_cache);
    }

    let solutions = forward_and_reverse_solutions(
        nums,
        goal,
        forward_cache=forward_cache,
        reverse_cache=reverse_cache,
        max_num_seeds=max_num_seeds,
    );
    if (number_to_seek !== "all") {
        // #
        solutions = takeNextN(number_to_seek as number, solutions);
    }
    yield* solutions;
}


export function easiestSolution(
    nums: number[],
    goal: number,
    forward_cache: AllDepthsCacheT = resultsAndGradesCaches.forward,
    reverse_cache: AllDepthsCacheT = resultsAndGradesCaches.reverse,
    ): SolutionInfo | null {

    let easiestSolution = null;
    const solutions = find_solutions(
                            nums,
                            goal,
                            "all",
                            null,
                            forward_cache,
                            reverse_cache,
                            );
    for (const solution of solutions) {
        if (easiestSolution === null || solution.grade < easiestSolution.grade) {
            easiestSolution = solution
        }
    }


    return easiestSolution;
}


export function stringifyForm(form: SolutionForm): string {
    return JSON.stringify(form).replaceAll('[','(').replaceAll(']',')');
}
