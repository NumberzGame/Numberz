import { useRef, useState } from 'react';

import { useDisclosure } from '@mantine/hooks';
import {Anchor, Center, Group, HoverCard, Button,
        Image, Text, Slider, Modal } from '@mantine/core';

import {
  useQuery,
} from '@tanstack/react-query'

import { NumbersGame } from './NumbersGame';

import { randomPositiveInteger, GOAL_MIN } from "../../gameCode/Core";
import { stringifyGameID, stringifyGame, destringifyGame } from '../../gameCode/Schema';
import { GameID, Game, GradedGameID, CustomGameID, GameState } from '../../gameCode/Classes';
import { spacer, FormsAndFreqs } from '../../gameCode/SuperMiniIndexStr/IndexCodec';
import { decodeSolsFromGoalFormAndBinaryData, randomGameFromGradeGoalFormAndSols } from '../../gameCode/gameDecoder';

// These JSON imports won't work in Deno without appending " with { type: "json" }"
// import NUM_SOLS_OF_ALL_GRADES from '../../data/num_sols_of_each_grade.json';
// import NUM_SOLS_OF_EACH_GRADE_AND_FORM from '../../data/num_of_sols_of_each_grade_and_form.json';
import NUM_SOLS_OF_EACH_GRADE_AND_GOAL from '../../data/num_of_sols_of_each_grade_and_goal.json';

import NUM_SOLS_GRADE_GOAL_FORMS_DATA_STRINGS from '../../data/SuperMiniIndexStr.json';




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



let storeGameInLocalStorage: (game: Game) => void;
let loadGameFromLocalStorage: (id: GameID) => Game | null;

if (storageAvailable()) {

  storeGameInLocalStorage = function(game: Game) {
      const key = stringifyGameID(game.id);
      const val = stringifyGame(game);
      localStorage.setItem(key, val);
  }

  loadGameFromLocalStorage = function(id: GameID) {
      const key = stringifyGameID(id);

      const val = localStorage.getItem(key);

      if (val === null) {
          return null;
      }

      return destringifyGame(val, id);

  }

} else {
    storeGameInLocalStorage = (game: Game) => {};
    loadGameFromLocalStorage = (id: GameID) => null;
}


const GRADE: number = 22;


interface winScreenProps {
    opened: boolean;
    close: () => void;

}



export function WinScreen(props: winScreenProps) {
    // CC0 https://stocksnap.io/photo/fireworks-background-CPLJUAMC1T
    // Photographer credit: https://stocksnap.io/author/travelphotographer
    return <Modal
              opened = {props.opened}
              onClose = {props.close}
              title="You are the winner!!"
              size="auto"
            >
            <Center mt="md">
            {/* <Text size="lg">
            </Text> */}
                {/* <Group gap="xs" maw = "400" justify="right" mt="sm" mr="sm" >
                  <Button size="md" onClick={}><b>X</b></Button>
                </Group> */}
            </Center>
            <Group justify="center" mt="md">
              <HoverCard shadow="md" openDelay={2000}>
                <HoverCard.Target>
                  <Image
                  h={500}
                  w="auto"
                  src="/fireworks-background_CPLJUAMC1T.jpg"
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
    </Modal>
    }


const onQuit = function() {}


export function GameBoSelector(props: {grade: number}) {
  const gradeObj = useRef(GRADE); //useRef(props.grade);

  // load gameID/key from localstorage; null if storage unavailable.
  const [currentGameID, setCurrentGame] = useState<GameID | null>(null);
  const [winScreenOpened, winScreenHandlers] = useDisclosure(false);

  const gradeSliderHandler = function(val: number) {
    gradeObj.current = 22; //val as number;
  }
  
  let gameComponent;
  if (currentGameID === null) {
      let gameID: GradedGameID;
      do {      
          const grade = gradeObj.current;
          const goal = randomGoal(grade); //
          const [form, formIndex] = randomFormAndIndex(grade, goal); //
          // localStorage.getItem returns null if the key is not found
          // loadGameFromLocalStorage passes this null through, signifying
          // a graded game with that gameID has not been played before.
          gameID = new GradedGameID(grade, goal, form, formIndex);
      } while (loadGameFromLocalStorage(gameID) !== null);
      
      gameComponent = (
        <NewGradedGameWithNewID 
        gameID = {gameID}
        onWin = {winScreenHandlers.open}
        ></NewGradedGameWithNewID>
      )
  } else {

    let game = loadGameFromLocalStorage(currentGameID);
    if (game === null) {
        // game not found in localStorage, or localStorage unavailable
        // Either way, we have nothing to destringify into a Game.
        if (currentGameID instanceof CustomGameID) {
          
            const state = new GameState();
            const datetime_ms = Date.now();
            const seedIndices = currentGameID.seedIndices;
            const opIndices = null;
            game = new Game(currentGameID, datetime_ms, seedIndices, opIndices, state);
        } else if (currentGameID instanceof GradedGameID) {
            throw new Error(`GradedGameID: ${currentGameID} came from game history, but could not be found`
                           +` in localstorage.  If the browser's localstorage was not cleared, after `
                           +`the game ID was retrieved from localstorage, then there may be a bug in the game. `
            );
        } else {
            throw new Error(`Unsupported game ID class: ${currentGameID}. `);
        }
    }
    gameComponent = (
        <NumbersGame 
          game = {game}
          onWin = {winScreenHandlers.open}
          store = {storeGameInLocalStorage}
          onQuit = {onQuit}
        ></NumbersGame>
    )
  }
  return <>
    <WinScreen opened={winScreenOpened} close = {winScreenHandlers.close}></WinScreen>
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
  gameID: GradedGameID;
  onWin: () => void;
}




function NewGradedGameWithNewID(props: NewGradedGameNewIDProps) {

  const gameID = props.gameID;

  // while (true) {
  const grade = gameID.grade;
  const goal = gameID.goal; //
  const form = gameID.form; //

  const formStrNoCommas = form.replaceAll(', ','_');
  const fileName = `solutions_${goal}_${formStrNoCommas}_grade_${grade}.dat`;
  const { isPending, error, data, isFetching } = useQuery({
    queryKey: [ grade, goal, form ],
    queryFn: async () => {
      const response = await fetch(
        `/grades_goals_forms_solutions/${grade}/${goal}/${fileName}`,
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

  const [seedsAndOpIndices, seedsAndOps, solStrings] = decodeSolsFromGoalFormAndBinaryData(goal, form, data);
  const game = randomGameFromGradeGoalFormAndSols(grade, goal, form, seedsAndOpIndices);

  // Only break if the game has not been played before.
  // (previously played games are stored in local storage).
  // const prevGame = loadGameFromLocalStorage(game.id);
  // console.log(prevGame);
  // if (prevGame === null) {
  //   break;
  // }
  //   break;
  // }
    
  return <>
          <Text>Form: {gameID.form}</Text>
          <NumbersGame
          game={game}
          onWin={props.onWin}
          store={storeGameInLocalStorage}
          onQuit = {onQuit}
          >
          </NumbersGame>
         </>
}
