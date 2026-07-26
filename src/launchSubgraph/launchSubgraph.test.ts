import {
  launchSubgraphView,
  regionAroundSegment,
  regionFromViewport,
  subgraphRegionProblem,
} from './launchSubgraphView'
import { createTestEnvironment } from './testEnv'
import { MAX_GRAPH_REGION_BP } from '../GraphGenomeView/model'

import type { MenuItem } from '@jbrowse/core/ui'

const LABEL_REGION = 'Graph genome view (this region)'
const LABEL_SEGMENT = 'Graph genome view (this segment)'

// pushLaunchViewMenuItem groups every "open another view" entry under one
// "Launch view" submenu, so that is where these land.
function launchItems(items: MenuItem[]) {
  const item = items.find(i => 'label' in i && i.label === 'Launch view')
  return item && 'subMenu' in item ? item.subMenu : []
}

function labels(items: MenuItem[]) {
  return launchItems(items).flatMap(i => ('label' in i ? [i.label] : []))
}

function clickItem(items: MenuItem[], label: string) {
  const item = launchItems(items).find(i => 'label' in i && i.label === label)
  if (item && 'onClick' in item) {
    item.onClick(undefined)
  } else {
    throw new Error(`menu item "${label}" not found`)
  }
}

// The launch is a snapshot, not an RPC: `loadedTrackId`/`loadedRegion` are the
// persisted props the view fetches from when its canvas mounts, so a launched
// view and a reloaded session take the same path.
test('the track menu launches the current region', () => {
  const { createDisplay } = createTestEnvironment()
  const { session, display } = createDisplay()

  const items = display.trackMenuItems()
  expect(labels(items)).toContain(LABEL_REGION)

  clickItem(items, LABEL_REGION)
  const [type, snapshot] = session.addedViews[0]!
  expect(type).toBe('GraphGenomeView')
  expect(snapshot.loadedTrackId).toBe('graph_track')
  expect(snapshot.loadedRegion).toEqual({
    refName: 'ctgA',
    assemblyName: 'volvox',
    start: expect.any(Number),
    end: expect.any(Number),
  })
})

// The launched view records which linear view it came from, which is what pairs
// the two for the hover sync (see hoverSync/graphViewHighlights).
test('the launch records the linear view it came from', () => {
  const { createDisplay } = createTestEnvironment()
  const { session, view, display } = createDisplay()

  clickItem(display.trackMenuItems(), LABEL_REGION)
  expect(session.addedViews[0]![1].connectedViewId).toBe(view.id)
})

// The gate is the declared capability, not the adapter's name — the old
// launcher named GfaTabixAdapter/GfaServerAdapter and went dead when they were
// removed.
test('no launch item for an adapter that cannot cut subgraphs', () => {
  const { createDisplay } = createTestEnvironment({ subgraphCapable: false })
  const { display } = createDisplay()
  expect(labels(display.trackMenuItems())).not.toContain(LABEL_REGION)
})

test('the context menu launches around the right-clicked segment', () => {
  const { createDisplay } = createTestEnvironment()
  const { session, display } = createDisplay()
  display.openContextMenu(
    {
      featureId: 's322',
      startBp: 1000,
      endBp: 1100,
      name: 's322',
      type: 'segment',
    },
    0,
    0,
    0,
  )

  const items = display.contextMenuItems()
  expect(labels(items)).toContain(LABEL_SEGMENT)

  clickItem(items, LABEL_SEGMENT)
  const [, snapshot] = session.addedViews[0]!
  // padded by half the segment's length on each side
  expect(snapshot.loadedRegion).toEqual({
    refName: 'ctgA',
    assemblyName: 'volvox',
    start: 950,
    end: 1150,
  })
})

test('no segment launch item without a right-clicked feature', () => {
  const { createDisplay } = createTestEnvironment()
  const { display } = createDisplay()
  expect(labels(display.contextMenuItems())).not.toContain(LABEL_SEGMENT)
})

test('a region past the cap notifies instead of opening a view', () => {
  const { createDisplay } = createTestEnvironment()
  const { session } = createDisplay()
  launchSubgraphView({
    session,
    region: {
      refName: 'ctgA',
      assemblyName: 'volvox',
      start: 0,
      end: MAX_GRAPH_REGION_BP + 1,
    },
    trackId: 'graph_track',
  })
  expect(session.addedViews).toHaveLength(0)
  expect(session.notifications[0]).toMatch(/Region too large/)
})

test('regionAroundSegment floors its padding at 10 bp', () => {
  expect(
    regionAroundSegment({
      refName: 'ctgA',
      assemblyName: 'volvox',
      start: 100,
      end: 101,
    }),
  ).toEqual({
    refName: 'ctgA',
    assemblyName: 'volvox',
    start: 90,
    end: 111,
  })
})

test('regionAroundSegment never pads past the start of the sequence', () => {
  expect(
    regionAroundSegment({
      refName: 'ctgA',
      assemblyName: 'volvox',
      start: 5,
      end: 15,
    }).start,
  ).toBe(0)
})

test('regionFromViewport is undefined with nothing displayed', () => {
  expect(regionFromViewport([])).toBeUndefined()
})

// Both launch entries cross region boundaries routinely — a view scrolled past
// one, a rubberband dragged across one. The leading block is then a sliver, and
// cutting a graph from it is both wrong and under the size cap, so the menu
// offers it as enabled rather than saying "zoom in".
test('a boundary-crossing span is cut from its widest block, not its first', () => {
  expect(
    regionFromViewport([
      { refName: 'ctgA', assemblyName: 'volvox', start: 49998, end: 50001 },
      { refName: 'ctgB', assemblyName: 'volvox', start: 0, end: 9000 },
    ]),
  ).toEqual({
    refName: 'ctgB',
    assemblyName: 'volvox',
    start: 0,
    end: 9000,
  })
})

test('the widest block wins on bp, so an oversized straddle still trips the cap', () => {
  const region = regionFromViewport([
    { refName: 'ctgA', assemblyName: 'volvox', start: 0, end: 10 },
    {
      refName: 'ctgB',
      assemblyName: 'volvox',
      start: 0,
      end: MAX_GRAPH_REGION_BP + 1000,
    },
  ])
  expect(region?.refName).toBe('ctgB')
  expect(subgraphRegionProblem(region!)).toMatch(/zoom in/)
})
