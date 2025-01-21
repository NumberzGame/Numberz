
import { ReactElement } from 'react';
import { Anchor, Group, Text } from '@mantine/core';

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
          <Group mt="sm">
            <Group>
                <Text ml="md">Total score: </Text> 
                <ScoreAndGradeBadge contents={props.score}/> 
            </Group>
            {props.pointsAvailable !== null && <Group>
                <Text ml="md">Points available: </Text> 
                <ScoreAndGradeBadge contents={props.pointsAvailable}/> 
            </Group>}
          </Group>
          <Group>
            <Anchor href="https://github.com/NumberzGame/Numberz"><GithubIcon size={size} /></Anchor>
            <ColourSchemeToggle size = {size}/>
          </Group>
        </Group>
        <TitleBanner/>
        {props.children}
    </>;
}