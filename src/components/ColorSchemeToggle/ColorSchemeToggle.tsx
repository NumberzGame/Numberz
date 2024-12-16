import { Button, Group, useMantineColorScheme } from '@mantine/core';

const size = "compact-xs";

export function ColorSchemeToggle() {
  const { setColorScheme } = useMantineColorScheme();

  return (
    <Group gap="xs" justify="right" mt="sm" mr="sm" >
      <Button size={size} onClick={() => setColorScheme('light')}><b>☼</b></Button>
      <Button size={size} onClick={() => setColorScheme('dark')}><b>☽</b></Button>
      <Button size={size} onClick={() => setColorScheme('auto')}>Auto</Button>
    </Group>
  );
}
