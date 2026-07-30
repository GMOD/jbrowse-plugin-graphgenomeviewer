import { readFileSync } from 'fs'
import { join } from 'path'

import { deletionEdges } from './deletionEdges'
import { convertGFAToGraph } from './gfa/gfaConverter'
import { parseGFA } from '../gfa-core/index'

function graphOf(gfa: string) {
  return convertGFAToGraph(parseGFA(gfa))
}

// Two backbone segments that abut, plus one that resumes 6,000 bp later: only
// the second link is a deletion, and it is worth exactly the gap.
const RGFA =
  'H\tVN:Z:1.0\n' +
  'S\t1\tACGTACGTAC\tSN:Z:GRCh38#0#chr6\tSO:i:1000\tSR:i:0\n' +
  'S\t2\tACGTACGTAC\tSN:Z:GRCh38#0#chr6\tSO:i:1010\tSR:i:0\n' +
  'S\t3\tACGTACGTAC\tSN:Z:GRCh38#0#chr6\tSO:i:7020\tSR:i:0\n' +
  'S\t4\tTTTT\tSN:Z:HG02717#1#chr6\tSO:i:9000\tSR:i:1\n' +
  'L\t1\t+\t2\t+\t0M\n' +
  'L\t2\t+\t3\t+\t0M\n' +
  'L\t2\t+\t4\t+\t0M\n' +
  'L\t4\t+\t3\t+\t0M\n'

test('a backbone link that skips reference is a deletion of the gap', () => {
  const found = deletionEdges(graphOf(RGFA))
  expect(found).toHaveLength(1)
  expect(found[0]).toMatchObject({
    refName: 'GRCh38#0#chr6',
    start: 1020,
    end: 7020,
    bp: 6000,
  })
})

test('adjacent backbone segments are not a deletion', () => {
  // 1 -> 2 abut exactly; a zero gap must not light up, or every link on the
  // backbone would draw as an event
  expect(deletionEdges(graphOf(RGFA)).map(d => d.bp)).not.toContain(0)
})

test('an allele detour is not a deletion, at either end', () => {
  // 2 -> 4 and 4 -> 3 both touch a rank-1 node, which has coordinates on
  // another assembly entirely: a gap computed across them would be meaningless
  const byId = new Map(graphOf(RGFA).nodes.map(n => [n.id, n]))
  const edges = graphOf(RGFA).edges
  for (const { edgeIndex } of deletionEdges(graphOf(RGFA))) {
    const e = edges[edgeIndex]!
    expect(byId.get(e.from)!.stable!.rank).toBe(0)
    expect(byId.get(e.to)!.stable!.rank).toBe(0)
  }
})

test('a link stated backwards still measures the gap forwards', () => {
  // `L 3 + 2 +` is the same edge as `L 2 + 3 +`; which endpoint is upstream has
  // to come from the coordinates, not from from/to
  const reversed = RGFA.replace('L\t2\t+\t3\t+\t0M', 'L\t3\t+\t2\t+\t0M')
  expect(deletionEdges(graphOf(reversed))[0]).toMatchObject({
    start: 1020,
    end: 7020,
    bp: 6000,
  })
})

test('an unanchored graph has no deletions rather than throwing', () => {
  const plain = 'H\tVN:Z:1.0\nS\t1\tACGT\nS\t2\tGGCC\nL\t1\t+\t2\t+\t0M\n'
  expect(deletionEdges(graphOf(plain))).toEqual([])
})

// The real four-strain minigraph slice, so the classification is exercised
// against a graph nobody wrote for this test.
test('finds deletions on the E. coli rGFA slice', () => {
  const gfa = readFileSync(
    join(__dirname, '../../test_data/ecoli_rgfa_slice.gfa'),
    'utf8',
  )
  const found = deletionEdges(graphOf(gfa))
  expect(found.length).toBeGreaterThan(0)
  for (const d of found) {
    expect(d.bp).toBeGreaterThan(0)
    expect(d.end).toBeGreaterThan(d.start)
  }
})
