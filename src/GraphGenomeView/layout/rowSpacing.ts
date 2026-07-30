// Vertical spacing for the two row layouts, in bp so it tracks the x axis.
//
// One row per rank (anchored) or per contributing assembly (sample rows), and
// both used to take a flat 5% of the window span per row. That is a per-row
// constant with no ceiling on the total, so the drawing's aspect ratio grows
// with the row count and the pane grows with it: at HPRC's MHC class II window
// the graph rows 16 haplotypes plus the backbone, which is 0.8 of the span tall
// and clears `MAX_CANVAS_HEIGHT`, so 600 px of pane carries 17 thin dashes.
// Worse, once the pane clips, zoom-to-fit binds on the *vertical* axis and the
// backbone shrinks to a fraction of the width — it stops sitting under the
// linear view's x axis, which is the one thing a row layout is for.
//
// So the total gets the ceiling, and the per-row spacing follows from it. Below
// the ceiling nothing changes: a window with a handful of rows keeps the 5% it
// always had.
const ROW_SPACING_SPAN_FRACTION = 0.05

// Ceiling on the whole drawing's height, as a fraction of the window span.
// canvasHeight is `bounds.h / bounds.w * usableWidth`, so this is what the pane
// costs: at the ~920 px usable width these figures render at, 0.35 is a 320 px
// drawing in a 400 px pane whatever the row count, against 600 px clipped. It
// also keeps the aspect under the 520/920 at which the vertical axis would
// start binding the fit.
//
// The floor it implies is what sets it: 17 rows over 320 px is ~20 px a row,
// against a 10 px node thickness and a 12 px row label. Tighter and the labels
// touch.
const MAX_TOTAL_SPAN_FRACTION = 0.35

export function rowSpacing(span: number, rowCount: number) {
  return (
    span *
    Math.min(
      ROW_SPACING_SPAN_FRACTION,
      MAX_TOTAL_SPAN_FRACTION / Math.max(rowCount - 1, 1),
    )
  )
}
