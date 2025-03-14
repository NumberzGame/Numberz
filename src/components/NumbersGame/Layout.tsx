
import { ReactElement } from 'react';
import { Button, Group, Text, SimpleGrid } from '@mantine/core';

import {TitleBanner} from './TitleBanner';

import { ScoreAndGradeBadge } from './ScoreAndGradeBadge';
import { ColourSchemeToggle } from '../ColourSchemeToggle/ColourSchemeToggle';
import { GithubIcon } from '@mantinex/dev-icons';


interface LayoutProps {
    score: number
    pointsAvailable: number | null;
    children: ReactElement
}

const size = "compact-xs";

export function Layout(props: LayoutProps) {

    return <>
        <Group justify="space-between">
          <SimpleGrid 
           mt="sm"
           cols={{ base: 1, xs: 2}}
          >
            <Group>
                <Text ml="md">Total score: </Text> 
                <ScoreAndGradeBadge contents={props.score}/> 
            </Group>
            {props.pointsAvailable !== null && <Group>
                <Text ml="md">Points available: </Text> 
                <ScoreAndGradeBadge contents={props.pointsAvailable}/> 
            </Group>}
          </SimpleGrid>
          <Group gap="xs" justify="right" mr="md" mt="xs">
            <Button  
              size = {size}
              component="a"
              href="https://github.com/NumberzGame/Numberz"
            >
              <GithubIcon size = {12}/>
            </Button>
            <ColourSchemeToggle size = {size}/>
          </Group>
        </Group>
        <TitleBanner/>
        {props.children}
    </>;
}