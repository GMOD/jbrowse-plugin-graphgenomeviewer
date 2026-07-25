import { anchoredLayout } from './layout/anchoredLayout'
import { sampleRowLayout } from './layout/sampleRowLayout'

import type { Graph, LayoutResult } from './types'

// The menu label for the Bandage force layout, shared so the docs' figure recipe
// and the menu itself can't drift apart. Kept out of the components directory
// because the recipe generator runs in Node and must not reach React.
export const FORCE_LAYOUT_LABEL = 'Force-directed layout'

// One table drives the persisted enum, the toolbar dropdown, and the dispatch in
// the model, so adding a layout is one entry rather than several edits that can
// disagree.
//
// `run` returning undefined means "this mode can't draw this graph" and hands
// off to the remote Bandage FMMM engine. 'auto' uses it when a GFA declares no
// rank-0 backbone, and 'force' is simply the mode that always takes it.
export interface LayoutMode {
  value: string
  label: string
  description: string
  run: (graph: Graph) => LayoutResult | undefined
  // whether this mode can draw this graph at all; the dropdown greys out the
  // rest rather than hiding them, so the reason a mode is unavailable stays
  // visible instead of the menu silently changing shape between graphs
  available: (graph: Graph) => boolean
}

// `satisfies` rather than a `: LayoutMode[]` annotation: the annotation widened
// every `value` to string, which collapsed LayoutModeValue to string and left the
// persisted enum unable to state which values it accepts.
export const LAYOUT_MODES = [
  {
    value: 'auto',
    label: 'Anchored',
    description: 'x is reference bp, one row per stable rank. rGFA only.',
    run: anchoredLayout,
    available: graph => graph.nodes.some(n => n.stable?.rank === 0),
  },
  {
    value: 'samplerows',
    label: 'Sample rows',
    description:
      'x is reference bp, one row per contributing assembly. rGFA only.',
    run: sampleRowLayout,
    available: graph =>
      graph.nodes.some(n => n.stable?.rank === 0) &&
      graph.nodes.some(n => n.stable && n.stable.rank > 0),
  },
  {
    value: 'force',
    label: FORCE_LAYOUT_LABEL,
    description: 'OGDF FMMM, via the external Bandage engine.',
    run: () => undefined,
    available: () => true,
  },
] as const satisfies readonly LayoutMode[]

export type LayoutModeValue = (typeof LAYOUT_MODES)[number]['value']

export const LAYOUT_MODE_VALUES = LAYOUT_MODES.map(m => m.value)

export function layoutModeByValue(value: string) {
  // An unknown value can only come from a snapshot written by a build that had
  // a mode this one doesn't; falling back to the default beats failing to draw
  return LAYOUT_MODES.find(m => m.value === value) ?? LAYOUT_MODES[0]
}
