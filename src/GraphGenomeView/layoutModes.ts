import { isBackbone, isOffReference } from './anchoredNodes'
import { anchoredLayout } from './layout/anchoredLayout'
import { sampleRowLayout } from './layout/sampleRowLayout'

import type { Graph, LayoutResult } from './types'

// The menu label for the Bandage force layout. This used to say it was shared
// with a docs figure-recipe generator that must not reach React, and nothing
// outside this file has imported it for some time, so the constant was carrying
// a reason that had stopped being true.
//
// What does read these labels is jbrowse-components' `website/scripts/
// check-menu-labels.ts`, which scans this `src/` for string literals and fails
// when a documented `**Track menu → …**` path names one this plugin no longer
// renders. That covers the three pangenome tutorials and the graph genome view
// guide, whose labels are otherwise unguarded: the plugin deploys from here, so
// a renamed dropdown changes every page walking a reader to it with no commit
// in that repo to attribute the drift to. It matches on literals rather than on
// this export, so keeping the label in a named constant is a readability choice
// now, not the mechanism.
export const FORCE_LAYOUT_LABEL = 'Force-directed layout'

// One table drives the persisted enum, the toolbar dropdown, and the dispatch in
// the model, so adding a layout is one entry rather than several edits that can
// disagree.
//
// `run` returning undefined means "this mode can't draw this graph" and hands
// off to the remote Bandage FMMM engine. 'auto' uses it when a GFA has no
// rank-0 backbone — neither declared in rGFA tags nor derivable from P/W lines
// (pathAnchoring.ts) — and 'force' is simply the mode that always takes it.
export interface LayoutMode {
  value: string
  label: string
  description: string
  // `region` is the interval the cut was made for, absent for a whole-file
  // import. The reference-anchored modes scale their rows and their allele
  // floor against it rather than against the backbone they were handed, which
  // a long-range allele's far anchor stretches well past the window
  // (referenceSpan).
  run: (
    graph: Graph,
    region?: { start: number; end: number },
  ) => LayoutResult | undefined
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
    description:
      'x is reference bp, one row per stable rank. Needs rGFA tags or a reference path.',
    run: anchoredLayout,
    available: graph => graph.nodes.some(isBackbone),
  },
  {
    value: 'samplerows',
    label: 'Sample rows',
    description:
      'x is reference bp, one row per contributing assembly. Needs rGFA tags or a reference path.',
    run: sampleRowLayout,
    available: graph =>
      graph.nodes.some(isBackbone) && graph.nodes.some(isOffReference),
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
  // a mode this one doesn't. It falls back to 'auto' rather than to the model's
  // own default of 'force', because 'auto' declines any graph it cannot draw and
  // hands off to force anyway, so this is the fallback that covers both.
  return LAYOUT_MODES.find(m => m.value === value) ?? LAYOUT_MODES[0]
}
