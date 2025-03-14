import { GameSelector } from '../components/NumbersGame/GameSelector';
import { Move, GameState } from '../gameCode/Classes';

export function HomePage() {
  
  // Return easiest grade by default.
  // If storage is unavailable, so are 
  // the historical games and current score.
  const INITIAL_GRADE = 1;

  // const grade = 22;
  // const goal = 224;
  // const form = '6';
  // const index = 0;

  // https://mantine.dev/styles/style-props/
  // ta - text align
  // maw - max width
  // mx - margin in-line
  // mt - margin top

  return (
    <>
      <GameSelector grade={INITIAL_GRADE} />
      {/* <NumbersGame gameID={gameID}></NumbersGame> */}
    </>
  );

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
