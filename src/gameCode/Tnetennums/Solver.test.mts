// deno run --unstable-sloppy-imports Solver.test.mts 10 1 2 3 4
// deno run --unstable-sloppy-imports Solver.test.mts 958 75 100 25 4 8 4
// deno run --unstable-sloppy-imports Solver.test.mts 110 10 6 1 5 2
// deno run --unstable-sloppy-imports Solver.test.mts  386 50 100 75 6 1 3


import { argv } from "node:process";

import { makeCaches } from "./Cachebuilder";
import { find_solutions } from "./Solver";


const [goal, ...seeds] = argv.slice(2).map((s) => parseInt(s));



makeCaches(seeds, [goal], seeds.length)

const solutions = find_solutions(seeds, goal, "all");


for (const solution of solutions) {
    console.log(`${solution.expression}  Grade: ${solution.grade}`);
}