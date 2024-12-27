// deno repl --unstable-sloppy-imports --allow-read --allow-env --eval-file=gameDecoder.test.ts
// deno run --unstable-sloppy-imports --allow-read --allow-env gameDecoder.test.ts 
// \22\224\solutions_224_6_grade_22.dat




import { argv } from "node:process";
import { readFileSync, existsSync } from "node:fs";

import { FORMS, GOAL_MIN, GOAL_MAX, } from './Core';
import { decodeSolsFromGoalFormAndBinaryData } from './gameDecoder';
import { evalSolution } from './solutionEvaluator';


const SOLS_DIR = '../../public/grades_goals_forms_solutions';


const gradesGoalDirsGoalsForms = function*(): IterableIterator<[number, string, number, string]> {
    for (let grade = 1; grade <= 246; grade++) {
        const gradeDir = `${SOLS_DIR}/${grade}`;
        if (!existsSync(gradeDir)) {
            continue;
        }
        for (let goal = GOAL_MIN; goal <= GOAL_MAX; goal++) { 
            const goalDir = `${gradeDir}/${goal}`;
            if (!existsSync(goalDir)) {
                continue;
            }

            for (const form of FORMS) { 
                yield [grade, goalDir, goal, form];
            }
        }
    }
}



for (const [grade, goalDir, goal, form] of gradesGoalDirsGoalsForms()) {

    const formStrNoCommas = form.replaceAll(', ','_');
    const fileName = `solutions_${goal}_${formStrNoCommas}_grade_${grade}.dat`;
    const filePath = `${goalDir}/${fileName}`;

    if (!existsSync(filePath)) {
        continue;
    }

    const data = readFileSync(filePath);

    const [indices, symbols, solExprs] = decodeSolsFromGoalFormAndBinaryData(goal,form,data);


    let i = 0;

    let broken = false;

    for (; i < symbols.length; i++) {
        const seedAndOpsymbols = symbols[i];
        const solExpr=solExprs[i];
        const result = evalSolution(form,...seedAndOpsymbols);
        if (result !== goal) {
            console.log(`${solExpr} (under |-| and |/| !==) ${result}`);
            broken = true;
            break
        }
    }
    if (broken) {
        break;
    } else {
        console.log(`Successfully decoded solutions with grade: ${grade}, goal: ${goal} of form: ${form}! Num sols : ${i+1}`);
    }
};
