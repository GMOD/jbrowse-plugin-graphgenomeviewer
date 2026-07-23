import { defineConfig } from 'vitest/config'

// Puppeteer-driven tests that boot a real JBrowse and exercise the plugin in a
// browser. Kept separate from the jsdom unit config: node environment, no setup
// shims, long timeouts, and run serially so one JBrowse server serves them all.
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    testTimeout: 180_000,
    hookTimeout: 180_000,
    fileParallelism: false,
  },
})
