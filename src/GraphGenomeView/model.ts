import { readConfObject } from '@jbrowse/core/configuration'
import { BaseViewModel } from '@jbrowse/core/pluggableElementTypes/models'
import { pushLaunchViewMenuItem } from '@jbrowse/core/ui'
import { getSession, isSessionModelWithWidgets } from '@jbrowse/core/util'
import { openLocation } from '@jbrowse/core/util/io'
import { addDisposer, flow, isAlive, types } from '@jbrowse/mobx-state-tree'
import { RenderLifecycleMixin } from '@jbrowse/render-core/RenderLifecycleMixin'
import { autorun, reaction, untracked } from 'mobx'

import { backboneNodes, backboneSpan } from './anchoredNodes'
import { BUBBLE_SPREAD_VALUES, spreadFor } from './bubbleSpreads'
import { COLOR_SCHEME_VALUES } from './colorSchemes'
import { deletionEdges } from './deletionEdges'
import { parseGFA } from '../gfa-core/index'
import { convertGFAToGraph } from './gfa/gfaConverter'
import { layoutScaling } from './layout/drawnScale'
import {
  LAYOUT_MODE_VALUES,
  layoutModeByValue,
  modeUsesLayoutEngine,
} from './layoutModes'
import { anchorFromPaths, anchorGraph } from './pathAnchoring'
import { pathColorsLegible, pathLegend } from './pathColors'
import { buildNeighbors, nodeReferenceSpan } from './referenceSpan'
import {
  brightenColors,
  buildGeometry,
  computeReferenceRamp,
  extractColorSlice,
} from './renderer/GeometryBuilder'
import {
  hoverInRegion,
  nodeForLgvHover,
  readLgvHover,
} from '../hoverSync/lgvHover'
import {
  contributingAssemblies,
  nodeOwnLocation,
  resolveContributors,
} from '../launchFromGraph/contributors'
import { graphLaunchMenuItems } from '../launchFromGraph/graphMenuItems'
import {
  highlightInLinearView,
  launchSyntenyView,
  paddedLocation,
  showInLinearView,
  withReferenceRegion,
} from '../launchFromGraph/launchFromGraph'
import { launchTracks } from '../launchFromGraph/launchTracks'
import { linearViewTarget } from '../launchFromGraph/linearViewTarget'
import { launchableSyntenyTracks } from '../launchFromGraph/syntenyTracks'

import type { BubbleSpread } from './bubbleSpreads'
import type { ColorScheme, ResolvedColorScheme } from './colorSchemes'
import type { LayoutScaling } from './layout/drawnScale'
import type { LayoutModeValue } from './layoutModes'
import type {
  RenderBatch,
  Renderer,
  SubBatchKey,
  VertexRange,
} from './renderer/types'
import type { Graph, GraphNode, LayoutResult } from './types'
import type { AxisScale } from './util/geometry'
import type { GraphLocation } from '../launchFromGraph/contributors'
import type { MenuItem } from '@jbrowse/core/ui'
import type { AbstractSessionModel } from '@jbrowse/core/util'
import type { FileLocation } from '@jbrowse/core/util/types'

// Ceiling on the pane, and what it falls back to before there is a layout to
// size against. A roughly square drawing (FMMM) hits this and keeps the
// scrollable pane it has always had.
const MAX_CANVAS_HEIGHT = 600
// Floor, so a window holding only backbone — one row, no height at all — still
// leaves room to hover a node and read its tooltip.
const MIN_CANVAS_HEIGHT = 160
// Gap between the drawing and the edge of the pane, on all four sides.
const FIT_PADDING = 40
const HOVER_BRIGHTEN = 1.4
const SELECT_BRIGHTEN = 1.6
const VIEWPORT_DEBOUNCE_MS = 150

// Hard size cap for the single-mode graph view. Past it the view declines with a
// "zoom in" message rather than switching to a degraded rendering mode — one mode
// only, since the large-region case is a linear synteny view, not a graph.
// (The `adr-027` citation this used to carry was stale: that number was reused
// for wheel-input semantics after the large-mode ADR was removed in 9d8102f0b5.)
//
// This bounds the *fetch*, and it is the only cap that can be applied before one
// happens. It is a poor proxy for cost, because cost tracks node count, so the
// number is chosen against the density of the graphs it can actually guard: a
// region is only ever fetched through `getSubgraph`, which only RgfaTabixAdapter
// implements, so every graph reaching this check is an rGFA. Both measured rGFAs
// are sparse, and at 5 Mb both land at or under the ~2k nodes that redraw in
// under 10 ms (see agent-docs/GRAPH_SCALE_AND_LOD.md):
//
//   HPRC MC GRCh38   ~7,000 bp/segment   whole 4.9 Mb MHC   1,173 nodes
//   ecoli minigraph   3,078 bp/segment   whole 4.6 Mb genome 2,415 nodes
//
// Fetch cost does not scale with the window either: against the hosted HPRC
// index a 4.9 Mb links query and a 100 kb one both cost ~1.3 s, being dominated
// by HTTP setup. FMMM is the slowest consumer at this size and stays tolerable,
// ~0.1-3 s for ~1k nodes depending on layout quality (bandage-layout-js), and it
// runs off the main thread.
//
// A dense graph is what this cannot protect against, because bp per node varies
// by orders of magnitude between graph types — a base-level pggb graph runs ~17
// bp/node, where 5 Mb would be hundreds of thousands. Such a graph has no region
// query to reach this check with today, and the node budget below is the cap that
// catches it if one ever does.
export const MAX_GRAPH_REGION_BP = 5_000_000

// The cap in a message, in the unit that reads: `5 Mb`, not `5000 kb`.
export function formatSpanBp(bp: number) {
  return bp >= 1_000_000
    ? `${+(bp / 1_000_000).toFixed(1)} Mb`
    : `${Math.round(bp / 1000)} kb`
}

// What the view will actually draw, checked once the graph is parsed and so
// applying to a whole-file import as much as to a subgraph fetch. Measured on
// bubble-chain graphs: ~1-2k nodes redraws in under 10 ms, 10k takes ~43 ms of
// geometry and ~125k canvas draw calls per frame (single-digit fps while
// panning), and 100k needs 632 ms and 75 MB of vertex buffers. So this is set
// where the tab stops being usable rather than where it stops being smooth, and
// it is a view prop rather than a constant so a session can raise it — the same
// escape hatch strangepg gives with `-T N`.
export const DEFAULT_MAX_GRAPH_NODES = 20_000

// The floor exists to keep a scale positive and finite, not to express a useful
// zoom level, so it has to clear the smallest scale a real layout asks for. In
// the reference-anchored layouts world units are bp: fitting a chromosome-scale
// rGFA (250 Mbp) into ~720 px needs ~3e-6, and the old 0.001 floor clamped that
// to 7x too wide — zoomToFit could not fit a whole-file import at all.
const MIN_ZOOM = 1e-6
const MAX_ZOOM = 100

function clampZoom(zoom: number) {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom))
}

// A node's PanSN sample as an assembly this session can open, or undefined. The
// graph's spelling and the assembly's need not agree — HPRC writes `CHM13` where
// the assembly is UCSC's `hs1` — and `assemblyManager` is what knows the aliases,
// so resolution goes through it and returns the canonical name.
//
// `has` before `get`, deliberately: `get` reports an unknown name to
// `Core-handleUnrecognizedAssembly`, which asks every installed plugin to go
// supply it, and this is a probe run for hundreds of haplotypes per graph.
function assemblySampleResolver(session: AbstractSessionModel) {
  return (sample: string) =>
    session.assemblyManager.has(sample)
      ? (session.assemblyManager.get(sample)?.name ?? sample)
      : undefined
}

// The zoom as a pair of axis scales. One expression, read by all three getters
// below: they sit in one `.views()` block and so cannot reach each other through
// `self`, which had each of them restating the `pixelRows ? 1 : scale` rule that
// AxisScale exists to keep in one place.
function axisScaleOf(scale: number, pixelRows: boolean): AxisScale {
  return { scaleX: scale, scaleY: pixelRows ? 1 : scale }
}

function computeViewportBounds(model: {
  translateX: number
  translateY: number
  width: number
  scaleX: number
  scaleY: number
  canvasHeight: number
}) {
  const padding = 0.2
  const minX = -model.translateX / model.scaleX
  const minY = -model.translateY / model.scaleY
  const maxX = (model.width - model.translateX) / model.scaleX
  const maxY = (model.canvasHeight - model.translateY) / model.scaleY
  const w = maxX - minX
  const h = maxY - minY
  return {
    minX: minX - w * padding,
    minY: minY - h * padding,
    maxX: maxX + w * padding,
    maxY: maxY + h * padding,
  }
}

// Force layouts already computed for a graph, keyed by the view props the
// engine reads. Every layout mode is local and costs a millisecond except this
// one, which is seconds: measured on the committed engine, a 1,201-node bubble
// chain is 0.6 s proportional, 4.3 s at 'Wide bubbles' and 3.4 s at the highest
// quality.
//
// Worth keeping because a session revisits the same layout. The two drawings
// answer different questions and the README's own figure is one subgraph in
// both, so Anchored <-> Force is a round trip a reader makes repeatedly — and
// every control in the settings dialog calls `recomputeLayout` on change
// whether or not the current mode reads what it changed, which made picking a
// reference path in force mode a multi-second re-run of an identical layout.
// Both are hits.
//
// Entries are the live position objects rather than copies, which a node drag
// mutates in place (see moveNode), so a layout comes back arranged the way it
// was left rather than snapping back.
//
// Weak on the graph so nothing has to invalidate it: a graph is rebuilt by
// every load and dropped by `clearGraph`, and its layouts go with it.
const forceLayouts = new WeakMap<Graph, Map<string, LayoutResult>>()

// Enough to hold the settings a comparison moves between; past that the oldest
// goes, since a big graph's positions are megabytes.
const FORCE_LAYOUT_CACHE_SIZE = 4

function forceLayoutsOf(graph: Graph) {
  let cache = forceLayouts.get(graph)
  if (!cache) {
    cache = new Map()
    forceLayouts.set(graph, cache)
  }
  return cache
}

// Re-anchoring builds a new Graph, and the force layout of it is the same
// drawing: `anchorFromPaths` rewrites each node's `stable` and `samples` and
// touches neither the ids, the lengths, the depths nor the edges, which are all
// the engine reads. So the layouts follow the graph they were computed for
// rather than being thrown away with it.
function inheritForceLayouts(from: Graph, to: Graph) {
  const cache = forceLayouts.get(from)
  if (cache && from !== to) {
    forceLayouts.set(to, cache)
  }
}

function remember(
  cache: Map<string, LayoutResult>,
  key: string,
  result: LayoutResult,
) {
  if (cache.size >= FORCE_LAYOUT_CACHE_SIZE) {
    cache.delete(cache.keys().next().value!)
  }
  cache.set(key, result)
}

// Recolor one node/edge/arrow's vertices. factor === 1 restores the base
// colors (cheap subarray view); a larger factor brightens for hover/select.
function applyHighlight<K extends string | number>(
  renderer: Renderer,
  target: SubBatchKey,
  ranges: Map<K, VertexRange> | undefined,
  baseColors: Uint32Array | undefined,
  key: K | null,
  factor: number,
) {
  if (key !== null && ranges && baseColors) {
    const range = ranges.get(key)
    if (range) {
      const colors =
        factor === 1
          ? extractColorSlice(baseColors, range)
          : brightenColors(baseColors, range, factor)
      renderer.updateSubBatchColors(target, colors, range.start)
    }
  }
}

export default function stateModelFactory() {
  return types
    .compose(
      'GraphGenomeView',
      BaseViewModel,
      RenderLifecycleMixin(),
      types.model({
        type: types.literal('GraphGenomeView'),
        // FMMM's iteration budget, 0-4, the same scale Bandage's own settings
        // dialog exposes: 3+1 iterations at 0, 15+10 at 1, 30+20 at 2, 60+40 at
        // 3, 120+60 at 4 (BandageNG layout/graphlayoutworker.cpp).
        //
        // 2 because that is what the engine we vendor ships as its default
        // (`graphLayoutQuality = IntSetting(2, 0, 4)`, program/settings.cpp).
        // This was 1 for no recorded reason, i.e. one step BELOW upstream, and a
        // first sight of any graph is the default: review kept asking whether
        // the drawing could be iterated more ("are you sure you can't iterate it
        // more times for better layout?") of figures that were simply on a lower
        // setting than the tool they come from. Cost at the sizes this view
        // draws is milliseconds, and the header states the layout time so the
        // difference is visible rather than asserted.
        layoutQuality: types.optional(types.number, 2),
        linearLayout: types.optional(types.boolean, false),
        // Which drawing to use; the modes and their fallbacks are described in
        // LAYOUT_MODES. Default 'force' is the Bandage FMMM drawing, i.e. what
        // someone who has seen a pangenome graph before expects to see.
        //
        // The default used to be 'auto', the reference-anchored layout, on the
        // argument that lining the graph's x axis up with a linear view above it
        // is what this view can do and Bandage cannot. Docs review disagreed
        // twice, on figure after figure — "the linear backbone is just
        // confusing", "default to showing the bandage graphs over linear
        // backbone in almost all cases" — and the reason is that the anchored
        // drawing looks like a track rather than a graph: a bubble collapses onto
        // the reference axis, so the alternative alleles read as short bars
        // hanging under a line rather than as two routes through the same locus.
        // The anchored modes stay one dropdown click away, and are what the
        // hover-sync and one-row-per-strain figures select deliberately.
        layoutMode: types.optional(
          types.enumeration(LAYOUT_MODE_VALUES),
          'force',
        ),
        // 'auto' rather than a colour, resolved by `effectiveColorScheme`. See
        // COLOR_SCHEMES for why the default is not 'uniform' any more. A session
        // that names a scheme keeps it — this only decides what an unstated one
        // opens as.
        colorScheme: types.optional(
          types.enumeration(COLOR_SCHEME_VALUES),
          'auto',
        ),
        // How far the force layout opens a bubble, which on a variation graph is
        // the difference between a legible drawing and a rope. See
        // BUBBLE_SPREADS; no effect on the reference-anchored layouts, which
        // place a node from its coordinates rather than from a force sim.
        bubbleSpread: types.optional(
          types.enumeration(BUBBLE_SPREAD_VALUES),
          'auto',
        ),
        // Which of a general GFA's paths the anchored layouts put on x. A path
        // GFA's names are arbitrary and none of them is marked as the
        // reference, so this is a choice; empty means "infer", which is the
        // assembly a subgraph was cut against, and the first path in the file
        // for a whole-file import. No effect on an rGFA, whose segments carry
        // their own coordinates. See pathAnchoring.ts.
        referencePath: types.optional(types.string, ''),
        // Whether the toolbar spells out `fetch 12371ms · layout 4ms · geom 9ms`.
        // Off by default because it was in the toolbar of every published graph
        // figure, where a machine's fetch time is noise a reader has to skip
        // past. The numbers themselves are always on the element as `data-*`
        // attributes, which is what browser tests assert against, so hiding the
        // text costs no coverage.
        showPerf: types.optional(types.boolean, false),
        contigThickness: types.optional(types.number, 10),
        connectorThickness: types.optional(types.number, 4),
        darkMode: types.optional(types.boolean, false),
        scale: types.optional(types.number, 1),
        translateX: types.optional(types.number, 0),
        translateY: types.optional(types.number, 0),
        drawPaths: types.optional(types.boolean, false),
        // Ceiling on the drawing pane, in css px, for a session or a figure that
        // wants a shorter one than the drawing asks for. Unset means the built-in
        // MAX_CANVAS_HEIGHT, which is what every existing session gets.
        //
        // Why this is a knob rather than a smaller default: the pane is as tall
        // as the drawing's own aspect ratio (see canvasHeight), which is right —
        // a graph that is twice as tall as it is wide should not be squeezed
        // into a strip. But one very long node in a cut of short ones makes that
        // aspect ratio all arc: the HPRC CHM13 figure draws a 142 kb allele
        // among sub-kb backbone segments, pins the 600 px ceiling and spends
        // most of it on the loop, with the chain squashed along the bottom edge.
        // Lowering the ceiling there scales the whole drawing down, which is
        // exactly the trade that figure wants and the wrong default for a graph
        // whose height is carrying information.
        paneHeight: types.maybe(types.number),
        // Raise to draw a bigger graph than the default budget allows; see
        // DEFAULT_MAX_GRAPH_NODES for what the numbers cost.
        maxGraphNodes: types.optional(types.number, DEFAULT_MAX_GRAPH_NODES),
        // The bp ceiling on a cut, which is a PROXY for node count and only a
        // good one at fine granularity: on a base-level index 5 Mb is already
        // thousands of segments, so refusing by span is refusing by cost. A
        // level-of-detail tier breaks the proxy — a whole 249 Mb human
        // chromosome is 474 nodes off the hosted HPRC tier — so a session that
        // knows which granularity it is pointed at can raise this. The real
        // backstop stays `maxGraphNodes`, which counts what actually came back.
        //
        // The launch MENUS keep the constant deliberately (launchSubgraphView):
        // a user rubber-banding 249 Mb over a fine index should still be told
        // no, because nothing there has said the track is coarse.
        maxRegionBp: types.optional(types.number, MAX_GRAPH_REGION_BP),
        loadedTrackId: types.optional(types.string, ''),
        loadedRegion: types.maybe(
          types.frozen<{
            refName: string
            assemblyName: string
            start: number
            end: number
          }>(),
        ),
        // How far the cut follows links past the segments the region's own
        // links name, defaulting to one hop because at 0 the drawing is wrong
        // rather than merely sparse. A detour that leaves the backbone before
        // the window and rejoins after it has its interior indexed only under
        // its own stable sequence, which no query on the reference reaches, so an
        // arm that bypasses 21 kb of reference arrives as a 43 bp fragment: the
        // one bubble draws as two unrelated small insertions, and nothing on
        // screen says they are the same event. One hop closes those, and that is
        // the whole of what a reader means by seeing the local graph.
        //
        // The cost is queries rather than nodes, and a hop only follows alleles
        // (offReference in RgfaTabixAdapter, which is gfabase's stop-at-cutpoints
        // rule read off the rank tag), so it is bounded by the off-reference
        // segments the cut already reached and it does not walk the backbone out
        // of the window. Measured: the E. coli paa locus goes 14 segments at 0 to
        // 17 at 1 and stays at 17 at 2, so the cut closes and stays closed.
        // HPRC's amylase window goes 63 to 78 to 92, because there the alleles
        // have alleles; wall-clock is flat across all three, the remote index
        // dominating. 0 stays available for a graph where even that is too much.
        //
        // Still not a graph-aware cut: a complete one needs the bubble
        // decomposition (`gfatools view -R`, whose bubble rows state their own
        // member segments) rather than a frontier, which is the follow-up noted
        // in the adapter.
        subgraphContext: types.optional(types.number, 1),
        // Whole-GFA source loaded on attach — lets a GraphGenomeView be
        // instantiated declaratively from a session/config snapshot.
        gfaLocation: types.maybe(types.frozen<FileLocation>()),
        // The reference span the reference-position ramp runs over. A graph cut
        // from a track already states one as `loadedRegion`; a file-loaded graph
        // has no region at all, and this is how its snapshot can still put a
        // linear track beside it on the same ramp — both painted from one pair
        // of numbers rather than from the file's own measured extent.
        colorDomain: types.maybe(
          types.frozen<{ start: number; end: number }>(),
        ),
        // The linear view this graph was launched from, so a hovered node can
        // draw its reference span there and vice versa. Written by the launch
        // menu; see hoverSync/.
        connectedViewId: types.maybe(types.string),
      }),
    )
    .volatile(() => ({
      graph: undefined as Graph | undefined,
      layoutResult: undefined as LayoutResult | undefined,

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      error: undefined as unknown,
      isLoading: false,
      statusMessage: '',
      hoveredNode: null as string | null,
      hoveredEdge: null as number | null,
      selectedNode: null as string | null,
      viewportDirty: 0,
      // Bumped when the layout's positions are mutated IN PLACE, which only a
      // node drag does. Separate from `viewportDirty` because that one also
      // fires on pan and zoom, and the things keyed off this — the two hit
      // indexes and the label placement's per-layout caches — do not depend on
      // the transform at all. Rebuilding a 12k-edge hit index because the user
      // panned cost ~14 ms of the first mousemove after every gesture.
      positionsVersion: 0,
      nodeVertexRanges: undefined as Map<string, VertexRange> | undefined,
      arrowVertexRanges: undefined as Map<number, VertexRange> | undefined,
      baseNodeColors: undefined as Uint32Array | undefined,
      baseArrowColors: undefined as Uint32Array | undefined,
      draggingNode: null as string | null,
      // Dragging the background rather than a node. Lives here beside
      // draggingNode instead of in a component ref+state pair, so the two
      // mutually exclusive drag modes are one piece of state read from one place.
      isPanning: false,
      // Set once the user pans/zooms (or a restored session carries a
      // transform). While false the view keeps auto-fitting as the layout and
      // canvas dimensions settle; a manual move opts out so we never fight the
      // user. Distinct from `isDefaultViewport`, which zoomToFit itself
      // invalidates on its first run — that made the fit fire once against
      // not-yet-measured dimensions and then never re-fit.
      userMovedViewport: false,
      viewportDirtyTimer: undefined as
        ReturnType<typeof setTimeout> | undefined,
      // 0 is never a live rAF handle, so it doubles as "nothing pending"
      positionsDirtyFrame: 0,
      // Performance instrumentation, surfaced in GraphStats for browser tests
      // to assert against budgets. `fetchMs` is the GetSubgraph RPC round-trip,
      // `layoutMs` is the Bandage FMMM compute time reported by the
      // GraphComputeLayout RPC, `geometryMs` is the main-thread buildGeometry
      // pass and `geometryVertexCount` the resulting node-mesh vertex count.
      lastFetchMs: undefined as number | undefined,
      lastLayoutMs: undefined as number | undefined,
      lastGeometryMs: undefined as number | undefined,
      lastGeometryVertexCount: undefined as number | undefined,
    }))
    .views(self => ({
      get nodeById() {
        if (self.graph) {
          const m = new Map<string, GraphNode>()
          for (const n of self.graph.nodes) {
            m.set(n.id, n)
          }
          return m
        }
        return undefined
      },
      // bp per node id, which is all the label overlay needs of a GraphNode.
      // Held here rather than rebuilt in the component: that render runs on
      // every pan, and the map is a fact about the graph (measured 6.9 ms an
      // allocation on a 30k-node cut).
      get nodeLengths() {
        const m = new Map<string, number>()
        for (const n of self.graph?.nodes ?? []) {
          m.set(n.id, n.length)
        }
        return m
      },
      get nodeCount() {
        return self.graph?.nodes.length ?? 0
      },
      get edgeCount() {
        return self.graph?.edges.length ?? 0
      },
      get pathCount() {
        return self.graph?.paths?.length ?? 0
      },
      get hasGraph() {
        return self.graph !== undefined
      },
      // Whether the drawing on screen is the FMMM engine's. False before there
      // is a graph, since nothing is drawn by anything yet.
      //
      // Read by the settings that only the engine looks at: the layout quality
      // and the bubble spread do nothing at all to an anchored drawing, which
      // places a node from its coordinates, and the guide says so in prose
      // precisely because the dialog did not. A control that silently does
      // nothing is worse than one that says it cannot — the same rule the
      // `drawPaths` switch already follows.
      get usesLayoutEngine() {
        return self.graph
          ? modeUsesLayoutEngine(self.layoutMode, self.graph)
          : false
      },
      // A rank-0 backbone to draw x against, whether the segments declared it
      // (rGFA) or a path walk derived it. Only a GFA with neither tags nor
      // paths has no backbone at all, and there force is the one honest layout.
      get canAnchorLayout() {
        return self.graph?.nodes.some(n => n.stable?.rank === 0) ?? false
      },
      // The paths this graph could be anchored on, for the picker. Empty for an
      // rGFA, which has no P/W records and needs none.
      get anchorPaths() {
        return self.graph?.anchorPaths ?? []
      },
      // Which haplotype each ribbon colour belongs to, in the order the file
      // states the paths — the same list and the same order the geometry keys
      // its colours off, so the key cannot name a colour that is not drawn.
      // Empty unless the ribbons are actually on: a colour key beside a drawing
      // with no colours in it is a legend for nothing.
      get pathLegend() {
        const paths = self.graph?.paths
        return self.drawPaths && paths && pathColorsLegible(paths.length)
          ? pathLegend(paths)
          : []
      },
      // Whether the drawing is actually painted per path, which is not the same
      // question as whether the user asked for it: past MAX_PATH_COLORS the
      // colours say nothing and cost a stroke per path per edge. A bare getter
      // returning a resolved value, the same shape and for the same reason as
      // `effectiveColorScheme` — every consumer of a path colour reads this
      // one, so the geometry, the hit index and the key cannot disagree about
      // whether there are any. The switch in the settings dialog reads the raw
      // `drawPaths`, so the user's choice stays visible as the choice it is.
      get effectiveDrawPaths() {
        return (
          self.drawPaths && pathColorsLegible(self.graph?.paths?.length ?? 0)
        )
      },
      // The path x is currently drawn on, which is not necessarily the one
      // `referencePath` asked for: an unmatched name falls back rather than
      // leaving the graph unanchored, and the picker has to show what happened.
      get activeReferencePath() {
        return self.graph?.referencePath
      },
      // What to anchor on. An explicit choice wins; otherwise a graph cut from
      // a track is anchored on the assembly it was cut against, which is the
      // one the linear view beside it is showing.
      get preferredReferencePath() {
        return self.referencePath === ''
          ? self.loadedRegion?.assemblyName
          : self.referencePath
      },
      // The span the reference-position ramp runs over: what the snapshot
      // stated, else the region the graph was cut from. Undefined only for a
      // file-loaded graph that states neither, where the ramp falls back to the
      // drawn extent (computeReferenceRamp).
      get rampDomain() {
        return self.colorDomain ?? self.loadedRegion
      },
      // The scheme the renderer actually paints with, which is the raw prop
      // unless it is 'auto'. A bare getter returns a resolved value (root
      // CLAUDE.md): every consumer of a colour reads this one, and the two
      // dropdowns read `colorScheme` so "Auto" stays visible as the choice it
      // is.
      //
      // 'auto' asks the GRAPH, not the layout. A hue along the reference is
      // meaningful whenever the segments have reference coordinates —
      // `anchoredBy` is exactly that question — and a force-directed drawing of
      // an rGFA is the case that proves it: the layout has no reference axis and
      // the ramp still says where on the reference each node came from, which is
      // the only quantity a linear track beside it can be painted with too.
      get effectiveColorScheme(): ResolvedColorScheme {
        return self.colorScheme !== 'auto'
          ? self.colorScheme
          : self.graph?.anchoredBy
            ? 'reference-position'
            : 'uniform'
      },
      get nodePositions() {
        return self.layoutResult?.nodePositions
      },
      // Empty rather than undefined: every consumer maps over it, and a layout
      // with no row structure (FMMM) is a normal state, not a missing one.
      get rowLabels() {
        return self.layoutResult?.rowLabels ?? []
      },
      // Deletions the layout found inside an allele, empty for the same reason
      // rowLabels is: a layout drawn at sequence scale states none, because
      // there a node's drawn extent already IS its length. `deletions` beside
      // this one is the bare-edge kind, which every layout has.
      get alleleDeletions() {
        return self.layoutResult?.alleleDeletions ?? []
      },
      // Extent of the drawing in layout units, or undefined before there is
      // one. Shared by the pane height and by zoomToFit so the two cannot
      // measure the same graph differently.
      //
      // On the reference-anchored layouts x is reference bp, and the axis those
      // layouts exist for is the region the cut was made for: it is what lines
      // the graph pane up with the linear view above it. So x comes from
      // `loadedRegion` there, not from how far the drawing reaches. One allele
      // can legitimately anchor far outside the window -- a 75 bp CFT073
      // segment in the E. coli pggb graph attaches at K12:997,574 and rejoins
      // at K12:1,004,667, a real 7 kb deletion -- and fitting to that drew a
      // 484 bp window at 6% of the frame, on a pane whose whole claim is that
      // its x matches the panel above. It exits the frame instead, which is
      // where it goes. y is always measured: rows are not on the reference.
      //
      // Force layouts keep the measured extent in both axes, x there being
      // simulation units that no region can bound.
      get layoutBounds() {
        let bounds:
          { minX: number; minY: number; w: number; h: number } | undefined
        if (self.layoutResult) {
          let minX = Infinity
          let minY = Infinity
          let maxX = -Infinity
          let maxY = -Infinity
          for (const segments of Object.values(
            self.layoutResult.nodePositions,
          )) {
            for (const seg of segments) {
              minX = Math.min(minX, seg.x)
              minY = Math.min(minY, seg.y)
              maxX = Math.max(maxX, seg.x)
              maxY = Math.max(maxY, seg.y)
            }
          }
          const region = self.layoutResult.referenceAxis
            ? self.loadedRegion
            : undefined
          if (region && region.end > region.start) {
            minX = region.start
            maxX = region.end
          }
          bounds = { minX, minY, w: maxX - minX, h: maxY - minY }
        }
        return bounds
      },
      // Whether the current layout states y in screen px rather than in the same
      // units as x (LayoutResult.pixelRows). Everything that has to put the two
      // axes in one expression reads this through scaleX/scaleY.
      get pixelRows() {
        return self.layoutResult?.pixelRows ?? false
      },
      get zoomPercent() {
        return `${(self.scale * 100).toFixed(1)}%`
      },
      // True while the persisted transform is still the schema default, i.e.
      // neither a restored session nor the user has positioned this view yet,
      // so an incoming layout is free to zoom-to-fit.
      get isDefaultViewport() {
        return (
          self.scale === 1 && self.translateX === 0 && self.translateY === 0
        )
      },
    }))
    .views(self => ({
      get nodeNeighbors() {
        return self.graph ? buildNeighbors(self.graph) : undefined
      },
      // Links that skip reference sequence, i.e. the deletions this graph
      // holds. Computed once per graph rather than per geometry rebuild: it is
      // a pass over the edges and the drawing rebuilds on every pan.
      get deletions() {
        return self.graph ? deletionEdges(self.graph) : []
      },
      // Every node's midpoint on the reference plus the interval the hue ramps
      // over — what `reference-position` paints from, and undefined under every
      // other scheme so the walk is never run for a colouring that ignores it.
      //
      // Here for the same reason `deletions` is, only more so: deriving it is a
      // bounded neighbour walk PER NODE (referenceMidpoints), it depends on
      // nothing the transform touches, and it was being redone inside every
      // geometry rebuild — 1.6 ms at 1.5k nodes, 45 ms at 30k, on a pass that
      // reruns on each debounced pan and each drag frame. `reference-position`
      // is also what `auto` resolves to on any anchored graph, so this was the
      // default path rather than an opt-in one.
      get referenceRamp() {
        return self.effectiveColorScheme === 'reference-position' && self.graph
          ? computeReferenceRamp(self.graph, self.rampDomain)
          : undefined
      },
      // The assemblies this view is showing, which is the interface every
      // assembly-aware piece of the app looks for — `viewTitle` first among
      // them, which falls back through it and otherwise names the view
      // "Untitled view". Every published HPRC figure showed that.
      // `launchSubgraphView` only avoids it by writing `displayName`, so a
      // declaratively-instantiated view (a session snapshot, a figure spec) got
      // the fallback.
      //
      // A whole-file import has none: its stable names are a GFA's business and
      // need not name anything the session has loaded. Empty rather than
      // undefined, matching what an LGV with no displayed regions reports.
      get assemblyNames() {
        const region = self.loadedRegion
        return region ? [region.assemblyName] : []
      },
      // Screen px per layout unit, per axis. `scale` is the x zoom and the whole
      // of what a user's wheel moves; y is a second question the layout answers
      // for itself.
      //
      // On a row layout the pitch is already in screen px (rowSpacing.ts), so
      // scaleY is 1 and stays 1: rows are a track's row height, unchanged by
      // zoom, and the backbone under them zooms the way the ruler above it does.
      // On an isotropic layout (FMMM) x and y are one simulation space and one
      // number scales both, exactly as before.
      //
      // Everything that mixes the two axes takes their ratio as `yToX`
      // (scaleY / scaleX) — see computeEdgeCurves.
      get scaleX() {
        return axisScaleOf(self.scale, self.pixelRows).scaleX
      },
      get scaleY() {
        return axisScaleOf(self.scale, self.pixelRows).scaleY
      },
      // The pair, for everything that draws or hit-tests. Handed over as one
      // value on purpose: every consumer needs both, and passing them separately
      // let a caller supply the x scale and default y, which compiles and draws
      // a wrong picture. See AxisScale.
      get axisScale() {
        return axisScaleOf(self.scale, self.pixelRows)
      },
      // The pane is as tall as the drawing, rather than a fixed box the drawing
      // floats in the middle of.
      //
      // A row layout says how tall it is outright: rows are px, so the drawing's
      // height is the row count times the pitch and this is a sum, not a
      // derivation. It used to be derived from the drawing's ASPECT RATIO
      // against the x-fit scale, because y was in bp and a height in px did not
      // exist until a scale was chosen — which is also why a ceiling had to be
      // put on the row pitch to stop tall graphs from binding the fit on the
      // wrong axis. Both are gone with the unit.
      //
      // An isotropic layout still has no height of its own and keeps the aspect
      // derivation. It reads neither `scale` nor the height it is replacing, so
      // zoomToFit consumes this without feeding back into it.
      get canvasHeight() {
        const bounds = self.layoutBounds
        const usableWidth = self.width - FIT_PADDING * 2
        // `paneHeight` replaces the built-in ceiling rather than adding a
        // second clamp under it, and the floor still wins: a pane shorter than
        // MIN_CANVAS_HEIGHT leaves no room to hover a node and read its
        // tooltip, which is the reason that floor exists.
        const ceiling = Math.max(
          MIN_CANVAS_HEIGHT,
          self.paneHeight ?? MAX_CANVAS_HEIGHT,
        )
        if (!bounds) {
          return ceiling
        }
        if (self.pixelRows) {
          return Math.min(
            ceiling,
            Math.max(MIN_CANVAS_HEIGHT, bounds.h + FIT_PADDING * 2),
          )
        }
        return bounds.w > 0 && usableWidth > 0
          ? Math.min(
              ceiling,
              Math.max(
                MIN_CANVAS_HEIGHT,
                (bounds.h * usableWidth) / bounds.w + FIT_PADDING * 2,
              ),
            )
          : ceiling
      },
    }))
    .views(self => ({
      // The reference interval of the hovered node, for a connected linear view
      // to highlight. Only a graph cut from a track has one: a whole-file import
      // has no region, and its stable names need not name anything in a loaded
      // assembly.
      get deletionEdgeIndexes() {
        return new Map(self.deletions.map(d => [d.edgeIndex, d.bypassed]))
      },
      // The interval the reference-position ramp runs over, for the key beside
      // the drawing, and undefined when no key should be drawn. Two tutorials
      // carry "red to magenta is left to right of the cut window" as a sentence
      // in prose because nothing on screen said it.
      //
      // Read off the ramp the drawing is actually painted with rather than
      // re-derived from the domain, so the key cannot come to describe a
      // different interval from the hues beside it — and so a graph that states
      // no domain, whose interval has to be measured, does not pay for a second
      // neighbour walk to say what the first one already worked out.
      get referenceRampDomain() {
        const ramp = self.referenceRamp
        return ramp
          ? { start: ramp.start, end: ramp.start + ramp.span }
          : undefined
      },
      get hoverHighlight() {
        let result:
          | {
              refName: string
              assemblyName: string
              start: number
              end: number
            }
          | undefined
        const region = self.loadedRegion
        const nodeId = self.hoveredNode
        const nodeById = self.nodeById
        const neighbors = self.nodeNeighbors
        if (region && nodeId !== null && nodeById && neighbors) {
          const span = nodeReferenceSpan({ nodeId, nodeById, neighbors })
          if (span) {
            result = {
              refName: region.refName,
              assemblyName: region.assemblyName,
              ...span,
            }
          }
        }
        return result
      },
    }))
    .views(self => ({
      // Every assembly this graph names a segment from, with the locus each one
      // contributes here. rGFA's SN tag is what makes this knowable: the graph
      // states its own contributors, so the view can offer a way out to each of
      // them without consulting an alignment.
      //
      // Gaps larger than the backbone span split a contributor's segments into
      // separate loci and the widest wins, so a sample that also contributes
      // sequence from a distant duplication is launched at the locus on screen
      // rather than at the union of the two.
      get contributingAssemblies() {
        const graph = self.graph
        const backbone = graph ? backboneNodes(graph) : []
        return graph
          ? contributingAssemblies(graph, {
              maxGap: backbone.length > 0 ? backboneSpan(backbone) : Infinity,
            })
          : []
      },
    }))
    .views(self => ({
      // The contributors a view can actually be opened on: those naming an
      // assembly this session has loaded. Every strain of an E. coli pangenome
      // demo is its own assembly, so all of them resolve; an HPRC graph names
      // hundreds of haplotypes that no session loads, so only the reference
      // does.
      get launchableAssemblies() {
        return resolveContributors(
          withReferenceRegion(self.contributingAssemblies, self.loadedRegion),
          assemblySampleResolver(getSession(self)),
        )
      },
      // Whether there is a linear view this graph may draw a highlight into —
      // the paired one, or the session's only one on the reference assembly.
      // Read by the node menu, which offers the item only when it would land
      // somewhere.
      get canHighlightInLinearView() {
        const region = self.loadedRegion
        return (
          region !== undefined &&
          linearViewTarget({
            views: [...getSession(self).views],
            connectedViewId: self.connectedViewId,
            assemblyName: region.assemblyName,
          }) !== undefined
        )
      },
      // Where one node can be opened: on its own assembly, and on the reference
      // the graph was cut against. Both are padded to a readable window — a
      // base-level allele is a few bp, and a linear view framed on exactly that
      // shows no context at all.
      nodeLaunchTargets(nodeId: string) {
        const node = self.nodeById?.get(nodeId)
        const own = node ? nodeOwnLocation(node) : undefined
        const ownAssembly = own
          ? assemblySampleResolver(getSession(self))(own.sample)
          : undefined
        const region = self.loadedRegion
        const nodeById = self.nodeById
        const neighbors = self.nodeNeighbors
        const span =
          region && nodeById && neighbors
            ? nodeReferenceSpan({ nodeId, nodeById, neighbors })
            : undefined
        return {
          own:
            own && ownAssembly
              ? { location: paddedLocation(own), assembly: ownAssembly }
              : undefined,
          reference:
            region && span
              ? {
                  location: paddedLocation({
                    sample: region.assemblyName,
                    refName: region.refName,
                    ...span,
                  }),
                  assembly: region.assemblyName,
                }
              : undefined,
        }
      },
    }))
    .actions(self => ({
      setError(error: unknown) {
        self.error = error
        self.isLoading = false
      },
      setStatusMessage(message: string) {
        self.statusMessage = message
      },
      setFetchMs(ms: number) {
        self.lastFetchMs = ms
      },
      setLayoutMs(ms: number) {
        self.lastLayoutMs = ms
      },
      setGeometryMetrics(ms: number, vertexCount: number) {
        self.lastGeometryMs = ms
        self.lastGeometryVertexCount = vertexCount
      },
      setLayoutQuality(quality: number) {
        self.layoutQuality = quality
      },
      setLinearLayout(linear: boolean) {
        self.linearLayout = linear
      },
      setLayoutMode(mode: LayoutModeValue) {
        self.layoutMode = mode
      },
      // Re-anchor in place rather than re-parsing: the coordinate walk is
      // already recorded on the graph, and only which path counts as rank 0
      // changes. The caller recomputes the layout, the same way it does after
      // setLayoutMode. An rGFA is left alone — its coordinates are not derived.
      setReferencePath(name: string) {
        self.referencePath = name
        const graph = self.graph
        if (graph?.anchoredBy === 'paths') {
          const reanchored = anchorFromPaths(graph, name)
          inheritForceLayouts(graph, reanchored)
          self.graph = reanchored
        }
      },
      setDrawPaths(draw: boolean) {
        self.drawPaths = draw
      },
      setShowPerf(show: boolean) {
        self.showPerf = show
      },
      setColorScheme(scheme: ColorScheme) {
        self.colorScheme = scheme
      },
      setBubbleSpread(spread: BubbleSpread) {
        self.bubbleSpread = spread
      },
      // Undefined restores the built-in ceiling. Nothing recomputes: the pane
      // reads canvasHeight and the drawing is placed by zoomToFit, which the
      // caller runs if it wants the drawing refitted into the new pane.
      setPaneHeight(px: number | undefined) {
        self.paneHeight = px
      },
      // The caller refetches — the number only describes how the next cut is
      // made, and the graph on screen was cut with the old one.
      setSubgraphContext(hops: number) {
        self.subgraphContext = hops
      },
      // Same contract as setSubgraphContext: describes how the NEXT cut is
      // gated, so the caller refetches. See the prop for why a session is
      // allowed to move this and the launch menus are not.
      setMaxRegionBp(bp: number) {
        self.maxRegionBp = bp
      },
      // Pair with a linear view for the hover sync, without ever repointing an
      // existing pairing: a graph launched *from* an LGV is already paired with
      // it, and stealing that would break the sync the user came in on. So a
      // launch out of the graph only claims the slot when it is empty.
      pairWithLinearView(viewId: string) {
        if (!self.connectedViewId) {
          self.connectedViewId = viewId
        }
      },
      setHoveredNode(nodeId: string | null) {
        self.hoveredNode = nodeId
      },
      setHoveredEdge(edgeIdx: number | null) {
        self.hoveredEdge = edgeIdx
      },
      setSelectedNode(nodeId: string | null) {
        self.selectedNode = nodeId
      },
      setDraggingNode(nodeId: string | null) {
        self.draggingNode = nodeId
      },
      setPanning(panning: boolean) {
        self.isPanning = panning
      },
      stopDragging() {
        self.draggingNode = null
        self.isPanning = false
      },
      // Everything that names a part of the current graph. Reset when the graph
      // is replaced, and by clearGraph.
      clearInteractionState() {
        self.hoveredNode = null
        self.hoveredEdge = null
        self.selectedNode = null
        self.draggingNode = null
        self.isPanning = false
      },
      showNodeDetails(nodeId: string) {
        const node = self.nodeById?.get(nodeId)
        const nodeById = self.nodeById
        const neighbors = self.nodeNeighbors
        if (node && nodeById && neighbors) {
          const session = getSession(self)
          const region = self.loadedRegion
          // refName/start/end are what makes the widget show a location rather
          // than a bare id, and they are the same span the linear view
          // highlights on hover.
          const span = region
            ? nodeReferenceSpan({ nodeId, nodeById, neighbors })
            : undefined
          if (isSessionModelWithWidgets(session)) {
            session.showWidget(
              session.addWidget('BaseFeatureWidget', 'baseFeature', {
                featureData: {
                  id: node.id,
                  name: node.name,
                  length: node.length,
                  depth: node.depth,
                  rank: node.stable?.rank,
                  stableName: node.stable?.refName,
                  // The assembly that contributed this segment, split off the
                  // stable name. On an HPRC graph this is the only thing that
                  // says which of 400-odd haplotypes an allele came from.
                  contributingAssembly: nodeOwnLocation(node)?.sample,
                  // Every assembly that traverses it, which is a different
                  // question and one only a path GFA can answer. Absent on an
                  // rGFA rather than approximated, so the two are never
                  // confused: there `contributingAssembly` is first-seen, not
                  // carriage.
                  carriedBy: node.samples?.join(', '),
                  ...(region && span
                    ? {
                        refName: region.refName,
                        assemblyName: region.assemblyName,
                        start: span.start,
                        end: span.end,
                      }
                    : {}),
                },
              }),
            )
          }
        }
      },

      setTransform(s: number, tx: number, ty: number) {
        self.userMovedViewport = true
        self.scale = clampZoom(s)
        self.translateX = tx
        self.translateY = ty
      },
      zoom(factor: number, centerX: number, centerY: number) {
        self.userMovedViewport = true
        const newScale = clampZoom(self.scale * factor)
        const ratio = newScale / self.scale
        self.scale = newScale
        self.translateX = centerX - (centerX - self.translateX) * ratio
        // y only follows when it is on the same scale. A row layout's y is
        // screen px (scaleY === 1), so nothing about it changes as x zooms —
        // moving translateY by the ratio there would slide the rows off under
        // the cursor while their pitch stayed put.
        if (!self.pixelRows) {
          self.translateY = centerY - (centerY - self.translateY) * ratio
        }
      },
      setViewportDirty() {
        self.viewportDirty++
      },
      // The positions themselves moved, as opposed to the window onto them.
      setPositionsDirty() {
        self.positionsVersion++
      },
      storeRenderBatchMeta(batch: RenderBatch) {
        self.nodeVertexRanges = batch.nodeVertexRanges
        self.arrowVertexRanges = batch.arrowVertexRanges
        self.baseNodeColors = batch.nodes.colors
        self.baseArrowColors = batch.arrows.colors
      },
      zoomToFit() {
        // A layout is routinely degenerate on one axis: an anchored window
        // holding only backbone segments puts every node on row 0. So each axis
        // constrains the scale only when it has extent, and only a layout with
        // no extent at all is unfittable. Requiring extent on both axes left
        // that window at scale 1 with the graph off-screen entirely, since x
        // there is reference bp.
        const bounds = self.layoutBounds
        const usableWidth = self.width - FIT_PADDING * 2
        const usableHeight = self.canvasHeight - FIT_PADDING * 2
        // Nothing to fit into before the canvas is measured. The autorun re-runs
        // once width lands, so skipping here beats computing a negative scale
        // and persisting that transform into the session snapshot.
        if (
          bounds &&
          usableWidth > 0 &&
          usableHeight > 0 &&
          // A row layout needs x extent specifically: y cannot stand in for it
          // there, having no scale left to solve for.
          (bounds.w > 0 || (!self.pixelRows && bounds.h > 0))
        ) {
          // A row layout fits on x ALONE, which is the point of it: the pane is
          // as tall as the rows are and the rows are as tall as they need to be,
          // so there is no height to fit into and nothing that can make the
          // backbone narrower than the pane it is supposed to line up with. That
          // is the bug this axis change is for — past ~12 rows the drawing was
          // taller than it was wide, the vertical axis bound the fit, and the
          // backbone stopped matching the linear view above it.
          //
          // An isotropic layout still fits on whichever axis binds, and the
          // leftover on the other is split evenly.
          const fitX = bounds.w > 0 ? usableWidth / bounds.w : Infinity
          const fitY = bounds.h > 0 ? usableHeight / bounds.h : Infinity
          const newScale = clampZoom(
            self.pixelRows ? fitX : Math.min(fitX, fitY),
          )
          self.scale = newScale
          self.translateX =
            FIT_PADDING -
            bounds.minX * newScale +
            (usableWidth - bounds.w * newScale) / 2
          // scaleY, which a row layout pins at 1
          const yScale = self.pixelRows ? 1 : newScale
          // Centre the leftover, but only when there IS leftover. A row layout
          // fits on x alone, so its drawing is routinely taller than the pane —
          // that is the case rowSpacing.ts means by "reached by panning" — and
          // centring an overflow splits the loss across both ends: at 41 rows
          // the top row landed 100 px above the pane. The top row is the
          // reference backbone, i.e. the axis the whole layout exists to put
          // under the linear view, so it is the one row that must not be the
          // first thing to go. Pinned at the padding it opens where a fitting
          // drawing opens, and the rows past the ceiling are below, which is the
          // direction a reader already scrolls a track in.
          const leftoverY = usableHeight - bounds.h * yScale
          self.translateY =
            FIT_PADDING - bounds.minY * yScale + Math.max(0, leftoverY) / 2
        }
      },
      clearRenderBatchMeta() {
        self.nodeVertexRanges = undefined
        self.arrowVertexRanges = undefined
        self.baseNodeColors = undefined
        self.baseArrowColors = undefined
      },
      clearPerfMetrics() {
        self.lastFetchMs = undefined
        self.lastLayoutMs = undefined
        self.lastGeometryMs = undefined
        self.lastGeometryVertexCount = undefined
      },
    }))
    .actions(self => {
      // Pan/zoom can wait: the geometry on screen is still correct while the
      // gesture runs (the viewport bounds carry 20% overscan), so rebuilding is
      // deferred until the user settles.
      function scheduleViewportDirty() {
        clearTimeout(self.viewportDirtyTimer)
        self.viewportDirtyTimer = setTimeout(() => {
          if (isAlive(self)) {
            self.setViewportDirty()
          }
        }, VIEWPORT_DEBOUNCE_MS)
      }

      // A node drag cannot wait — the node only moves on screen when its
      // geometry is rebuilt — but a bump costs a full geometry rebuild plus
      // invalidation of both hit-detection indexes, and mousemove fires in
      // bursts well above the frame rate. Coalescing to the next frame keeps the
      // drag live while bounding that work to once per frame instead of once
      // per event.
      function requestPositionsDirtyFrame() {
        cancelAnimationFrame(self.positionsDirtyFrame)
        self.positionsDirtyFrame = requestAnimationFrame(() => {
          if (isAlive(self)) {
            self.setPositionsDirty()
          }
        })
      }

      return {
        // Back to the import form: drop the graph and everything derived from
        // it. Composed from the same resets the load path uses, so a field added
        // to one of them cannot be forgotten here.
        clearGraph() {
          self.graph = undefined
          self.layoutResult = undefined
          self.error = undefined
          self.isLoading = false
          self.statusMessage = ''
          self.clearInteractionState()
          self.clearRenderBatchMeta()
          self.clearPerfMetrics()
        },
        // Moves the position objects IN PLACE, which is the one thing
        // jbrowse-components' upload invariant says not to do ("per-region
        // upload values must be freshly constructed, never mutated — backends
        // diff by reference identity"), so it is worth saying why this is not
        // that case and what it costs instead.
        //
        // Nothing here diffs by identity: the geometry is rebuilt wholesale and
        // handed over as one batch, so `nodePositions` identity is not a
        // protocol between the model and the backend the way a per-region map
        // is. What identity DOES drive is the fit: the zoom-to-fit autorun and
        // `layoutBounds` — and so `canvasHeight` — key off `layoutResult`, and
        // they mean "a new LAYOUT arrived", not "a node moved". Publishing a
        // fresh positions record per frame of a drag would refit the drawing
        // and resize the pane under the cursor, sixty times a second.
        //
        // So the change is announced by `positionsVersion` instead, and every
        // cache that would otherwise trust identity takes it as a key. The cost
        // of that trade is that the version is a thing to remember: a caller
        // that mutates here and does not bump it gets stale curves, stale hit
        // boxes and stale labels, silently. Everything downstream of it is
        // reached from this one action.
        moveNode(nodeId: string, dx: number, dy: number) {
          const positions = self.layoutResult?.nodePositions
          if (positions?.[nodeId]) {
            for (const seg of positions[nodeId]) {
              seg.x += dx
              seg.y += dy
            }
            requestPositionsDirtyFrame()
          }
        },
        scheduleViewportDirty,
      }
    })
    .actions(self => {
      // `scaling.nodes` rather than the graph's own: under a compressing
      // drawn-length law a node's `length` crosses this boundary as a drawn
      // length, which is all the engine ever reads it as.
      function callLayout(graph: Graph, scaling: LayoutScaling) {
        const session = getSession(self)
        const { rpcManager } = session
        // Stable grouping key for the layout RPC; a view has no display-level
        // rpcSessionId. `rpcManager.call` injects sessionId into the args.
        const sessionId = 'graph'
        return rpcManager.call(sessionId, 'GraphComputeLayout', {
          graph: { nodes: scaling.nodes, edges: graph.edges },
          options: {
            quality: self.layoutQuality,
            linearLayout: self.linearLayout,
            ...scaling.opts,
          },
          statusCallback: (message: string) => {
            self.setStatusMessage(message)
          },
        }) as Promise<{ result: LayoutResult; duration: number }>
      }

      // The engine's inputs, and only those: the graph, plus what `callLayout`
      // puts in `options`. The colour scheme, the reference path and the
      // anchored modes' own settings are all absent because none of them
      // reaches the engine.
      function forceLayoutKey() {
        return `${self.layoutQuality}|${self.linearLayout}|${self.bubbleSpread}`
      }

      // Single dispatch point for every layout mode. A mode that returns a
      // result computed it locally; one that returns undefined can't draw this
      // graph and hands off to the remote FMMM engine, which is also how
      // 'force' is expressed. See LAYOUT_MODES.
      function* computeLayout(graph: Graph) {
        const start = performance.now()
        const local = layoutModeByValue(self.layoutMode).run(
          graph,
          self.loadedRegion,
        )
        if (local) {
          return { result: local, duration: performance.now() - start }
        }
        const cache = forceLayoutsOf(graph)
        const key = forceLayoutKey()
        const hit = cache.get(key)
        if (hit) {
          return { result: hit, duration: performance.now() - start }
        }
        const { result, duration } = (yield callLayout(
          graph,
          layoutScaling(graph, spreadFor(self.bubbleSpread)),
        )) as { result: LayoutResult; duration: number }
        // Under the key read BEFORE the call: the settings that produced this
        // drawing are not necessarily the ones on screen now, and filing it
        // under the current ones would serve it up as a layout it is not.
        remember(cache, key, result)
        return { result, duration }
      }

      // Which layout request is the live one. A layout is async and nothing in
      // the UI waits for it, so several are routinely in flight: every control
      // in the settings dialog fires `recomputeLayout` on change, and a force
      // layout takes seconds where an anchored one is instant.
      //
      // The graph identity below is not enough to order them, because the
      // competing requests are usually layouts of the SAME graph. Left to
      // resolve order the last one to FINISH won rather than the last one
      // asked for, so switching away from a slow force layout — to an anchored
      // mode, a cheaper bubble spread, a lower quality — drew the abandoned
      // one over the top of the chosen one seconds later, with the dropdown
      // still naming the choice that was discarded.
      let liveRequest = 0

      // Applied under a guard because a layout is async and the user can load a
      // different graph, or ask for a different layout of it, while one is in
      // flight; the stale result must not land.
      function* layoutInto(graph: Graph) {
        const request = ++liveRequest
        const { result, duration } = yield* computeLayout(graph)
        const live = self.graph === graph && request === liveRequest
        if (live) {
          self.layoutResult = result
          self.setLayoutMs(duration)
        }
        return live
      }

      function* parseAndLayout(text: string, name: string) {
        self.setStatusMessage('Parsing GFA')
        const gfaGraph = parseGFA(text)
        // A general GFA states its coordinates only in its P/W lines, so the
        // walk that recovers them happens before anything reads `stable` —
        // otherwise the anchored layouts see an unanchored graph and hand off
        // to force.
        const graph = anchorGraph(
          convertGFAToGraph(gfaGraph, name),
          self.preferredReferencePath,
        )
        // Checked here, between parsing and laying out, because this is the one
        // point both load paths pass through and it is upstream of everything
        // expensive: the layout, the geometry and the per-frame draw calls all
        // scale with this number. The whole-file import path had no cap at all,
        // so a chromosome-scale GFA would parse and then freeze the tab.
        if (graph.nodes.length > self.maxGraphNodes) {
          throw new Error(
            `Graph too large to draw: ${graph.nodes.length.toLocaleString()} nodes (limit ${self.maxGraphNodes.toLocaleString()}). Zoom in to a smaller region, or raise maxGraphNodes on this view.`,
          )
        }
        self.graph = graph
        // hoveredEdge is an index into graph.edges and hoveredNode/selectedNode
        // are ids, so all three address the graph being replaced here. Carrying
        // them over points the tooltip and the highlight at whatever now happens
        // to sit at that index.
        self.clearInteractionState()
        self.setStatusMessage('Computing layout')
        yield* layoutInto(graph)
      }

      // Inner loading logic shared by loadFromTabixSubgraph and refetchIfNeeded
      function* doSubgraphLoad(
        adapterConfig: Record<string, unknown>,
        region: {
          refName: string
          assemblyName: string
          start: number
          end: number
        },
        opts: {
          context?: number
        } = {},
      ) {
        const regionSize = region.end - region.start
        if (regionSize > self.maxRegionBp) {
          // One mode only: past the size cap the graph view declines rather
          // than degrading to a non-graph rectangle rendering. Large-region and
          // full-genome comparison is a linear synteny view instead.
          self.graph = undefined
          self.layoutResult = undefined
          self.error = new Error(
            `Region too large (${formatSpanBp(regionSize)}) — zoom in to view graph (max ${formatSpanBp(self.maxRegionBp)})`,
          )
          return
        }
        self.isLoading = true
        self.error = undefined
        self.setStatusMessage('Fetching subgraph')
        try {
          const session = getSession(self)
          const { rpcManager } = session
          const sessionId = 'graph' // getRpcSessionId(self) no rpcSessionId getter
          const fetchStart = performance.now()
          const gfaText = (yield rpcManager.call(sessionId, 'GetSubgraph', {
            adapterConfig,
            region,
            opts: { context: opts.context },
          })) as string
          self.setFetchMs(performance.now() - fetchStart)
          if (!gfaText) {
            throw new Error(
              'Adapter returned no GFA — region may be outside indexed data or the adapter does not implement getSubgraph',
            )
          }
          const label = `${region.refName}:${region.start.toLocaleString()}-${region.end.toLocaleString()}`
          yield* parseAndLayout(gfaText, label)
        } catch (e) {
          console.error('[GraphGenomeView.loadFromTabixSubgraph]', e)
          self.error = e
        } finally {
          self.isLoading = false
        }
      }

      // The cut behind a graph whose source is a track in this session, which is
      // what both a launch snapshot and a restored session carry. Silent when
      // there is no such pair, or when the track it names has since gone: those
      // are the whole-file and stale cases, not errors.
      //
      // Nothing here saves and restores the transform: `userMovedViewport` is
      // what protects a restored session's pan/zoom, and it gates the fit
      // autorun — the only thing in this flow that would otherwise move the
      // view. A save/restore pair around the load wrote back the values it had
      // just read.
      function* cutFromLoadedTrack() {
        const region = self.loadedRegion
        const track = self.loadedTrackId
          ? getSession(self).tracks.find(t => t.trackId === self.loadedTrackId)
          : undefined
        if (track && region) {
          yield* doSubgraphLoad(readConfObject(track, 'adapter'), region, {
            context: self.subgraphContext,
          })
        }
      }

      return {
        loadGFA: flow(function* (text: string, name = 'Imported GFA') {
          self.loadedTrackId = ''
          self.loadedRegion = undefined
          self.isLoading = true
          self.error = undefined
          try {
            yield* parseAndLayout(text, name)
          } catch (e) {
            console.error('[GraphGenomeView.loadGFA]', e)
            self.error = e
          } finally {
            self.isLoading = false
          }
        }),
        loadFromTabixSubgraph: flow(function* (
          adapterConfig: Record<string, unknown>,
          region: {
            refName: string
            assemblyName: string
            start: number
            end: number
          },
          opts: {
            trackId?: string
          } = {},
        ) {
          self.loadedTrackId = opts.trackId ?? ''
          self.loadedRegion = opts.trackId ? region : undefined
          yield* doSubgraphLoad(adapterConfig, region, {
            context: self.subgraphContext,
          })
        }),
        // Cut on attach only — a graph already on screen is either the user's
        // own or one this just drew.
        refetchIfNeeded: flow(function* () {
          if (!self.graph) {
            yield* cutFromLoadedTrack()
          }
        }),
        // Cut the same region again, for a change to what the cut returns
        // rather than to how it is drawn (subgraphContext).
        reloadSubgraph: flow(function* () {
          yield* cutFromLoadedTrack()
        }),
        recomputeLayout: flow(function* () {
          const graph = self.graph
          if (!graph) {
            return
          }
          self.isLoading = true
          self.setStatusMessage('Computing layout')

          try {
            // A superseded request leaves the spinner to the request that
            // replaced it: clearing it here reports "done" while the layout the
            // user actually asked for is still being computed, which is the
            // common case when a cheap choice follows an expensive one.
            if (yield* layoutInto(graph)) {
              self.isLoading = false
            }
          } catch (e) {
            console.error('[GraphGenomeView.recomputeLayout]', e)
            self.error = e
            self.isLoading = false
          }
        }),
      }
    })
    .actions(self => ({
      startRenderingBackend(backend: Renderer) {
        if (!self.autorunsInstalled) {
          // Autorun: keep the view fitted to the graph until the user moves it.
          // Reads layoutResult plus (via zoomToFit) width/canvasHeight, so it
          // re-fires — and re-fits — as the layout arrives and the canvas is
          // measured, rather than firing once against not-yet-known dimensions.
          // A manual pan/zoom (or a restored-session transform) sets
          // userMovedViewport, opting out so we never override the user.
          addDisposer(
            self,
            autorun(() => {
              if (
                self.layoutResult &&
                untracked(() => !self.userMovedViewport)
              ) {
                self.zoomToFit()
              }
            }),
          )

          // Autorun: mirror a connected linear view's hover onto the graph. An
          // LGV writes `{hoverPosition, hoverFeature}` to session.hovered on
          // every mousemove; neither field names the source view, so the guard
          // is that the position lies in the region this graph was cut from.
          //
          // Only `hovered` is tracked — the graph reads are untracked, so a
          // geometry rebuild can't re-fire this and clobber a hover the canvas
          // itself set. Assigning an unchanged id doesn't notify, so a hover
          // that travels within one segment costs nothing downstream.
          addDisposer(
            self,
            autorun(() => {
              const hover = readLgvHover(getSession(self).hovered)
              untracked(() => {
                const region = self.loadedRegion
                const graph = self.graph
                if (region && graph) {
                  self.setHoveredNode(
                    hover && hoverInRegion(hover, region)
                      ? nodeForLgvHover({ hover, nodes: graph.nodes })
                      : null,
                  )
                }
              })
            }),
          )

          // Reaction: drop a hover the pointer cannot still be over.
          //
          // A hover is set by a mousemove on the canvas, and here the drawing
          // moves under a STATIONARY cursor on three axes — the wheel zoom, the
          // toolbar's zoom and fit buttons, and a pan — none of which fire a
          // pointer event. Left alone the tooltip goes on naming the node that
          // used to be under the cursor, `hoverHighlight` goes on publishing its
          // span, and the paired linear view paints a band over the wrong
          // sequence until the mouse happens to move.
          //
          // This is jbrowse-components' `installClearHoverOnViewportChange`
          // (BaseLinearDisplay), whose three axes are bpPerPx / offsetPx /
          // scrollTop; a graph view's are its own transform. Its rule is worth
          // restating rather than just citing: a sticky canvas gets no
          // mousemove and no mouseleave for any of them. Not imported because
          // it lives in the LGV plugin and reads a containing LGV, and this
          // plugin deliberately takes no runtime dependency on that plugin
          // (see hoverSync/index.tsx).
          //
          // A `reaction`, not an autorun, for the reason stated there: the
          // effect touches hover state, and an autorun would re-enter itself.
          // Selection is untouched — a click is a choice, and the content
          // moving does not unmake it.
          addDisposer(
            self,
            reaction(
              () => `${self.scale}-${self.translateX}-${self.translateY}`,
              () => {
                self.setHoveredNode(null)
                self.setHoveredEdge(null)
              },
              { name: 'GraphClearHoverOnViewportChange' },
            ),
          )

          // Autorun: debounce viewport dirty flag on pan/zoom (skip first run)
          let firstViewport = true
          addDisposer(
            self,
            autorun(() => {
              void self.scale
              void self.translateX
              void self.translateY
              if (firstViewport) {
                firstViewport = false
              } else {
                self.scheduleViewportDirty()
              }
            }),
          )

          // Autorun: hover/select color-only updates — no geometry rebuild.
          //
          // Also tracks nodeVertexRanges, which a geometry rebuild replaces:
          // the fresh buffers carry base colors, so without re-running here a
          // selected node lost its highlight on every pan and zoom.
          let prevHoveredNode: string | null = null
          let prevHoveredEdge: number | null = null
          let prevSelectedNode: string | null = null
          addDisposer(
            self,
            autorun(() => {
              const b = self.currentRenderingBackend as Renderer | undefined
              const hoveredNode = self.hoveredNode
              const hoveredEdge = self.hoveredEdge
              const selectedNode = self.selectedNode
              const ranges = self.nodeVertexRanges
              if (b) {
                const node = (key: string | null, factor: number) => {
                  applyHighlight(
                    b,
                    'nodes',
                    ranges,
                    self.baseNodeColors,
                    key,
                    factor,
                  )
                }
                const arrow = (key: number | null, factor: number) => {
                  applyHighlight(
                    b,
                    'arrows',
                    self.arrowVertexRanges,
                    self.baseArrowColors,
                    key,
                    factor,
                  )
                }

                // Nodes and arrowheads live in vertex buffers, so the previous
                // frame's brightening has to be written back to base colors
                // before the new frame's goes on.
                node(prevHoveredNode, 1)
                if (prevSelectedNode !== prevHoveredNode) {
                  node(prevSelectedNode, 1)
                }
                arrow(prevHoveredEdge, 1)

                // brighten the current selection, then hover on top of it
                node(selectedNode, SELECT_BRIGHTEN)
                if (hoveredNode !== selectedNode) {
                  node(hoveredNode, HOVER_BRIGHTEN)
                }
                arrow(hoveredEdge, HOVER_BRIGHTEN)

                // An edge is a stroke, not vertices: the renderer overrides its
                // color at draw time, so stating the current one is enough — no
                // restore pass, and no buffer to go stale on a rebuild.
                b.setEdgeHighlight(hoveredEdge, HOVER_BRIGHTEN)

                prevHoveredNode = hoveredNode
                prevHoveredEdge = hoveredEdge
                prevSelectedNode = selectedNode

                self.renderNow()
              }
            }),
          )
        }

        self.attachRenderingBackend<Renderer>(backend, {
          // Autorun: rebuild geometry when graph data or display options
          // change. scale/translate are untracked so they don't trigger a full
          // rebuild — only the debounced viewportDirty flag does.
          upload: b => {
            b.resize(self.width, self.canvasHeight)
            const nodeById = self.nodeById
            if (self.nodePositions && self.graph && nodeById) {
              // The window moved (debounced pan/zoom), or the positions did (a
              // node drag, coalesced to a frame). Both change the drawing;
              // everything below reads them untracked or not at all.
              void self.viewportDirty
              void self.positionsVersion
              const geometryStart = performance.now()
              const batch = buildGeometry({
                nodePositions: self.nodePositions,
                graph: self.graph,
                nodeById,
                colorScheme: self.effectiveColorScheme,
                contigThickness: self.contigThickness,
                connectorThickness: self.connectorThickness,
                drawPaths: self.effectiveDrawPaths,
                // Untracked, so a zoom does not eagerly rebuild geometry — the
                // debounced viewportDirty bump drives the scale-dependent
                // rebuild (flatness, arrow visibility, viewport culling), same
                // as pan.
                axis: untracked(() => self.axisScale),
                linearLayout: self.linearLayout,
                viewportBounds: untracked(() => computeViewportBounds(self)),
                // Where each node sits on the reference and what interval the
                // hue spans. Held against the graph rather than derived here,
                // the same way `deletions` is and for the same reason — see
                // the `referenceRamp` view.
                referenceRamp: self.referenceRamp,
                deletions: self.deletionEdgeIndexes,
                // Read tracked above; passed here so the shared edge-curve
                // cache can tell a drag from a pan.
                version: self.positionsVersion,
              })
              b.uploadGeometry(batch)
              self.storeRenderBatchMeta(batch)
              self.setGeometryMetrics(
                performance.now() - geometryStart,
                batch.nodes.vertexCount,
              )
            }
          },
          // Autorun: re-render on pan/zoom/darkMode without rebuilding geometry
          render: b => {
            if (!self.nodePositions) {
              return false
            }
            const dpr = window.devicePixelRatio || 1
            b.updateTransform({
              scaleX: self.scaleX * dpr,
              scaleY: self.scaleY * dpr,
              translateX: self.translateX * dpr,
              translateY: self.translateY * dpr,
              viewportWidth: self.width * dpr,
              viewportHeight: self.canvasHeight * dpr,
            })
            b.render(self.darkMode ? [0.12, 0.12, 0.12, 1] : [1, 1, 1, 1])
            return true
          },
        })
      },
    }))
    .actions(self => ({
      // Fetch and render the whole GFA named by `gfaLocation`. loadGFA leaves
      // `gfaLocation` intact, so the source round-trips through a session
      // snapshot.
      loadFromLocation: flow(function* () {
        const loc = self.gfaLocation
        if (loc) {
          try {
            const text = yield openLocation(loc).readFile('utf8')
            const name =
              'uri' in loc ? (loc.uri.split('/').pop() ?? 'GFA') : 'GFA'
            yield self.loadGFA(text, name)
          } catch (e) {
            console.error('[GraphGenomeView.loadFromLocation]', e)
            self.setError(e)
          }
        }
      }),
    }))
    .actions(self => ({
      // A declaratively-instantiated view loads itself on attach, from either
      // declarative source: a whole-GFA `gfaLocation`, or the
      // `loadedTrackId`/`loadedRegion` pair the launch menu writes and a
      // reloaded session restores.
      //
      // This has to happen here rather than when the rendering backend starts:
      // the canvas only mounts once `hasGraph` is true (the import form shows
      // until then), so a view whose graph must be fetched would never fetch it.
      afterAttach() {
        // A restored session that already carries a non-default transform is
        // the user's own view — mark it so the fit autorun leaves it alone.
        if (!self.isDefaultViewport) {
          self.userMovedViewport = true
        }
        if (self.gfaLocation && !self.graph) {
          void self.loadFromLocation()
        }
        void self.refetchIfNeeded()
      },
    }))
    .actions(self => ({
      // Move the linear view already on screen, or open one if there is none,
      // and pair with whichever it was. A view being created gets the session's
      // annotation for the assembly it opens on (see launchTracks), led by the
      // graph's own segments track when the launch is on the reference — the one
      // assembly that track is configured for.
      showInLinearView(target: { location: GraphLocation; assembly: string }) {
        const session = getSession(self)
        const viewId = showInLinearView({
          session,
          location: target.location,
          assembly: target.assembly,
          connectedViewId: self.connectedViewId,
          tracks: launchTracks({
            session,
            assemblyName: target.assembly,
            first:
              self.loadedTrackId &&
              target.assembly === self.loadedRegion?.assemblyName
                ? self.loadedTrackId
                : undefined,
          }),
        })
        self.pairWithLinearView(viewId)
      },
      // Mark the node's reference interval in the linear view beside the graph.
      // Not an action that opens anything: with no view to mark, the menu does
      // not offer it (see nodeLaunchMenuItems).
      highlightInLinearView(target: {
        location: GraphLocation
        assembly: string
      }) {
        highlightInLinearView({
          session: getSession(self),
          location: target.location,
          assembly: target.assembly,
          connectedViewId: self.connectedViewId,
        })
      },
      showSyntenyView(trackId: string) {
        launchSyntenyView({
          session: getSession(self),
          contributors: self.launchableAssemblies,
          trackId,
        })
      },
    }))
    .views(self => ({
      // Synteny datasets that could fill the panels of a multi-genome launch.
      // Below two openable contributors there is nothing to compare, so the scan
      // is skipped rather than run and discarded.
      get syntenyLaunchTracks() {
        const samples = self.launchableAssemblies.map(c => c.sample)
        return samples.length >= 2
          ? launchableSyntenyTracks(getSession(self), samples)
          : []
      },
    }))
    .views(self => ({
      // The graph's way out, in the same shared "Launch view" submenu every
      // other view contributes to. Until this existed the triangle had two edges:
      // a linear view could open a graph or a synteny view of a locus, and the
      // graph could open nothing at all.
      menuItems(): MenuItem[] {
        const items: MenuItem[] = []
        for (const item of graphLaunchMenuItems({
          contributors: self.launchableAssemblies,
          syntenyTracks: self.syntenyLaunchTracks,
          onShowLinear: target => {
            self.showInLinearView(target)
          },
          onShowSynteny: trackId => {
            self.showSyntenyView(trackId)
          },
        })) {
          pushLaunchViewMenuItem(items, item)
        }
        return items
      },
    }))
}

export type GraphGenomeViewModel = ReturnType<
  ReturnType<typeof stateModelFactory>['create']
>
