import { Canvas2DRenderer } from './Canvas2DRenderer'
import { buildGeometry } from './GeometryBuilder'
import { recordingCanvas } from './recordingCanvas'

import type { TransformUniform } from './types'

// isotropic: one scale for both axes, which is every layout but the row ones
const iso = (scale = 1) => ({ scaleX: scale, scaleY: scale })

function makeRenderer() {
  const { canvas, strokes, fills, lineWidths, points } = recordingCanvas()
  return {
    renderer: new Canvas2DRenderer(canvas),
    strokes,
    fills,
    lineWidths,
    points,
  }
}

const TRANSFORM: TransformUniform = {
  scaleX: 1,
  scaleY: 1,
  translateX: 0,
  translateY: 0,
  viewportWidth: 800,
  viewportHeight: 600,
  dpr: 1,
}

// three nodes in a row wired A -> B -> C, so edge 0 and edge 1 are distinct
// strokes and a highlight on one must not touch the other
const nodes = [
  { id: 'A+', name: 'A', length: 10, depth: 1 },
  { id: 'B+', name: 'B', length: 10, depth: 1 },
  { id: 'C+', name: 'C', length: 10, depth: 1 },
]

function batchOf2Edges() {
  return buildGeometry({
    nodePositions: {
      'A+': [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ],
      'B+': [
        { x: 40, y: 0 },
        { x: 50, y: 0 },
      ],
      'C+': [
        { x: 80, y: 0 },
        { x: 90, y: 0 },
      ],
    },
    graph: {
      name: 'test',
      nodes,
      edges: [
        { from: 'A+', to: 'B+' },
        { from: 'B+', to: 'C+' },
      ],
    },
    nodeById: new Map(nodes.map(n => [n.id, n])),
    colorScheme: 'uniform',
    contigThickness: 10,
    connectorThickness: 4,
    drawPaths: false,
    axis: iso(),
  })
}

function channels(rgba: string) {
  const m = /rgba\((\d+),(\d+),(\d+)/.exec(rgba)
  return [Number(m?.[1]), Number(m?.[2]), Number(m?.[3])]
}

test('strokes one path per edge', () => {
  const { renderer, strokes } = makeRenderer()
  renderer.uploadGeometry(batchOf2Edges())
  renderer.updateTransform(TRANSFORM)
  renderer.render([1, 1, 1, 1])

  expect(strokes).toHaveLength(2)
  expect(strokes[0]).toBe(strokes[1])
})

test('a highlighted edge is stroked brighter and its neighbour is not', () => {
  const { renderer, strokes } = makeRenderer()
  const batch = batchOf2Edges()
  renderer.uploadGeometry(batch)
  renderer.updateTransform(TRANSFORM)
  renderer.render([1, 1, 1, 1])
  const base = strokes[0]!

  strokes.length = 0
  renderer.setEdgeHighlight(1, 1.6)
  renderer.render([1, 1, 1, 1])

  expect(strokes).toHaveLength(2)
  // edge 0 untouched, edge 1 brightened on every channel
  expect(strokes[0]).toBe(base)
  expect(strokes[1]).not.toBe(base)
  const [r, g, b] = channels(strokes[1]!)
  const [br, bg, bb] = channels(base)
  expect(r).toBeGreaterThan(br!)
  expect(g).toBeGreaterThan(bg!)
  expect(b).toBeGreaterThan(bb!)
})

test('clearing the highlight restores the base stroke', () => {
  const { renderer, strokes } = makeRenderer()
  renderer.uploadGeometry(batchOf2Edges())
  renderer.updateTransform(TRANSFORM)
  renderer.setEdgeHighlight(0, 1.6)
  renderer.render([1, 1, 1, 1])
  const highlighted = [...strokes]

  strokes.length = 0
  renderer.setEdgeHighlight(null, 1.6)
  renderer.render([1, 1, 1, 1])

  expect(highlighted[0]).not.toBe(strokes[0])
  expect(strokes[0]).toBe(strokes[1])
})

// A rebuild renumbers the strokes, so a range captured against the old batch
// could brighten an unrelated edge. The model re-applies the current hover after
// every upload; the renderer's job is not to keep pointing at a stale range.
test('uploading a new batch drops the previous highlight', () => {
  const { renderer, strokes } = makeRenderer()
  renderer.uploadGeometry(batchOf2Edges())
  renderer.updateTransform(TRANSFORM)
  renderer.setEdgeHighlight(1, 1.6)
  renderer.render([1, 1, 1, 1])
  expect(strokes[0]).not.toBe(strokes[1])

  strokes.length = 0
  renderer.uploadGeometry(batchOf2Edges())
  renderer.render([1, 1, 1, 1])

  expect(strokes).toHaveLength(2)
  expect(strokes[0]).toBe(strokes[1])
})

// A thickness is quoted in CSS pixels and expanded AFTER the transform, so it
// is the one term the dpr-scaled transform does not reach. Left alone, every
// tube, connector and arrowhead came out 1/dpr of its weight on a hidpi
// display, with the positions between them correct — measurable here as the
// round cap's overhang past the node's own coordinates.
//
// Asserted as "twice the backing-store pixels at twice the ratio", which is the
// same drawing in css px. The whole point is that a figure does not change
// weight with the machine it is opened on.
describe('a thickness is css pixels, whatever the device ratio', () => {
  function drawnWidth(dpr: number) {
    const { renderer, points, lineWidths } = makeRenderer()
    renderer.uploadGeometry(batchOf2Edges())
    renderer.updateTransform({ ...TRANSFORM, scaleX: dpr, scaleY: dpr, dpr })
    renderer.render([1, 1, 1, 1])
    const xs = points.map(p => p.x)
    return {
      spanPx: Math.max(...xs) - Math.min(...xs),
      lineWidth: lineWidths[0]!,
    }
  }

  test('a node mesh scales its caps with the ratio', () => {
    // three 10-unit nodes over a 90-unit span, plus half a tube of cap at each
    // end: contigThickness 10, so 100 units at ratio 1
    expect(drawnWidth(1).spanPx).toBeCloseTo(100, 5)
    expect(drawnWidth(2).spanPx).toBeCloseTo(200, 5)
  })

  test('a stroked edge scales its width with the ratio', () => {
    // connectorThickness 4 is a half-width of 2, so a 4 px stroke at ratio 1
    expect(drawnWidth(1).lineWidth).toBeCloseTo(4, 5)
    expect(drawnWidth(2).lineWidth).toBeCloseTo(8, 5)
  })
})
