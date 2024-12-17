import '@mantine/core/styles.css';

import {
  QueryClientProvider, QueryClient
} from '@tanstack/react-query'
import { MantineProvider, createTheme, virtualColor  } from '@mantine/core';
import { Router } from './Router';
import { theme } from './theme';
import { GameBoSelector } from './components/NumbersGame/GameBoSelector';

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme}>
        <Router />
      </MantineProvider>
    </QueryClientProvider>
  );
}
