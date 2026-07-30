import { readConfObject } from '@jbrowse/core/configuration'
import BaseViewModel from '@jbrowse/core/pluggableElementTypes/models/BaseViewModel'
import { pushLaunchViewMenuItem } from '@jbrowse/core/ui'
import { getSession, isSessionModelWithWidgets } from '@jbrowse/core/util'
import { openLocation } from '@jbrowse/core/util/io'
import { addDisposer, flow, isAlive, types } from '@jbrowse/mobx-state-tree'
import { RenderLifecycleMixin } from '@jbrowse/render-core/RenderLifecycleMixin'
import { autorun, untracked } from 'mobx'

import { backboneNodes, backboneSpan } from './anchoredNodes'
import { BUBBLE_SPREAD_VALUES, minNodeLengthFor } from './bubbleSpreads'
import { COLOR_SCHEME_VALUES } from './colorSchemes'
import { deletionEdges } from './deletionEdges'
import { parseGFA } from '../gfa-core/index'
import { convertGFAToGraph } from './gfa/gfaConverter'
import { bandageAutoScale } from './layout/drawnScale'
import { LAYOUT_MODE_VALUES, layoutModeByValue } from './layoutModes'
import { anchorFromPaths, anchorGraph } from './pathAnchoring'
import { buildNeighbors, nodeReferenceSpan } from './referenceSpan'
import {
  brightenColors,
  buildGeometry,
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
import type { ColorScheme } from './colorSchemes'
import type { BandageScaleOpts } from './layout/drawnScale'
import type { LayoutModeValue } from './layoutModes'
import type {
  RenderBatch,
  Renderer,
  SubBatchKey,
  VertexRange,
} from './renderer/types'
import type { Graph, GraphNode, LayoutResult } from './types'
import type { GraphLocation } from '../launchFromGraph/contributors'
import type { MenuItem } from '@jbrowse/core/ui'
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

function computeViewportBounds(model: {
  translateX: number
  translateY: number
  width: number
  scale: number
  canvasHeight: number
}) {
  const padding = 0.2
  const minX = -model.translateX / model.scale
  const minY = -model.translateY / model.scale
  const maxX = (model.width - model.translateX) / model.scale
  const maxY = (model.canvasHeight - model.translateY) / model.scale
  const w = maxX - minX
  const h = maxY - minY
  return {
    minX: minX - w * padding,
    minY: minY - h * padding,
    maxX: maxX + w * padding,
    maxY: maxY + h * padding,
  }
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
        layoutQuality: types.optional(types.number, 1),
        linearLayout: types.optional(types.boolean, false),
        // Which drawing to use; the modes and their fallbacks are described in
        // LAYOUT_MODES. Default 'auto' is the anchored layout, which puts x on
        // the reference axis so the graph lines up with a linear view above it,
        // falling through to FMMM for a GFA with no backbone to anchor to.
        layoutMode: types.optional(
          types.enumeration(LAYOUT_MODE_VALUES),
          'auto',
        ),
        colorScheme: types.optional(
          types.enumeration(COLOR_SCHEME_VALUES),
          'uniform',
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
        contigThickness: types.optional(types.number, 10),
        connectorThickness: types.optional(types.number, 4),
        darkMode: types.optional(types.boolean, false),
        scale: types.optional(types.number, 1),
        translateX: types.optional(types.number, 0),
        translateY: types.optional(types.number, 0),
        drawPaths: types.optional(types.boolean, false),
        // Raise to draw a bigger graph than the default budget allows; see
        // DEFAULT_MAX_GRAPH_NODES for what the numbers cost.
        maxGraphNodes: types.optional(types.number, DEFAULT_MAX_GRAPH_NODES),
        loadedTrackId: types.optional(types.string, ''),
        loadedRegion: types.maybe(
          types.frozen<{
            refName: string
            assemblyName: string
            start: number
            end: number
          }>(),
        ),
        // Whole-GFA source loaded on attach — lets a GraphGenomeView be
        // instantiated declaratively from a session/config snapshot.
        gfaLocation: types.maybe(types.frozen<FileLocation>()),
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
      viewportDirtyFrame: 0,
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
      get nodePositions() {
        return self.layoutResult?.nodePositions
      },
      // Empty rather than undefined: every consumer maps over it, and a layout
      // with no row structure (FMMM) is a normal state, not a missing one.
      get rowLabels() {
        return self.layoutResult?.rowLabels ?? []
      },
      // Extent of the drawing in layout units, or undefined before there is
      // one. Shared by the pane height and by zoomToFit so the two cannot
      // measure the same graph differently.
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
          bounds = { minX, minY, w: maxX - minX, h: maxY - minY }
        }
        return bounds
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
      // The pane is as tall as the drawing, rather than a fixed box the drawing
      // floats in the middle of. Row spacing on the reference-anchored layouts
      // is a fraction of the reference span, so those layouts have a pinned
      // aspect ratio and can never fill a tall pane: measured on the ecoli
      // slice, 178 px of rows sat in the old 600 px pane with 211 px of dead
      // space above and below, and narrowing the pane made it worse.
      //
      // x is therefore what limits the fit, so the height follows from the
      // x-fit scale — a function of `width` alone. It reads neither `scale` nor
      // the height it is replacing, so zoomToFit consumes this without feeding
      // back into it, and the pane does not resize as the user zooms.
      get canvasHeight() {
        const bounds = self.layoutBounds
        const usableWidth = self.width - FIT_PADDING * 2
        return bounds && bounds.w > 0 && usableWidth > 0
          ? Math.min(
              MAX_CANVAS_HEIGHT,
              Math.max(
                MIN_CANVAS_HEIGHT,
                (bounds.h * usableWidth) / bounds.w + FIT_PADDING * 2,
              ),
            )
          : MAX_CANVAS_HEIGHT
      },
    }))
    .views(self => ({
      // The reference interval of the hovered node, for a connected linear view
      // to highlight. Only a graph cut from a track has one: a whole-file import
      // has no region, and its stable names need not name anything in a loaded
      // assembly.
      get deletionEdgeIndexes() {
        return new Set(self.deletions.map(d => d.edgeIndex))
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
          getSession(self).assemblyNames,
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
        const loaded = new Set(getSession(self).assemblyNames)
        const region = self.loadedRegion
        const nodeById = self.nodeById
        const neighbors = self.nodeNeighbors
        const span =
          region && nodeById && neighbors
            ? nodeReferenceSpan({ nodeId, nodeById, neighbors })
            : undefined
        return {
          own:
            own && loaded.has(own.sample)
              ? { location: paddedLocation(own), assembly: own.sample }
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
        if (self.graph?.anchoredBy === 'paths') {
          self.graph = anchorFromPaths(self.graph, name)
        }
      },
      setDrawPaths(draw: boolean) {
        self.drawPaths = draw
      },
      setColorScheme(scheme: ColorScheme) {
        self.colorScheme = scheme
      },
      setBubbleSpread(spread: BubbleSpread) {
        self.bubbleSpread = spread
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
        self.translateY = centerY - (centerY - self.translateY) * ratio
      },
      setViewportDirty() {
        self.viewportDirty++
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
          (bounds.w > 0 || bounds.h > 0) &&
          usableWidth > 0 &&
          usableHeight > 0
        ) {
          // Whichever axis binds, the leftover on the other is split evenly.
          // For a row layout that is x, and canvasHeight is derived from the
          // same x-fit, so the vertical leftover it centers is ~0.
          const newScale = clampZoom(
            Math.min(
              bounds.w > 0 ? usableWidth / bounds.w : Infinity,
              bounds.h > 0 ? usableHeight / bounds.h : Infinity,
            ),
          )
          self.scale = newScale
          self.translateX =
            FIT_PADDING -
            bounds.minX * newScale +
            (usableWidth - bounds.w * newScale) / 2
          self.translateY =
            FIT_PADDING -
            bounds.minY * newScale +
            (usableHeight - bounds.h * newScale) / 2
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
      function requestViewportDirtyFrame() {
        cancelAnimationFrame(self.viewportDirtyFrame)
        self.viewportDirtyFrame = requestAnimationFrame(() => {
          if (isAlive(self)) {
            self.setViewportDirty()
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
        moveNode(nodeId: string, dx: number, dy: number) {
          const positions = self.layoutResult?.nodePositions
          if (positions?.[nodeId]) {
            for (const seg of positions[nodeId]) {
              seg.x += dx
              seg.y += dy
            }
            requestViewportDirtyFrame()
          }
        },
        scheduleViewportDirty,
      }
    })
    .actions(self => {
      function callLayout(graph: Graph, extraOpts?: BandageScaleOpts) {
        const session = getSession(self)
        const { rpcManager } = session
        // Stable grouping key for the layout RPC; a view has no display-level
        // rpcSessionId. `rpcManager.call` injects sessionId into the args.
        const sessionId = 'graph'
        return rpcManager.call(sessionId, 'GraphComputeLayout', {
          graph: { nodes: graph.nodes, edges: graph.edges },
          options: {
            quality: self.layoutQuality,
            linearLayout: self.linearLayout,
            ...extraOpts,
          },
          statusCallback: (message: string) => {
            self.setStatusMessage(message)
          },
        }) as Promise<{ result: LayoutResult; duration: number }>
      }

      // Single dispatch point for every layout mode. A mode that returns a
      // result computed it locally; one that returns undefined can't draw this
      // graph and hands off to the remote FMMM engine, which is also how
      // 'force' is expressed. See LAYOUT_MODES.
      function* computeLayout(graph: Graph) {
        const start = performance.now()
        const local = layoutModeByValue(self.layoutMode).run(graph)
        return local
          ? { result: local, duration: performance.now() - start }
          : ((yield callLayout(
              graph,
              bandageAutoScale(graph, minNodeLengthFor(self.bubbleSpread)),
            )) as {
              result: LayoutResult
              duration: number
            })
      }

      // Applied under a guard because a layout is async and the user can load a
      // different graph while one is in flight; the stale result must not land.
      function* layoutInto(graph: Graph) {
        const { result, duration } = yield* computeLayout(graph)
        if (self.graph === graph) {
          self.layoutResult = result
          self.setLayoutMs(duration)
        }
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
        if (regionSize > MAX_GRAPH_REGION_BP) {
          // One mode only: past the size cap the graph view declines rather
          // than degrading to a non-graph rectangle rendering. Large-region and
          // full-genome comparison is a linear synteny view instead.
          self.graph = undefined
          self.layoutResult = undefined
          self.error = new Error(
            `Region too large (${formatSpanBp(regionSize)}) — zoom in to view graph (max ${formatSpanBp(MAX_GRAPH_REGION_BP)})`,
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
            context?: number
            trackId?: string
          } = {},
        ) {
          self.loadedTrackId = opts.trackId ?? ''
          self.loadedRegion = opts.trackId ? region : undefined
          yield* doSubgraphLoad(adapterConfig, region, opts)
        }),
        refetchIfNeeded: flow(function* () {
          if (!self.loadedTrackId || !self.loadedRegion || self.graph) {
            return
          }
          const session = getSession(self)
          const track = session.tracks.find(
            t => t.trackId === self.loadedTrackId,
          )
          if (!track) {
            return
          }
          // Nothing here saves and restores the transform: `userMovedViewport`
          // is what protects a restored session's pan/zoom, and it gates the fit
          // autorun — the only thing in this flow that would otherwise move the
          // view. A save/restore pair around the load wrote back the values it
          // had just read.
          const adapterConfig = readConfObject(track, 'adapter')
          yield* doSubgraphLoad(adapterConfig, self.loadedRegion, {})
        }),
        recomputeLayout: flow(function* () {
          const graph = self.graph
          if (!graph) {
            return
          }
          self.isLoading = true
          self.setStatusMessage('Computing layout')

          try {
            yield* layoutInto(graph)
          } catch (e) {
            console.error('[GraphGenomeView.recomputeLayout]', e)
            self.error = e
          } finally {
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
              void self.viewportDirty
              const geometryStart = performance.now()
              const batch = buildGeometry({
                nodePositions: self.nodePositions,
                graph: self.graph,
                nodeById,
                colorScheme: self.colorScheme,
                contigThickness: self.contigThickness,
                connectorThickness: self.connectorThickness,
                drawPaths: self.drawPaths,
                // scale is untracked so a zoom doesn't eagerly rebuild
                // geometry — the debounced viewportDirty bump drives the
                // scale-dependent rebuild (flatness, arrow visibility,
                // viewport culling), same as pan.
                scale: untracked(() => self.scale),
                linearLayout: self.linearLayout,
                viewportBounds: untracked(() => computeViewportBounds(self)),
                // the region the subgraph was cut from, which is what the
                // reference-position ramp spans. A whole-file import has none
                // and the ramp falls back to the drawn extent.
                colorDomain: self.loadedRegion,
                deletions: self.deletionEdgeIndexes,
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
              scaleX: self.scale * dpr,
              scaleY: self.scale * dpr,
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
