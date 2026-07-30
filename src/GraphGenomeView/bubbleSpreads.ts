import { MEAN_NODE_LENGTH } from './layout/drawnScale'

// How far apart the force layout draws the two arms of a bubble, as a floor on
// any node's drawn length. One table drives the persisted enum, the dropdown and
// the value handed to the engine, the same way LAYOUT_MODES and COLOR_SCHEMES do.
//
// Why this needs to be a control rather than a better default: the floor is the
// one thing standing between a variation graph and a legible force layout, and
// raising it costs the property that node length is proportional to bp. Bandage
// ships 5 units, which suits an assembly graph whose nodes are kb to Mb. In a
// pangenome an allele is 1-50 bp, so every alt clamps to a 5-unit stub, both arms
// of a bubble land inside one node thickness of each other, and FMMM has nothing
// to spread — zoom-to-fit then delivers a single rope with the variation
// invisible inside it. Raising the floor opens the bubbles and flattens the
// length ratio among the smallest nodes, and which of those a reader wants
// depends on the figure, so the view asks rather than assumes.
//
// Measured on an odgi extract of GRCh38#0#chrM:8,200-8,400 from HPRC release 2's
// chrM pggb graph (61 nodes, 84 edges, 234 haplotype paths), each layout fitted
// to a 900x560 pane: at Bandage's 5 the window is one squiggle with a single knot
// in it; at 2.5x the mean every bubble is a legible lens; at 10x clearer still;
// at 25x the drawing only grows (1,980 -> 3,386 -> 7,452 -> 26,617 units wide,
// aspect ratio flat at ~1.33 throughout). So 2.5x is the knee and 10x the
// comfortable read, and past that there is nothing to buy.
//
// 'auto' is Bandage's own floor, unchanged, so every existing figure and the
// `bandageAutoScale` length-proportionality test are untouched by this existing.
export const BUBBLE_SPREADS = [
  {
    value: 'auto',
    label: 'Proportional',
    description:
      "Bandage's own scale: a node draws proportional to its length, so a 1 bp allele is a speck.",
    factor: 0,
  },
  {
    value: 'open',
    label: 'Open bubbles',
    description:
      'Give every allele a drawn length, so a bubble reads as two arms rather than a knot.',
    factor: 2.5,
  },
  {
    value: 'wide',
    label: 'Wide bubbles',
    description:
      'As open, spread further. Best on a window of a dozen bubbles.',
    factor: 10,
  },
] as const

export type BubbleSpread = (typeof BUBBLE_SPREADS)[number]['value']

export const BUBBLE_SPREAD_VALUES = BUBBLE_SPREADS.map(s => s.value)

// The floor in FMMM units, resolved so the model has one place that knows how a
// spread becomes a number and `bandageAutoScale` keeps taking plain units.
export function minNodeLengthFor(spread: string) {
  const entry = BUBBLE_SPREADS.find(s => s.value === spread)
  return (entry?.factor ?? 0) * MEAN_NODE_LENGTH
}
