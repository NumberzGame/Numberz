// deno run --unstable-sloppy-imports Solver.test.mts


import { argv } from "node:process";

import { INVALID_ARGS, OP_SYMBOLS, OPS, takeNextN } from '../Core';
import { SolutionForm, Seed, Op,  } from './Core';
import { makeCaches } from "./Cachebuilder";
import { find_solutions } from "./Solver";


import PUZZLES from './PUZZLES.json' with { type: "json" };


// see also EXPR_PATTERN in solverDFS.ts.  They're all escaped in that.
const OPS_PATTERN = OP_SYMBOLS.map((c) => `\\${c}`).join('|');
const OPS_REGEXP = new RegExp(OPS_PATTERN,'g');
const DIGITS_REGEXP = new RegExp('\\d+','g');
// "|".join(re.escape(op) for op in core.OPS)


function* get_op_symbols_from_encodable_sol_expr(expr: string): IterableIterator<string>{
    for (const match of expr.matchAll(OPS_REGEXP)) {
        yield match[0];
    }
}


function* get_seeds_from_encodable_sol_expr(expr: string): IterableIterator<number>{
    for (const match of expr.matchAll(DIGITS_REGEXP)) {
        const digits = match[0];
        yield parseInt(digits);
    }
}


function eval_encodable(
    form: SolutionForm,
    seeds: IterableIterator<Seed>,
    ops: IterableIterator<Op>,
): number {
    // "Evaluates encoded solutions using the commutative extentions of - and //"

    const seeds_it = seeds[Symbol.iterator]();
    const ops_it = ops[Symbol.iterator]();

    if (typeof form === 'number') {
        let retval = seeds_it.next().value;
        console.log(`Retval at start: ${retval}`)
        for (const op_symbol of takeNextN<string>(form - 1, ops_it, `Not enough Ops in ${ops}`)){
            const op = OPS[op_symbol];
            console.log(`op: ${op}`);
            const seed = seeds_it.next().value
            const result = op(retval, seed);
            if (result === null || result === INVALID_ARGS) {
                throw new Error(
                    `Invalid encoded solution: {form=} {list(seeds)=}, {list(ops)=}`
                )
            }
            console.log(`Result: ${result} after ${op_symbol} for int form: ${retval}`);
            retval = result;
        }
        return retval;
    }

    // assert isinstance(form, tuple), f"{type(form)=}, {form=}"
    // assert len(form) == 2, f"{len(form)=}, {form=}"

    if (!(form.length === 2)) {
        throw new Error(`form must be a number of a nested length 2 array of numbers.  Got: ${form}`);
    }

    const sub_result_1 = eval_encodable(form[0], seeds_it, ops_it)
    // # print(f'{sub_result_1=}')
    const op = OPS[ops_it.next().value]
    const sub_result_2 = eval_encodable(form[1], seeds_it, ops_it)
    // # print(f'{sub_result_2=}')

    const result = op(sub_result_1, sub_result_2);
    if (result === null || result === INVALID_ARGS) {
        throw new Error(
            `Invalid encoded solution, form: ${form} seeds:${seeds}, ops:${ops}`
        )
    }
    return result;
}


function testPUZZLESjson() {

    for (const [seeds, goal] of PUZZLES.slice(2)) {
        console.log(`Testing: ${seeds}, goal: ${goal}`);
        const solutions = Array.from(find_solutions(seeds as number[], goal as number, "all", null, {}, {}));
        if (solutions.length === 0) {
            console.log('No sols found :( ');
        }
        for (const solution of solutions) {
            const encodable = solution.encodable;
            const solSeeds = get_seeds_from_encodable_sol_expr(encodable);
            const ops = get_op_symbols_from_encodable_sol_expr(encodable);
            const result = eval_encodable(solution.form,solSeeds,ops)
            if (result !== goal) {
                throw new Error(`Could not validate result: ${result} !== ${goal}. Puzzle: ${seeds}, goal: ${goal}, ${solution}`); 
            }
            console.log(`Evaluated: ${encodable} (using commutative - & /) to ${result}`); 
        }
    }
}



function solveAndGradePuzzleFromCommandLine(): void {
    // Use with:
    // deno run --unstable-sloppy-imports Solver.test.mts 10 1 2 3 4
    // deno run --unstable-sloppy-imports Solver.test.mts 958 75 100 25 4 8 4
    // deno run --unstable-sloppy-imports Solver.test.mts 110 10 6 1 5 2
    // deno run --unstable-sloppy-imports Solver.test.mts  386 50 100 75 6 1 3
    const [goal, ...seeds] = argv.slice(2).map((s) => parseInt(s));



    makeCaches(seeds, [goal], seeds.length)

    const solutions = find_solutions(seeds, goal, "all");


    for (const solution of solutions) {
        console.log(`${solution.expression}  Grade: ${solution.grade}`);
    }
}

if (argv.slice(2).length === 0) {
    testPUZZLESjson()
} else {
    solveAndGradePuzzleFromCommandLine();
}