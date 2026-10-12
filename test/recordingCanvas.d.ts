declare module '@jbrowse/bandage-core/renderer/recordingCanvas' {
  export function recordingCanvas(): {
    canvas: HTMLCanvasElement
    strokes: string[]
    fills: string[]
    lineWidths: number[]
    points: { x: number; y: number }[]
    clears: () => number
  }
}
