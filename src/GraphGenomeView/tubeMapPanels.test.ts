import { convertGFAToGraph } from '@jbrowse/bandage-core/gfa/gfaConverter'
import { parseGFA } from '@jbrowse/bandage-core/gfa-core/index'
import { tubeMapReferenceLayout } from '@jbrowse/bandage-core/layout/tubeMapLayout'
import { anchorGraph } from '@jbrowse/bandage-core/pathAnchoring'

import {
  PANEL_GAP,
  graphOfPaths,
  tubeMapPanelGroups,
  withTubeMapPanels,
} from './tubeMapPanels'

// A carries an insertion on its first haplotype; B lacks segment 3
const GFA = [
  'S\t1\tACGTACGTAC',
  'S\t2\tGGGG',
  'S\t3\tTTTTTTTTTT',
  'S\t4\tCCCCCCCCCC',
  'L\t1\t+\t2\t+\t0M',
  'L\t2\t+\t3\t+\t0M',
  'L\t1\t+\t3\t+\t0M',
  'L\t3\t+\t4\t+\t0M',
  'L\t1\t+\t4\t+\t0M',
  'P\tref\t1+,3+,4+\t*',
  'P\tA#1#c\t1+,2+,3+,4+\t*',
  'P\tA#2#c\t1+,3+,4+\t*',
  'P\tB#1#c\t1+,4+\t*',
].join('\n')

function graph() {
  return anchorGraph(convertGFAToGraph(parseGFA(GFA)), 'ref')
}

test('a panel per sample holds its haplotypes, per walk each walk alone', () => {
  const g = graph()
  expect(tubeMapPanelGroups(g, 'sample')).toEqual([
    { key: 'A', paths: ['A#1#c', 'A#2#c'] },
    { key: 'B', paths: ['B#1#c'] },
  ])
  expect(tubeMapPanelGroups(g, 'walk').map(p => p.key)).toEqual([
    'A#1#c',
    'A#2#c',
    'B#1#c',
  ])
  expect(tubeMapPanelGroups(g, 'sample', ['B']).map(p => p.key)).toEqual([
    'B',
    'A',
  ])
})

test("a panel's graph is the reference and its walks, and what they visit", () => {
  const b = graphOfPaths(graph(), ['B#1#c'])
  expect(b.paths!.map(p => p.name)).toEqual(['ref', 'B#1#c'])
  expect(b.nodes.map(n => n.name).sort()).toEqual(['1', '3', '4'])
  expect(b.edges.every(e => e.from !== '2+' && e.to !== '2+')).toBe(true)
  for (const visits of b.pathVisits!.values()) {
    expect(visits.every(v => v.path === 'ref' || v.path === 'B#1#c')).toBe(true)
  }
})

test('panels stack down the pane, a title gap above each', () => {
  const g = graph()
  const whole = tubeMapReferenceLayout(g)!
  const laidOut = tubeMapPanelGroups(g, 'sample').map(group => ({
    ...group,
    result: tubeMapReferenceLayout(graphOfPaths(g, group.paths)),
  }))
  const split = withTubeMapPanels(whole, laidOut)
  const [a, b] = split.tubeMapPanels!
  expect(a!.top).toBe(PANEL_GAP)
  expect(b!.top).toBe(a!.top + a!.height + PANEL_GAP)
  expect(split.extent).toMatchObject({ minY: 0, maxY: b!.top + b!.height })
  expect(a!.result.tubeMap.layout.tracks).toHaveLength(3)
  expect(b!.result.tubeMap.layout.tracks).toHaveLength(2)
  const ys = Object.values(split.nodePositions).flatMap(s => s.map(p => p.y))
  expect(Math.min(...ys)).toBeGreaterThanOrEqual(PANEL_GAP)
  expect(Math.max(...ys)).toBeLessThanOrEqual(split.extent!.maxY!)
})

test('one group draws the whole map, unsplit', () => {
  const g = graph()
  const whole = tubeMapReferenceLayout(g)!
  const split = withTubeMapPanels(whole, [
    {
      key: 'B',
      paths: ['B#1#c'],
      result: tubeMapReferenceLayout(graphOfPaths(g, ['B#1#c'])),
    },
  ])
  expect(split).toBe(whole)
})
