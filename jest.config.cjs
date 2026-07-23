module.exports = {
  // The linked jbrowse-components2 source resolves mobx/MST/react from its own
  // node_modules, so without this jest loads two copies and MST flows fail with
  // "a mst flow must always have a parent context". In the browser these are a
  // single host global (esbuild externalizes them); here we force one copy.
  moduleNameMapper: {
    '^mobx$': '<rootDir>/node_modules/mobx',
    '^mobx-react$': '<rootDir>/node_modules/mobx-react',
    '^@jbrowse/mobx-state-tree$': '<rootDir>/node_modules/@jbrowse/mobx-state-tree',
    '^react$': '<rootDir>/node_modules/react',
    '^react-dom$': '<rootDir>/node_modules/react-dom',
    '^react/jsx-runtime$': '<rootDir>/node_modules/react/jsx-runtime',
  },
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': '<rootDir>/config/jest/babelTransform.cjs',
    '^.+\\.css$': '<rootDir>/config/jest/cssTransform.cjs',
  },
  // @jbrowse/*, @mui/*, mobx*, tss-react etc. publish untranspiled ESM to
  // node_modules, so they must run through babel rather than be ignored like
  // the rest of node_modules. Everything else under node_modules is skipped.
  transformIgnorePatterns: [
    '/node_modules/(?!.*(?:@jbrowse|@mui|mobx|mobx-react|tss-react|@popperjs|clsx|@emotion|d3-|colord|flatbush|flatqueue)).+\\.(js|jsx|mjs)$',
    '\\.module\\.(css|sass|scss)$',
  ],
  setupFiles: [
    '<rootDir>/config/jest/textEncoder.js',
    '<rootDir>/config/jest/structuredClone.js',
    '<rootDir>/config/jest/console.js',
    '<rootDir>/config/jest/messagechannel.js',
    '<rootDir>/config/jest/resizeObserver.js',
  ],
  setupFilesAfterEnv: [
    '<rootDir>/config/jest/fetchMockAfterEnv.js',
    '<rootDir>/config/jest/deterministicIds.js',
  ],
  testEnvironment: 'jsdom',
  testEnvironmentOptions: { url: 'http://localhost' },
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
  testTimeout: 15000,
}
