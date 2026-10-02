# Handoff: walk rows under the graph

Worktree: `.claude/worktrees/walk-strip` in this repo. Plan with its Opus review
folded in: see "Design" below; the full plan was `plan-strip.md` in the session
scratchpad.

## Done on this branch

- **Core** (`fdb6f50`, committed):
  - `layout/walkStrip.ts`: `stripMarks` turns `graph.pathVisits` into ticks
    through `row.axis`, one tick per pass. `segmentAt` returns the longest node
    within half a pixel of a bar point. `walkStripFrame` sizes rows to fit every
    haplotype (20 px down to 3 px) and drops labels and readouts below 12 px.
    Also `stripRowAt` and `walkMarksTree`.
  - `walkRowsTree` takes `rowPx`, `barPx` and `readouts` in its frame, and
    merges sub-pixel runs (`coalesceRuns`).
  - Measured on the HPRC AMY1 cut (14.5k nodes, 10 rows): runs drop from 2,175
    to 1,265, building the tree takes 11 ms, ticks and hover cost about 5 µs per
    node, and all 96,266 ticks round-trip to their node.
- **Plugin**:
  - Model: a `walkStrip` view prop, plus the views `walkStripShown`,
    `walkStripRows` (graph region with the sample filter, no repeat pick),
    `walkStripFrame`, `walkStripMarks`, `walkStripLocator` and `cutsWholeWalks`.
  - `setStripHover` sets `hoveredNode` through `segmentAt`. A Layout menu
    checkbox reads "Walk rows under the graph".
  - `viewModel.ts` cuts whole walks (`snarls: 'overlapping'`) while the strip is
    on, and re-cuts when the strip is toggled.
  - Components: `WalkStrip.tsx` (bars memoized, ticks as their own layer, labels
    or a hover readout, click to `toggleWalk`, right-click into a linear view),
    `WalkStripLocator.tsx` (a ring around the lit node), and
    `WalkRowContextMenu.tsx`, split out of GraphCanvas with a `bars` prop.
  - Unit tests: 1,041 pass, including two new model tests for the strip.
- **Checked in real JBrowse** against the hosted HPRC config, with the plugin
  served from this worktree's `dist/` by a Playwright route on the hosted
  `latest/` URL:
  - Hovering a bar rings the node in the force drawing and ticks each bar.
  - The bars share the reference-position ramp with the nodes.
  - Clicking a bar lifts its walk.

## Open

1. The e2e suites run from a worktree only with
   `JBROWSE_TEST_DIR=<primary checkout>/.test-jbrowse-beta9`, since the served
   JBrowse and its fixtures live there; without it the fixture suites skip.
   `walkStrip.test.ts` once failed because it hovered before the force layout
   landed, leaving no node position to ring.
2. Release as 4.3.0 (`pnpm version minor`; 4.2.0 went out with the
   `sampleCount` rename) once CI is green and the user agrees.
3. **BandageJS port** after 4.3.0: a strip overlaying the bottom of the pane,
   since its `flex: 1` pane plus a ResizeObserver refits; DOM from the core
   trees; hover feeds `state.hoveredNode`; a click selects the row and toggles
   its lift.
4. **Later:** gene boxes in the strip, SVG export of the strip, strip in
   LinearGraphDisplay, and a walk-lift colour on the lifted bar.

## Elsewhere, still pending

- **jbrowse-components** worktree `.claude/worktrees/walk-rows-wording`: two
  commits with the HPRC tutorial wording ("on / off GRCh38's path", count the
  genes on bars, span can mislead). Land them together with re-shot
  `hprc_amylase_walk_rows` and `graph_kiv2_walk_rows` once the hosted
  `jbrowse.org/plugins/…/latest/` serves 4.1.1. That copy updates through
  jbrowse-plugin-list's nightly deploy PR and its upload. jbrowse-components
  main was red from someone else's stale `user_guide.md` (run `pnpm autogen`).
