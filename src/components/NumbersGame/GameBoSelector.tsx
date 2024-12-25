import { useRef, useState } from 'react';

import {Anchor, Center, Group, HoverCard, 
        Image, Text, Stack, Slider } from '@mantine/core';

import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query'

import { MakeSubByteEncoderAndDecoder,
  getBitWidthsEncodingsAndDecodings, intDecoder
 } from 'sub_byte';

import { ALL_SEEDS, SEEDS, OP_SYMBOLS, FORMS, randomPositiveInteger, 
         MAX_OPS, MAX_SEEDS, GOAL_MIN, GOAL_MAX} from "./Core";
import { NumbersGame, NumbersGameProps, loadGameFromLocalStorage } from './NumbersGame';
import { evalSolution, solutionExpr} from './solutionEvaluator';
import { GameID, Game, GradedGameID, CustomGameID, GameState, numSeedsFromForm } from './Classes';
import { spacer, FormsAndFreqs } from '../SuperMiniIndexStr/IndexCodec';
// These JSON imports won't work in Deno without appending " with { type: "json" }"
// import NUM_SOLS_OF_ALL_GRADES from '../../data/num_sols_of_each_grade.json';
// import NUM_SOLS_OF_EACH_GRADE_AND_FORM from '../../data/num_of_sols_of_each_grade_and_form.json';
import NUM_SOLS_OF_EACH_GRADE_AND_GOAL from '../../data/num_of_sols_of_each_grade_and_goal.json';

import NUM_SOLS_GRADE_GOAL_FORMS_DATA_STRINGS from '../../data/SuperMiniIndexStr.json';

const GRADES_NUMS = Object.keys(NUM_SOLS_OF_EACH_GRADE_AND_GOAL).map((k) => parseInt(k));
const GRADE_MIN = GRADES_NUMS.reduce((x, y) => Math.min(x, y));
const GRADE_MAX = GRADES_NUMS.reduce((x, y) => Math.max(x, y));



function sumValues(obj: Record<string, number>): number {
    return Object.values(obj).reduce((x, y) => x+y);

}


const NUM_SOLS_OF_ALL_GRADES = Object.fromEntries(Object.entries(NUM_SOLS_OF_EACH_GRADE_AND_GOAL).map(([k, v]) => [k, sumValues(v)]));



function randomGrade(): number {
    return 22
    const numSolsAllGrades = sumValues(NUM_SOLS_OF_ALL_GRADES);
    let index = randomPositiveInteger(numSolsAllGrades);

    let numSols = 0;
    for (const [grade, value] of Object.entries(NUM_SOLS_OF_ALL_GRADES).sort(([k, v]) => parseInt(k))) {
        numSols += value;
        if (index < numSols) {
          return parseInt(grade) as number; 
        }
    }
    throw new Error(`No grade found for index: ${index} in num_sols_of_each_grade.json`);

}

function randomGoal(
    grade: number, // keyof typeof NUM_SOLS_OF_EACH_GRADE_AND_GOAL,
    ): number {

    // return 224
    // If nullish, shortcut to empty object making the main loop 
    // have 0 iterations, ending in the "form not found" error
    const gradesObj = NUM_SOLS_OF_EACH_GRADE_AND_GOAL[grade.toString() as keyof typeof NUM_SOLS_OF_EACH_GRADE_AND_GOAL] ?? {};
    
    const numSolsOfGrade = sumValues(gradesObj);
    let index = randomPositiveInteger(numSolsOfGrade);

    let numSolsSoFar = 0;
    for (const [goal, numSols] of Object.entries(gradesObj).sort(([k, v]) => parseInt(k))) {
      numSolsSoFar += numSols;
        if (index < numSolsSoFar) {
          return parseInt(goal); 
        }
        
    }
    
    throw new Error(
      `No goal found for index: ${index}, numSols: ${numSolsSoFar} `
      +`grade: ${grade} in num_of_sols_of_each_grade_and_form.json`
    );
}


function assert(condition: any, goalKey: string, grade: number): asserts condition {
  if (!condition) {
    throw new Error(`Goal: ${goalKey} not found for grade: ${grade} in ${NUM_SOLS_OF_EACH_GRADE_AND_GOAL}}`);
  }
}


function randomForm(
    grade: number,
    goal: number,
    // grade: keyof typeof NUM_SOLS_GRADE_GOAL_FORMS_DATA_STRINGS,
    // goal: number, //keyof typeof NUM_SOLS_OF_EACH_GRADE_AND_GOAL,
    ): string {
    // If nullish, shortcut to empty object making the main loop 
    // have 0 iterations, ending in the "form not found" error


    const gradeDataStringsKey = grade.toString() as keyof typeof NUM_SOLS_GRADE_GOAL_FORMS_DATA_STRINGS
    const goalsFormsDataString = NUM_SOLS_GRADE_GOAL_FORMS_DATA_STRINGS[gradeDataStringsKey] as string;
    const goalIndex = goal - GOAL_MIN;  // 1 goal per step of 1, so the interpolation formula is easy.
    const goalsDataStrings = goalsFormsDataString.split(spacer, goalIndex+1);
    const goalFormsDataString = goalsDataStrings[goalIndex];
    
    // const gradeKey = grade.toString as keyof typeof 

    const gradeKey = grade.toString() as keyof typeof NUM_SOLS_OF_EACH_GRADE_AND_GOAL
    const gradesTotalsObj = NUM_SOLS_OF_EACH_GRADE_AND_GOAL[gradeKey] as Record<string, number>;
    const goalKey = goal.toString();
    assert(goalKey in gradesTotalsObj, goalKey, grade);
    const totalNumSolsOfGradeAndGoal = gradesTotalsObj[goalKey];

    const solutionIndex = randomPositiveInteger(totalNumSolsOfGradeAndGoal);
    
    const decoder = new FormsAndFreqs(goalFormsDataString);

    const formsAndFreqs = Array.from(decoder.formsAndFreqs());

    const totalSols = formsAndFreqs.map(([form, freq]) => freq).reduce((a, c) => a+c);

    if (totalSols !== totalNumSolsOfGradeAndGoal) {
        throw new Error(
          `Decoding error.  Got totalSols: ${totalSols}.  Expected: ${totalNumSolsOfGradeAndGoal} `
          +`, grade: ${grade}, goal: ${goal}`);
    }


    let numSolsSoFar = 0;

    for (const [form, freq] of formsAndFreqs) {
        numSolsSoFar += freq;
        if (solutionIndex < numSolsSoFar) {
            return form; 
        }
        
    }
    
    throw new Error(
         `No form found for grade: ${grade} with index: ${solutionIndex} `
        +`in SuperMiniIndexStr.json.json`
    );

    // const numSolsOfGrade = sumValues(formsObj);
    // let index = randomPositiveInteger(numSolsOfGrade);
    // let numSols = 0;
    // for (const form of FORMS) {
    //     if (!(form in formsObj)) {
    //       continue;
    //     }
    //     const value = formsObj[form as keyof typeof formsObj];
    //     numSols += value;
    //     if (index < numSols) {
    //       return form; 
    //     }
        
    // }
    
    // throw new Error(`No form found for grade: ${grade} with index: ${index }in num_of_sols_of_each_grade_and_goal.json`);

    // return '(((2_2)_1)_1)';
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

const GRADE: number = 22;


export function onWin() {
    // CC0 https://stocksnap.io/photo/fireworks-background-CPLJUAMC1T
    // Photographer credit: https://stocksnap.io/author/travelphotographer
    return <>
            <Center mt="md">
            <Text size="lg">
              You are the winner!!
            </Text>
            </Center>
            <Group justify="center" mt="md">
              <HoverCard shadow="md" openDelay={2000}>
                <HoverCard.Target>
                  <Image
                  h={500}
                  w="auto"
                  src="./fireworks-background_CPLJUAMC1T.jpg"
                  radius="lg"
                ></Image>
                </HoverCard.Target>
                <HoverCard.Dropdown>
                  <Anchor href="https://stocksnap.io/author/travelphotographer"
                          size="sm"
                          c="violet">Photo credit: "TravelPhotographer"</Anchor>
                </HoverCard.Dropdown>
              </HoverCard>
            </Group>
    </>
    }


export function GameBoSelector(props: {grade: number}) {
  const gradeObj = useRef(GRADE); //useRef(props.grade);

  // load gameID/key from localstorage; null if storage unavailable.
  const [currentGame, setCurrentGame] = useState<GameID | null>(null);

  const gradeSliderHandler = function(val: number) {
    gradeObj.current = 22; //val as number;
  }
  
  let gameComponent;
  if (currentGame === null) {
      gameComponent = (
        <NewGradedGameWithNewID 
         grade = {gradeObj.current}
        ></NewGradedGameWithNewID>
      )
  } else {

    let game = loadGameFromLocalStorage(currentGame);
    if (game === null) {
        // game not found in localStorage, or localStorage unavailable
        // Either way, we have nothing to destringify into a Game.
        if (currentGame instanceof CustomGameID) {
          
            const state = new GameState();
            const datetime_ms = Date.now();
            const seedIndices = currentGame.seedIndices;
            const opIndices = null;
            game = new Game(currentGame, datetime_ms, seedIndices, opIndices, state);
        } else if (currentGame instanceof GradedGameID) {
            throw new Error(`GradedGameID: ${currentGame} came from game history, but could not be found`
                           +` in localstorage.  If the browser's localstorage was not cleared, after `
                           +`the game ID was retrieved from localstorage, then there may be a bug in the game. `
            );
        } else {
            throw new Error(`Unsupported game ID class: ${currentGame}. `);
        }
    }
    gameComponent = (
        <NumbersGame 
          game = {game}
          onWin = {onWin}
        ></NumbersGame>
    )
  }
  return <>
    {gameComponent}
    
    <Slider
        value = {gradeObj.current}
        min={GRADE}
        max = {GRADE}
        // marks={[
        //   {value: 0, label: '1'},
        //   // { value: 20, label: '20%' },
        //   // { value: 50, label: '50%' },
        //   // { value: 80, label: '80%' },
        //   {value: 100, label: '223'},
        // ]}
        mt = {15}
        onChangeEnd = {gradeSliderHandler}
      />
  </>
}


interface NewGradedGameNewIDProps {
  grade: number
}


function NewGradedGameWithNewID(props: NewGradedGameNewIDProps) {

  const grade = props.grade;
  const goal = randomGoal(grade); //
  const form = randomForm(grade, goal); //
  const key = `${goal}_${form}_grade_${grade}`;
  const { isPending, error, data, isFetching } = useQuery({
    queryKey: [ key ],
    queryFn: async () => {
      const response = await fetch(
        `./grades_goals_forms_solutions/${grade}/${goal}/solutions_${key}.dat`,
      );
      return await response.bytes();
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
  const seedIndicesAndOpIndices = [];

  const numSeeds = numSeedsFromForm(form);
  const numOps = numSeeds - 1;

  while (true) {
      // num seeds (6) and num ops (5) are 
      // determined by the form above (((2_2)_1)_1)
      // const seeds = Array.from(decoder(dataIterator, 6));
      // const opSymbols = Array.from(decoder(dataIterator, 5));
      const seedIndices = Array.from(intDecoder(dataIterator, numSeeds, seedsBitWidths));
      const opIndices = Array.from(intDecoder(dataIterator, numOps, opsBitWidths));
      const seeds = seedIndices.map(x => SEEDS[x]);
      const opSymbols = opIndices.map(x => OP_SYMBOLS[x]);
      // const opSymbols = Array.from(decoder(dataIterator, 5));
      if (seeds.length < 6 ) { //|| opSymbols.length < 5) {
        break;
      }

      if (evalSolution(form, seeds, opSymbols) !== goal) {
          throw new Error(`Invalid solution. Form: ${form}, seeds: ${seeds}, ops: ${opSymbols}`);
      }
      seedIndicesAndOpIndices.push([seedIndices, opIndices]);
      sols.push(<Text>{solutionExpr(form, seeds, opSymbols)}</Text>);
  }

  const index = randomPositiveInteger(sols.length);
  const sol = sols[index];
  const id = new GradedGameID(grade, goal, form, index);

  
  const [seedIndices, opIndices] = seedIndicesAndOpIndices[index];
 
  const state = new GameState();
  const datetime_ms = Date.now();
  const game = new Game(id, datetime_ms, seedIndices, opIndices, state);

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
  
  return <NumbersGame
          game={game}
          onWin={onWin}
          >
         </NumbersGame>
}
