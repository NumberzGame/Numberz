import { Button, Group, useMantineColorScheme } from '@mantine/core';

interface ColourSchemeToggleProps {
    size : string;
}

const statesToSetForButtons = {"☼": 'light', "☽": 'dark', "Auto":'auto'};
const nextButtonToShow = {'light' : "☽", 'dark' : "Auto", 'auto' : "☼"};

export function ColourSchemeToggle(props : ColourSchemeToggleProps) {
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  const buttonIcon = nextButtonToShow[colorScheme] as keyof typeof statesToSetForButtons;
  const stateToSetToOnClick = statesToSetForButtons[buttonIcon];

  return <Button 
           size={props.size} 
           onClick={() => setColorScheme(stateToSetToOnClick as 'dark' | 'light' | 'auto')}
         >
           <b>{buttonIcon}</b>
         </Button>
}
