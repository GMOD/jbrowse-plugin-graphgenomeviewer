import { describe, expect, it } from 'vitest'

import { bubbleSubgraph } from './popBubble'

import type { Graph } from '../types'

const graph: Graph = {
  name: 'g',
  nodes: ['s1', 's2', 's3', 's4'].map((name, i) => ({
    id: `${name}+`,
    name,
    length: 10,
    depth: 1,
    stable: { refName: 'chr', start: i * 10, rank: i === 2 ? 1 : 0 },
  })),
  edges: [
    { from: 's1+', to: 's2+' },
    { from: 's2+', to: 's3+' },
    { from: 's3+', to: 's4+' },
    { from: 's2+', to: 's4+' },
  ],
  anchoredBy: 'tags',
}

describe('bubbleSubgraph', () => {
  it('keeps the named segments and the links among them', () => {
    const sub = bubbleSubgraph(graph, ['s2', 's3', 's4'])
    expect(sub.nodes.map(n => n.name)).toEqual(['s2', 's3', 's4'])
    expect(sub.edges).toEqual([
      { from: 's2+', to: 's3+' },
      { from: 's3+', to: 's4+' },
      { from: 's2+', to: 's4+' },
    ])
    expect(sub.anchoredBy).toBe('tags')
  })
})
