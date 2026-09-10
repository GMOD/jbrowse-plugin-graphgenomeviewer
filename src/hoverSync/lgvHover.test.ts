import { hoverInRegion, nodeForLgvHover, readLgvHover } from './lgvHover'

import type { GraphNode } from '../GraphGenomeView/types'

// The shape LinearGenomeViewContainer writes on mousemove: `hoverPosition` is a
// PxToBpResult, i.e. the displayed region the pointer landed in spread flat, so
// it carries that region's assemblyName.
function lgvHovered(coord: number, featureName?: string, assemblyName = 'K12') {
  return {
    hoverPosition: { refName: 'chr1', coord, assemblyName },
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
    assemblyName: 'K12',
    featureName: 'v2',
  })
})

test('a hover with no feature under it still yields the position', () => {
  expect(readLgvHover(lgvHovered(42))).toEqual({
    refName: 'chr1',
    coord: 42,
    assemblyName: 'K12',
    featureName: undefined,
  })
})

// Nothing else in the payload identifies the source, so an older LGV — or
// anything hand-writing the channel — that states no assembly has to read as a
// hover rather than as no hover. `hoverInRegion` takes it at its word.
test('a position with no assembly still yields the hover', () => {
  expect(
    readLgvHover({ hoverPosition: { refName: 'chr1', coord: 42 } }),
  ).toEqual({
    refName: 'chr1',
    coord: 42,
    assemblyName: undefined,
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

const REGION = {
  refName: 'chr1',
  assemblyName: 'K12',
  start: 100,
  end: 200,
}

test('the region gate accepts its own refName and span, inclusive', () => {
  const hover = (coord: number, refName = 'chr1') => ({
    refName,
    coord,
    assemblyName: 'K12',
  })
  expect(hoverInRegion(hover(100), REGION)).toBe(true)
  expect(hoverInRegion(hover(200), REGION)).toBe(true)
  expect(hoverInRegion(hover(201), REGION)).toBe(false)
  expect(hoverInRegion(hover(150, 'chr2'), REGION)).toBe(false)
})

// The case refName cannot separate, and it is the ordinary one rather than a
// corner: a PanSN name reduces to a bare contig, so the E. coli pangenome's
// five strains are five assemblies each holding one refName `chr`. A synteny
// stack of them puts a row of each on screen, and every row's hover answers to
// `chr` at coordinates of its own.
test('a hover on another assembly is refused, however well the refName matches', () => {
  const onSakai = { refName: 'chr1', coord: 150, assemblyName: 'Sakai' }
  expect(hoverInRegion(onSakai, REGION)).toBe(false)
  expect(hoverInRegion({ ...onSakai, assemblyName: 'K12' }, REGION)).toBe(true)
})

test('a hover that states no assembly is taken at its word', () => {
  expect(hoverInRegion({ refName: 'chr1', coord: 150 }, REGION)).toBe(true)
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
