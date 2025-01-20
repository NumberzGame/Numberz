
import { ReactElement } from 'react';
import { Group, Text } from '@mantine/core';

import {TitleBanner} from './TitleBanner';

import { ScoreAndGradeBadge } from './ScoreAndGradeBadge';
import { ColorSchemeToggle } from '../ColorSchemeToggle/ColorSchemeToggle';


interface LayoutProps {
    score: number
    children: ReactElement
}


export function Layout(props: LayoutProps) {

    return <>
        <Group justify="space-between">
          <Group mt="sm">
            <Text ml="md">Score: </Text> 
            <ScoreAndGradeBadge contents={props.score}/> 
          </Group>
          <ColorSchemeToggle/>
        </Group>
        <TitleBanner/>
        {props.children}
    </>;
}