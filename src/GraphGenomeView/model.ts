import { readConfObject } from '@jbrowse/core/configuration'
import BaseViewModel from '@jbrowse/core/pluggableElementTypes/models/BaseViewModel'
import { getSession, isSessionModelWithWidgets } from '@jbrowse/core/util'
import { openLocation } from '@jbrowse/core/util/io'
import { addDisposer, flow, isAlive, types } from '@jbrowse/mobx-state-tree'
import { RenderLifecycleMixin } from '@jbrowse/render-core/RenderLifecycleMixin'
import { autorun, untracked } from 'mobx'

import { parseGFA } from '../gfa-core/index'
import { convertGFAToGraph } from './gfa/gfaConverter'
import { bandageAutoScale } from './layout/drawnScale'
import { LAYOUT_MODE_VALUES, layoutModeByValue } from './layoutModes'
import {
  brightenColors,
  buildGeometry,
  extractColorSlice,
} from './renderer/GeometryBuilder'
import { COLOR_SCHEMES } from './types'

import type { BandageScaleOpts } from './layout/drawnScale'
import type {
  RenderBatch,
  Renderer,
  SubBatchKey,
  VertexRange,
} from './renderer/types'
import type { ColorScheme, Graph, GraphNode, LayoutResult } from './types'
import type { FileLocation } from '@jbrowse/core/util/types'

const DEFAULT_CANVAS_HEIGHT = 600
const HOVER_BRIGHTEN = 1.4
const SELECT_BRIGHTEN = 1.6
const VIEWPORT_DEBOUNCE_MS = 150

// Hard size cap for the single-mode graph view. Subgraph extraction is
// sub-second up to ~100 kb; past this the view declines with a "zoom in"
// message rather than switching to a degraded rendering mode — one mode only,
// since the large-region case is a linear synteny view, not a graph.
// (The old `adr-027` citation here was stale: that number was reused for
// wheel-input semantics after the large-mode ADR was removed in 9d8102f0b5.)
export const MAX_GRAPH_REGION_BP = 100_000

const MIN_ZOOM = 0.001
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
          types.enumeration([...COLOR_SCHEMES]),
          'uniform',
        ),
        contigThickness: types.optional(types.number, 10),
        connectorThickness: types.optional(types.number, 4),
        darkMode: types.optional(types.boolean, false),
        scale: types.optional(types.number, 1),
        translateX: types.optional(types.number, 0),
        translateY: types.optional(types.number, 0),
        drawPaths: types.optional(types.boolean, false),
        canvasHeight: types.optional(types.number, DEFAULT_CANVAS_HEIGHT),
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
        // Override the WASM layout-engine base URL (default: the hosted
        // jbrowse.org/demos/bandage). Relative values resolve against the app
        // origin, so a deployment can self-host the engine.
        layoutUrl: types.maybe(types.string),
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
      edgeVertexRanges: undefined as Map<number, VertexRange> | undefined,
      arrowVertexRanges: undefined as Map<number, VertexRange> | undefined,
      baseNodeColors: undefined as Uint32Array | undefined,
      baseEdgeColors: undefined as Uint32Array | undefined,
      baseArrowColors: undefined as Uint32Array | undefined,
      draggingNode: null as string | null,
      viewportDirtyTimer: undefined as
        ReturnType<typeof setTimeout> | undefined,
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
      // rGFA declares a rank-0 backbone, so it can be drawn on the reference
      // axis; a plain GFA can only ever be force-laid-out, and offering the
      // choice there would be offering one option twice.
      get canAnchorLayout() {
        return self.graph?.nodes.some(n => n.stable?.rank === 0) ?? false
      },
      get nodePositions() {
        return self.layoutResult?.nodePositions
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
      setLayoutMode(mode: string) {
        self.layoutMode = mode
      },
      setDrawPaths(draw: boolean) {
        self.drawPaths = draw
      },
      setColorScheme(scheme: ColorScheme) {
        self.colorScheme = scheme
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
      showNodeDetails(nodeId: string) {
        const node = self.nodeById?.get(nodeId)
        if (node) {
          const session = getSession(self)
          if (isSessionModelWithWidgets(session)) {
            session.showWidget(
              session.addWidget('BaseFeatureWidget', 'baseFeature', {
                featureData: {
                  id: node.id,
                  name: node.name,
                  length: node.length,
                  depth: node.depth,
                },
              }),
            )
          }
        }
      },

      setTransform(s: number, tx: number, ty: number) {
        self.scale = clampZoom(s)
        self.translateX = tx
        self.translateY = ty
      },
      zoom(factor: number, centerX: number, centerY: number) {
        const newScale = clampZoom(self.scale * factor)
        const ratio = newScale / self.scale
        self.scale = newScale
        self.translateX = centerX - (centerX - self.translateX) * ratio
        self.translateY = centerY - (centerY - self.translateY) * ratio
      },
      setCanvasHeight(height: number) {
        self.canvasHeight = height
      },
      setViewportDirty() {
        self.viewportDirty++
      },
      storeRenderBatchMeta(batch: RenderBatch) {
        self.nodeVertexRanges = batch.nodeVertexRanges
        self.edgeVertexRanges = batch.edgeVertexRanges
        self.arrowVertexRanges = batch.arrowVertexRanges
        self.baseNodeColors = batch.nodes.colors
        self.baseEdgeColors = batch.edges.colors
        self.baseArrowColors = batch.arrows.colors
      },
      zoomToFit() {
        if (!self.layoutResult) {
          return
        }
        const positions: Record<string, { x: number; y: number }[]> =
          self.layoutResult.nodePositions
        let minX = Infinity
        let minY = Infinity
        let maxX = -Infinity
        let maxY = -Infinity
        for (const segments of Object.values(positions)) {
          for (const seg of segments) {
            minX = Math.min(minX, seg.x)
            minY = Math.min(minY, seg.y)
            maxX = Math.max(maxX, seg.x)
            maxY = Math.max(maxY, seg.y)
          }
        }
        const graphWidth = maxX - minX
        const graphHeight = maxY - minY
        if (graphWidth <= 0 || graphHeight <= 0) {
          return
        }
        const padding = 40
        const scaleX = (self.width - padding * 2) / graphWidth
        const scaleY = (self.canvasHeight - padding * 2) / graphHeight
        const newScale = clampZoom(Math.min(scaleX, scaleY))
        self.scale = newScale
        self.translateX =
          padding -
          minX * newScale +
          (self.width - padding * 2 - graphWidth * newScale) / 2
        self.translateY =
          padding -
          minY * newScale +
          (self.canvasHeight - padding * 2 - graphHeight * newScale) / 2
      },
      clearGraph() {
        self.graph = undefined
        self.layoutResult = undefined
        self.error = undefined
        self.isLoading = false
        self.statusMessage = ''
        self.hoveredNode = null
        self.hoveredEdge = null
        self.selectedNode = null
        self.draggingNode = null
        self.nodeVertexRanges = undefined
        self.edgeVertexRanges = undefined
        self.arrowVertexRanges = undefined
        self.baseNodeColors = undefined
        self.baseEdgeColors = undefined
        self.baseArrowColors = undefined
        self.lastFetchMs = undefined
        self.lastLayoutMs = undefined
        self.lastGeometryMs = undefined
        self.lastGeometryVertexCount = undefined
      },
    }))
    .actions(self => ({
      moveNode(nodeId: string, dx: number, dy: number) {
        const positions = self.layoutResult?.nodePositions
        if (positions?.[nodeId]) {
          for (const seg of positions[nodeId]) {
            seg.x += dx
            seg.y += dy
          }
          self.setViewportDirty()
        }
      },
      scheduleViewportDirty() {
        clearTimeout(self.viewportDirtyTimer)
        self.viewportDirtyTimer = setTimeout(() => {
          if (isAlive(self)) {
            self.setViewportDirty()
          }
        }, VIEWPORT_DEBOUNCE_MS)
      },
    }))
    .actions(self => {
      function callLayout(graph: Graph, extraOpts?: BandageScaleOpts) {
        const session = getSession(self)
        const { rpcManager } = session
        // Stable grouping key for the layout RPC; a view has no display-level
        // rpcSessionId. `rpcManager.call` injects sessionId into the args.
        const sessionId = 'graph'
        const layoutUrl = self.layoutUrl
          ? new URL(self.layoutUrl, window.location.href).href
          : undefined
        return rpcManager.call(sessionId, 'GraphComputeLayout', {
          graph: { nodes: graph.nodes, edges: graph.edges },
          options: {
            quality: self.layoutQuality,
            linearLayout: self.linearLayout,
            ...extraOpts,
          },
          layoutUrl,
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
          : ((yield callLayout(graph, bandageAutoScale(graph))) as {
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
        const graph = convertGFAToGraph(gfaGraph, name)
        self.graph = graph
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
            `Region too large (${Math.round(regionSize / 1000)} kb) — zoom in to view graph (max ${MAX_GRAPH_REGION_BP / 1000} kb)`,
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
          // Save pan/zoom — zoomToFit autorun fires when layoutResult is set,
          // overriding the persisted transform; we restore it afterward.
          const savedScale = self.scale
          const savedTx = self.translateX
          const savedTy = self.translateY
          const adapterConfig = readConfObject(track, 'adapter')
          yield* doSubgraphLoad(adapterConfig, self.loadedRegion, {})
          self.scale = savedScale
          self.translateX = savedTx
          self.translateY = savedTy
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
          // Autorun: zoom to fit when a layout result arrives, unless the view
          // already carries a transform (restored session, or the user panned).
          // Skipping the autorun's *first* run instead would swallow the fit
          // whenever the load beat the renderer backend to start — the normal
          // case for a view created from a session spec.
          addDisposer(
            self,
            autorun(() => {
              if (
                self.layoutResult &&
                untracked(() => self.isDefaultViewport)
              ) {
                self.zoomToFit()
              }
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

          // Autorun: hover/select color-only updates — no geometry rebuild
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
              if (b) {
                const node = (key: string | null, factor: number) => {
                  applyHighlight(
                    b,
                    'nodes',
                    self.nodeVertexRanges,
                    self.baseNodeColors,
                    key,
                    factor,
                  )
                }
                const edge = (key: number | null, factor: number) => {
                  applyHighlight(
                    b,
                    'edges',
                    self.edgeVertexRanges,
                    self.baseEdgeColors,
                    key,
                    factor,
                  )
                  applyHighlight(
                    b,
                    'arrows',
                    self.arrowVertexRanges,
                    self.baseArrowColors,
                    key,
                    factor,
                  )
                }

                // restore the previous frame's highlights to base colors
                node(prevHoveredNode, 1)
                if (prevSelectedNode !== prevHoveredNode) {
                  node(prevSelectedNode, 1)
                }
                edge(prevHoveredEdge, 1)

                // brighten the current selection, then hover on top of it
                node(selectedNode, SELECT_BRIGHTEN)
                if (hoveredNode !== selectedNode) {
                  node(hoveredNode, HOVER_BRIGHTEN)
                }
                edge(hoveredEdge, HOVER_BRIGHTEN)

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
        if (self.gfaLocation && !self.graph) {
          void self.loadFromLocation()
        }
        void self.refetchIfNeeded()
      },
    }))
}

export type GraphGenomeViewModel = ReturnType<
  ReturnType<typeof stateModelFactory>['create']
>
