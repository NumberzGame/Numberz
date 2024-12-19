
import { useRef, useState } from 'react';

import {Text, Stack, Slider } from '@mantine/core';

import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query'

import { MakeSubByteEncoderAndDecoder,
  getBitWidthsEncodingsAndDecodings, intDecoder
 } from 'sub_byte';

import { ALL_SEEDS, SEEDS, OP_SYMBOLS, FORMS, randomPositiveInteger } from "./Core";
import { NumbersGame, NumbersGameProps } from './NumbersGame';
import { evalSolution, solutionExpr} from './solutionEvaluator';
import { GameID, Game } from './Classes';
// Wont work in Deno - need to append " with { type: "json" }"
import NUM_SOLS_OF_ALL_GRADES from '../../../public/grades_goals_solutions_forms/num_sols_of_each_grade.json';
import NUM_SOLS_OF_EACH_GRADE_AND_FORM from '../../../public/grades_goals_solutions_forms/num_of_sols_of_each_grade_and_form.json';
// import NUM_SOLS_OF_EACH_GRADE_AND_GOAL from '../../../public/grades_goals_solutions_forms/num_of_sols_of_each_grade_and_goal.json';

type StrNumsMappingT = {
  [key in string]: number;
};

function sumValues(obj: StrNumsMappingT): number {
    return Object.values(obj).reduce((x, y) => x+y);

}

function randomGrade(): number {

  const numSolsAllGrades = sumValues(NUM_SOLS_OF_ALL_GRADES);
  let index = randomPositiveInteger(numSolsAllGrades);

  let numSols = 0;
  for (const [grade, value] of Object.entries(NUM_SOLS_OF_ALL_GRADES).sort(([k, v]) => parseInt(k))) {
      numSols += value;
      if (index < numSols) {
        return parseInt(grade); 
      }
  }
  throw new Error(`No grade found for index: ${index} in num_sols_of_each_grade.json`);

}

function randomGoal(
    grade: number,// grade: keyof typeof NUM_SOLS_OF_EACH_GRADE_AND_FORM,
    ): number {
    return 224
    // // If nullish, shortcut to empty object making the main loop 
    // // have 0 iterations, ending in the "form not found" error
    // const gradesObj = NUM_SOLS_OF_EACH_GRADE_AND_FORM[grade] ?? {};
    
    // const numSolsOfGrade = sumValues(gradesObj);
    // let index = randomPositiveInteger(numSolsOfGrade);

    // let numSolsSoFar = 0;
    // for (const [goal, numSols] of Object.entries(gradesObj).sort(([k, v]) => parseInt(k))) {
    //   numSolsSoFar += numSols;
    //     if (index < numSols) {
    //       return goal; 
    //     }
        
    // }
    
    // throw new Error(`No goal found for grade: ${grade} in num_of_sols_of_each_grade_and_form.json`);
}

function randomForm(
    grade: keyof typeof NUM_SOLS_OF_EACH_GRADE_AND_FORM,
    // goal: keyof typeof NUM_SOLS_OF_EACH_GRADE_AND_GOAL,
    ): string {
    // If nullish, shortcut to empty object making the main loop 
    // have 0 iterations, ending in the "form not found" error
    const formsObj = NUM_SOLS_OF_EACH_GRADE_AND_FORM[grade] ?? {};
    
    const numSolsOfGrade = sumValues(formsObj);
    let index = randomPositiveInteger(numSolsOfGrade);
    let numSols = 0;
    for (const form of FORMS) {
        if (!(form in formsObj)) {
          continue;
        }
        const value = formsObj[form as keyof typeof formsObj];
        numSols += value;
        if (index < numSols) {
          return form; 
        }
        
    }
    
    throw new Error(`No form found for grade: ${grade} with index: ${index }in num_of_sols_of_each_grade_and_goal.json`);

}

// These two should be the same:
// console.log(sumValues(NUM_SOLS_OF_ALL_GRADES));
// console.log(Object.values(NUM_SOLS_OF_EACH_GRADE_AND_FORM).map(sumValues).reduce((x, y) => x+y));


// const [encodeOps,
//        decodeOps,
//        opsBitWidths,
//        opsEncodings,
//        opsDecodings,
// ] = MakeSubByteEncoderAndDecoder([OP_SYMBOLS]);

// const [encodeSeeds,
//        decodeSeeds,
//        seedsBitWidths,
//        seedsEncodings,
//        seedsDecodings,
// ] = MakeSubByteEncoderAndDecoder([ALL_SEEDS]);

const seedsValueSets = [ALL_SEEDS, ALL_SEEDS, ALL_SEEDS, ALL_SEEDS, ALL_SEEDS, ALL_SEEDS];
const opsValueSets= [OP_SYMBOLS, OP_SYMBOLS, OP_SYMBOLS, OP_SYMBOLS, OP_SYMBOLS, ];
// const valueSets = [,...seedsValueSets,...opsValueSets];

// const [encoder,
//        decoder,
//        bitWidths,
//        encodings,
//        decodings,
// ] = MakeSubByteEncoderAndDecoder<(string | number)>(valueSets);

// const [bitWidths, encodings, decodings] = getBitWidthsEncodingsAndDecodings<(string | number)>(valueSets)
const [seedsBitWidths, seedsEncodings, seedsDecodings] = getBitWidthsEncodingsAndDecodings(seedsValueSets)
const [opsBitWidths, opsEncodings, opsDecodings] = getBitWidthsEncodingsAndDecodings(opsValueSets)

const GRADE = 22;

export function GameBoSelector(props: {grade: number}) {
  const gradeObj = useRef(GRADE); //props.grade);
  const [currentGame, setCurrentGame] = useState<GameID | null>(null);

  const gradeSliderHandler = function(val: number) {
    gradeObj.current = val;
  }
  
  if (currentGame === null) {
    return <NewGradedGameWithNewID grade = {gradeObj.current}></NewGradedGameWithNewID>
  }     
  return <NumbersGame 
          gameID = {currentGame}
         ></NumbersGame>;
  
}


interface NewGradedGameNewIDProps {
  grade: number
}


function NewGradedGameWithNewID(props: NewGradedGameNewIDProps) {
  const grade = props.grade;
  const goal = randomGoal(grade); //
  const form = '(((2_2)_1)_1)'; //
  const key = `${goal}_${form}_grade_${grade}`;
  const { isPending, error, data, isFetching } = useQuery({
    queryKey: [ key ],
    queryFn: async () => {
      const response = await fetch(
        `./grades_goals_solutions_forms/${grade}/${goal}/solutions_${key}.dat`,
      );
      return await response.bytes()
    },
  });
  


  if (isPending) {
    return 'Loading game...';
  }

  if (error) {
    return 'An error has occurred: ' + error.message;
  }
  
  if (isFetching) {
    return 'Fetching game... ';
  }

  const dataNums = Uint8Array.from(data);

  const dataIterator = dataNums[Symbol.iterator]() as IterableIterator<number>;

  const sols = [];
  while (true) {
    // num seeds (6) and num ops (5) are 
    // determined by the form above (((2_2)_1)_1)
    // const seeds = Array.from(decoder(dataIterator, 6));
    // const opSymbols = Array.from(decoder(dataIterator, 5));
    const seeds = Array.from(intDecoder(dataIterator, 6, seedsBitWidths)).map(x => SEEDS[x]);
    const opSymbols = Array.from(intDecoder(dataIterator, 5, opsBitWidths)).map(x => OP_SYMBOLS[x]);
    // const opSymbols = Array.from(decoder(dataIterator, 5));
    if (seeds.length < 6 ) { //|| opSymbols.length < 5) {
      break;
    }

    if (evalSolution(form, seeds, opSymbols) !== goal) {
        throw new Error(`Invalid solution. Form: ${form}, seeds: ${seeds}, ops: ${opSymbols}`);
    }

    sols.push(<Text>{solutionExpr(form, seeds, opSymbols)}</Text>)
  }

  // const texts = [];
  // for (const x of dataNums) {
  //   texts.push(<Text>{x}</Text>)
  // }
  // const dataTexts = dataNums.map((x) => <Text>{x}</Text>);

  // const forms: string[] = Array.from(Object.keys(data));
  // const freqs: number[] = Array.from(Object.values(data));
  // const FormTexts = Object.entries(data).map(([k, v]: [string, any]) => (<Text>{k} : {v.toString()}</Text>));

      // <div>
      //   <h1>{data.full_name}</h1>
      //   <p>{data.description}</p>
      //   <strong>👀 {data.subscribers_count}</strong>{' '}
      //   <strong>✨ {data.stargazers_count}</strong>{' '}
      //   <strong>🍴 {data.forks_count}</strong>
      //   <div>{isFetching ? 'Updating...' : ''}</div>
      // </div>
  
  return ( <>    <Stack>
        {/* {FormTexts} */}
        {/* {texts} */}
        {sols}
      </Stack>
      </>
  )
}
