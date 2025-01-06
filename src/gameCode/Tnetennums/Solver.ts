import {Grade, Op, OperandT, OperandsT, Result, Seed, SolutionForm,
        opsAndLevelsResults,
        pairCombinations
} from './Core';



const SOLUTION_FMT_STRING = "([arg_1] [op_symbol] [arg_2])"


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



class SolutionInfo {
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
        for (const two_seeds of pairCombinations(three_seeds)) {
            const other_seed_list = Array.from(three_seeds);
            for (const seed of two_seeds) {
                const index = other_seed_list.indexOf(seed);
                if (index === -1) {
                    continue;
                }
                other_seed_list.splice(index,1)
            }
            const other_seed = other_seed_list[0]

            for (const [pair_symbol, [pair_result, pair_level]] of 
                        Object.entries(opsAndLevelsResults(...two_seeds))){  //# pair = op(*two_seeds)
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
            `${this.__class__.__name__}(goal=${this.goal}, `
            +`expression=${this.expression}, grade=${this.grade}, `
            +`form=${this.form}, seeds=${this.seeds}`
        )
        if (this.expression !== this.encodable) {
            retval += `, encodable=${this.encodable}`
        }
        retval += ")"
        return retval;
    }

}