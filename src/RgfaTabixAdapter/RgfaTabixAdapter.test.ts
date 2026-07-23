import { firstValueFrom } from 'rxjs'
import { toArray } from 'rxjs/operators'

import Adapter from './RgfaTabixAdapter.ts'
import configSchema from './configSchema.ts'

// Built by scripts/build_rgfa_tabix.sh from the minigraph rGFA of four E. coli
// strains at jbrowse.org/demos/ecoli_pangenome/ecoli_rgfa_slice.gfa (the
// pangenome tutorial's figure data): 161 segments across four stable sequences,
// ranks 0-3. Named rgfa_ecoli rather than ecoli_rgfa because the repo's
// .gitignore ignores `ecoli_*` (the multi-GB pangenome build dirs).
const prefix = require
  .resolve('./test_data/rgfa_ecoli.segs.bed.gz')
  .replace(/\.segs\.bed\.gz$/, '')

function makeAdapter() {
  const local = (path: string) => ({
    localPath: path,
    locationType: 'LocalPathLocation',
  })
  return new Adapter(
    configSchema.create({
      segmentsLocation: local(`${prefix}.segs.bed.gz`),
      segmentsIndex: { location: local(`${prefix}.segs.bed.gz.tbi`) },
      linksLocation: local(`${prefix}.links.bed.gz`),
      linksIndex: { location: local(`${prefix}.links.bed.gz.tbi`) },
    }),
  )
}

// The graph names its stable sequences PanSN (`K12#1#chr`); an assembly asking
// for them names them `chr` in assembly `K12`.
const k12 = {
  refName: 'chr',
  assemblyName: 'K12',
  start: 993236,
  end: 997574,
}

test('getRefNames lists the stable sequences', async () => {
  expect(await makeAdapter().getRefNames()).toEqual([
    'CFT073#1#chr',
    'K12#1#chr',
    'NCTC86#1#chr',
    'Sakai#1#chr',
  ])
})

test('getFeatures returns the segments on a stable sequence', async () => {
  const features = await firstValueFrom(
    makeAdapter().getFeatures(k12).pipe(toArray()),
  )
  expect(
    features.map(f => ({
      name: f.get('name'),
      start: f.get('start'),
      end: f.get('end'),
      rank: f.get('rank'),
    })),
  ).toEqual([
    { name: 's322', start: 993236, end: 993310, rank: 0 },
    { name: 's323', start: 993310, end: 997574, rank: 0 },
  ])
})

test('getFeatures resolves a PanSN name given unqualified', async () => {
  const qualified = await firstValueFrom(
    makeAdapter()
      .getFeatures({ ...k12, refName: 'K12#1#chr' })
      .pipe(toArray()),
  )
  expect(qualified.map(f => f.get('name'))).toEqual(['s322', 's323'])
})

test('getFeatures is empty for a sequence the graph does not anchor to', async () => {
  const features = await firstValueFrom(
    makeAdapter()
      .getFeatures({ ...k12, assemblyName: 'volvox', refName: 'ctgA' })
      .pipe(toArray()),
  )
  expect(features).toEqual([])
})

// The point of the two-file index: a region on the reference backbone reaches
// the rank>0 segments hanging off it, which live at their own coordinates on
// another stable sequence (here CFT073) and so can never be found by a
// coordinate query on this region.
test('getSubgraph reaches off-reference neighbours', async () => {
  const gfa = await makeAdapter().getSubgraph(k12)
  expect(gfa).toBe(
    [
      'H\tVN:Z:1.0',
      'S\ts1727\t*\tLN:i:226\tSN:Z:CFT073#1#chr\tSO:i:1044024\tSR:i:2',
      'S\ts1728\t*\tLN:i:75\tSN:Z:CFT073#1#chr\tSO:i:1048515\tSR:i:2',
      'S\ts322\t*\tLN:i:74\tSN:Z:K12#1#chr\tSO:i:993236\tSR:i:0',
      'S\ts323\t*\tLN:i:4264\tSN:Z:K12#1#chr\tSO:i:993310\tSR:i:0',
      'S\ts324\t*\tLN:i:7093\tSN:Z:K12#1#chr\tSO:i:997574\tSR:i:0',
      'L\ts1727\t+\ts323\t+\t0M',
      'L\ts322\t+\ts323\t+\t0M',
      'L\ts323\t+\ts1728\t+\t0M',
      'L\ts323\t+\ts324\t+\t0M',
    ].join('\n'),
  )
})

test('getSubgraph is byte-identical across calls', async () => {
  const adapter = makeAdapter()
  expect(await adapter.getSubgraph(k12)).toBe(await adapter.getSubgraph(k12))
})

// context expands by whole link hops, following each newly reached segment from
// its own stable coordinates — which every link row carries.
test('getSubgraph context adds another hop', async () => {
  const adapter = makeAdapter()
  const ids = (gfa: string) =>
    gfa
      .split('\n')
      .filter(l => l.startsWith('S'))
      .map(l => l.split('\t')[1]!)

  const near = ids(await adapter.getSubgraph(k12))
  const far = ids(await adapter.getSubgraph(k12, { context: 1 }))
  expect(far.length).toBeGreaterThan(near.length)
  expect(far).toEqual(expect.arrayContaining(near))
})

test('getSubgraph returns a bare header outside the graph', async () => {
  const gfa = await makeAdapter().getSubgraph({
    ...k12,
    assemblyName: 'volvox',
    refName: 'ctgA',
  })
  expect(gfa).toBe('H\tVN:Z:1.0')
})

// Minigraph-Cactus writes PanSN stable names, so HPRC release 2 calls the
// reference `GRCh38#0#chr1` while the JBrowse assembly is `hg38`. This reuses
// the `assemblyNameToPanSN` slot and helper the all-vs-all PAF adapters use.
// Matching on the bare contig instead is not an option: that graph also carries
// `CHM13#0#chr1`, so it would silently resolve to the wrong sample.
function makeMappedAdapter(assemblyNameToPanSN: Record<string, string>) {
  const local = (path: string) => ({
    localPath: path,
    locationType: 'LocalPathLocation',
  })
  return new Adapter(
    configSchema.create({
      segmentsLocation: local(`${prefix}.segs.bed.gz`),
      segmentsIndex: { location: local(`${prefix}.segs.bed.gz.tbi`) },
      linksLocation: local(`${prefix}.links.bed.gz`),
      linksIndex: { location: local(`${prefix}.links.bed.gz.tbi`) },
      assemblyNameToPanSN,
    }),
  )
}

// the fixture's sample is `K12`, so an assembly named anything else needs the map
const renamed = { ...k12, assemblyName: 'ecoli_k12' }

test('maps an assembly name to a differing PanSN sample prefix', async () => {
  const features = await firstValueFrom(
    makeMappedAdapter({ ecoli_k12: 'K12' })
      .getFeatures(renamed)
      .pipe(toArray()),
  )
  expect(features.length).toBeGreaterThan(0)
  expect(features.every(f => f.get('refName') === 'chr')).toBe(true)
})

test('without the mapping the same query resolves nothing', async () => {
  const features = await firstValueFrom(
    makeMappedAdapter({}).getFeatures(renamed).pipe(toArray()),
  )
  expect(features).toEqual([])
})

test('getSubgraph resolves through the mapping too', async () => {
  const gfa = await makeMappedAdapter({ ecoli_k12: 'K12' }).getSubgraph(renamed)
  expect(gfa.split('\n').filter(l => l.startsWith('S')).length).toBeGreaterThan(
    0,
  )
})
