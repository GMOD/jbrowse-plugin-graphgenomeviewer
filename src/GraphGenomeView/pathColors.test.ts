import { pathCssColor, pathLegend } from './pathColors'

test('a P record legend is labelled by sample', () => {
  expect(
    pathLegend([
      { name: 'K12#1#chr:1004500-1004961', nodeIds: [] },
      { name: 'IAI39#1#chr:2249412-2249872', nodeIds: [] },
    ]),
  ).toEqual([
    { name: 'K12#1#chr:1004500-1004961', label: 'K12', color: pathCssColor('K12#1#chr:1004500-1004961') },
    { name: 'IAI39#1#chr:2249412-2249872', label: 'IAI39', color: pathCssColor('IAI39#1#chr:2249412-2249872') },
  ])
})

test('two haplotypes of one sample widen every label, not just theirs', () => {
  expect(
    pathLegend([
      { name: 'HG00738#1', nodeIds: [] },
      { name: 'HG00738#2', nodeIds: [] },
      { name: 'GRCh38#0', nodeIds: [] },
    ]).map(e => e.label),
  ).toEqual(['HG00738#1', 'HG00738#2', 'GRCh38#0'])
})

test('a colour is a function of the full path name', () => {
  expect(pathCssColor('K12#1#chr')).toMatch(/^hsl\(\d+, 70%, 50%\)$/)
  expect(pathCssColor('K12#1#chr')).not.toBe(pathCssColor('Sakai#1#chr'))
})
