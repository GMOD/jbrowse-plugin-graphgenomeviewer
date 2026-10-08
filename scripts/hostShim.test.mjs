import { describe, expect, it } from 'vitest'

import { shimSource } from './hostShim.mjs'

const KEY = '@jbrowse/display-kit/DisplayChrome'

// What the bundle's copy of the shim does on a host: the module's exports,
// given what that host serves under the key.
function onHost(served, names) {
  const body = shimSource(KEY, names, 'GraphGenomeView')
    .replaceAll(/^export const (\w+) =/gm, 'out.$1 =')
    .replace('export default', 'out.default =')
  const out = {}
  new Function('JBrowseExports', 'out', body)({ [KEY]: served }, out)
  return out
}

describe('shimSource', () => {
  const Chrome = () => null
  const Status = () => null
  const names = ['DisplayStatusChrome', 'default']

  it('reads names and the default off a namespace the host marks __esModule', () => {
    const out = onHost(
      { __esModule: true, default: Chrome, DisplayStatusChrome: Status },
      names,
    )
    expect(out.default).toBe(Chrome)
    expect(out.DisplayStatusChrome).toBe(Status)
  })

  it('names the export when a host serves the module without it', () => {
    const out = onHost(Chrome, names)
    expect(out.default).toBe(Chrome)
    expect(out.DisplayStatusChrome).toHaveProperty(
      'jbrowseHostMissing',
      'DisplayStatusChrome',
    )
    expect(out.DisplayStatusChrome).toThrow(
      "This JBrowse does not provide 'DisplayStatusChrome' from '@jbrowse/display-kit/DisplayChrome' to plugins: GraphGenomeView was built for a different JBrowse version",
    )
  })

  it('leaves a key served whole on the module.exports shim, under its host key', () => {
    expect(shimSource('@mui/material/Checkbox', [], 'X')).toBe(
      'module.exports = JBrowseExports["@mui/material/Checkbox"]',
    )
    expect(shimSource('@jbrowse/mobx-state-tree', ['types'], 'X')).toContain(
      'JBrowseExports["mobx-state-tree"]',
    )
  })
})
