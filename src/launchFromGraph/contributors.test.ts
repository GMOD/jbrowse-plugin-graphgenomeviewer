import { expect, test } from 'vitest'

import {
  contributingAssemblies,
  locString,
  nodeOwnLocation,
  resolveContributors,
} from './contributors'

import type { Graph, GraphNode } from '../GraphGenomeView/types'

function node(
  id: string,
  refName: string,
  start: number,
  length: number,
  rank: number,
): GraphNode {
  return {
    id,
    name: id,
    length,
    depth: 1,
    stable: { refName, start, rank },
  }
}

function graph(nodes: GraphNode[]): Graph {
  return { name: 'test', nodes, edges: [] }
}

test('a node states its own assembly and coordinates', () => {
  expect(nodeOwnLocation(node('s1', 'CFT073#1#chr', 1044024, 226, 2))).toEqual({
    sample: 'CFT073',
    refName: 'chr',
    start: 1044024,
    end: 1044250,
  })
})

// A plain-GFA segment has no SN/SO at all, so it belongs to no assembly. The
// launch has nothing to offer for it, which is different from offering the
// reference by default.
test('an unanchored node has no location', () => {
  expect(
    nodeOwnLocation({ id: 's1', name: 's1', length: 10, depth: 1 }),
  ).toBeUndefined()
})

test('contributors are the assemblies named on the segments, reference first', () => {
  const contributors = contributingAssemblies(
    graph([
      node('s1', 'K12#1#chr', 1000, 500, 0),
      node('s2', 'K12#1#chr', 2000, 500, 0),
      node('s3', 'Sakai#1#chr', 90000, 300, 1),
      node('s4', 'CFT073#1#chr', 5000, 100, 2),
    ]),
  )
  expect(contributors.map(c => c.sample)).toEqual(['K12', 'Sakai', 'CFT073'])
  expect(contributors[0]).toEqual({
    sample: 'K12',
    refName: 'chr',
    start: 1000,
    end: 2500,
    rank: 0,
    nodeCount: 2,
  })
})

// A sample contributing sequence from a distant duplication would otherwise
// yield a locus spanning both, and a linear view opened on it shows neither.
test('a distant second locus does not widen a contributor to cover both', () => {
  const [sakai] = contributingAssemblies(
    graph([
      node('s1', 'K12#1#chr', 0, 10000, 0),
      node('s2', 'Sakai#1#chr', 50000, 400, 1),
      node('s3', 'Sakai#1#chr', 50600, 400, 1),
      node('s4', 'Sakai#1#chr', 3000000, 100, 1),
    ]),
    { maxGap: 10000 },
  ).filter(c => c.sample === 'Sakai')
  expect(sakai).toEqual({
    sample: 'Sakai',
    refName: 'chr',
    start: 50000,
    end: 51000,
    rank: 1,
    nodeCount: 3,
  })
})

// The HPRC case: hundreds of contributing haplotypes, one loaded assembly. Only
// the reference can be opened, and that is the honest answer rather than a menu
// full of items that would fail.
test('only contributors naming a loaded assembly are openable', () => {
  const contributors = contributingAssemblies(
    graph([
      node('s1', 'GRCh38#0#chr6', 31000000, 5000, 0),
      node('s2', 'HG02717#1#chr6', 12000, 300, 1),
      node('s3', 'HG00438#2#chr6', 900000, 300, 1),
    ]),
  )
  expect(contributors).toHaveLength(3)
  expect(resolveContributors(contributors, ['hg38', 'GRCh38#0#chr6'])).toEqual(
    [],
  )
  expect(
    resolveContributors(contributors, ['GRCh38', 'hg38']).map(c => c.sample),
  ).toEqual(['GRCh38'])
})

test('a locstring is 1-based inclusive', () => {
  expect(
    locString({ sample: 'K12', refName: 'chr', start: 0, end: 100 }),
  ).toBe('chr:1-100')
})
