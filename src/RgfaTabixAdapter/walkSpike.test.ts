import { existsSync } from 'node:fs'

import Adapter from './RgfaTabixAdapter.ts'
import configSchema from './configSchema.ts'

// Spike-only: the chr22 walk-indexed files built on 2026-10-08 under
// ~/work/scratch/walks-20261008/spike. Skipped when they are absent.
const prefix = '/home/cdiesh/work/scratch/walks-20261008/spike/chr22'
const present = existsSync(`${prefix}.walks.bed.gz`)

function makeAdapter() {
  const local = (path: string) => ({
    localPath: path,
    locationType: 'LocalPathLocation',
  })
  return new Adapter(
    configSchema.create({
      segmentsLocation: local(`${prefix}.nodes.bed.gz`),
      segmentsIndex: { location: local(`${prefix}.nodes.bed.gz.tbi`) },
      linksLocation: local(`${prefix}.links.bed.gz`),
      linksIndex: { location: local(`${prefix}.links.bed.gz.tbi`) },
      walksLocation: local(`${prefix}.walks.bed.gz`),
      walksIndex: { location: local(`${prefix}.walks.bed.gz.tbi`) },
      assemblyNameToPanSN: { hg38: 'GRCh38', hs1: 'CHM13' },
    }),
  )
}

test.skipIf(!present)('a walk-indexed cut carries W lines', async () => {
  const t0 = performance.now()
  const gfa = await makeAdapter().getSubgraph({
    refName: 'chr22',
    assemblyName: 'hg38',
    start: 20_000_000,
    end: 20_100_000,
  })
  const lines = gfa.split('\n')
  const count = (p: string) => lines.filter(l => l.startsWith(p)).length
  console.log(
    `chr22:20.0-20.1 Mb: ${count('S\t')} S, ${count('L\t')} L, ${count('W\t')} W in ${Math.round(performance.now() - t0)} ms`,
  )
  expect(count('W\t')).toBeGreaterThan(400)
  expect(count('S\t')).toBeGreaterThan(1000)
  const w = lines.find(l => l.startsWith('W\tGRCh38\t'))!
  expect(w.split('\t')[3]).toBe('chr22')
})

test.skipIf(!present)('a CHM13 window cuts from the same files', async () => {
  const gfa = await makeAdapter().getSubgraph({
    refName: 'chr22',
    assemblyName: 'hs1',
    start: 20_000_000,
    end: 20_100_000,
  })
  const lines = gfa.split('\n')
  expect(lines.filter(l => l.startsWith('W\tCHM13\t')).length).toBeGreaterThan(0)
  expect(lines.filter(l => l.startsWith('W\t')).length).toBeGreaterThan(400)
})
