import '@mantine/core/styles.css';

import { MantineProvider, createTheme  } from '@mantine/core';
import { Router } from './Router';
// import { theme } from './theme';

const CustomTheme = createTheme({
  colors: {
    'beige' : [
      "#fef7e6",
      "#f7eed6",
      "#eddaae",
      "#e2c682",
      "#d9b55e",
      "#d4aa46",
      "#d2a538",
      "#b9902a",
      "#a57f21",
      "#8f6d14"
    ],
    sepia: [
      '#F4ECD8',
      '#EAD8B7',
      '#DFC29A',
      '#D4AC7E',
      '#C99862',
      '#BD8447',
      '#B2702D',
      '#A55C15',
      '#924908',
      '#7A3704',
    ],
  },

});

export default function App() {
  return (
    <MantineProvider theme={CustomTheme}>
      <Router />
    </MantineProvider>
  );
}
