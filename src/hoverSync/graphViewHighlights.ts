export interface HighlightRegion {
  refName: string
  start: number
  end: number
  assemblyName?: string
}

export interface GraphViewHighlight {
  key: string
  region: HighlightRegion
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readRegion(value: unknown): HighlightRegion | undefined {
  let region: HighlightRegion | undefined
  if (isRecord(value)) {
    const { refName, start, end, assemblyName } = value
    if (
      typeof refName === 'string' &&
      typeof start === 'number' &&
      typeof end === 'number'
    ) {
      region = {
        refName,
        start,
        end,
        assemblyName:
          typeof assemblyName === 'string' ? assemblyName : undefined,
      }
    }
  }
  return region
}

// Whether a graph view's highlights belong on a given linear view.
// `connectedViewId` is written by the launch menu, so a launched pair is
// explicit. A graph view without one — a hand-written session snapshot, or
// `Add > Graph genome view` followed by a subgraph load — matches any linear
// view, because the alternative is silently drawing nothing.
function isConnected(view: Record<string, unknown>, linearViewId: string) {
  const connectedViewId = view.connectedViewId
  return connectedViewId === undefined || connectedViewId === linearViewId
}

// The highlights a linear view should draw for the graph views connected to it.
// Reads `session.views` structurally: the members it needs are declared by
// GraphGenomeView, not by the AbstractViewModel the session array is typed as.
export function graphViewHighlights(
  views: unknown[],
  linearViewId: string,
): GraphViewHighlight[] {
  const highlights: GraphViewHighlight[] = []
  for (const view of views) {
    if (
      isRecord(view) &&
      view.type === 'GraphGenomeView' &&
      isConnected(view, linearViewId)
    ) {
      const region = readRegion(view.hoverHighlight)
      if (region) {
        highlights.push({
          key: typeof view.id === 'string' ? view.id : 'graph',
          region,
        })
      }
    }
  }
  return highlights
}
