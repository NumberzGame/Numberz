import '@mantine/core/styles.css';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTheme, MantineProvider, virtualColor } from '@mantine/core';
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
