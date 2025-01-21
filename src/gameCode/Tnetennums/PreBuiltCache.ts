
import {GOAL_MIN, randomPositiveInteger} from '../Core';
import { FormsAndFreqs, spacer } from '../SuperMiniIndexStr/IndexCodec';

// These JSON imports won't work in Deno without appending " with { type: "json" }"
// import NUM_SOLS_OF_EACH_GRADE_AND_FORM from '../../data/num_of_sols_of_each_grade_and_form.json';
import NUM_SOLS_OF_EACH_GRADE_AND_GOAL from '../../data/num_of_sols_of_each_grade_and_goal.json';
import NUM_SOLS_GRADE_GOAL_FORMS_DATA_STRINGS from '../../data/superMiniIndexStr.json';



export const KNOWN_GRADES=Object.freeze(
    Object.keys(NUM_SOLS_OF_EACH_GRADE_AND_GOAL)
          .map((k) => parseInt(k))
          .sort((a, b) => a-b)
  );



function sumValues(obj: Record<string, number>): number {
  return Object.values(obj).reduce((x, y) => x + y);
}




export function randomGoal(
  grade: number // keyof typeof NUM_SOLS_OF_EACH_GRADE_AND_GOAL,
): number {
  // return 224;
  // If nullish, shortcut to empty object making the main loop
  // have 0 iterations, ending in the "form not found" error
  const gradesObj =
    NUM_SOLS_OF_EACH_GRADE_AND_GOAL[
      grade.toString() as keyof typeof NUM_SOLS_OF_EACH_GRADE_AND_GOAL
    ] ?? {};

  const numSolsOfGrade = sumValues(gradesObj);
  const index = randomPositiveInteger(numSolsOfGrade);

  let numSolsSoFar = 0;
  for (const [goal, numSols] of Object.entries(gradesObj).sort(([k, _v]) => parseInt(k, 10))) {
    numSolsSoFar += numSols;
    if (index < numSolsSoFar) {
      return parseInt(goal, 10);
    }
  }

  throw new Error(
    `No goal found for index: ${index}, numSols: ${numSolsSoFar} ` +
      `grade: ${grade} in num_of_sols_of_each_grade_and_form.json`
  );
}

function assert(condition: any, goalKey: string, grade: number): asserts condition {
  if (!condition) {
    throw new Error(
      `Goal: ${goalKey} not found for grade: ${grade} in ${NUM_SOLS_OF_EACH_GRADE_AND_GOAL}}`
    );
  }
}

export function randomFormAndIndex(
  grade: number,
  goal: number,
  // grade: keyof typeof NUM_SOLS_GRADE_GOAL_FORMS_DATA_STRINGS,
  // goal: number, //keyof typeof NUM_SOLS_OF_EACH_GRADE_AND_GOAL,
): [string, number] {
  // If nullish, shortcut to empty object making the main loop
  // have 0 iterations, ending in the "form not found" error

  const gradeDataStringsKey =
    grade.toString() as keyof typeof NUM_SOLS_GRADE_GOAL_FORMS_DATA_STRINGS;
  const goalsFormsDataString = NUM_SOLS_GRADE_GOAL_FORMS_DATA_STRINGS[
    gradeDataStringsKey
  ] as string;
  const goalIndex = goal - GOAL_MIN; // 1 goal per step of 1, so the interpolation formula is easy.
  const goalsDataStrings = goalsFormsDataString.split(spacer, goalIndex + 1);
  const goalFormsDataString = goalsDataStrings[goalIndex];

  // const gradeKey = grade.toString as keyof typeof

  const gradeKey = grade.toString() as keyof typeof NUM_SOLS_OF_EACH_GRADE_AND_GOAL;
  const gradesTotalsObj = NUM_SOLS_OF_EACH_GRADE_AND_GOAL[gradeKey] as Record<string, number>;
  const goalKey = goal.toString();
  assert(goalKey in gradesTotalsObj, goalKey, grade);
  const totalNumSolsOfGradeAndGoal = gradesTotalsObj[goalKey];

  const solutionIndex = randomPositiveInteger(totalNumSolsOfGradeAndGoal);

  const decoder = new FormsAndFreqs(goalFormsDataString);

  const formsAndFreqs = Array.from(decoder.formsAndFreqs());

  // const formIndex = 6; //  "((2, 2), 1)",
  // const formIndex = 8; //  "(4, 2)",
  // const formIndex = 4; // "5"
  // const formIndex = 7; // "6"
  // return [FORMS[formIndex], randomPositiveInteger(formsAndFreqs[formIndex][1])];

  const totalSols = formsAndFreqs.map(([_form, freq]) => freq).reduce((a, c) => a + c);

  if (totalSols !== totalNumSolsOfGradeAndGoal) {
    throw new Error(
      `Decoding error.  Got totalSols: ${totalSols}.  Expected: ${totalNumSolsOfGradeAndGoal} ` +
        `, grade: ${grade}, goal: ${goal}`
    );
  }

  let numSolsSoFar = 0;
  for (const [form, freq] of formsAndFreqs) {
    const prevNumSolsSoFar = numSolsSoFar;
    numSolsSoFar += freq;
    if (solutionIndex < numSolsSoFar) {
      const solIndexThisForm = solutionIndex - prevNumSolsSoFar;
      return [form, solIndexThisForm];
    }
  }

  throw new Error(
    `No form found for grade: ${grade} with index: ${solutionIndex} in SuperMiniIndexStr.json`
  );
}