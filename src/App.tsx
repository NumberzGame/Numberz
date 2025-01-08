import '@mantine/core/styles.css';

import {
  QueryClientProvider, QueryClient
} from '@tanstack/react-query'
import { MantineProvider, createTheme, virtualColor  } from '@mantine/core';
import { Router } from './Router';
import { theme } from './theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // default: true
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme}>
        <Router />
      </MantineProvider>
    </QueryClientProvider>
  );
}
