import { useMediaQuery } from '@mantine/hooks';

import {Group, Text, Title} from '@mantine/core';
import classes from './TitleBanner.module.css';

export function TitleBanner() {

  const isMobile = useMediaQuery(`(max-width: 400px)`);

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
            {isMobile || <Text component="span" size="lg" mb={4.5}>
              A numbers game.
            </Text>}
          </Group>
  </Title>
}
