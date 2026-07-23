// Dump the exact GFA that GraphGenomeView renders for a region, so the same
// subgraph can be handed to Bandage itself:
//
//   node scripts/dump-subgraph.ts ../../test_data/rgfa_ecoli/rgfa_ecoli \
//     K12 chr 4050000 4100000 ecoli.gfa
//   QT_QPA_PLATFORM=offscreen Bandage image ecoli.gfa ecoli.png --height 900
//
// It reads the two tabix BEDs through the same rgfaBed helpers the adapter
// uses, rather than the adapter itself: the adapter's plugin barrel reaches
// .tsx, which node's type-stripping cannot load.
import fs from 'node:fs'

import { TabixIndexedFile } from '@gmod/tabix'

import {
  buildRefNameLookup,
  formatSubgraph,
  linkKey,
  parseLinkLine,
  parseSegmentLine,
  resolveRefName,
} from '../src/RgfaTabixAdapter/rgfaBed.ts'

import type { RgfaLink, RgfaSegment } from '../src/RgfaTabixAdapter/rgfaBed.ts'

// optional 7th arg: the PanSN sample prefix, when it differs from the assembly
// name (Minigraph-Cactus graphs; see the adapter's assemblyNameToPanSN slot)
const [uri, assemblyName, refName, start, end, out, panSN] =
  process.argv.slice(2)
if (!uri || !assemblyName || !refName || !start || !end || !out) {
  throw new Error(
    'usage: dump-subgraph.ts <uri-prefix> <assemblyName> <refName> <start> <end> <out.gfa>',
  )
}

const segs = new TabixIndexedFile({ path: `${uri}.segs.bed.gz` })
const linksFile = new TabixIndexedFile({ path: `${uri}.links.bed.gz` })
const segments = new Map<string, RgfaSegment>()
const links = new Map<string, RgfaLink>()

const lookup = buildRefNameLookup(await segs.getReferenceSequenceNames())
const tabixRefName = resolveRefName(lookup, panSN ?? assemblyName, refName)
if (tabixRefName === undefined) {
  throw new Error(`no tabix refName for ${assemblyName}/${refName}`)
}

await segs.getLines(tabixRefName, Number(start), Number(end), {
  lineCallback: line => {
    const segment = parseSegmentLine(line)
    segments.set(segment.id, segment)
  },
})
// Link rows carry both endpoints in full, which is how the off-reference
// segments — living at their own coordinates on another assembly — are reached.
await linksFile.getLines(tabixRefName, Number(start), Number(end), {
  lineCallback: line => {
    const link = parseLinkLine(line)
    links.set(linkKey(link), link)
    for (const segment of [link.sourceSegment, link.targetSegment]) {
      if (!segments.has(segment.id)) {
        segments.set(segment.id, segment)
      }
    }
  },
})

fs.writeFileSync(out, `${formatSubgraph(segments, links)}\n`)
console.log(out, segments.size, 'segments,', links.size, 'links')
