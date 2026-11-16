import { chipReadoutAt } from './LabelLayer'

import type { GenePin } from '@jbrowse/bandage-core/genes/genePins'

const pin: GenePin = {
  gene: {
    name: 'CFHR3',
    refName: 'HG00097#1#CM1',
    start: 5011,
    end: 5019,
    strand: 1,
    exons: [],
  },
  exons: '',
  exonsByNode: [],
  nodeIds: new Set(['h0+']),
  at: { x: 0, y: 0 },
  covered: 1,
  onReference: false,
  walks: 1,
}

test("a chip's readout names the gene as the chip does, a copy with its haplotype", () => {
  const name = 'CFHR3 · HG00097#1'
  const genes = [{ item: { pin, name }, x: 100, y: 50, w: 90, text: name }]
  expect(chipReadoutAt({ genes }, 100, 50)).toEqual({
    label: name,
    readout: 'HG00097#1#CM1:5,011-5,019',
  })
  expect(chipReadoutAt({ genes }, 400, 50)).toBeUndefined()
})
