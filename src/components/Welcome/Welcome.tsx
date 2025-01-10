import { Anchor, Group, Text, Title } from '@mantine/core';
import classes from './Welcome.module.css';

export function Welcome() {
  return (
    <>
      <Title className={classes.title} ta="center" mt={0}>
        {/* Welcome to{' '} */}
        <Group justify="center" align="end">
          <Text
            inherit
            variant="gradient"
            component="span"
            gradient={{ from: 'rebeccapurple', to: 'orange' }}
          >
            Numberz.
          </Text>
          <Text component="span" size="lg" mb={4.5}>
            A numbers game.
          </Text>
        </Group>
      </Title>
      {/* <Group justify="center">
        
      </Group> */}
      {/* <Text ta="center" size="lg" maw={580} mx="auto" mt="xl">
        This starter Vite project includes a minimal setup, if you want to learn more on Mantine +
        Vite integration follow{' '}
        <Anchor href="https://mantine.dev/guides/vite/" size="lg">
          this guide
        </Anchor>
        . To get started edit pages/Home.page.tsx file. 
      </Text> */}
    </>
  );
}
