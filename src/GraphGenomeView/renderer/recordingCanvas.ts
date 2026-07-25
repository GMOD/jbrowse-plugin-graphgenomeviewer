// Test support: a 2D context that records what it was asked to draw. jsdom
// implements no canvas backend, so there is no real context to render into and no
// pixels to read back; counting draw calls is what is available here, and it is
// enough for the two things worth asserting about this renderer.
//
// Draw-call counts are also the only *deterministic* performance signal available
// in a unit test -- wall-clock is machine- and load-dependent, so a timing bound
// loose enough not to flake is too loose to catch a 3x regression. See
// agent-docs/GRAPH_SCALE_AND_LOD.md.
//
// Not bundled: nothing under src/index.ts imports this, so it never ships. Same
// arrangement as launchSubgraph/testEnv.ts.

export interface RecordedDraws {
  strokes: string[]
  fills: string[]
}

export function recordingCanvas() {
  const strokes: string[] = []
  const fills: string[] = []
  const ctx = {
    canvas: { width: 800, height: 600, style: {} },
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    lineCap: '',
    lineJoin: '',
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    bezierCurveTo: () => {},
    fillRect: () => {},
    stroke: () => {
      strokes.push(ctx.strokeStyle)
    },
    fill: () => {
      fills.push(ctx.fillStyle)
    },
  }
  // The element is real (jsdom gives a genuine HTMLCanvasElement); only the
  // context is a stand-in, which is the one cast this needs.
  const canvas = document.createElement('canvas')
  canvas.getContext = () => ctx as unknown as CanvasRenderingContext2D
  return { canvas, strokes, fills }
}
