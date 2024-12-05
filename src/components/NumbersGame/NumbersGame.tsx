


import { useLocalStorage } from '@mantine/hooks';

import { Button, Group, TextInput } from '@mantine/core';

import { OPS } from './Core';
import { GetReadersAndWriters } from './Schema';

const overrideSymbolText = function(s: string): string {
  if (s === '//') {
    return '÷'
  }
  return s
}


export function NumbersGame() {

    // https://mantine.dev/hooks/use-local-storage/
    const [playHistory, setplayHistory] = useLocalStorage({ key: 'play-history', defaultValue: '' });




    const [currentGameState, setCurrentGameState] = useLocalStorage({ key: 'current-game-state', defaultValue: '' });

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