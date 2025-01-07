// deno run --unstable-sloppy-imports Solver.test.mts 10 1 2 3 4
// deno run --unstable-sloppy-imports Solver.test.mts 958 75 100 25 4 8 4
// deno run --unstable-sloppy-imports Solver.test.mts 110 10 6 1 5 2
// deno run --unstable-sloppy-imports Solver.test.mts  386 50 100 75 6 1 3


import { argv } from "node:process";

import { OP_SYMBOLS } from '../Core';
import { makeCaches } from "./Cachebuilder";
import { find_solutions } from "./Solver";


import PUZZLES from './PUZZLES.json' with { type: "json" };


const OPS_PATTERN = OP_SYMBOLS.join("|");
// "|".join(re.escape(op) for op in core.OPS)


function* get_op_symbols_from_encodable_sol_expr(expr: string): Iterator[str]{
    yield* re.findall(OPS_PATTERN, expr)
}


// function* get_seeds_from_encodable_sol_expr(expr: string): Iterator[int]{
//     for digits in re.findall(r"\d+", expr):
//         yield int(digits)
// }


// def eval_encodable(
//     form: core.SolutionForm, seeds: Iterable[int], ops: Iterable[str]
// ) -> int:
//     "Evaluates encoded solutions using the commutative extentions of - and //"

//     seeds_it, ops_it = iter(seeds), iter(ops)

//     if isinstance(form, int):
//         retval = next(seeds_it)
//         for op_symbol in itertools.islice(ops_it, form - 1):
//             op = core.OPS[op_symbol]
//             result = op(retval, next(seeds_it))
//             if result is None:
//                 raise Exception(
//                     f"Invalid encoded solution: {form=} {list(seeds)=}, {list(ops)=}"
//                 )
//             retval = result
//         return retval

//     assert isinstance(form, tuple), f"{type(form)=}, {form=}"
//     assert len(form) == 2, f"{len(form)=}, {form=}"

//     sub_result_1 = eval_encodable(form[0], seeds_it, ops_it)
//     # print(f'{sub_result_1=}')
//     op = core.OPS[next(ops_it)]
//     sub_result_2 = eval_encodable(form[1], seeds_it, ops_it)
//     # print(f'{sub_result_2=}')

//     result = op(sub_result_1, sub_result_2)
//     if result is None:
//         raise Exception(
//             f"Invalid encoded solution: {form=} {list(seeds)=}, {list(ops)=}"
//         )
//     return result


for (const [seeds, goal] of PUZZLES) {
    const solutions = find_solutions(seeds as number[], goal as number, "all");

}



function solveAndGradePuzzleFromCommandLine(): void {
    const [goal, ...seeds] = argv.slice(2).map((s) => parseInt(s));



    makeCaches(seeds, [goal], seeds.length)

    const solutions = find_solutions(seeds, goal, "all");


    for (const solution of solutions) {
        console.log(`${solution.expression}  Grade: ${solution.grade}`);
    }
}