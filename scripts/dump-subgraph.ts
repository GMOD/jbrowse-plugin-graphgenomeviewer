// Dump the GFA that GraphGenomeView draws for a region of a segment and link
// index, so the same subgraph can be handed to Bandage itself:
//
//   node scripts/dump-subgraph.ts src/RgfaTabixAdapter/test_data/rgfa_ecoli \
//     K12 chr 1000000 1100000 ecoli.gfa
//   QT_QPA_PLATFORM=offscreen Bandage image ecoli.gfa ecoli.png --height 900
//
// <prefix> names a local pair, <prefix>.segs.bed.gz and <prefix>.links.bed.gz
// with their .tbi indexes; @gmod/tabix's `path` reads no url, so download a
// hosted pair first. <sample> is the PanSN sample the region is on (GRCh38 for
// an hg38 region of a Minigraph-Cactus graph), and [hops] defaults to the one
// hop the view asks for.
//
// The script runs the adapter's cut, rgfaCut, rather than the adapter, which
// node's type stripping cannot load.
import fs from 'node:fs'

import { TabixIndexedFile } from '@gmod/tabix'
import { refNameLookup, resolveRefName } from '@jbrowse/graph-walks'

import { rgfaCut } from '../src/RgfaTabixAdapter/rgfaCut.ts'

const [prefix, sample, refName, start, end, out, hops = '1'] =
  process.argv.slice(2)
if (!prefix || !sample || !refName || !start || !end || !out) {
  throw new Error(
    'usage: dump-subgraph.ts <prefix> <sample> <refName> <start> <end> <out.gfa> [hops]',
  )
}

const files = {
  segments: new TabixIndexedFile({ path: `${prefix}.segs.bed.gz` }),
  links: new TabixIndexedFile({ path: `${prefix}.links.bed.gz` }),
}
const lookup = refNameLookup(await files.segments.getReferenceSequenceNames())
const tabixRefName = resolveRefName(lookup, sample, refName)
if (tabixRefName === undefined) {
  throw new Error(`${prefix}.segs.bed.gz has no sequence ${sample} ${refName}`)
}

const gfa = await rgfaCut(
  files,
  { refName: tabixRefName, start: Number(start), end: Number(end) },
  { hops: Number(hops) },
)
fs.writeFileSync(out, `${gfa}\n`)
const count = (type: string) =>
  gfa.split('\n').filter(line => line.startsWith(`${type}\t`)).length
console.log(out, count('S'), 'segments,', count('L'), 'links')
