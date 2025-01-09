import { useRef, useState, ReactNode } from 'react';
import { useImmer } from "use-immer";

import { useDisclosure, useFocusWithin } from '@mantine/hooks';
import {Anchor, Box, Center, Group, HoverCard, Button, Select,
        Image, Text, Slider, Modal, Stack, NumberInput, 
        SimpleGrid, TagsInput, Popover, FileInput } from '@mantine/core';


import { nanoid } from 'nanoid';
import { useQuery } from '@tanstack/react-query';

import { RandomGameOfGivenGradePicker } from './RandomGameOfGivenGradePicker';
import { CustomGamePicker } from './CustomGamePicker';
import { HistoricalGamePicker } from './HistoricalGamePicker';
import { WinScreen } from './WinScreen';
import { NumbersGame } from './NumbersGame';

import { randomPositiveInteger, SEEDS, ALL_SEEDS, GOAL_MIN, GOAL_MAX, MAX_SEEDS, OP_SYMBOLS } from "../../gameCode/Core";
import { stringifyGameID, destringifyGameID, stringifyGame, destringifyGame } from '../../gameCode/Schema';
import { GameID, Game, GradedGameID, CustomGameID, GameState, Move, } from '../../gameCode/Classes';
import { spacer, FormsAndFreqs } from '../../gameCode/SuperMiniIndexStr/IndexCodec';
import { decodeSolsFromGoalFormAndBinaryData, randomGameFromGradeGoalFormAndSols } from '../../gameCode/gameDecoder';
import { easiestSolution, stringifyForm, get_op_symbols_from_encodable_sol_expr } from '../../gameCode/Tnetennums/Solver';


// These JSON imports won't work in Deno without appending " with { type: "json" }"
// import NUM_SOLS_OF_ALL_GRADES from '../../data/num_sols_of_each_grade.json';
// import NUM_SOLS_OF_EACH_GRADE_AND_FORM from '../../data/num_of_sols_of_each_grade_and_form.json';
import NUM_SOLS_OF_EACH_GRADE_AND_GOAL from '../../data/num_of_sols_of_each_grade_and_goal.json';

import NUM_SOLS_GRADE_GOAL_FORMS_DATA_STRINGS from '../../data/SuperMiniIndexStr.json';
import { identity } from '@mantine/core/lib/core/factory/factory';




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

    // return 224;
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


function randomFormAndIndex(
    grade: number,
    goal: number,
    // grade: keyof typeof NUM_SOLS_GRADE_GOAL_FORMS_DATA_STRINGS,
    // goal: number, //keyof typeof NUM_SOLS_OF_EACH_GRADE_AND_GOAL,
    ): [string, number] {
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


    // const formIndex = 6; //  "((2, 2), 1)",
    // const formIndex = 8; //  "(4, 2)",
    // const formIndex = 4; // "5"
    // const formIndex = 7; // "6"
    // return [FORMS[formIndex], randomPositiveInteger(formsAndFreqs[formIndex][1])];


    const totalSols = formsAndFreqs.map(([form, freq]) => freq).reduce((a, c) => a+c);

    if (totalSols !== totalNumSolsOfGradeAndGoal) {
        throw new Error(
          `Decoding error.  Got totalSols: ${totalSols}.  Expected: ${totalNumSolsOfGradeAndGoal} `
          +`, grade: ${grade}, goal: ${goal}`);
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
         `No form found for grade: ${grade} with index: ${solutionIndex} `
        +`in SuperMiniIndexStr.json`
    );

}



function storageAvailable(type: "localStorage" | "sessionStorage" = "localStorage"): boolean {
  // https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API#testing_for_availability
  let storage;
  try {
    storage = window[type];
    const x = "__storage_test__";
    storage.setItem(x, x);
    storage.removeItem(x);
    return true;
  } catch (e) {
    return Boolean(
      e instanceof DOMException &&
      e.name === "QuotaExceededError" &&
      // acknowledge QuotaExceededError only if there's something already stored
      storage &&
      storage.length !== 0
    );
  }
}



let storeInLocalStorageIfAvailable: (k: string, v: string) => void;
let getFromLocalStorageIfAvailable: (k: string) => string | null;
let getKeyFromLocalStorageIfAvailable: (index: number) => string | null;
const LOCAL_STORAGE_AVAILABLE = storageAvailable("localStorage");

if (LOCAL_STORAGE_AVAILABLE) {
    storeInLocalStorageIfAvailable = (k: string, v: string) => localStorage.setItem(k, v);
    getFromLocalStorageIfAvailable = (k: string) => localStorage.getItem(k);
    getKeyFromLocalStorageIfAvailable = (i: number) => localStorage.key(i);
} else {
    storeInLocalStorageIfAvailable = (k: string, v: string) => undefined;
    getFromLocalStorageIfAvailable = (k: string) => null;
    getKeyFromLocalStorageIfAvailable = (i: number) => null;
}


const storeGame = function(game: Game) {
  const key = stringifyGameID(game.id);
  const val = stringifyGame(game);
  storeInLocalStorageIfAvailable(key, val);
}


const loadStoredGameFromKeyAndID = function(key: string, id: GameID): Game | null {
  const val = getFromLocalStorageIfAvailable(key);

  if (val === null) {
      return null;
  }

  return destringifyGame(val, id);

}


const loadStoredGame = function(id: GameID | null): Game | null {
  if (id === null) {
    return null;
  }

  const key = stringifyGameID(id);

  return loadStoredGameFromKeyAndID(key, id);
}

const loadCurrentGameIDIfStorageAvailable = function(): GameID | null {
  const stringifiedID = getFromLocalStorageIfAvailable('currentGame');
  if (stringifiedID === null) {
      return null;
  }

  return destringifyGameID(stringifiedID);
}

const saveGameIDIfStorageAvailable = function(id: GameID): void {
    const stringifiedID = stringifyGameID(id);
    storeInLocalStorageIfAvailable('currentGame', stringifiedID)
}

const GRADE: number = 22;









const previouslyUnseenGradedGameID = function(minGrade: number, maxGrade: number): GradedGameID {
  let gameID: GradedGameID;
  do {      
      const grade = minGrade + randomPositiveInteger(1 + maxGrade - minGrade);
      const goal = randomGoal(grade); //
      const [form, formIndex] = randomFormAndIndex(grade, goal); //
      // localStorage.getItem returns null if the key is not found
      // loadStoredGame passes this null through, signifying
      // a graded game with that gameID has not been played before.
      gameID = new GradedGameID(grade, goal, form, formIndex);
  } while (loadStoredGame(gameID) !== null);
  return gameID
}




const getStoredGames = function*(): IterableIterator<Game> {
    if (!LOCAL_STORAGE_AVAILABLE) {
        return;
    }
    for (let i = 0; i < localStorage.length; i++) {
        const key = getKeyFromLocalStorageIfAvailable(i);
        if (key === null) {
            return;
        }
        let gameID: GameID;
        try {
            gameID = destringifyGameID(key);
        } catch (error) {
            continue;
        }
        const game = loadStoredGameFromKeyAndID(key, gameID);
        if (game === null) {
            continue;
        }
        yield game;
    }

}








export function GameSelector(props: {grade: number}) {
  const gradeObj = useRef(1); //props.grade);

  // load gameID/key from localstorage; null if storage unavailable.
  const [currentGameID, setCurrentGameID] = useState<GameID | null>(loadCurrentGameIDIfStorageAvailable);
  
  const [winScreenOpened, winScreenHandlers] = useDisclosure(false);

  const onWin = function(): void {
      winScreenHandlers.open()
  }

  const selectNewGame = function(): void {
      setCurrentGameID(null);
  }

  const onClose = function(): void {
      selectNewGame()
      winScreenHandlers.close();
  }

  if (winScreenOpened && currentGameID !== null) {
      return <WinScreen opened={winScreenOpened} close = {onClose}></WinScreen>
  }

  // console.log(`currentGameID: ${currentGameID?.goal}, ${currentGameID?.form}` );
  const gradeSliderHandler = function(val: number) {
      gradeObj.current = val;// as number;
  }
  
  const setCurrentGameIDToPreviouslyUnseenGradedGameID = function() {
      const gameID = previouslyUnseenGradedGameID(gradeObj.current, gradeObj.current)
      setCurrentGameID(gameID);
  }

  const onQuit = function() {  
      selectNewGame()
  }

  if (currentGameID === null) {
      // Check if the null in currentGameID came from the initial/default 
      // factory passed to useState, which checked localstorage.
      if (loadCurrentGameIDIfStorageAvailable() === null) {
        setCurrentGameIDToPreviouslyUnseenGradedGameID();
          return <></>;
      }


      return <Group justify="center" mt="xs">
              <Stack justify="flex-start">
                  <RandomGameOfGivenGradePicker
                    initialValue={gradeObj.current}
                    onChangeEnd={gradeSliderHandler}
                    onClick={setCurrentGameIDToPreviouslyUnseenGradedGameID}
                  />  
                  <CustomGamePicker
                    setCurrentGameID={setCurrentGameID}

                  />
                  <HistoricalGamePicker
                    getStoredGames={getStoredGames}
                    storeGame={storeGame}
                    setCurrentGameID={setCurrentGameID} 
                  />
              </Stack>
             </Group>
      
  }

  // Write stringified gameID to localstorage (if available) under the key: "currentGame".
  saveGameIDIfStorageAvailable(currentGameID)

  let game = loadStoredGame(currentGameID);
  let gameComponent: ReactNode;
  if (game === null && currentGameID instanceof GradedGameID) {
      gameComponent = (
        <NewGradedGame 
          gameID = {currentGameID}
          onWin = {onWin}
          store = {storeGame}
          onQuit = {onQuit}
        ></NewGradedGame>
      )
  } else {
      if (currentGameID instanceof CustomGameID) {
          const solution = easiestSolution(
            currentGameID.seeds(),
            currentGameID.goal,
            );

          const form  = solution === null ? null : stringifyForm(solution.form);
          const grade = solution === null ? null : solution.grade;
          const id = new CustomGameID(
                              currentGameID.goal,
                              currentGameID.seedIndices,
                              grade,
                              form,
                              )
          const state = new GameState();
          const datetime_ms = Date.now();
          const seedIndices = currentGameID.seedIndices;
          const opIndices = (solution === null 
                            ? null
                            : Array.from(get_op_symbols_from_encodable_sol_expr(solution.encodable)).map((op) => OP_SYMBOLS.indexOf(op))
                            );
          game = new Game(id, datetime_ms, seedIndices, opIndices, state);

      } 
      if (game === null) {
          throw new Error(` Unsupported GameID type: ${currentGameID}.  No corresponding game found`
                          +` in localstorage for it.  Was the browser's localstorage cleared or were keys`
                          +` deleted from it, immediately after the gameID was retrieved from localstorage? `
          );
      }

      // write stringifed game to local storage under its (stringified) game ID
      storeGame(game);

      gameComponent = (
          <NumbersGame 
            game = {game}
            onWin = {onWin}
            store = {storeGame}
            onQuit = {onQuit}
          ></NumbersGame>
      )
  }


  return <>
    {gameComponent}
    
  </>
}


interface NewGradedGameProps {
  gameID: GradedGameID;
  onWin: () => void;
  store: (game: Game) => void;
  onQuit: () => void
}




function NewGradedGame(props: NewGradedGameProps) {
  // This sub component contains all the Tan Query stuff
  // needed to look up game solutions from the cache, that
  // shouldn't cause rerendeing of the Game selection menu.
  const gameID = props.gameID;

  // while (true) {
  const grade = gameID.grade;
  const goal = gameID.goal; //
  const form = gameID.form!; //

  const formStrNoCommas = form.replaceAll(', ','_');
  const fileName = `solutions_${goal}_${formStrNoCommas}_grade_${grade}.dat`;
  const { isPending, error, data, isFetching } = useQuery({
    queryKey: [ grade, goal, form ],
    queryFn: async () => {
      const response = await fetch(
        // `./all_grades_goals_forms_solutions/${grade}/${goal}/${fileName}`,
        `./grade_22_goals_forms_solutions/${grade}/${goal}/${fileName}`,
      );
      if (!response.ok){
          throw new Error(`Something went wrong fetching grade: ${grade}, goal: ${goal}, form: ${form}`);
      }
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

  const [seedsAndOpIndices, seedsAndOps, solStrings] = decodeSolsFromGoalFormAndBinaryData(goal, form, data);
  const game = randomGameFromGradeGoalFormAndSols(grade!, goal, form, seedsAndOpIndices);
  props.store(game);
  // Only break if the game has not been played before.
  // (previously played games are stored in local storage).
  // const prevGame = loadStoredGame(game.id);
  // console.log(prevGame);
  // if (prevGame === null) {
  //   break;
  // }
  //   break;
  // }
  // 
  // <Text>Form: {gameID.form}</Text>
    
  return <>
          <NumbersGame
          game={game}
          onWin={props.onWin}
          store={props.store}
          onQuit = {props.onQuit}
          >
          </NumbersGame>
         </>
}
