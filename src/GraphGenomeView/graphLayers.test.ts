import { DEFAULT_LAYERS, layersOf, withLayer } from './graphLayers'

test('unset draws the default layers', () => {
  expect([...layersOf(undefined)]).toEqual(DEFAULT_LAYERS)
  expect([...layersOf([])]).toEqual([])
})

test('a toggle adds or drops one layer and keeps the rest', () => {
  expect(withLayer(undefined, 'bubbles', true)).toEqual([
    ...DEFAULT_LAYERS,
    'bubbles',
  ])
  expect(withLayer(['genes', 'paths'], 'genes', false)).toEqual(['paths'])
})
