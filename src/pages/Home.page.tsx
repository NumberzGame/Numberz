import { ColorSchemeToggle } from '../components/ColorSchemeToggle/ColorSchemeToggle';
import { Welcome } from '../components/Welcome/Welcome';
import { NumbersGame } from '../components/NumbersGame/NumbersGame';
// import { theme } from '../theme';


export function HomePage() {


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
      <NumbersGame></NumbersGame>

    </>
  );
}
