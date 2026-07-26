import { hoverInRegion, nodeForLgvHover, readLgvHover } from './lgvHover'

import type { GraphNode } from '../GraphGenomeView/types'

// The shape LinearGenomeViewContainer writes on mousemove.
function lgvHovered(coord: number, featureName?: string) {
  return {
    hoverPosition: { refName: 'chr1', coord },
    hoverFeature: featureName
      ? { get: (key: string) => (key === 'name' ? featureName : undefined) }
      : undefined,
  }
}

const NODES: GraphNode[] = [
  {
    id: 'v1+',
    name: 'v1',
    length: 5,
    depth: 1,
    stable: { refName: 'chr1', start: 0, rank: 0 },
  },
  {
    id: 'v2+',
    name: 'v2',
    length: 3,
    depth: 1,
    stable: { refName: 'chr1', start: 5, rank: 0 },
  },
  {
    id: 'alt+',
    name: 'alt',
    length: 2,
    depth: 1,
    stable: { refName: 'foo', start: 8, rank: 1 },
  },
]

test('reads the position and the feature name off the hover', () => {
  expect(readLgvHover(lgvHovered(42, 'v2'))).toEqual({
    refName: 'chr1',
    coord: 42,
    featureName: 'v2',
  })
})

test('a hover with no feature under it still yields the position', () => {
  expect(readLgvHover(lgvHovered(42))).toEqual({
    refName: 'chr1',
    coord: 42,
    featureName: undefined,
  })
})

// `session.hovered` is a shared channel every view writes its own shape to, so
// anything that isn't an LGV hover has to read as absent rather than throw.
test.each([
  ['nothing hovered', undefined],
  ['a foreign shape', { somethingElse: true }],
  ['a hover with no position', { hoverPosition: undefined }],
  ['a position missing its coord', { hoverPosition: { refName: 'chr1' } }],
  ['a position missing its refName', { hoverPosition: { coord: 5 } }],
])('%s reads as no hover', (_label, hovered) => {
  expect(readLgvHover(hovered)).toBeUndefined()
})

test('the region gate accepts its own refName and span, inclusive', () => {
  const region = { refName: 'chr1', start: 100, end: 200 }
  expect(hoverInRegion({ refName: 'chr1', coord: 100 }, region)).toBe(true)
  expect(hoverInRegion({ refName: 'chr1', coord: 200 }, region)).toBe(true)
  expect(hoverInRegion({ refName: 'chr1', coord: 201 }, region)).toBe(false)
  expect(hoverInRegion({ refName: 'chr2', coord: 150 }, region)).toBe(false)
})

// The feature name is the bare segment id; the node id carries a strand suffix,
// so the match is on name and the answer is the id.
test('a hovered segment feature resolves to its node id', () => {
  expect(
    nodeForLgvHover({
      hover: { refName: 'chr1', coord: 6, featureName: 'v2' },
      nodes: NODES,
    }),
  ).toBe('v2+')
})

// Hovering a gene or bubble track gives only a coordinate, which still names the
// backbone segment covering it.
test('a hover with no matching feature falls back to the covering segment', () => {
  expect(
    nodeForLgvHover({
      hover: { refName: 'chr1', coord: 6, featureName: 'HLA-DRB5' },
      nodes: NODES,
    }),
  ).toBe('v2+')
  expect(
    nodeForLgvHover({ hover: { refName: 'chr1', coord: 0 }, nodes: NODES }),
  ).toBe('v1+')
})

// An exact segment match wins even when the coordinate sits inside a different
// segment — the feature under the cursor is the better evidence.
test('the feature match beats the coordinate', () => {
  expect(
    nodeForLgvHover({
      hover: { refName: 'chr1', coord: 6, featureName: 'v1' },
      nodes: NODES,
    }),
  ).toBe('v1+')
})

// Off-reference segments are not candidates: their offsets are on another stable
// sequence, so a reference coordinate cannot land in them.
test('only backbone segments answer a coordinate lookup', () => {
  expect(
    nodeForLgvHover({ hover: { refName: 'chr1', coord: 8 }, nodes: NODES }),
  ).toBeNull()
})

test('a coordinate past the graph resolves to nothing', () => {
  expect(
    nodeForLgvHover({ hover: { refName: 'chr1', coord: 9999 }, nodes: NODES }),
  ).toBeNull()
})
