
import { ReactElement } from 'react';
import { Group, Text } from '@mantine/core';

import {TitleBanner} from './TitleBanner';

import { ScoreAndGradeBadge } from './ScoreAndGradeBadge';
import { ColorSchemeToggle } from '../ColorSchemeToggle/ColorSchemeToggle';


interface LayoutProps {
    score: number
    pointsAvailable: number | null;
    children: ReactElement
}


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
          <ColorSchemeToggle/>
        </Group>
        <TitleBanner/>
        {props.children}
    </>;
}