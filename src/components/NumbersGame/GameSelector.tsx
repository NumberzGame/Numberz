import { ReactNode, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Group, Stack } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
// These JSON imports won't work in Deno without appending " with { type: "json" }"
// import NUM_SOLS_OF_EACH_GRADE_AND_FORM from '../../data/num_of_sols_of_each_grade_and_form.json';
import NUM_SOLS_OF_EACH_GRADE_AND_GOAL from '../../data/num_of_sols_of_each_grade_and_goal.json';
import NUM_SOLS_GRADE_GOAL_FORMS_DATA_STRINGS from '../../data/superMiniIndexStr.json';
import { CustomGameID, Game, GameID, GameState, GradedGameID } from '../../gameCode/Classes';
import { GOAL_MIN, OP_SYMBOLS, randomPositiveInteger, SEEDS } from '../../gameCode/Core';
import {
  decodeSolsFromGoalFormAndBinaryData,
  randomGameFromGradeGoalFormAndSols,
} from '../../gameCode/gameDecoder';
import {
  destringifyGame,
  destringifyGameID,
  stringifyGame,
  stringifyGameID,
} from '../../gameCode/Schema';
import { FormsAndFreqs, spacer } from '../../gameCode/SuperMiniIndexStr/IndexCodec';
import {
  get_op_symbols_from_encodable_sol_expr,
  get_seeds_from_encodable_sol_expr,
} from '../../gameCode/Tnetennums/SolutionInfo';
import { easiestSolution, stringifyForm } from '../../gameCode/Tnetennums/Solver';
import { CustomGamePicker } from './CustomGamePicker';
import { HistoricalGamePicker } from './HistoricalGamePicker';
import { NumbersGame } from './NumbersGame';
import { RandomGameOfGivenGradePicker } from './RandomGameOfGivenGradePicker';
import { WinScreen } from './WinScreen';

function sumValues(obj: Record<string, number>): number {
  return Object.values(obj).reduce((x, y) => x + y);
}




function randomGoal(
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

function randomFormAndIndex(
  grade: number,
  goal: number
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

function storageAvailable(type: 'localStorage' | 'sessionStorage' = 'localStorage'): boolean {
  // https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API#testing_for_availability
  let storage;
  try {
    storage = window[type];
    const x = '__storage_test__';
    storage.setItem(x, x);
    storage.removeItem(x);
    return true;
  } catch (e) {
    return Boolean(
      e instanceof DOMException &&
        e.name === 'QuotaExceededError' &&
        // acknowledge QuotaExceededError only if there's something already stored
        storage &&
        storage.length !== 0
    );
  }
}

let storeInLocalStorageIfAvailable: (k: string, v: string) => void;
let getFromLocalStorageIfAvailable: (k: string) => string | null;
let getKeyFromLocalStorageIfAvailable: (index: number) => string | null;
const LOCAL_STORAGE_AVAILABLE = storageAvailable('localStorage');

if (LOCAL_STORAGE_AVAILABLE) {
  storeInLocalStorageIfAvailable = (k: string, v: string) => localStorage.setItem(k, v);
  getFromLocalStorageIfAvailable = (k: string) => localStorage.getItem(k);
  getKeyFromLocalStorageIfAvailable = (i: number) => localStorage.key(i);
} else {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  storeInLocalStorageIfAvailable = (k: string, v: string) => undefined;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getFromLocalStorageIfAvailable = (k: string) => null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getKeyFromLocalStorageIfAvailable = (i: number) => null;
}

const storeGame = function (game: Game) {
  const key = stringifyGameID(game.id);
  const val = stringifyGame(game);
  storeInLocalStorageIfAvailable(key, val);
};

const loadStoredGameFromKeyAndID = function (key: string, id: GameID): Game | null {
  const val = getFromLocalStorageIfAvailable(key);

  if (val === null) {
    return null;
  }

  return destringifyGame(val, id);
};

const loadStoredGame = function (id: GameID | null): Game | null {
  if (id === null) {
    return null;
  }

  const key = stringifyGameID(id);

  return loadStoredGameFromKeyAndID(key, id);
};

const loadCurrentGameIDIfStorageAvailable = function (): GameID | null {
  const stringifiedID = getFromLocalStorageIfAvailable('currentGame');
  if (stringifiedID === null) {
    return null;
  }

  return destringifyGameID(stringifiedID);
};

const saveGameIDIfStorageAvailable = function (id: GameID): void {
  const stringifiedID = stringifyGameID(id);
  storeInLocalStorageIfAvailable('currentGame', stringifiedID);
};

const previouslyUnseenGradedGameID = function (minGrade: number, maxGrade: number): GradedGameID {
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
  return gameID;
};

const getStoredGames = function* (): IterableIterator<Game> {
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
};

export function GameSelector(props: { grade: number }) {
  const gradeObj = useRef(props.grade);

  // load gameID/key from localstorage; null if storage unavailable.
  const [currentGameID, setCurrentGameID] = useState<GameID | null>(
    loadCurrentGameIDIfStorageAvailable
  );

  const [winScreenOpened, winScreenHandlers] = useDisclosure(false);

  const onWin = function (): void {
    winScreenHandlers.open();
  };

  const selectNewGame = function (): void {
    setCurrentGameID(null);
  };

  const onClose = function (): void {
    selectNewGame();
    winScreenHandlers.close();
  };

  if (winScreenOpened && currentGameID !== null) {
    return <WinScreen opened={winScreenOpened} close={onClose} />;
  }

  // console.log(`currentGameID: ${currentGameID?.goal}, ${currentGameID?.form}` );
  const gradeSliderHandler = function (val: number) {
    gradeObj.current = val; // as number;
  };

  const setCurrentGameIDToPreviouslyUnseenGradedGameID = function () {
    const gameID = previouslyUnseenGradedGameID(gradeObj.current, gradeObj.current);
    setCurrentGameID(gameID);
  };

  const onQuit = function () {
    selectNewGame();
  };

  if (currentGameID === null) {
    // Check if the null in currentGameID came from the initial/default
    // factory passed to useState, which checked localstorage.
    if (loadCurrentGameIDIfStorageAvailable() === null) {
      setCurrentGameIDToPreviouslyUnseenGradedGameID();
      return <></>;
    }

    return (
      <Group justify="center" mt="xs">
        <Stack justify="flex-start">
          <RandomGameOfGivenGradePicker
            initialValue={gradeObj.current}
            onChangeEnd={gradeSliderHandler}
            onClick={setCurrentGameIDToPreviouslyUnseenGradedGameID}
          />
          <CustomGamePicker setCurrentGameID={setCurrentGameID} />
          <HistoricalGamePicker
            getStoredGames={getStoredGames}
            storeGame={storeGame}
            setCurrentGameID={setCurrentGameID}
          />
        </Stack>
      </Group>
    );
  }

  // Write stringified gameID to localstorage (if available) under the key: "currentGame".
  saveGameIDIfStorageAvailable(currentGameID);

  let game = loadStoredGame(currentGameID);
  let gameComponent: ReactNode;
  if (game === null && currentGameID.typeCode === GradedGameID.GAME_ID_TYPE_CODE) {
    const gradedGameID = currentGameID as GradedGameID;
    gameComponent = (
      <NewGradedGame gameID={gradedGameID} onWin={onWin} store={storeGame} onQuit={onQuit} />
    );
  } else {
    if (currentGameID.typeCode === CustomGameID.GAME_ID_TYPE_CODE) {
      const customGameID = currentGameID as CustomGameID;
      const solution = easiestSolution(
        customGameID.seeds(),
        customGameID.goal,
        // Keeping the cache from previous custom games, slows
        // down solving future games unnecessarily,
        // as all possible operands in the caches are checked.
        // So we provide new empty forward and reverse caches
        // for each call:
        {},
        {}
      );

      // console.log(solution);

      let form: string | null;
      let grade: number | null;
      let opIndices: number[] | null;
      let seedIndices: number[];

      if (solution === null) {
        form = null;
        grade = null;
        opIndices = null;
        seedIndices = customGameID.seedIndices;
      } else {
        form = stringifyForm(solution.form);
        grade = solution.grade;
        const ops = Array.from(get_op_symbols_from_encodable_sol_expr(solution.encodable));
        // console.log(`ops: ${ops}`);
        opIndices = ops.map((op) => OP_SYMBOLS.indexOf(op));
        seedIndices = Array.from(get_seeds_from_encodable_sol_expr(solution.encodable)).map(
          (seed) => SEEDS.indexOf(seed)
        );
      }
      const id = new CustomGameID(customGameID.goal, customGameID.seedIndices, grade, form);
      const state = new GameState();
      const datetime_ms = Date.now();
      // console.log(`opIndices: ${opIndices}`);
      game = new Game(id, datetime_ms, seedIndices, opIndices, state);
    }
    if (game === null) {
      throw new Error(
        ` Unsupported GameID type: ${currentGameID}.  No corresponding game found` +
          ` in localstorage for it.  Was the browser's localstorage cleared or were keys` +
          ` deleted from it, immediately after the gameID was retrieved from localstorage? `
      );
    }

    // write stringifed game to local storage under its (stringified) game ID
    storeGame(game);

    gameComponent = <NumbersGame game={game} onWin={onWin} store={storeGame} onQuit={onQuit} />;
  }

  return <>{gameComponent}</>;
}

interface NewGradedGameProps {
  gameID: GradedGameID;
  onWin: () => void;
  store: (game: Game) => void;
  onQuit: () => void;
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

  const formStrNoCommas = form.replaceAll(', ', '_');
  const fileName = `solutions_${goal}_${formStrNoCommas}_grade_${grade}.dat`;
  const { isPending, error, data, isFetching } = useQuery({
    queryKey: [grade, goal, form],
    queryFn: async () => {
      const response = await fetch(
        // `./all_grades_goals_forms_solutions/${grade}/${goal}/${fileName}`,
        `./grade_22_goals_forms_solutions/${grade}/${goal}/${fileName}`
      );
      if (!response.ok) {
        throw new Error(
          `Something went wrong fetching grade: ${grade}, goal: ${goal}, form: ${form}`
        );
      }
      return await response.bytes();
    },
  });

  if (isPending) {
    return 'Loading game...';
  }

  if (error) {
    return `An error has occurred: ${error.message}`;
  }

  if (isFetching) {
    return 'Fetching game... ';
  }

  const [seedsAndOpIndices, _seedsAndOps, _solStrings] = decodeSolsFromGoalFormAndBinaryData(
    goal,
    form,
    data
  );
  const game = randomGameFromGradeGoalFormAndSols(grade!, goal, form, seedsAndOpIndices);
  props.store(game);

  return (
    <>
      <NumbersGame game={game} onWin={props.onWin} store={props.store} onQuit={props.onQuit} />
    </>
  );
}
