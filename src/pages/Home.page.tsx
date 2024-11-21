import { ColorSchemeToggle } from '../components/ColorSchemeToggle/ColorSchemeToggle';
import { Welcome } from '../components/Welcome/Welcome';
import { Text, Button, Group, TextInput } from '@mantine/core';
// import { theme } from '../theme';

import SYMBOLS from '../data/symbols.json'

export function HomePage() {
  const SymbolsButtons = SYMBOLS.OPS.map((symbol) => (<Button >{symbol}</Button>));
  return (
    <>
      <Welcome />
      <ColorSchemeToggle  />
      {/* https://mantine.dev/styles/style-props/ 
      ta - text align
      maw - max width
      mx - margin in-line
      mt - margin top
      */}
      <Text ta="center" size="lg" maw={580} mx="auto" mt="xl">
        Play the game below!!!
      </Text>
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
  );
}
