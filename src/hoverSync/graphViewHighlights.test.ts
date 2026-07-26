import { graphViewHighlights } from './graphViewHighlights'

const HIGHLIGHT = {
  refName: 'chr6',
  start: 32_500_000,
  end: 32_501_000,
  assemblyName: 'hg38',
}

function graphView(props: Record<string, unknown>) {
  return { id: 'graph1', type: 'GraphGenomeView', ...props }
}

test('a graph view launched from this linear view contributes its highlight', () => {
  expect(
    graphViewHighlights(
      [graphView({ connectedViewId: 'lgv1', hoverHighlight: HIGHLIGHT })],
      'lgv1',
    ),
  ).toEqual([{ key: 'graph1', region: HIGHLIGHT }])
})

test('a graph view launched from a different linear view is ignored', () => {
  expect(
    graphViewHighlights(
      [graphView({ connectedViewId: 'lgv2', hoverHighlight: HIGHLIGHT })],
      'lgv1',
    ),
  ).toEqual([])
})

// A hand-written session snapshot (the docs figures build one) carries
// loadedRegion but no connectedViewId. Drawing nothing there would make the
// feature look broken, so an unpaired graph view broadcasts.
test('a graph view with no connection broadcasts to any linear view', () => {
  expect(
    graphViewHighlights([graphView({ hoverHighlight: HIGHLIGHT })], 'lgv1'),
  ).toHaveLength(1)
})

test('nothing hovered means nothing to draw', () => {
  expect(
    graphViewHighlights([graphView({ connectedViewId: 'lgv1' })], 'lgv1'),
  ).toEqual([])
})

test('other view types never contribute', () => {
  expect(
    graphViewHighlights(
      [{ id: 'lgv2', type: 'LinearGenomeView', hoverHighlight: HIGHLIGHT }],
      'lgv1',
    ),
  ).toEqual([])
})

test('an incomplete highlight is skipped rather than drawn at NaN', () => {
  expect(
    graphViewHighlights(
      [graphView({ hoverHighlight: { refName: 'chr6', start: 1 } })],
      'lgv1',
    ),
  ).toEqual([])
})

test('several connected graph views each contribute a highlight', () => {
  const views = [
    { id: 'a', type: 'GraphGenomeView', hoverHighlight: HIGHLIGHT },
    { id: 'b', type: 'GraphGenomeView', hoverHighlight: HIGHLIGHT },
  ]
  expect(graphViewHighlights(views, 'lgv1').map(h => h.key)).toEqual(['a', 'b'])
})
