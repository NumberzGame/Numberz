import { ReactNode, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Group, Stack, } from '@mantine/core';
import { useDisclosure, } from '@mantine/hooks';

import { CustomGamePicker } from './CustomGamePicker';
import { HistoricalGamePicker, niceGameSummaryStr } from './HistoricalGamePicker';
import { NumbersGame, GameCallbacks } from './NumbersGame';
import { RandomGameOfGivenGradePicker } from './RandomGameOfGivenGradePicker';
import { WinScreen } from './WinScreen';
import { Layout } from './Layout';

import { CustomGameID, Game, GameID, GameState, GradedGameID, getRedHerringIndices } from '../../gameCode/Classes';
import { OP_SYMBOLS, randomPositiveInteger, SEEDS } from '../../gameCode/Core';
import {
  decodeSolsFromGoalFormAndBinaryData,
  newGameFromGradeGoalFormAndSols,
} from '../../gameCode/gameDecoder';
import {
  destringifyGame,
  destringifyGameID,
  stringifyGame,
  stringifyGameID,
} from '../../gameCode/Schema';
import {makeCounter} from '../../gameCode/Tnetennums/Core';
import {
  get_op_symbols_from_encodable_sol_expr,
  get_seeds_from_encodable_sol_expr,
} from '../../gameCode/Tnetennums/SolutionInfo';
import { easiestSolution, stringifyForm } from '../../gameCode/Tnetennums/Solver';
import {randomGoal, randomFormAndIndex, KNOWN_GRADES} from '../../gameCode/Tnetennums/PreBuiltCache';


// Players unlock higher difficulties as their score increases.
const INITIAL_MAX_DIFFICULTY=14;


function maxDifficulty(score: number): number {
    return Math.floor(0.6*score + INITIAL_MAX_DIFFICULTY);
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

const LOCAL_STORAGE_AVAILABLE = storageAvailable('localStorage');

let storeInLocalStorageIfAvailable: (k: string, v: string) => void;
let getFromLocalStorageIfAvailable: (k: string) => string | null;
let getKeyFromLocalStorageIfAvailable: (index: number) => string | null;

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

const dec = (s: string) => s.split("").map((c)=>c.charCodeAt(0)); 

const saveGameIDIfStorageAvailable = function (id: GameID): void {
  const stringifiedID = stringifyGameID(id);
  storeInLocalStorageIfAvailable('currentGame', stringifiedID);
};


const loadChosenGradeOfNewGameIfStorageAvailable = function() : number | null {
    const stringified = getFromLocalStorageIfAvailable('newGameChosenGrade');
    if (stringified === null) {
        return null;
    }
    return parseInt(stringified, 10);
}

const saveChosenGradeOfNewGameIfStorageAvailable = function (grade: number): void {
  const stringified = grade.toString(10);
  storeInLocalStorageIfAvailable('newGameChosenGrade', stringified);
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


const calculateScore = function(historicalGames: Record<string,Game>): number {
    const games = Object.values(historicalGames);
    if (games.length === 0) {
        return 0;
    }
    let score = 0;
    for (const game of games) {
        // If points are given only for solving Graded Games 
        // if (game.id instanceof GradedGameID) {            
        // }
        const gameScore = game.getScore();
        score += gameScore;
    }
    return score;
}


export function GameSelector(props: { grade: number }) {
  const [newGameChosenGrade, setNewGameChosenGrade] = useState<number>(
    () => loadChosenGradeOfNewGameIfStorageAvailable() ?? props.grade
  );

  // load gameID/key from localstorage; null if storage unavailable.
  const [currentGameID, setCurrentGameID] = useState<GameID | null>(
    loadCurrentGameIDIfStorageAvailable
  );

  // useDisclosure is Mantine's built-in hook for boolean state variables.
  const [winScreenOpened, winScreenHandlers] = useDisclosure(false);

  const setAndStoreCurrentGameID = function(id: GameID) {
      saveGameIDIfStorageAvailable(id);
      setCurrentGameID(id);
  }


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

  const gradeSliderHandler = function (val: number) {
    saveChosenGradeOfNewGameIfStorageAvailable(val);
    setNewGameChosenGrade(val);
  };

  const setCurrentGameIDToPreviouslyUnseenGradedGameID = function () {
    const gameID = previouslyUnseenGradedGameID(newGameChosenGrade, newGameChosenGrade);
    setAndStoreCurrentGameID(gameID);
  };

  const onQuit = function () {
    selectNewGame();
  };

  const gameCallbacks = new GameCallbacks(onWin, storeGame, onQuit);

  if (currentGameID === null && 
      loadCurrentGameIDIfStorageAvailable() === null) {
      setCurrentGameIDToPreviouslyUnseenGradedGameID();
      // The previous line called a useState setter, triggering 
      // a re-render, so don't return any components on this render.
      return <></>;
    }
  const historicalGames = Object.fromEntries(
    Array.from(getStoredGames())
          .sort((a, b) => b.timestamp_ms - a.timestamp_ms)
          .map((game) => [niceGameSummaryStr(game), game])
  );

  const score = calculateScore(historicalGames);

  if (currentGameID === null) {
    // Check if the null in currentGameID came from the initial/default
    // factory passed to useState, which checked localstorage.
    return <Layout score={score} pointsAvailable = {null}>
      <Group justify="center" mt="xs">
        <Stack justify="flex-start">
          <RandomGameOfGivenGradePicker
            initialValue={newGameChosenGrade}
            onChangeEnd={gradeSliderHandler}
            onClick={setCurrentGameIDToPreviouslyUnseenGradedGameID}
            max={maxDifficulty(score)}
            // assumes KNOWN_GRADES is sorted
            min={KNOWN_GRADES[0]!}
            highestKnownGrade={KNOWN_GRADES.at(-1)!}
          />
          <CustomGamePicker setCurrentGameID={setAndStoreCurrentGameID} />
          <HistoricalGamePicker
            storeGame={storeGame}
            setCurrentGameID={setAndStoreCurrentGameID}
            historicalGames={historicalGames}
          />
        </Stack>
      </Group>
    </Layout>
  }

  // Write stringified gameID to localstorage (if available) under the key: "currentGame".
  saveGameIDIfStorageAvailable(currentGameID);

  let game = loadStoredGame(currentGameID);
  let gameComponent: ReactNode;
  if (game === null && currentGameID.typeCode === GradedGameID.GAME_ID_TYPE_CODE) {
    const gradedGameID = currentGameID as GradedGameID;
    gameComponent = (
      <NewGradedGame 
        score = {score}
        gameID={gradedGameID}
        callBacks={gameCallbacks} />
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


      let form: string | null;
      let grade: number | null;
      let opIndices: number[] | null;
      let seedIndices: number[];
      let redHerrings: number[] = [];

      if (solution === null) {
        form = null;
        grade = null;
        opIndices = null;
        seedIndices = customGameID.seedIndices;
      } else {
        form = stringifyForm(solution.form);
        grade = solution.grade;
        const ops = Array.from(get_op_symbols_from_encodable_sol_expr(solution.encodable));
        opIndices = ops.map((op) => OP_SYMBOLS.indexOf(op));
        // solution might not have used all seeds in CustomGameID 
        const seedsCounter = makeCounter(customGameID.seeds());
        seedIndices = [];
        for (const seed of get_seeds_from_encodable_sol_expr(solution.encodable)) {
            if ((seedsCounter[seed] ?? 0) === 0) {
                throw new Error(
                  `Solution: ${solution.encodable} requires too `+
                  `many of seed: ${seed}  from available seeds: ${customGameID.seeds()}`
                );
            }
            seedsCounter[seed] -= 1
            seedIndices.push(SEEDS.indexOf(seed));
        }
        // Preserve any other custom seeds, not used in the easiest solution, as redHerrings
        for (const [seed, freq] of Object.entries(seedsCounter)) {
            for (let x = 0; x < freq; x++) {
                const index = SEEDS.indexOf(parseInt(seed, 10))
                redHerrings.push(index);
            }
        }
      }
      //Fill rest of redHerrings up to MAX_SEEDS, if less than 6 custom seeds specified.
      for (const index of getRedHerringIndices(seedIndices.concat(redHerrings))) {
          redHerrings.push(index);
      }
      // avoid triggering a re-render from having to call setter
      const id = new CustomGameID(customGameID.goal, customGameID.seedIndices, grade, form);
      const state = new GameState();
      const datetime_ms = Date.now();
      game = new Game(id, datetime_ms, seedIndices, opIndices, state, redHerrings);
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

    gameComponent = <NumbersGame score={score} game={game} callBacks={gameCallbacks} />;
  }

  return gameComponent;
}

interface NewGradedGameProps{
  score: number;
  gameID: GradedGameID;
  callBacks: GameCallbacks;
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
  const index = gameID.index;

  const formStrNoCommas = form.replaceAll(', ', '_');
  const fileName = `solutions_${goal}_${formStrNoCommas}_grade_${grade}.dat`;
  const { isPending, error, data, isFetching } = useQuery({
    queryKey: [grade, goal, form],
    queryFn: async () => {
      const response = await fetch(
        `./grades_goals_forms_solutions/${grade}/${goal}/${fileName}`,
        // `./grade_22_goals_forms_solutions/${grade}/${goal}/${fileName}`
      );
      if (!response.ok) {
        throw new Error(
          `Something went wrong fetching grade: ${grade}, goal: ${goal}, form: ${form}`
        );
      }
      // As of 16th Jan 2015, not implemented on Chromium browsers (Chrome and Edge),
      // just Firefox and Brave:
      // return await response.bytes();
      const arrBuff = await response.arrayBuffer();
      const bytes = new Uint8Array(arrBuff);
      return bytes

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
  const game = newGameFromGradeGoalFormAndSols(gameID, seedsAndOpIndices);
  props.callBacks.store(game);
  saveGameIDIfStorageAvailable(gameID);

  return (
    <>
      <NumbersGame score={props.score} game={game} callBacks={props.callBacks} />
    </>
  );
}
