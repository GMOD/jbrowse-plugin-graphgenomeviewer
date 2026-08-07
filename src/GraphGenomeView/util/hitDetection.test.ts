import {
  distanceToCubicBezier,
  distanceToSegment,
  findHoveredEdge,
  findHoveredNode,
} from './hitDetection'

import type { Graph } from '../types'

describe('distanceToSegment', () => {
  test('point on the segment', () => {
    expect(distanceToSegment(5, 0, 0, 0, 10, 0)).toBeCloseTo(0)
  })

  test('point perpendicular to segment midpoint', () => {
    expect(distanceToSegment(5, 3, 0, 0, 10, 0)).toBeCloseTo(3)
  })

  test('point closest to segment start', () => {
    expect(distanceToSegment(-1, 0, 0, 0, 10, 0)).toBeCloseTo(1)
  })

  test('point closest to segment end', () => {
    expect(distanceToSegment(11, 0, 0, 0, 10, 0)).toBeCloseTo(1)
  })

  test('zero-length segment (point)', () => {
    expect(distanceToSegment(3, 4, 0, 0, 0, 0)).toBeCloseTo(5)
  })
})

describe('distanceToCubicBezier', () => {
  test('straight-line bezier at midpoint', () => {
    // control points on the line = straight bezier
    const dist = distanceToCubicBezier(5, 1, 0, 0, 3.3, 0, 6.6, 0, 10, 0)
    expect(dist).toBeLessThan(1.5)
  })

  test('point far from bezier', () => {
    const dist = distanceToCubicBezier(100, 100, 0, 0, 3, 0, 7, 0, 10, 0)
    expect(dist).toBeGreaterThan(100)
  })
})

describe('findHoveredNode', () => {
  const nodePositions = {
    'A+': [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ],
    'B+': [
      { x: 20, y: 20 },
      { x: 30, y: 20 },
    ],
  }

  test('finds node when cursor is on segment', () => {
    expect(findHoveredNode(nodePositions, 5, 0, 1)).toBe('A+')
  })

  test('finds node when cursor is near segment', () => {
    expect(findHoveredNode(nodePositions, 5, 3, 1)).toBe('A+')
  })

  test('returns null when cursor is far from nodes', () => {
    expect(findHoveredNode(nodePositions, 50, 50, 1)).toBeNull()
  })

  test('respects scale for threshold', () => {
    // At scale 10, threshold is 5/10 = 0.5, so a point 3 units away should miss
    expect(findHoveredNode(nodePositions, 5, 3, 10)).toBeNull()
  })
})

describe('findHoveredEdge', () => {
  // Horizontal A→B edge so the path-offset perpendicular is purely vertical;
  // each of 3 paths occupies a lane at y ≈ -3, 0, +3 (offsetDist = 3).
  const nodePositions = {
    'A+': [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
    ],
    'B+': [
      { x: 150, y: 0 },
      { x: 200, y: 0 },
    ],
  }
  const graph: Graph = {
    name: 't',
    nodes: [
      { id: 'A+', name: 'A', length: 50, depth: 1 },
      { id: 'B+', name: 'B', length: 50, depth: 1 },
    ],
    edges: [{ from: 'A+', to: 'B+', pathIds: ['p1', 'p2', 'p3'] }],
  }

  test('hits edge on center lane', () => {
    expect(findHoveredEdge(nodePositions, graph, 100, 0, 1, true)).toBe(0)
  })

  test('hits edge on offset path lane', () => {
    // Outer lane sits ~3 units off center; 10/scale threshold easily covers it.
    expect(findHoveredEdge(nodePositions, graph, 100, 3, 1, true)).toBe(0)
  })

  test('misses when far from all lanes', () => {
    expect(findHoveredEdge(nodePositions, graph, 100, 200, 1, true)).toBeNull()
  })

  test('drawPaths=false still hits on centerline', () => {
    expect(findHoveredEdge(nodePositions, graph, 100, 0, 1, false)).toBe(0)
  })

  // A deletion is drawn bowed off its chord, and the tutorial tells the reader to
  // hover it for the interval and the bp it removes. Hit detection built its
  // curves without the bow, so the shape on screen was not hoverable and the
  // empty space along the chord was.
  describe('a bowed deletion arc', () => {
    // bulge = DELETION_BULGE_FRACTION * the bypassed node's drawn length
    const bypassing = new Map([[0, ['mid']]])
    const withBypassed = {
      ...nodePositions,
      mid: [
        { x: 50, y: 0 },
        { x: 150, y: 0 },
      ],
    }
    const at = (x: number, y: number, deletions?: Map<number, string[]>) =>
      findHoveredEdge(withBypassed, graph, x, y, 1, false, 0, deletions)

    test('is hoverable where it is drawn', () => {
      // 0.35 * 100 = 35 of bulge, so the curve's own midpoint is near y = 26
      expect(at(100, 26, bypassing)).toBe(0)
    })

    test('and the chord it is not drawn on is not', () => {
      expect(at(100, 26)).toBeNull()
    })
  })
})

// The hover threshold is 5 screen px converted to world units, so zoomed out it
// spans several nodes at once. Returning the first candidate inside it meant the
// grid's visit order decided the answer: the cursor sat on one node and a
// neighbour lit up.
test('picks the nearest node when several are inside the threshold', () => {
  const positions = {
    'near+': [
      { x: 1000, y: 0 },
      { x: 1100, y: 0 },
    ],
    'far+': [
      { x: 500, y: 0 },
      { x: 600, y: 0 },
    ],
  }
  // scale 0.008 -> a 625 unit threshold, wide enough to reach both
  expect(findHoveredNode(positions, 1050, 0, 0.008)).toBe('near+')
  expect(findHoveredNode(positions, 550, 0, 0.008)).toBe('far+')
})

// On a row layout x is reference bp and y is screen px, and the hover slack is
// screen px over the x scale — 500 bp at a 100 kb window. Fed straight into a
// hypot over both axes that slack is also 500 ROWS, so every row within the
// cursor's x band answered the hover and the nearest of them won: the cursor sat
// on one haplotype and the drawing lit up another. `yToX` is what makes the two
// comparable, and 5 px is 5 px on either axis once it is applied.
describe('hover on a row layout', () => {
  const ROWS = {
    top: [
      { x: 0, y: 0 },
      { x: 100_000, y: 0 },
    ],
    next: [
      { x: 0, y: 20 },
      { x: 100_000, y: 20 },
    ],
  }
  // 100 kb over ~1000 px, and rows already in px
  const scaleX = 0.01
  const yToX = 1 / scaleX

  test('a cursor on a row hits that row', () => {
    expect(findHoveredNode(ROWS, 50_000, 2, scaleX, 0, yToX)).toBe('top')
    expect(findHoveredNode(ROWS, 50_000, 18, scaleX, 0, yToX)).toBe('next')
  })

  test('a cursor between the rows hits neither', () => {
    expect(findHoveredNode(ROWS, 50_000, 10, scaleX, 0, yToX)).toBeNull()
  })

  test('the slack is still screen px along x', () => {
    // 300 bp past the end is 3 px at this scale, and inside the 5 px slack
    expect(findHoveredNode(ROWS, 100_300, 0, scaleX, 0, yToX)).toBe('top')
    expect(findHoveredNode(ROWS, 101_000, 0, scaleX, 0, yToX)).toBeNull()
  })
})
