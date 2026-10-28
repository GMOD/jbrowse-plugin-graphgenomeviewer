import {
  legendSections,
  rowPitch,
  swatchHeight,
  tubeMapRows,
} from './legendSections'

import type { GraphPaneModel } from './model'

function labels(readsShown: { shown: number; total: number } | undefined) {
  const model = {
    tubeMapKeys: {
      logWidths: false,
      foldBp: undefined,
      forwardReads: true,
      reverseReads: false,
      substitution: false,
      insertion: false,
      deletion: false,
    },
    readsShown,
  }
  return tubeMapRows(model as unknown as GraphPaneModel).map(r => r.label)
}

test('a sampled read set says how many of its reads are drawn', () => {
  expect(labels({ shown: 5000, total: 12_345 })).toContain(
    '5,000 of 12,345 reads shown',
  )
})

test('a read set drawn whole says nothing of its count', () => {
  expect(labels({ shown: 40, total: 40 }).join()).not.toMatch(/reads shown/)
})

// toLocaleString with no locale writes 1.000 for a German viewer
test("the ramp key's bp read the same in every locale", () => {
  const format = Number.prototype.toLocaleString
  const german = vi
    .spyOn(Number.prototype, 'toLocaleString')
    .mockImplementation(function (this: number, locales, options) {
      return format.call(this, locales ?? 'de-DE', options)
    })
  const model = {
    walkLift: undefined,
    referenceRampDomain: { start: 999.5, end: 123_456.5 },
    referenceRampDrawsOffReference: false,
    bubbleHalos: [],
    genePins: [],
    pathLegend: [],
    tubeMapKeys: {},
  }
  const [ramp] = legendSections(model as unknown as GraphPaneModel)
  german.mockRestore()
  expect(ramp!.rows[0]!.under).toBe('1,000-123,457 (122 kb)')
})

function widthLegend(over: Record<string, unknown>) {
  const model = {
    walkLift: undefined,
    referenceRampDomain: undefined,
    bubbleHalos: [],
    genePins: [],
    pathLegend: [],
    tubeMapKeys: {},
    deletions: [],
    graph: { nodes: [{ depth: 1 }, { depth: 26 }], edges: [], paths: [{}] },
    drawsNodes: true,
    walkRowBars: undefined,
    nodeWidth: 'depth',
    contigThickness: 6,
    depthRange: { min: 1, max: 26, mean: 8 },
    linkWidth: 'uniform',
    connectorThickness: 2,
    busiestLink: 26,
    ...over,
  }
  return legendSections(model as unknown as GraphPaneModel).find(
    s => s.testid === 'graph-width-legend',
  )?.rows
}

test('the width key names what node thickness counts, thickest first', () => {
  const rows = widthLegend({})!
  expect(rows.map(r => r.label)).toEqual([
    'node thickness: walks through it',
    '26 walks',
    '8 walks',
    '1 walk',
  ])
  const [thick, mean, thin] = rows.slice(1).map(r => swatchHeight(r.swatch!))
  expect(mean).toBe(6)
  expect(thick).toBeGreaterThan(mean!)
  expect(thin).toBeLessThan(mean!)
})

test('a walk count reads whole, and a mean that rounds onto an end is dropped', () => {
  expect(
    widthLegend({ depthRange: { min: 1, max: 3, mean: 1.9 } })!.map(
      r => r.label,
    ),
  ).toEqual([
    'node thickness: walks through it',
    '3 walks',
    '2 walks',
    '1 walk',
  ])
  expect(
    widthLegend({ depthRange: { min: 1, max: 3, mean: 1.2 } })!.map(
      r => r.label,
    ),
  ).toEqual(['node thickness: walks through it', '3 walks', '1 walk'])
})

test('a frequency width keys shares of haplotypes, or AF where tagged', () => {
  expect(widthLegend({ nodeWidth: 'frequency' })!.map(r => r.label)).toEqual([
    'node thickness: share of haplotypes through it',
    '100%',
    '50%',
    '10%',
  ])
  const tagged = { nodes: [{ depth: 1, frequency: 0.4 }], edges: [] }
  expect(
    widthLegend({ nodeWidth: 'frequency', graph: tagged })![0]!.label,
  ).toBe('node thickness: allele frequency (AF)')
})

test('uniform widths, or one depth everywhere, draw no width key', () => {
  expect(widthLegend({ nodeWidth: 'uniform' })).toBeUndefined()
  expect(
    widthLegend({ depthRange: { min: 3, max: 3, mean: 3 } }),
  ).toBeUndefined()
})

test('links by walks key the busiest link and a single walk', () => {
  const rows = widthLegend({ nodeWidth: 'uniform', linkWidth: 'walks' })!
  expect(rows.map(r => r.label)).toEqual([
    'link thickness: walks taking it',
    '26 walks',
    '1 walk',
  ])
})

test('every row of a key shares one pitch, roomy enough for its tallest', () => {
  const rows = widthLegend({})!
  for (const row of rows.slice(1)) {
    expect(rowPitch(rows)).toBeGreaterThanOrEqual(swatchHeight(row.swatch!) + 2)
  }
  expect(rowPitch([{ key: 'a', label: 'a' }])).toBe(15)
})
