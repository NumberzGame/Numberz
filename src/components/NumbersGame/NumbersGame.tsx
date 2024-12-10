import { useImmer } from "use-immer";
// import { useState } from 'react';
import { useLocalStorage } from '@mantine/hooks';
import { useFetch } from '@mantine/hooks';

import { Button, Group, TextInput } from '@mantine/core';

import { OP_SYMBOLS } from './Core';
import { Game, GameID, GameState, Move } from './Classes';
import { destringifyGameID, stringifyGameID, destringifyGame, stringifyGame, MIN_GAME_ID_SIZE } from './Schema';

const overrideSymbolText = function(s: string): string {
  if (s === '//') {
    return '÷'
  }
  return s
}

const STARTING_DIFFICULTY = 25;



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

if (storageAvailable()) {

    storeGameInLocalStorage = function(game: Game) {
        const key = stringifyGameID(game.id);
        const val = stringifyGame(game);
        localStorage.setItem(key, val);
    }
} else {
    storeGameInLocalStorage = (game: Game) => {};
}


export function OpButton(props: {onClick: () => void}) {
    // All Op Buttons act like radio buttons, but none can be pressed too.
    // onClick => Toggle button clicked on
    // If not clicked on the currently activated one => turn activated one off.
    // Adds Op clicked on to game.state.Moves[-1]
    return <></>
}
export function OperandButton(props: {onClick: () => void}) {
    return <></>
}

interface NumbersGameProps{
    gameID: GameID
    // onWin: () => void
    // onQuit: () => void
}
// Add Game Manager

export function NumbersGame(props: NumbersGameProps) {

    // https://mantine.dev/hooks/use-local-storage/
    const gameID = props.gameID;

    const gameFactory = function(): Game{

      const state = new GameState();
      const datetime_ms = Date.now();
      const game =  new Game(gameID, datetime_ms, [0,0,1,1,10,12], [0], state);
      return game;
    }
    const [game, setGameUsingImmerProducer] = useImmer(gameFactory);



    const doMove = function() {
        const move = new Move(0,[0,1]);
        setGameUsingImmerProducer((draft: Game) => {
            draft.state.moves.push(move);
            storeGameInLocalStorage(draft);
        });
    };

    // const [current, setAndStoreCurrent] = useLocalStorage({ key: key, defaultValue: stringifyGame(game) });
    // const [pastGameIDs, setPastGameIDs] = useLocalStorage({ key: 'pastGameIDs', defaultValue: '' });
    // const [currentDifficulty,
    //        setCurrentDifficulty] = useLocalStorage({ key: 'currentDifficulty',
    //                                                  defaultValue: STARTING_DIFFICULTY.toString(),
    //                                                });


    // let currentGameID = pastGameIDs.slice(-MIN_GAME_ID_SIZE);

    // if (currentGameID.length === 0) {
    //     const game = getRandomGameOfDifficulty(parseInt(currentDifficulty));

    //     // Import/Request  `public\grades_goals_solutions_forms\${currentDifficulty}\distribution.json`.
    //     // Sum up all values to get total (number of solutions for each goal).
    //     // Generate random number rand from [0,1].
    //     // Calculate solution index = Math.floor(rand*total).
    //     // Iterate through distribution.json to find goal of solution with that index.
    //     // Calculate new_index (Offset of index into solutions) of that goal and grade).
    //     // Import/Request  `public\grades_goals_solutions_forms\${currentDifficulty}\${goal}\distribution.json`
    //     // Iterate through distribution.json to find form of solution with that index, grade and goal.
    //     // Construct gameID = new GameID(...);
    //     // Get seeds and ops
    //     // Construct gameState = new GameState
    //     // Get timestamp
    //     // Construct game = new Game
    //     // return game
        
        
    // }


    const SymbolsButtons = OP_SYMBOLS.map((s: string) => (<Button >{overrideSymbolText(s)}</Button>));

    
    return <>
      {/* <Text ta="center" size="lg" maw={580} mx="auto" mt="xl">
        Play the game below!!!
      </Text> */}
      {/* Text Goal */}
      <TextInput
        // label="Input label"
        ta="center" size="lg" maw={235} mx="auto" mt="md"
        // description="Input description"
        // placeholder="Input placeholder"
      />
      <Group justify="center" mt="md">
        {SymbolsButtons}
      </Group>
      <Group justify="center" mt="md">
        <Button onClick={doMove}>=</Button>
      </Group>
    </>
}