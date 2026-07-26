import { expect, test, vi } from 'vitest'

import { graphLaunchMenuItems } from './graphMenuItems'
import { launchSyntenyView, showInLinearView } from './launchFromGraph'

import type { Contributor } from './contributors'
import type { GraphLaunchSession } from './launchFromGraph'
import type { MenuItem } from '@jbrowse/core/ui'

function contributor(sample: string, rank: number, start = 1000): Contributor {
  return {
    sample,
    refName: 'chr',
    start,
    end: start + 5000,
    rank,
    nodeCount: 3,
  }
}

function testSession(views: unknown[] = []) {
  const added: [string, Record<string, unknown> | undefined][] = []
  const session = {
    tracks: [],
    assemblies: [],
    assemblyNames: ['K12', 'Sakai'],
    views,
    addView: (type: string, snapshot?: Record<string, unknown>) => {
      added.push([type, snapshot])
      return { id: `view-${added.length}` }
    },
  }
  // The launch functions read only these members, which is why they are typed
  // structurally rather than against AbstractSessionModel.
  return { session: session satisfies GraphLaunchSession, added }
}

function linearView(id: string, assemblyNames: string[]) {
  return {
    id,
    type: 'LinearGenomeView',
    assemblyNames,
    navToLocString: vi.fn(),
  }
}

const K12_LOCATION = {
  sample: 'K12',
  refName: 'chr',
  start: 1000,
  end: 6000,
}

// The point of the whole feature: the graph moves the linear view beside it
// rather than stacking another pane on top of it.
test('an existing linear view on the assembly is navigated, not duplicated', () => {
  const view = linearView('lgv1', ['K12'])
  const { session, added } = testSession([view])

  const viewId = showInLinearView({
    session,
    location: K12_LOCATION,
    assembly: 'K12',
    connectedViewId: undefined,
  })

  expect(view.navToLocString).toHaveBeenCalledWith('chr:1001-6000', 'K12')
  expect(added).toEqual([])
  expect(viewId).toBe('lgv1')
})

test('the paired view wins over another view on the same assembly', () => {
  const paired = linearView('lgv2', ['K12'])
  const other = linearView('lgv1', ['K12'])
  const { session } = testSession([other, paired])

  showInLinearView({
    session,
    location: K12_LOCATION,
    assembly: 'K12',
    connectedViewId: 'lgv2',
  })

  expect(paired.navToLocString).toHaveBeenCalled()
  expect(other.navToLocString).not.toHaveBeenCalled()
})

// Ambiguous and unpaired: scrolling one of the user's several views is a guess,
// so a view we own is opened instead. The graph's own track goes on it.
test('two candidate views and no pairing opens a new view', () => {
  const { session, added } = testSession([
    linearView('lgv1', ['K12']),
    linearView('lgv2', ['K12']),
  ])

  showInLinearView({
    session,
    location: K12_LOCATION,
    assembly: 'K12',
    connectedViewId: undefined,
    tracks: ['graph_segments'],
  })

  expect(added).toEqual([
    [
      'LinearGenomeView',
      {
        displayName: 'K12 — chr:1,001-6,000',
        init: {
          assembly: 'K12',
          loc: 'chr:1001-6000',
          tracks: ['graph_segments'],
        },
      },
    ],
  ])
})

test('a linear view on another assembly is not navigated', () => {
  const view = linearView('lgv1', ['Sakai'])
  const { session, added } = testSession([view])

  showInLinearView({ session, location: K12_LOCATION, assembly: 'K12' })

  expect(view.navToLocString).not.toHaveBeenCalled()
  expect(added).toHaveLength(1)
})

// The panel loci come from the graph itself, so no mate discovery, no PAF
// lookup and no dialog stand between the graph and a multi-genome view.
test('a synteny launch frames each panel on its own assembly coordinates', () => {
  const { session, added } = testSession()

  launchSyntenyView({
    session,
    contributors: [contributor('K12', 0), contributor('Sakai', 1, 90000)],
    trackId: 'ecoli_ava',
  })

  expect(added[0]).toEqual([
    'LinearSyntenyView',
    {
      init: {
        views: [
          { assembly: 'K12', loc: 'chr:1001-6000' },
          { assembly: 'Sakai', loc: 'chr:90001-95000' },
        ],
        tracks: ['ecoli_ava'],
        collapseEmptyRows: true,
      },
    },
  ])
})

function labels(items: MenuItem[]) {
  return items.flatMap(i => ('label' in i ? [i.label] : []))
}

test('one contributor offers a linear view and no synteny item', () => {
  const items = graphLaunchMenuItems({
    contributors: [contributor('GRCh38', 0)],
    syntenyTracks: [],
    onShowLinear: () => {},
    onShowSynteny: () => {},
  })
  expect(labels(items)).toEqual(['Linear genome view — GRCh38 chr:1,001-6,000'])
})

// Disabled rather than absent: an item that vanishes teaches nobody that the
// session is one synteny track short of a multi-genome view.
test('several contributors with no synteny track offer a disabled item', () => {
  const items = graphLaunchMenuItems({
    contributors: [contributor('K12', 0), contributor('Sakai', 1)],
    syntenyTracks: [],
    onShowLinear: () => {},
    onShowSynteny: () => {},
  })
  const synteny = items.find(
    i => 'label' in i && i.label === 'Linear synteny view (2 assemblies)',
  )
  expect(synteny).toMatchObject({ disabled: true })
})

test('several contributors and a synteny track launch it', () => {
  const onShowSynteny = vi.fn()
  const items = graphLaunchMenuItems({
    contributors: [contributor('K12', 0), contributor('Sakai', 1)],
    syntenyTracks: [{ trackId: 'ecoli_ava', name: 'All vs all', coverage: 2 }],
    onShowLinear: () => {},
    onShowSynteny,
  })
  const item = items.find(
    i =>
      'label' in i &&
      i.label === 'Linear synteny view (2 assemblies) — All vs all',
  )
  if (item && 'onClick' in item) {
    item.onClick(undefined)
  }
  expect(onShowSynteny).toHaveBeenCalledWith('ecoli_ava')
})
