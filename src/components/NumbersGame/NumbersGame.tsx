


import { useLocalStorage } from '@mantine/hooks';

import { Button, Group, TextInput } from '@mantine/core';
import SYMBOLS from '../../data/symbols.json';

const overrideSymbolText = function(s: string): string {
  if (s === '//') {
    return '÷'
  }
  return s
}


export function NumbersGame() {

    // https://mantine.dev/hooks/use-local-storage/
    const [playHistory, setplayHistory] = useLocalStorage({ key: 'play-history', defaultValue: '' });

    // currentGameState currentGame
    // time_stamp_first_played_mins Date.now() / 1000 / 60
    // current game grade u13 (1,..,223) under current Heuristic (additional difficulty)
    // current game goal u15 (100,...,999)
    // current game form u10 {2, 3, 4, (2, 2), 5, (3, 2), (1, (2, 2)), 6, (4, 2), (3, 3), 
    // (2, (2, 2)), (1, (3, 2)), (1, (1, (2, 2)) },
    // current game index u25, max is grade 18 with 781176 (20 bits) non de-duped solutions
    // (index all inc forms, and figure out using JSON dict of frequencies?)
    const [currentGameState, setCurrentGameState] = useLocalStorage({ key: 'current-game-state', defaultValue: '' });

    const SymbolsButtons = SYMBOLS.OPS.map((s: string) => (<Button >{overrideSymbolText(s)}</Button>));

    
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