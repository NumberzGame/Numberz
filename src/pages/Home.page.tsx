import { ColorSchemeToggle } from '../components/ColorSchemeToggle/ColorSchemeToggle';
import { Welcome } from '../components/Welcome/Welcome';
import { NumbersGame } from '../components/NumbersGame/NumbersGame';
import { GameBoSelector } from '../components/NumbersGame/GameBoSelector';
// import { theme } from '../theme';

import { GameID, GradedGameID } from '../components/NumbersGame/Classes';


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
    <GameBoSelector grade = {INITIAL_GRADE}></GameBoSelector>
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
