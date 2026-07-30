import { formatBp, graphLabels } from './graphLabels'

const NODES = {
  long: [
    { x: 0, y: 0 },
    { x: 200, y: 0 },
  ],
  // 30 units, which at scale 1 is wide enough to hold "12 bp" within the
  // factor-of-two overhang and at scale 0.2 is not
  small: [
    { x: 300, y: 0 },
    { x: 330, y: 0 },
  ],
  // 2 units: a speck, whose label would be twenty times the thing it names
  speck: [
    { x: 400, y: 0 },
    { x: 402, y: 0 },
  ],
}
const LENGTHS = new Map([
  ['long', 39_000],
  ['small', 12],
  ['speck', 7],
])

const VIEWPORT = { translateX: 0, translateY: 0, width: 800, height: 400 }

test('labels a node with the sequence it carries', () => {
  const labels = graphLabels({
    nodePositions: NODES,
    nodeLengths: LENGTHS,
    deletions: [],
    scale: 1,
    ...VIEWPORT,
  })
  expect(labels.map(l => l.text).sort()).toEqual(['12 bp', '39 kb'])
})

// The reason a label is missing has to be in the picture. It is not "the node is
// small" against a flat pixel count, it is "the node is shorter than the words",
// measured against the text that would be drawn.
test('drops a label the node cannot nearly hold', () => {
  const labels = graphLabels({
    nodePositions: NODES,
    nodeLengths: LENGTHS,
    deletions: [],
    scale: 1,
    ...VIEWPORT,
  })
  expect(labels.map(l => l.text)).not.toContain('7 bp')
})

// Zooming out shrinks every node past its own label, so a wide view sheds labels
// on its own rather than carrying one per speck.
test('sheds labels as the view zooms out', () => {
  const at = (scale: number) =>
    graphLabels({
      nodePositions: NODES,
      nodeLengths: LENGTHS,
      deletions: [],
      scale,
      ...VIEWPORT,
    }).map(l => l.text)
  expect(at(1).sort()).toEqual(['12 bp', '39 kb'])
  expect(at(0.2)).toEqual(['39 kb'])
  expect(at(0.05)).toEqual([])
})

test('drops a label that would land outside the canvas', () => {
  const labels = graphLabels({
    nodePositions: NODES,
    nodeLengths: LENGTHS,
    deletions: [],
    scale: 1,
    ...VIEWPORT,
    // panned until the long node's midpoint is off the left edge
    translateX: -250,
  })
  expect(labels.map(l => l.text)).toEqual(['12 bp'])
})

// A deletion carries no negative sequence; it skips reference. A signed number
// beside a graph reads as a length that went negative, which is what a review
// took "−84.7 kb" for.
test('a deletion says what it skips, positively, on its arc', () => {
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
    ...VIEWPORT,
  }).filter(l => l.kind === 'deletion')
  expect(label!.text).toBe('skips 84.7 kb')
  // off the line the bypassed node lies on, which is what puts it on the curve
  expect(Math.abs(label!.y)).toBeGreaterThan(10)
})

// The arc is the only thing on screen representing sequence that is absent, so
// it outranks the node labels competing for the same space.
test('a deletion label wins the space over a node label', () => {
  const labels = graphLabels({
    nodePositions: {
      long: NODES.long,
      // sits where the arc's apex lands (bulge 0.35*200, apex 3/4 of it), so the
      // two labels compete for one box
      clash: [
        { x: 60, y: 52 },
        { x: 140, y: 52 },
      ],
    },
    nodeLengths: new Map([
      ['long', 39_000],
      ['clash', 900_000],
    ]),
    deletions: [
      {
        edgeIndex: 0,
        refName: 'chr1',
        start: 100,
        end: 84_783,
        bp: 84_683,
        bypassed: ['long'],
      },
    ],
    scale: 1,
    ...VIEWPORT,
  })
  expect(labels.map(l => l.text)).toEqual(['skips 84.7 kb', '39 kb'])
})

// Two arcs over the same stretch of backbone put their labels in nearly the same
// place, and the one that survives should be the larger event rather than
// whichever the edge list happened to reach first.
test('the bigger deletion keeps its label', () => {
  const bypassed = ['long']
  const del = (edgeIndex: number, bp: number) => ({
    edgeIndex,
    refName: 'chr1',
    start: 100,
    end: 100 + bp,
    bp,
    bypassed,
  })
  const labels = graphLabels({
    nodePositions: NODES,
    nodeLengths: LENGTHS,
    deletions: [del(0, 10_000), del(1, 15_700)],
    scale: 1,
    ...VIEWPORT,
  }).filter(l => l.kind === 'deletion')
  expect(labels.map(l => l.text)).toEqual(['skips 15.7 kb'])
})

test('formats bp at the scale a pangenome allele lives at', () => {
  expect([formatBp(12), formatBp(1200), formatBp(2_500_000)]).toEqual([
    '12 bp',
    '1.2 kb',
    '2.5 Mb',
  ])
})
