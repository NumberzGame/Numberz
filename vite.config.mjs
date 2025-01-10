import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './vitest.setup.mjs',
  },
  build: {
    copyPublicDir: false,
  },
  assetsInclude: [
    '/all_grades_goals_forms_solutions/*/*/*.*',
    '/grade_22_goals_forms_solutions/*/*/*.*',
  ],
});
