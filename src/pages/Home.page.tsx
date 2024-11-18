import { ColorSchemeToggle } from '../components/ColorSchemeToggle/ColorSchemeToggle';
import { Welcome } from '../components/Welcome/Welcome';
import { Text, Button, Group } from '@mantine/core';
// import { theme } from '../theme';


export function HomePage() {
  return (
    <>
      <Welcome />
      <ColorSchemeToggle  />
      <Text ta="center" size="lg" maw={580} mx="auto" mt="xl">
        Play the game below!!!
      </Text>
      
      <Group justify="center" mt="xl">
        <Button >+</Button>
        <Button >-</Button>
        <Button >*</Button>
        <Button >÷</Button>
      </Group>
    </>
  );
}
