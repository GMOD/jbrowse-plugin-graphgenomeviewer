import { walkHighlight } from './walkHighlight'
import { parseGFA } from '../gfa-core/index'
import { convertGFAToGraph } from './gfa/gfaConverter'
import { anchorGraph } from './pathAnchoring'

// ref walks v1 v2 v3; alt walks v1 a1 v3, taking a1 in place of v2. The a1->v3
// link is written the other way round in the file, so the walk's step has to
// find it against the edge's direction.
const GFA = `S\tv1\tAAAA
S\tv2\tCC
S\tv3\tGGG
S\ta1\tTTTTTT
L\tv1\t+\tv2\t+\t0M
L\tv2\t+\tv3\t+\t0M
L\tv1\t+\ta1\t+\t0M
L\tv3\t-\ta1\t-\t0M
W\tref\t0\tchr\t0\t9\t>v1>v2>v3
W\talt\t1\tchr\t0\t13\t>v1>a1>v3`

const graph = anchorGraph(convertGFAToGraph(parseGFA(GFA)), 'ref')

test('a walk lifts its nodes, its links either way round, and its bp', () => {
  const h = walkHighlight(graph, 'alt#1#chr')!
  expect([...h.nodeIds]).toEqual(['v1+', 'a1+', 'v3+'])
  expect([...h.edgeIndexes].sort()).toEqual([2, 3])
  expect(h).toMatchObject({ steps: 3, bp: 13, referenceBp: 9 })
})

test('the reference walk compares to nothing, and a stranger is undefined', () => {
  expect(walkHighlight(graph, 'ref#0#chr')!.referenceBp).toBeUndefined()
  expect(walkHighlight(graph, 'nobody')).toBeUndefined()
})
