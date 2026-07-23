// Used only by jest (via config/jest/babelTransform.cjs, rootMode: 'upward').
// The shipped bundle is built by esbuild, which transpiles TS/JSX itself.
module.exports = {
  presets: [
    ['@babel/preset-react', { runtime: 'automatic' }],
    '@babel/preset-env',
    '@babel/preset-typescript',
  ],
}
