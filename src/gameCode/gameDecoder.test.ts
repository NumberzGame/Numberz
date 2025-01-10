// deno repl --unstable-sloppy-imports --allow-read --allow-env --eval-file=gameDecoder.test.ts
// deno run --unstable-sloppy-imports --allow-read --allow-env gameDecoder.test.ts
// \22\224\solutions_224_6_grade_22.dat

import { existsSync, readFileSync } from 'node:fs';
import { argv } from 'node:process';
import { FORMS, GOAL_MAX, GOAL_MIN } from './Core';
import { decodeSolsFromGoalFormAndBinaryData } from './gameDecoder';
import { evalSolution } from './solutionEvaluator';

const SOLS_DIR = '../../public/grades_goals_forms_solutions';

const gradesGoalDirsGoalsForms = function* (): IterableIterator<[number, string, number, string]> {
  // for (let grade = 1; grade <= 246; grade++) {
  for (let grade = 22; grade <= 22; grade++) {
    const gradeDir = `${SOLS_DIR}/${grade}`;
    if (!existsSync(gradeDir)) {
      continue;
    }
    // for (let goal = GOAL_MIN; goal <= GOAL_MAX; goal++) {
    for (let goal = 224; goal <= 224; goal++) {
      const goalDir = `${gradeDir}/${goal}`;
      if (!existsSync(goalDir)) {
        continue;
      }

      // for (const form of FORMS) {
      for (const form of ['(4, 2)']) {
        yield [grade, goalDir, goal, form];
      }
    }
  }
};

for (const [grade, goalDir, goal, form] of gradesGoalDirsGoalsForms()) {
  const formStrNoCommas = form.replaceAll(/\s*,\s*/g, '_');
  const fileName = `solutions_${goal}_${formStrNoCommas}_grade_${grade}.dat`;
  const filePath = `${goalDir}/${fileName}`;

  if (!existsSync(filePath)) {
    continue;
  }

  const data = readFileSync(filePath);

  const [indices, symbols, solExprs] = decodeSolsFromGoalFormAndBinaryData(goal, form, data);

  let i = 0;

  let broken = false;

  for (; i < symbols.length; i++) {
    const seedAndOpsymbols = symbols[i];
    const solExpr = solExprs[i];
    const result = evalSolution(form, ...seedAndOpsymbols);
    console.log(`${solExpr} (under |-| and |/| ===) ${result}`);
    if (result !== goal) {
      console.log(`${solExpr} (under |-| and |/| !==) ${result}`);
      broken = true;
      break;
    }
  }
  if (broken) {
    break;
  } else {
    console.log(
      `Successfully decoded solutions with grade: ${grade}, goal: ${goal} of form: ${form}! Num sols : ${i + 1}`
    );
  }
}
