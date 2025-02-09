import {Group, Text, Title} from '@mantine/core';
import classes from './TitleBanner.module.css';

export function TitleBanner() {
  return <Title className={classes.title} ta="center" mt={0}>
          <Group justify="center" align="end">
            <Text
              inherit
              variant="gradient"
              component="span"
              gradient={{ from: 'rebeccapurple', to: 'orange' }}
            >
              Numberz
            </Text>
            <Text component="span" size="lg" mb={4.5}>
              A numbers game.
            </Text>
          </Group>
  </Title>
}
