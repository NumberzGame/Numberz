import { ColorSchemeToggle } from '../components/ColorSchemeToggle/ColorSchemeToggle';
import { Welcome } from '../components/Welcome/Welcome';
import { NumbersGame } from '../components/NumbersGame/NumbersGame';
import { GameSelector } from '../components/NumbersGame/GameSelector';
// import { theme } from '../theme';

import { GameID, GradedGameID } from '../gameCode/Classes';


export function HomePage() {

  const INITIAL_GRADE = 17;

  const grade = 22;
  const goal=224;
  const form="6";
  const index=0;
  const gameID = new GradedGameID(grade, goal, form, index);

  // https://mantine.dev/styles/style-props/ 
  // ta - text align
  // maw - max width
  // mx - margin in-line
  // mt - margin top
      
  return <>
    <ColorSchemeToggle  />
    <Welcome />
    <GameSelector grade = {INITIAL_GRADE}></GameSelector>
    {/* <NumbersGame gameID={gameID}></NumbersGame> */}
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
