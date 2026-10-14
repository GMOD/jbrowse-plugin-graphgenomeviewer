const originalError = console.error
const originalWarn = console.warn

console.error = (...args) => {
  const r = String(args)
  if (
    r.includes('indexedDB') ||
    r.includes('popupState') ||
    r.includes('Unterminated') ||
    r.includes('Cannot update a component') ||
    r.includes('was not wrapped in act') ||
    r.includes('Only HTTP(S) protocols are supported') ||
    // load failures reach model.error, which the tests assert; the log repeats it
    /^\[GraphGenomeView\.\w+\]/.test(r) ||
    r.includes(
      'You are trying to `require` a file outside of the scope of the test code',
    )
  ) {
    return undefined
  }
  originalError.call(console, ...args)
}

console.warn = (...args) => {
  const r = String(args)
  if (
    r.includes('The `anchorEl` prop provided to the component is invalid') ||
    r.includes('[GPU] WebGPU initialization failed') ||
    r.includes('[GPU] WebGPU device ready') ||
    r.includes('[GPU] WebGL2 unavailable, falling back to Canvas2D') ||
    r.includes('[GPU] WebGPU not supported in this browser') ||
    r.includes('] init (live=') ||
    r.includes('LD coloring: index SNP') ||
    r.includes('Unexpected RPC')
  ) {
    return undefined
  }
  originalWarn.call(console, ...args)
}
