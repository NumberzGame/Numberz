import {Badge} from '@mantine/core';


interface ScoreAndGradeBadgeProps {
    contents: string | number;
}


export function ScoreAndGradeBadge(props: ScoreAndGradeBadgeProps) {
return <Badge variant="filled" color="pink" size="lg">
         {props.contents}
       </Badge>
}