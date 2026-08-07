import type { ReactNode } from 'react'

import GraphHoverSyncF from './index'

import type PluginManager from '@jbrowse/core/PluginManager'

// `contributeToExtensionPoint` landed in core on 2026-08-05 and is unreleased,
// so on every published JBrowse it is undefined — and calling it threw while the
// plugin was still installing, which takes the WHOLE plugin down: no view type,
// no adapter, and no error a reader can act on. The bundle on the CDN had that
// in it.
//
// A third-party plugin is loaded by whatever JBrowse the reader is running, so
// the version it needs is the oldest one it can work on. These two tests are the
// pair that says so, and the second is the one that would have caught it.
const POINT = 'LinearGenomeView-TracksContainerComponent'

// enough of a pluginManager to record a registration; the two halves differ only
// in which method the host offers
function modernHost() {
  const calls: { name: string; callback: (props: { model: unknown }) => unknown }[] = []
  return {
    calls,
    manager: {
      contributeToExtensionPoint: (
        name: string,
        callback: (props: { model: unknown }) => unknown,
      ) => {
        calls.push({ name, callback })
      },
      addToExtensionPoint: () => {
        throw new Error('a host with contributeToExtensionPoint must use it')
      },
    } as unknown as PluginManager,
  }
}

function releasedHost() {
  const calls: {
    name: string
    callback: (entries: ReactNode[], props: Record<string, unknown>) => ReactNode[]
  }[] = []
  return {
    calls,
    manager: {
      // no contributeToExtensionPoint at all, which is the whole point
      addToExtensionPoint: (
        name: string,
        callback: (
          entries: ReactNode[],
          props: Record<string, unknown>,
        ) => ReactNode[],
      ) => {
        calls.push({ name, callback })
      },
    } as unknown as PluginManager,
  }
}

test('a host with the accumulating method gets one contributed element', () => {
  const { calls, manager } = modernHost()
  GraphHoverSyncF(manager)

  expect(calls).toHaveLength(1)
  expect(calls[0]!.name).toBe(POINT)
  // one element, not an array: the fold and the key are the method's job
  expect(calls[0]!.callback({ model: { id: 'lgv1' } })).toBeTruthy()
})

test('a host without it still registers, and appends rather than replacing', () => {
  const { calls, manager } = releasedHost()
  GraphHoverSyncF(manager)

  expect(calls).toHaveLength(1)
  expect(calls[0]!.name).toBe(POINT)

  // the fallback has to do by hand what contributeToExtensionPoint does for
  // free: append. Returning just its own element would delete every other
  // plugin's, which is the bug that method exists to prevent.
  const existing = ['someone-elses-element']
  const result = calls[0]!.callback(existing, { model: { id: 'lgv1' } })
  expect(result).toHaveLength(2)
  expect(result[0]).toBe(existing[0])
  // and the input array is left alone
  expect(existing).toHaveLength(1)
})

// A host that hands the callback something with no model has nothing to draw a
// highlight against, and dropping the accumulated array there would delete other
// plugins' entries on the way past.
test('the fallback passes the accumulated entries through when there is no model', () => {
  const { calls, manager } = releasedHost()
  GraphHoverSyncF(manager)

  const existing = ['someone-elses-element']
  expect(calls[0]!.callback(existing, {})).toEqual(existing)
})
