import { ColorSchemeToggle } from '../components/ColorSchemeToggle/ColorSchemeToggle';
import { Welcome } from '../components/Welcome/Welcome';
import { NumbersGame } from '../components/NumbersGame/NumbersGame';
// import { theme } from '../theme';

import { GameID } from '../components/NumbersGame/Classes';


export function HomePage() {


  const grade = 10;
  const goal=100;
  const form="2";
  const index=0;
  const gameID = new GameID(grade, goal, form, index);

  return (
    <>
      <Welcome />
      <ColorSchemeToggle  />
      {/* https://mantine.dev/styles/style-props/ 
      ta - text align
      maw - max width
      mx - margin in-line
      mt - margin top
      */}
      <NumbersGame gameID={gameID}></NumbersGame>

    </>
  );
}
