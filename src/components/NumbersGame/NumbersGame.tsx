import { useState } from 'react';
import { useLocalStorage } from '@mantine/hooks';
import { useFetch } from '@mantine/hooks';

import { Button, Group, TextInput } from '@mantine/core';

import { OPS } from './Core';
import { Game, GameID, GameState } from './Classes';
import { destringifyGameID, stringifyGameID, destringifyGame, stringifyGame, MIN_GAME_ID_SIZE } from './Schema';

const overrideSymbolText = function(s: string): string {
  if (s === '//') {
    return '÷'
  }
  return s
}

const STARTING_DIFFICULTY = 25;

const getRandomGameOfDifficulty = function(grade: number): Game{
    const goal=100;
    const form="2";
    const index=0;
    const gameID = new GameID(grade, goal, form, index);
    const state = new GameState(false, []);
    const date = new Date("2024-12-06T10:34:48.793Z");
    const datetime_ms = date.getTime();
    const game =  new Game(gameID, datetime_ms, [], state, []);
    return game;
}


// Add Game Manager

export function NumbersGame(props: {gameID: string, onWin: () => void, onQuit: () => void}) {

    // https://mantine.dev/hooks/use-local-storage/
    // const [pastGameIDs, setPastGameIDs] = useLocalStorage({ key: 'pastGameIDs', defaultValue: '' });
    // const [currentDifficulty,
    //        setCurrentDifficulty] = useLocalStorage({ key: 'currentDifficulty',
    //                                                  defaultValue: STARTING_DIFFICULTY.toString(),
    //                                                });

    const [game, setAndStoreGame] = useLocalStorage({ key: props.gameID, defaultValue: '' });

    let currentGameID = pastGameIDs.slice(-MIN_GAME_ID_SIZE);

    if (currentGameID.length === 0) {
        const game = getRandomGameOfDifficulty(parseInt(currentDifficulty));

        // Import/Request  `public\grades_goals_solutions_forms\${currentDifficulty}\distribution.json`.
        // Sum up all values to get total (number of solutions for each goal).
        // Generate random number rand from [0,1].
        // Calculate solution index = Math.floor(rand*total).
        // Iterate through distribution.json to find goal of solution with that index.
        // Calculate new_index (Offset of index into solutions) of that goal and grade).
        // Import/Request  `public\grades_goals_solutions_forms\${currentDifficulty}\${goal}\distribution.json`
        // Iterate through distribution.json to find form of solution with that index, grade and goal.
        // Construct gameID = new GameID(...);
        // Get seeds and ops
        // Construct gameState = new GameState
        // Get timestamp
        // Construct game = new Game
        // return game
        
        
    }


    const SymbolsButtons = OPS.map((s: string) => (<Button >{overrideSymbolText(s)}</Button>));

    
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
    </>
}