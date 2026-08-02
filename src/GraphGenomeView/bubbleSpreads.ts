import { PROPORTIONAL_LENGTH } from './layout/drawnScale'

import type { DrawnLengthLaw } from './layout/drawnScale'

// How far apart the force layout draws the two arms of a bubble, as the law
// turning a node's bp into its drawn length. One table drives the persisted
// enum, the dropdown and the value handed to the engine, the same way
// LAYOUT_MODES and COLOR_SCHEMES do.
//
// Why this needs to be a control rather than a better default: the drawn-length
// law is the one thing standing between a variation graph and a legible force
// layout, and compressing it costs the property that node length is proportional
// to bp. Bandage maps length linearly, which suits an assembly graph whose nodes
// are kb to Mb. In a pangenome an allele is 1-50 bp against a backbone segment
// of several kb, so on that map every alt clamps to the engine's 5-unit floor,
// both arms of a bubble land inside one node thickness of each other, and FMMM
// has nothing to spread — zoom-to-fit then delivers a single rope with the
// variation invisible inside it. Compressing the law opens the bubbles and
// flattens the length ratio, and which of those a reader wants depends on the
// figure, so the view asks rather than assumes.
//
// The compression is Bandage's own, taken off the axis upstream uses it on: it
// draws node *width* from depth as a power law against the mean, at power 0.5
// and effect 0.5, for the same reason. 'open' is those two numbers. See
// DrawnLengthLaw.
//
// Measured on an odgi extract of GRCh38#0#chrM:8,200-8,400 from HPRC release 2's
// chrM pggb graph (61 nodes, 84 edges, 234 haplotype paths), fitted to a 900x560
// pane: proportional is one squiggle with a single knot in it, and the bubbles
// come apart into legible lenses once the law compresses.
//
// This replaces a floor on a node's drawn length, which reached the small end
// but did it by raising a per-node minimum: that lifts a graph's non-branching
// chain nodes along with its alleles, so the drawing inflates with the node
// count and zoom-to-fit hands it back as a smaller picture. On the 521-node pggb
// cut in `pangenome/graph_resolution` the floor put the drawing at ~52,000 units
// and the fit at 1.4%, which is why that figure could only afford a spread on
// its 7-node half. A law stated against the mean leaves the drawing the size it
// already was, so both halves can take the same one.
//
// 'auto' is the proportional map, unchanged, so every existing figure and the
// `bandageAutoScale` length-proportionality test are untouched by this existing.
export const BUBBLE_SPREADS = [
  {
    value: 'auto',
    label: 'Proportional',
    description:
      "Bandage's own scale: a node draws proportional to its length, so a 1 bp allele is a speck.",
    law: PROPORTIONAL_LENGTH,
  },
  {
    value: 'open',
    label: 'Open bubbles',
    description:
      'Give every allele a drawn length, so a bubble reads as two arms rather than a knot.',
    law: { power: 0.5, effect: 0.5 },
  },
  {
    value: 'wide',
    label: 'Wide bubbles',
    description:
      'As open, spread further. Best on a window of a dozen bubbles.',
    law: { power: 0.5, effect: 0.25 },
  },
] as const

export type BubbleSpread = (typeof BUBBLE_SPREADS)[number]['value']

export const BUBBLE_SPREAD_VALUES = BUBBLE_SPREADS.map(s => s.value)

// The law behind a spread, resolved so the model has one place that knows how a
// spread becomes numbers. An unknown value draws proportionally rather than
// throwing, which is what a session persisted by a newer build degrades to.
export function lawFor(spread: string): DrawnLengthLaw {
  return (
    BUBBLE_SPREADS.find(s => s.value === spread)?.law ?? PROPORTIONAL_LENGTH
  )
}
