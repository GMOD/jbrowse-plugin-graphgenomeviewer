import { COMPRESSED_KEY } from '@jbrowse/bandage-core/bubbleSpreads'
import { graphKey } from '@jbrowse/bandage-core/graphKey'

import {
  legendSections,
  rowPitch,
  swatchHeight,
  swatchWidth,
  tubeMapRows,
  walkRowSwatch,
} from './legendSections'

import type { GraphPaneModel } from './model'
import type { GraphKeyOptions } from '@jbrowse/bandage-core/graphKey'
import type { Graph } from '@jbrowse/bandage-core/types'

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

// A pane model holding bandage-core's key for `graph`, as model.graphKey
// builds it
function keyModel(
  graph: Graph,
  options: Partial<GraphKeyOptions> = {},
  layout: { compressed?: true } = {},
) {
  return {
    walkLift: undefined,
    bubbleHalos: [],
    pathLegend: [],
    tubeMapKeys: {},
    graphKey: graphKey(graph, layout, {
      skips: { dashed: false, short: false },
      ...options,
    }),
  } as unknown as GraphPaneModel
}

const node = (id: string, depth: number) => ({
  id,
  name: id,
  length: 10,
  depth,
})

const DEPTHS: Graph = {
  nodes: [node('a', 1), node('b', 26)],
  edges: [{ from: 'a', to: 'b', pathIds: ['p', 'q'] }],
  paths: Array.from({ length: 26 }, (_, i) => ({
    name: `w${i}`,
    nodeIds: ['a'],
  })),
}

function rowsOf(model: GraphPaneModel, testid: string) {
  return legendSections(model).find(s => s.testid === testid)?.rows
}

// toLocaleString with no locale writes 1.000 for a German viewer
test("the ramp key's bp read the same in every locale", () => {
  const format = Number.prototype.toLocaleString
  const german = vi
    .spyOn(Number.prototype, 'toLocaleString')
    .mockImplementation(function (this: number, locales, options) {
      return format.call(this, locales ?? 'de-DE', options)
    })
  const model = keyModel(
    { nodes: [], edges: [] },
    {
      referenceRamp: { start: 999.5, span: 122_457, midpoints: new Map() },
    },
  )
  const [ramp] = legendSections(model)
  german.mockRestore()
  expect(ramp!.rows[0]!.under).toBe('1,001-123,457 (122 kb)')
})

test("the legend draws bandage-core's key, each section under the plugin's testid", () => {
  const model = keyModel(DEPTHS, { edgeWidth: 'walks' }, { compressed: true })
  expect(rowsOf(model, 'graph-width-legend')!.map(r => r.label)).toEqual([
    '26 walks',
    '1 walk',
  ])
  expect(
    rowsOf(model, 'graph-width-legend')!.map(r => swatchHeight(r.swatch!)),
  ).toEqual(
    model.graphKey[0]!.entries.map(e =>
      e.swatch?.kind === 'width' ? e.swatch.px : 0,
    ),
  )
  expect(rowsOf(model, 'graph-link-width-legend')!.map(r => r.label)).toEqual([
    '2 walks',
    '1 walk',
  ])
  expect(rowsOf(model, 'graph-compressed-legend')!.map(r => r.label)).toEqual([
    COMPRESSED_KEY,
  ])
})

test('colour keys are square chips, unlike the thickness bars', () => {
  const model = keyModel(
    { nodes: [node('x', 1)], edges: [] },
    { referenceRamp: { start: 0, span: 1000, midpoints: new Map() } },
  )
  const [ramp] = legendSections(model)
  const off = ramp!.rows.find(r => r.key === 'off')!.swatch!
  expect(swatchWidth(off)).toBe(swatchHeight(off))
})

test('a key of several groups heads each once, a key of one stays bare', () => {
  const both = legendSections(keyModel(DEPTHS, { edgeWidth: 'walks' }))
  expect(both.map(s => s.heading)).toEqual(['Node thickness', 'Link thickness'])
  const one = legendSections(keyModel(DEPTHS))
  expect(one.map(s => s.heading)).toEqual([undefined])
})

test('every row of a key shares one pitch, roomy enough for its tallest', () => {
  const rows = rowsOf(keyModel(DEPTHS), 'graph-width-legend')!
  for (const row of rows) {
    expect(rowPitch(rows)).toBeGreaterThanOrEqual(swatchHeight(row.swatch!) + 2)
  }
  expect(rowPitch([{ key: 'a', label: 'a' }])).toBe(15)
})

test("a walk row key's hollow bar keeps its rim round its fill", () => {
  expect(
    walkRowSwatch({
      kind: 'bar',
      fill: 'rgb(250, 240, 214)',
      rim: 'rgb(217, 164, 65)',
    }),
  ).toEqual({
    kind: 'fill',
    stops: [{ offset: 0, color: 'rgb(250, 240, 214)' }],
    height: expect.any(Number),
    rim: 'rgb(217, 164, 65)',
  })
  expect(walkRowSwatch({ kind: 'bar', fill: '#3c4148' })).not.toHaveProperty(
    'rim',
  )
})
