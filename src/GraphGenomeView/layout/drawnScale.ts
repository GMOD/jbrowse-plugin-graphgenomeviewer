import type { Graph } from '../types'

export interface BandageScaleOpts {
  nodeLengthPerMegabase: number
  minimumNodeLength: number
  nodeSegmentLength: number
  edgeLength: number
}

// Node drawn length, in FMMM units, as a function of bp. Used both by the layouts
// that run here and by the options handed to the WASM engine, so a graph is drawn
// at the same scale whichever one draws it. Bandage's own auto rule
// (`AssemblyGraph::determineGraphInfo`):
// pick units-per-megabase so the *mean* drawn node length lands on 40, with a
// floor on total drawn length so a small graph doesn't collapse to a speck.
//
// This has to be derived per graph, not fixed. The scale that suits a bacterial
// assembly's 10-100 kb contigs is wrong by orders of magnitude for a minigraph
// pangenome window, whose nodes run 300 bp to a few kb: a fixed 1000 units/Mbp
// makes every node shorter than the edges between them and the graph reads as
// beads on a string, while 1 unit/bp makes each node a long sweeping curve and
// the graph sprawls. For the 53-node E. coli window this lands near 35,000.
//
// It matters most at the small end. The WASM wrapper's own default of 1000
// units/Mbp puts *every* node in a 400 bp pggb window below minimumNodeLength,
// so all 31 clamp to the floor and a 1 bp SNP allele draws the same size as the
// 164 bp backbone segment beside it — which is what made that figure read as a
// chain of same-sized two-node bubbles. Bandage draws the same file with a 75:1
// length ratio, the SNP alleles as specks.
//
// The remaining three are upstream Bandage's shipped defaults
// (`program/settings.cpp`), which the WASM wrapper's own header does not match —
// it defaults all of them to 1.0, so they have to be passed explicitly.
const MEAN_NODE_LENGTH = 40
const MIN_TOTAL_GRAPH_LENGTH = 500

// Bandage's own floor on a node's drawn length. Right for an assembly graph,
// whose nodes are kb to Mb, and the reason a variation graph draws as a rope:
// see BUBBLE_SPREADS, which is how a view asks for more.
const BANDAGE_MINIMUM_NODE_LENGTH = 5

export function bandageAutoScale(
  graph: Graph,
  // Floor on a node's drawn length, in the same FMMM units as the scale below.
  // Anything at or under Bandage's own floor leaves the drawing exactly as it
  // was, which is what keeps `'auto'` byte-identical to the shipped behaviour.
  minNodeLength = BANDAGE_MINIMUM_NODE_LENGTH,
): BandageScaleOpts {
  const totalLength = graph.nodes.reduce((sum, n) => sum + n.length, 0)
  const megabases = totalLength / 1_000_000
  const target = Math.max(
    graph.nodes.length * MEAN_NODE_LENGTH,
    MIN_TOTAL_GRAPH_LENGTH,
  )
  return {
    nodeLengthPerMegabase: megabases > 0 ? target / megabases : 10_000,
    minimumNodeLength: Math.max(BANDAGE_MINIMUM_NODE_LENGTH, minNodeLength),
    edgeLength: 5,
    nodeSegmentLength: 20,
  }
}

// The mean drawn node length `bandageAutoScale` targets, exported so
// BUBBLE_SPREADS can state its floors as multiples of it rather than as
// unanchored constants.
export { MEAN_NODE_LENGTH }
