import { AppShell } from '@mantine/core';

import { ColorSchemeToggle } from '../components/ColorSchemeToggle/ColorSchemeToggle';
import { Welcome } from '../components/Welcome/Welcome';
import { NumbersGame } from '../components/NumbersGame/NumbersGame';
// import { theme } from '../theme';

import { GameID } from '../components/NumbersGame/Classes';


export function HomePage() {


  const grade = 22;
  const goal=224;
  const form="6";
  const index=0;
  const gameID = new GameID(grade, goal, form, index);

  // https://mantine.dev/styles/style-props/ 
  // ta - text align
  // maw - max width
  // mx - margin in-line
  // mt - margin top
      
  return <>
    <ColorSchemeToggle  />
    <Welcome />
    <NumbersGame gameID={gameID}></NumbersGame>
  </>



  // return (<>
  //    <AppShell
  //      header={{ height: 45 }}
  //      padding="md"
  //    >
  //      <AppShell.Header>
  //       <ColorSchemeToggle  />
  //     </AppShell.Header>
  //     <AppShell.Main>
  //       <Welcome />
  //       <NumbersGame gameID={gameID}></NumbersGame>
  //     </AppShell.Main>
  //   </AppShell>
  //   </>
  // );
}
