// Vertical spacing for the two row layouts, in SCREEN PIXELS.
//
// One row per rank (anchored) or per contributing assembly (sample rows). Both
// used to set this in bp, as a fraction of the window span, and the view scaled
// both axes by one number — so a row pitch was 5% of the drawn width whatever
// the row was holding. Three separate things were that one decision:
//
//   - a two-row graph got a ~46 px pitch for a 10 px tube, i.e. most of the
//     pane was the gap between two lines ("the different rank rows are quite
//     tall, we need compressed visualizations with efficient use of y-axis real
//     estate", hprc_graph_vs_callset review);
//   - past ~12 rows the drawing was taller than it was wide, so zoom-to-fit
//     bound on the VERTICAL axis and the backbone shrank to a fraction of the
//     width — it stopped sitting under the linear view's x axis, which is the
//     one thing a row layout is for;
//   - a ceiling had to be bolted on (0.35 of the span, total) to hold the
//     second one off, which then squeezed a 40-row graph to an 8 px pitch and
//     made the labels touch.
//
// A row pitch is a property of what a row has to hold — a 10 px tube and an
// 11 px label — and of nothing else, so it is a constant here and the y axis is
// no longer scaled at all (LayoutResult.pixelRows, and the model's scaleY).
// Rows past the pane's ceiling are reached by panning, the way a track's rows
// are, rather than by shrinking every row until they all fit.
//
// 20 px is the measured floor from when the ceiling was in force: 17 rows over
// the 320 px it allowed is ~20 px a row, and tighter than that the labels
// touch. So the graphs that were already at the ceiling do not move.
export const ROW_HEIGHT_PX = 20
