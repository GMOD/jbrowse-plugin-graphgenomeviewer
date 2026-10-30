import { defineConfig } from 'vitest/config'

export default defineConfig({
  // One copy of each host global, as the browser has: with two, MST flows
  // fail with "a mst flow must always have a parent context".
  resolve: {
    dedupe: [
      'mobx',
      'mobx-react',
      '@jbrowse/mobx-state-tree',
      'react',
      'react-dom',
      '@mui/icons-material',
      '@mui/material',
      '@mui/system',
      '@emotion/react',
    ],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    environmentOptions: { jsdom: { url: 'http://localhost' } },
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: [
      './config/vitest/console.js',
      './config/vitest/contractGate.js',
      './config/vitest/resizeObserver.js',
    ],
    testTimeout: 15000,
  },
})
