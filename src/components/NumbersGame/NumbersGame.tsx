


import { useLocalStorage } from '@mantine/hooks';

import { Button, Group, TextInput } from '@mantine/core';
import SYMBOLS from '../../data/symbols.json';

const overrideSymbolText = function(s: string): string {
  if (s === '//') {
    return '÷'
  }
  return s
}

// https://mantine.dev/hooks/use-local-storage/
// const [playHistory, setplayHistory] = useLocalStorage({ key: 'play-history', defaultValue: '' });

// currentGameState currentGame
// time_stamp_first_played_mins Date.now() / 1000 / 60
// current game grade
// current game goal
// current game form
// current game index (index all inc forms, and figure out using JSON dict of frequencies?)
// const [currentGameState, setCurrentGameState] = useLocalStorage({ key: 'current-game-state', defaultValue: '' });

export function NumbersGame() {

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