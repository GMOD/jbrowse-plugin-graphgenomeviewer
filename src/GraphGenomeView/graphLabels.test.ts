import { formatBp, graphLabels } from './graphLabels'

const NODES = {
  long: [
    { x: 0, y: 0 },
    { x: 200, y: 0 },
  ],
  short: [
    { x: 300, y: 0 },
    { x: 302, y: 0 },
  ],
}
const LENGTHS = new Map([
  ['long', 39_000],
  ['short', 12],
])

test('labels a node with the sequence it carries', () => {
  const labels = graphLabels({
    nodePositions: NODES,
    nodeLengths: LENGTHS,
    deletions: [],
    scale: 1,
  })
  expect(labels.map(l => l.text)).toEqual(['39 kb'])
})

// The threshold is what keeps a wide view from carrying one label per speck, so
// it has to be measured after the zoom rather than in layout units.
test('drops every label as the view zooms out', () => {
  const at = (scale: number) =>
    graphLabels({
      nodePositions: NODES,
      nodeLengths: LENGTHS,
      deletions: [],
      scale,
    }).length
  expect(at(1)).toBe(1)
  expect(at(0.05)).toBe(0)
})

test('a deletion says what it removes, on its arc rather than on the backbone', () => {
  const [label] = graphLabels({
    nodePositions: NODES,
    nodeLengths: LENGTHS,
    deletions: [
      {
        edgeIndex: 3,
        refName: 'chr1',
        start: 100,
        end: 84_783,
        bp: 84_683,
        bypassed: ['long'],
      },
    ],
    scale: 1,
  }).filter(l => l.kind === 'deletion')
  expect(label!.text).toBe('−84.7 kb')
  // off the line the bypassed node lies on, which is what puts it on the curve
  expect(Math.abs(label!.y)).toBeGreaterThan(10)
})

test('formats bp at the scale a pangenome allele lives at', () => {
  expect([formatBp(12), formatBp(1200), formatBp(2_500_000)]).toEqual([
    '12 bp',
    '1.2 kb',
    '2.5 Mb',
  ])
})
