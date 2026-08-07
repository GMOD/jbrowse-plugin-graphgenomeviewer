import {
  REFERENCE_RAMP_MAX_HUE,
  brightenColors,
  buildGeometry,
  endTangent,
  extractColorSlice,
  hslToRgb,
} from './GeometryBuilder'
import {
  abgrAlpha,
  abgrBlue,
  abgrGreen,
  abgrRed,
  packAbgr,
} from './colorBits'
import {
  FIELD_OFFSET_F32,
  INSTANCE_STRIDE_F32,
} from './shaders/graph.generated'

// isotropic: one scale for both axes, which is every layout but the row ones
const iso = (scale = 1) => ({ scaleX: scale, scaleY: scale })

const simpleGraph = {
  name: 'test',
  nodes: [
    { id: 'A+', name: 'A', length: 100, depth: 1 },
    { id: 'B+', name: 'B', length: 200, depth: 2 },
  ],
  edges: [{ from: 'A+', to: 'B+' }],
}

const simpleNodeById = new Map(simpleGraph.nodes.map(n => [n.id, n]))

const simplePositions = {
  'A+': [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
  ],
  'B+': [
    { x: 20, y: 0 },
    { x: 30, y: 0 },
  ],
}

test('produces non-empty geometry for simple graph', () => {
  const batch = buildGeometry({
    axis: iso(),
    nodePositions: simplePositions,
    graph: simpleGraph,
    nodeById: simpleNodeById,
    colorScheme: 'uniform',
    contigThickness: 5,
    connectorThickness: 1.5,
    drawPaths: false,
  })

  expect(batch.nodes.vertexCount).toBeGreaterThan(0)
  expect(batch.nodes.colors.length).toBeGreaterThan(0)
  expect(batch.nodes.indices.length).toBeGreaterThan(0)
  expect(batch.edgeCurves.length).toBeGreaterThan(0)
  expect(batch.nodes.vertexCount).toBe(batch.nodes.colors.length)
  expect(batch.nodes.vertexData.length).toBe(
    batch.nodes.vertexCount * INSTANCE_STRIDE_F32,
  )
  expect(batch.nodes.vertexDataU32.buffer).toBe(batch.nodes.vertexData.buffer)
  const firstVertexColor = batch.nodes.vertexDataU32[FIELD_OFFSET_F32.color]
  expect(firstVertexColor).toBe(batch.nodes.colors[0])
})

test('produces different geometry for different color schemes', () => {
  const opts = {
    nodePositions: simplePositions,
    graph: simpleGraph,
    nodeById: simpleNodeById,
    contigThickness: 5,
    connectorThickness: 1.5,
    drawPaths: false,
    axis: iso(),
  }

  const uniformBatch = buildGeometry({
    ...opts,
    colorScheme: 'uniform' as const,
  })
  const depthBatch = buildGeometry({ ...opts, colorScheme: 'depth' as const })

  expect(uniformBatch.nodes.vertexCount).toBe(depthBatch.nodes.vertexCount)
  let colorsDiffer = false
  for (let i = 0; i < uniformBatch.nodes.colors.length; i++) {
    if (uniformBatch.nodes.colors[i] !== depthBatch.nodes.colors[i]) {
      colorsDiffer = true
      break
    }
  }
  expect(colorsDiffer).toBe(true)
})

test('tracks vertex ranges for nodes and edges', () => {
  const batch = buildGeometry({
    nodePositions: simplePositions,
    graph: simpleGraph,
    nodeById: simpleNodeById,
    colorScheme: 'uniform',
    axis: iso(),
    contigThickness: 5,
    connectorThickness: 1.5,
    drawPaths: false,
  })

  expect(batch.nodeVertexRanges.size).toBe(2)
  expect(batch.nodeVertexRanges.has('A+')).toBe(true)
  expect(batch.nodeVertexRanges.has('B+')).toBe(true)
  expect(batch.edgeCurveRanges.size).toBe(1)
  expect(batch.edgeCurveRanges.has(0)).toBe(true)

  const rangeA = batch.nodeVertexRanges.get('A+')!
  expect(rangeA.start).toBeDefined()
  expect(rangeA.count).toBeGreaterThan(0)
})

test('handles empty node positions gracefully', () => {
  const batch = buildGeometry({
    nodePositions: {},
    axis: iso(),
    graph: simpleGraph,
    nodeById: simpleNodeById,
    colorScheme: 'uniform',
    contigThickness: 5,
    connectorThickness: 1.5,
    drawPaths: false,
  })

  expect(batch.nodes.vertexCount).toBe(0)
  expect(batch.nodes.indices.length).toBe(0)
  expect(batch.edgeCurves.length).toBe(0)
})

test('handles graph with paths and drawPaths', () => {
  const graphWithPaths = {
    ...simpleGraph,
    edges: [{ from: 'A+', to: 'B+', pathIds: ['p1'] }],
    paths: [{ name: 'p1', nodeIds: ['A+', 'B+'] }],
  }

  const batch = buildGeometry({
    nodePositions: simplePositions,
    axis: iso(),
    graph: graphWithPaths,
    nodeById: simpleNodeById,
    colorScheme: 'uniform',
    contigThickness: 5,
    connectorThickness: 1.5,
    drawPaths: true,
  })

  expect(batch.nodes.vertexCount).toBeGreaterThan(0)
  // one stroke per path crossing the edge, not one for the edge
  expect(batch.edgeCurves).toHaveLength(1)
  expect(batch.edgeCurveRanges.get(0)).toEqual({ start: 0, count: 1 })
})

// A three-path graph where the middle node is the one B skips: A and C walk
// A+ -> B+ , B walks around it. That absence is what the stripes have to show.
const carriageGraph = {
  ...simpleGraph,
  edges: [{ from: 'A+', to: 'B+', pathIds: ['pA', 'pB', 'pC'] }],
  paths: [
    { name: 'pA', nodeIds: ['A+', 'B+'] },
    { name: 'pB', nodeIds: ['A+'] },
    { name: 'pC', nodeIds: ['A+', 'B+'] },
  ],
}

const carriageOpts = {
  nodePositions: simplePositions,
  axis: iso(),
  graph: carriageGraph,
  nodeById: simpleNodeById,
  colorScheme: 'uniform' as const,
  contigThickness: 12,
  connectorThickness: 1.5,
}

// distinct colors used anywhere in a node's vertex range
function nodeColors(
  batch: ReturnType<typeof buildGeometry>,
  nodeId: string,
) {
  const range = batch.nodeVertexRanges.get(nodeId)!
  return new Set(
    Array.from(batch.nodes.colors.slice(range.start, range.start + range.count)),
  )
}

test('drawPaths stripes a node once per path that visits it', () => {
  const batch = buildGeometry({ ...carriageOpts, drawPaths: true })

  // A+ is on all three paths, B+ on two: the count of colors down the node is
  // its carriage, which is the whole point of striping the node rather than
  // only the edge
  expect(nodeColors(batch, 'A+').size).toBe(3)
  expect(nodeColors(batch, 'B+').size).toBe(2)
  // and B+'s two are the same two colors A+ has, not a re-numbered pair: the
  // slot is fixed by the path's position in the legend, so a gap lands in the
  // same place on every node
  expect([...nodeColors(batch, 'B+')].every(c => nodeColors(batch, 'A+').has(c))).toBe(true)
})

test('stripes divide the node width rather than inflating it', () => {
  const striped = buildGeometry({ ...carriageOpts, drawPaths: true })
  const plain = buildGeometry({ ...carriageOpts, drawPaths: false })

  const halfWidth = (batch: ReturnType<typeof buildGeometry>) => {
    const { vertexData, vertexCount } = batch.nodes
    let max = 0
    for (let i = 0; i < vertexCount; i++) {
      const base = i * INSTANCE_STRIDE_F32
      const nx = vertexData[base + FIELD_OFFSET_F32.normal]!
      const ny = vertexData[base + FIELD_OFFSET_F32.normal + 1]!
      const t = vertexData[base + FIELD_OFFSET_F32.thickness]!
      max = Math.max(max, Math.hypot(nx, ny) * t)
    }
    return max
  }
  // three stripes of a third the width each, laid across the same 12 units
  expect(halfWidth(striped)).toBeLessThanOrEqual(halfWidth(plain))
})

test('a node keeps its scheme color when a stripe would be sub-pixel', () => {
  // contigThickness is screen px, so a thin node over three paths gives a
  // one-px stripe each: aliasing between neighbours rather than three colors
  const thin = buildGeometry({
    ...carriageOpts,
    contigThickness: 3,
    drawPaths: true,
  })
  expect(nodeColors(thin, 'A+').size).toBe(1)
})

test('the stripe offset is in world units, so zoom does not fan them apart', () => {
  const yAt = (batch: ReturnType<typeof buildGeometry>, nodeId: string) => {
    const range = batch.nodeVertexRanges.get(nodeId)!
    let min = Infinity
    let max = -Infinity
    for (let i = range.start; i < range.start + range.count; i++) {
      const y = batch.nodes.vertexData[i * INSTANCE_STRIDE_F32 + 1]!
      min = Math.min(min, y)
      max = Math.max(max, y)
    }
    return max - min
  }
  // the stripes are laid across a width stated in screen px, so in world units
  // they must spread twice as far when the view is drawn at half the zoom
  const near = buildGeometry({ ...carriageOpts, drawPaths: true, axis: iso()})
  const far = buildGeometry({ ...carriageOpts, drawPaths: true, axis: iso(0.5)})
  expect(yAt(far, 'A+')).toBeCloseTo(yAt(near, 'A+') * 2, 5)
})

test('a many-path graph is not striped at all', () => {
  const manyPaths = {
    ...simpleGraph,
    paths: Array.from({ length: 40 }, (_, i) => ({
      name: `p${i}`,
      nodeIds: ['A+', 'B+'],
    })),
  }
  const batch = buildGeometry({
    ...carriageOpts,
    graph: manyPaths,
    drawPaths: true,
  })
  // forty colors down one node is not a reading, so the node keeps its own
  expect(nodeColors(batch, 'A+').size).toBe(1)
})

test('stores normals and thicknesses for shader-based expansion', () => {
  const batch = buildGeometry({
    axis: iso(),
    nodePositions: simplePositions,
    graph: simpleGraph,
    nodeById: simpleNodeById,
    colorScheme: 'uniform',
    contigThickness: 10,
    connectorThickness: 4,
    drawPaths: false,
  })

  const { vertexData, vertexCount } = batch.nodes
  let hasNonZeroNormal = false
  let hasPositiveThickness = false
  for (let i = 0; i < vertexCount; i++) {
    const base = i * INSTANCE_STRIDE_F32
    if (
      Math.abs(vertexData[base + FIELD_OFFSET_F32.normal]!) > 0.001 ||
      Math.abs(vertexData[base + FIELD_OFFSET_F32.normal + 1]!) > 0.001
    ) {
      hasNonZeroNormal = true
    }
    if (vertexData[base + FIELD_OFFSET_F32.thickness]! > 0) {
      hasPositiveThickness = true
    }
  }
  expect(hasNonZeroNormal).toBe(true)
  expect(hasPositiveThickness).toBe(true)
})

test('brightenColors produces brighter values', () => {
  const batch = buildGeometry({
    nodePositions: simplePositions,
    graph: simpleGraph,
    axis: iso(),
    nodeById: simpleNodeById,
    colorScheme: 'uniform',
    contigThickness: 5,
    connectorThickness: 1.5,
    drawPaths: false,
  })

  const range = batch.nodeVertexRanges.get('A+')!
  const brightened = brightenColors(batch.nodes.colors, range, 1.4)
  const original = extractColorSlice(batch.nodes.colors, range)

  let hasBrighterValue = false
  for (let i = 0; i < brightened.length; i++) {
    const origR = original[i]! & 0xff
    const brightR = brightened[i]! & 0xff
    if (brightR > origR) {
      hasBrighterValue = true
      break
    }
  }
  expect(hasBrighterValue).toBe(true)
})

test('viewport culling skips off-screen nodes', () => {
  const batch = buildGeometry({
    axis: iso(),
    nodePositions: simplePositions,
    graph: simpleGraph,
    nodeById: simpleNodeById,
    colorScheme: 'uniform',
    contigThickness: 5,
    connectorThickness: 1.5,
    drawPaths: false,
    viewportBounds: { minX: -5, minY: -5, maxX: 15, maxY: 5 },
  })

  expect(batch.nodeVertexRanges.has('A+')).toBe(true)
  expect(batch.nodeVertexRanges.has('B+')).toBe(false)
})

// The reference-anchored layouts put x in bp, so a backbone segment is routinely
// wider than the window with both of its endpoints outside it. Culling on
// endpoint containment dropped exactly the segment those layouts exist to show.
test('viewport culling keeps a node spanning the whole viewport', () => {
  const nodes = [{ id: 'backbone+', name: 'backbone', length: 50_000, depth: 1 }]
  const batch = buildGeometry({
    nodePositions: {
      'backbone+': [
        { x: 0, y: 0 },
        { x: 50_000, y: 0 },
      ],
    },
    graph: { name: 'test', nodes, edges: [] },
    nodeById: new Map(nodes.map(n => [n.id, n])),
    colorScheme: 'uniform',
    axis: iso(),
    contigThickness: 5,
    connectorThickness: 1.5,
    drawPaths: false,
    viewportBounds: { minX: 20_000, minY: -100, maxX: 21_000, maxY: 100 },
  })

  expect(batch.nodeVertexRanges.has('backbone+')).toBe(true)
})

test('node-length color scheme produces distinct colors for different lengths', () => {
  const nodes = [
    { id: 'short+', name: 'short', length: 10, depth: 1 },
    { id: 'long+', name: 'long', length: 10000, depth: 1 },
  ]
  const positions = {
    'short+': [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ],
    'long+': [
      { x: 20, y: 0 },
      { x: 30, y: 0 },
    ],
  }
  const graph = { name: 'test', nodes, edges: [] }
  const nodeById = new Map(nodes.map(n => [n.id, n]))

  const batch = buildGeometry({
    nodePositions: positions,
    graph,
    nodeById,
    colorScheme: 'node-length',
    axis: iso(),
    contigThickness: 5,
    connectorThickness: 1.5,
    drawPaths: false,
  })

  const shortRange = batch.nodeVertexRanges.get('short+')!
  const longRange = batch.nodeVertexRanges.get('long+')!
  expect(shortRange).toBeDefined()
  expect(longRange).toBeDefined()
  expect(batch.nodes.colors[shortRange.start]).not.toBe(
    batch.nodes.colors[longRange.start],
  )
})

test('rainbow color scheme produces distinct colors for nodes at different indices', () => {
  const nodes = [
    { id: 'A+', name: 'A', length: 100, depth: 1 },
    { id: 'B+', name: 'B', length: 100, depth: 1 },
    { id: 'C+', name: 'C', length: 100, depth: 1 },
  ]
  const positions = {
    'A+': [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ],
    'B+': [
      { x: 20, y: 0 },
      { x: 30, y: 0 },
    ],
    'C+': [
      { x: 40, y: 0 },
      { x: 50, y: 0 },
    ],
  }
  const graph = { name: 'test', nodes, edges: [] }
  const nodeById = new Map(nodes.map(n => [n.id, n]))

  const batch = buildGeometry({
    nodePositions: positions,
    graph,
    nodeById,
    colorScheme: 'rainbow',
    axis: iso(),
    contigThickness: 5,
    connectorThickness: 1.5,
    drawPaths: false,
  })

  const rangeA = batch.nodeVertexRanges.get('A+')!
  const rangeB = batch.nodeVertexRanges.get('B+')!
  const rangeC = batch.nodeVertexRanges.get('C+')!
  expect(rangeA).toBeDefined()
  expect(rangeB).toBeDefined()
  expect(rangeC).toBeDefined()
  expect(batch.nodes.colors[rangeA.start]).not.toBe(
    batch.nodes.colors[rangeB.start],
  )
  expect(batch.nodes.colors[rangeB.start]).not.toBe(
    batch.nodes.colors[rangeC.start],
  )
  expect(batch.nodes.colors[rangeA.start]).not.toBe(
    batch.nodes.colors[rangeC.start],
  )
})

test('builds geometry for a self-loop edge', () => {
  const graph = {
    name: 'test',
    nodes: [{ id: 'A+', name: 'A', length: 100, depth: 1 }],
    edges: [{ from: 'A+', to: 'A+' }],
  }
  const batch = buildGeometry({
    nodePositions: {
      'A+': [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ],
    },
    graph,
    nodeById: new Map(graph.nodes.map(n => [n.id, n])),
    colorScheme: 'uniform',
    contigThickness: 5,
    connectorThickness: 1.5,
    drawPaths: false,
    axis: iso(),
  })
  expect(batch.nodes.vertexCount).toBeGreaterThan(0)
  // a self loop is two curves, so it strokes as one two-segment path
  expect(batch.edgeCurves[0]!.curves).toHaveLength(2)
  expect(batch.edgeCurveRanges.has(0)).toBe(true)
})

test('skips edges that reference missing node positions', () => {
  const graph = {
    name: 'test',
    nodes: [{ id: 'A+', name: 'A', length: 100, depth: 1 }],
    edges: [{ from: 'A+', to: 'missing+' }],
  }
  const batch = buildGeometry({
    nodePositions: {
      'A+': [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ],
    },
    graph,
    nodeById: new Map(graph.nodes.map(n => [n.id, n])),
    colorScheme: 'uniform',
    contigThickness: 5,
    connectorThickness: 1.5,
    drawPaths: false,
    axis: iso(),
  })
  // node still builds; the dangling edge is silently dropped
  expect(batch.nodes.vertexCount).toBeGreaterThan(0)
  expect(batch.edgeCurves).toHaveLength(0)
  expect(batch.edgeCurveRanges.size).toBe(0)
})

test('brightenColors clamps channels at 255', () => {
  const colors = new Uint32Array([packAbgr(200, 200, 200, 255)])
  const range = { start: 0, count: 1 }
  const brightened = brightenColors(colors, range, 2)
  expect(abgrRed(brightened[0]!)).toBe(255)
  expect(abgrGreen(brightened[0]!)).toBe(255)
  expect(abgrBlue(brightened[0]!)).toBe(255)
  expect(abgrAlpha(brightened[0]!)).toBe(255)
})

test('brightenColors preserves alpha', () => {
  const colors = new Uint32Array([packAbgr(100, 100, 100, 128)])
  const range = { start: 0, count: 1 }
  const brightened = brightenColors(colors, range, 1.5)
  expect(abgrAlpha(brightened[0]!)).toBe(128)
})

test('extractColorSlice shares the underlying buffer', () => {
  const colors = new Uint32Array([10, 20, 30, 40, 50])
  const range = { start: 1, count: 3 }
  const slice = extractColorSlice(colors, range)
  expect(slice.buffer).toBe(colors.buffer)
  expect(Array.from(slice)).toEqual([20, 30, 40])
})

// Arrowheads used to take their angle from the last two points of the
// tessellated edge mesh. The mesh is gone, so the angle comes from the curve's
// analytic end tangent instead — which has to agree with the direction the
// tessellation was reporting, or every arrowhead points somewhere else.
describe('endTangent', () => {
  // direction of a cubic just short of its endpoint, i.e. what walking the
  // tessellated points to the end and taking the last step measured
  function numericEndAngle(c: {
    x0: number
    y0: number
    cx0: number
    cy0: number
    cx1: number
    cy1: number
    x1: number
    y1: number
  }) {
    const at = (t: number) => {
      const u = 1 - t
      return {
        x:
          u ** 3 * c.x0 +
          3 * u * u * t * c.cx0 +
          3 * u * t * t * c.cx1 +
          t ** 3 * c.x1,
        y:
          u ** 3 * c.y0 +
          3 * u * u * t * c.cy0 +
          3 * u * t * t * c.cy1 +
          t ** 3 * c.y1,
      }
    }
    // a short secant, which is what the last tessellated step was; small enough
    // that its own error stays well under the tolerance below
    const a = at(1 - 1e-6)
    const b = at(1)
    return Math.atan2(b.y - a.y, b.x - a.x)
  }

  const curves = [
    { x0: 0, y0: 0, cx0: 30, cy0: 0, cx1: 70, cy1: 40, x1: 100, y1: 40 },
    { x0: 0, y0: 0, cx0: 0, cy0: 80, cx1: 100, cy1: 80, x1: 100, y1: 0 },
    { x0: 5, y0: 5, cx0: -20, cy0: 60, cx1: -60, cy1: -30, x1: -100, y1: 10 },
  ]

  test.each(curves)('matches the numeric tangent of %j', curve => {
    expect(endTangent(curve)).toBeCloseTo(numericEndAngle(curve), 4)
  })

  // Degenerate control point: the derivative at t=1 vanishes, so there is no
  // tangent to read and the chord is the only direction available.
  test('falls back to the chord when the control point is on the endpoint', () => {
    expect(
      endTangent({ x0: 0, y0: 0, cx0: 0, cy0: 0, cx1: 10, cy1: 10, x1: 10, y1: 10 }),
    ).toBeCloseTo(Math.atan2(10, 10), 6)
  })
})

describe('the reference-position ramp', () => {
  // Two backbone segments at either end of a 1000 bp window and one allele
  // bridging them, which is the shape every graph-over-linear figure has.
  const nodes = [
    {
      id: 'left+',
      name: 'left',
      length: 100,
      depth: 2,
      stable: { refName: 'chr', start: 0, rank: 0 },
    },
    {
      id: 'right+',
      name: 'right',
      length: 100,
      depth: 2,
      stable: { refName: 'chr', start: 900, rank: 0 },
    },
    {
      id: 'alt+',
      name: 'alt',
      length: 5000,
      depth: 1,
      stable: { refName: 'other', start: 7, rank: 1 },
    },
    // a second allele, branching from the far end of the window rather than the
    // middle of it, so a position-dependent colouring would paint it differently
    {
      id: 'alt2+',
      name: 'alt2',
      length: 400,
      depth: 1,
      stable: { refName: 'other', start: 900, rank: 1 },
    },
    { id: 'loose+', name: 'loose', length: 10, depth: 1 },
  ]
  const graph = {
    name: 'test',
    nodes,
    edges: [
      { from: 'left+', to: 'alt+' },
      { from: 'alt+', to: 'right+' },
      { from: 'right+', to: 'alt2+' },
    ],
  }
  const positions = Object.fromEntries(
    nodes.map((n, i) => [
      n.id,
      [
        { x: i * 20, y: 0 },
        { x: i * 20 + 10, y: 0 },
      ],
    ]),
  )

  function colorsFor(colorDomain?: { start: number; end: number }) {
    const batch = buildGeometry({
      nodePositions: positions,
      graph,
      nodeById: new Map(nodes.map(n => [n.id, n])),
      colorScheme: 'reference-position',
      colorDomain,
      axis: iso(),
      contigThickness: 5,
      connectorThickness: 1.5,
      drawPaths: false,
    })
    return Object.fromEntries(
      nodes.map(n => [
        n.id,
        batch.nodes.colors[batch.nodeVertexRanges.get(n.id)!.start],
      ]),
    )
  }

  // The contract a linear track's `color` jexl reproduces. Written out as the
  // arithmetic rather than as a captured constant, so an edit to the ramp fails
  // here instead of silently desynchronising the two panels.
  function expectedColor(mid: number, start: number, span: number) {
    const frac = Math.max(0, Math.min(1, (mid - start) / span))
    const [r, g, b] = hslToRgb(frac * REFERENCE_RAMP_MAX_HUE, 0.7, 0.5)
    return packAbgr(
      Math.round(r * 255),
      Math.round(g * 255),
      Math.round(b * 255),
      255,
    )
  }

  test('paints a backbone segment the hue of its own midpoint', () => {
    const colors = colorsFor({ start: 0, end: 1000 })
    expect(colors['left+']).toBe(expectedColor(50, 0, 1000))
    expect(colors['right+']).toBe(expectedColor(950, 0, 1000))
  })

  // The ramp is the reference path's colouring, so an allele is taken off it
  // entirely: a hue here — even a pale one — says the allele IS the reference at
  // that position, which is the opposite of what it is.
  test('paints an allele off the ramp, in the flat alternative colour', () => {
    const colors = colorsFor({ start: 0, end: 1000 })
    expect(colors['alt+']).toBe(packAbgr(60, 65, 72, 255))
  })

  // Every allele the same colour, wherever it branches: the ramp is not what
  // distinguishes them, and a reader looking for one is reading position off a
  // node that has none.
  test('paints two alleles at different positions the same colour', () => {
    const colors = colorsFor({ start: 0, end: 1000 })
    expect(colors['alt+']).toBe(colors['alt2+'])
    expect(colors['alt+']).not.toBe(expectedColor(500, 0, 1000))
  })

  test('greys a node with no reference position at all', () => {
    expect(colorsFor({ start: 0, end: 1000 })['loose+']).toBe(
      packAbgr(160, 160, 160, 255),
    )
  })

  // A whole-file import states no region, so the ramp spans what it drew. The
  // two backbone segments then take the ends of the ramp rather than sitting in
  // the middle of a window nothing declared.
  test('falls back to the drawn extent with no region', () => {
    const colors = colorsFor()
    expect(colors['left+']).toBe(expectedColor(50, 50, 900))
    expect(colors['right+']).toBe(expectedColor(950, 50, 900))
  })
})
