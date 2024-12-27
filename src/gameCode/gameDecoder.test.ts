// deno repl --unstable-sloppy-imports --allow-read --allow-env --eval-file=gameDecoder.test.ts -- 22 224
// deno run --unstable-sloppy-imports --allow-read --allow-env gameDecoder.test.ts 
// \22\224\solutions_224_6_grade_22.dat




import { argv } from "node:process";
import { readFileSync, existsSync } from "node:fs";

import { FORMS } from './Core';
import { decodeSolsFromGoalFormAndBinaryData } from './gameDecoder';
import { evalSolution } from './solutionEvaluator';



const grade = parseInt(argv[2]);
const goal = parseInt(argv[3]);

for (const form of FORMS) { 

    const fileName = `solutions_${goal}_${form}_grade_${grade}.dat`.replaceAll(', ','_');
    const filePath = `../../public/grades_goals_forms_solutions/${grade}/${goal}/${fileName}`;

    if (!existsSync(filePath)) {
        continue;
    }

    const data = readFileSync(filePath);

    const [indices, symbols, solExprs] = decodeSolsFromGoalFormAndBinaryData(224,form,data);

    let broken = false;

    let i = 0;

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
        console.log(`Decoded: ${i+1} solutions of form: ${form} successfully!`);
    }
};