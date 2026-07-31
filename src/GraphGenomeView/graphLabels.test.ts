import { formatBp, graphLabels, rowLabelBox } from './graphLabels'

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

// The two backbone nodes a deletion edge runs BETWEEN. The arc is drawn from the
// end of one to the start of the other and bowed off that chord, so a fixture
// that states only `bypassed` cannot say where the arc is: the label is placed on
// the curve now rather than at an apex re-derived from the bypassed run, which is
// what stopped the words and the arc landing in different places under a force
// layout. Deliberately absent from LENGTHS, so they carry no labels of their own
// and the assertions below stay about the deletion.
const FLANKS = {
  before: [
    { x: -80, y: 0 },
    { x: 0, y: 0 },
  ],
  after: [
    { x: 200, y: 0 },
    { x: 280, y: 0 },
  ],
}
const FLANKED = { ...NODES, ...FLANKS }
const between = { from: 'before', to: 'after' }

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
    nodePositions: FLANKED,
    nodeLengths: LENGTHS,
    deletions: [
      {
        edgeIndex: 3,
        ...between,
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
  expect(label!.text).toBe('skips 84.7 kb of reference')
  // off the line the bypassed node lies on, which is what puts it on the curve
  expect(Math.abs(label!.y)).toBeGreaterThan(10)
})

// The arc is the only thing on screen representing sequence that is absent, so
// it outranks the node labels competing for the same space.
test('a deletion label wins the space over a node label', () => {
  const labels = graphLabels({
    nodePositions: {
      long: NODES.long,
      ...FLANKS,
      // sits where the arc's own midpoint lands (bulge 0.35*200, and a cubic
      // whose control points both sit that far off the chord reaches 3/4 of it),
      // so the two labels compete for one box
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
        ...between,
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
  expect(labels.map(l => l.text)).toEqual([
    'skips 84.7 kb of reference',
    '39 kb',
  ])
})

// The gate is the arc's drawn extent, not its bulge. Bulge is in layout units,
// which differ per layout: the same deletion cleared a bulge threshold under FMMM
// and failed it in an anchored layout, where the bow is a fraction of the skipped
// span in bp. Here the bypassed node is short (so the bulge is small) while the
// endpoints are far apart (so the arc is wide) -- the anchored case, and the one
// the old rule got wrong.
test('a wide, shallow arc is labelled', () => {
  const labels = graphLabels({
    nodePositions: {
      ...FLANKS,
      shallow: [
        { x: 90, y: 0 },
        { x: 110, y: 0 },
      ],
    },
    nodeLengths: new Map(),
    deletions: [
      {
        edgeIndex: 0,
        ...between,
        refName: 'chr1',
        start: 100,
        end: 9400,
        bp: 9300,
        bypassed: ['shallow'],
      },
    ],
    scale: 1,
    ...VIEWPORT,
  })
  expect(labels.map(l => l.text)).toEqual(['skips 9.3 kb of reference'])
})

// Two arcs over the same stretch of backbone put their labels in nearly the same
// place, and the one that survives should be the larger event rather than
// whichever the edge list happened to reach first.
test('the bigger deletion keeps its label', () => {
  const bypassed = ['long']
  const del = (edgeIndex: number, bp: number) => ({
    edgeIndex,
    ...between,
    refName: 'chr1',
    start: 100,
    end: 100 + bp,
    bp,
    bypassed,
  })
  const labels = graphLabels({
    nodePositions: FLANKED,
    nodeLengths: LENGTHS,
    deletions: [del(0, 10_000), del(1, 15_700)],
    scale: 1,
    ...VIEWPORT,
  }).filter(l => l.kind === 'deletion')
  expect(labels.map(l => l.text)).toEqual(['skips 15.7 kb of reference'])
})

test('formats bp at the scale a pangenome allele lives at', () => {
  expect([formatBp(12), formatBp(1200), formatBp(2_500_000)]).toEqual([
    '12 bp',
    '1.2 kb',
    '2.5 Mb',
  ])
})

// The row labels of a row-structured layout paint over the same overlay and are
// opaque, so a node label under one is gone rather than behind it: a "17 bp"
// against the left edge of an anchored layout came out as a stray "bp" beside
// `Reference (rank 0)`.
test('a row label holds its space against a node label', () => {
  const at = (reserved?: ReturnType<typeof rowLabelBox>[]) =>
    graphLabels({
      nodePositions: {
        atEdge: [
          { x: 10, y: 40 },
          { x: 90, y: 40 },
        ],
      },
      nodeLengths: new Map([['atEdge', 17]]),
      deletions: [],
      scale: 1,
      ...VIEWPORT,
      reserved,
    }).map(l => l.text)
  expect(at()).toEqual(['17 bp'])
  expect(at([rowLabelBox('Reference (rank 0)', 40)])).toEqual([])
})
