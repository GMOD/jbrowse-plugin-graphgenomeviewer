import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

import { BASE_URL, PLUGIN_ESM_URL, writeServedFile } from './setup'

// The four-strain E. coli minigraph graph, indexed as rGFA tabix — the same
// fixture RgfaTabixAdapter.test.ts asserts a golden subgraph against, so these
// demos and the unit tests read the same bytes.
const RGFA_FIXTURE = 'test_data/rgfa_ecoli'

export const RGFA_TRACK_ID = 'ecoli_minigraph_segments'
export const PLAIN_TRACK_ID = 'ecoli_backbone_regions'
export const LGV_ID = 'demo_lgv'
export const ASSEMBLY = 'K12'
export const REF_NAME = 'chr'

// A window with eight backbone segments and the alleles hanging off them: small
// enough to draw instantly, big enough to have bubbles to hover.
export const DEMO_START = 1
export const DEMO_END = 20_000

export const PLAIN_BED = 'rgfa/backbone_regions.bed'

// A plain feature track on the reference, standing in for any track that marks
// where variation is but cannot cut a graph — the bubble track is the real case.
// Derived from the rGFA index's own K12 rows with the PanSN prefix stripped, so
// its features sit exactly on the segments the graph view will draw, and it can't
// drift from the graph it describes.
export function writePlainBedTrack() {
  const segs = path.join(process.cwd(), RGFA_FIXTURE, 'rgfa_ecoli.segs.bed.gz')
  const text = zlib.gunzipSync(fs.readFileSync(segs)).toString('utf8')
  const rows = text
    .split('\n')
    .filter(line => line.startsWith(`${ASSEMBLY}#1#${REF_NAME}\t`))
    .map(line => {
      const [, start, end, name] = line.split('\t')
      return `${REF_NAME}\t${start}\t${end}\t${name}`
    })
  writeServedFile(PLAIN_BED, `${rows.join('\n')}\n`)
  return rows.length
}

export function demoDataFiles(): [string, string][] {
  return [
    'K12.chrom.sizes',
    'rgfa_ecoli.segs.bed.gz',
    'rgfa_ecoli.segs.bed.gz.tbi',
    'rgfa_ecoli.links.bed.gz',
    'rgfa_ecoli.links.bed.gz.tbi',
  ].map(name => [`${RGFA_FIXTURE}/${name}`, `rgfa/${name}`])
}

export const GRAPH_ID = 'demo_graph'

// The same config with a graph view already open beside the linear view, cut
// from the graph track and paired with it — the state every "out of the graph"
// entry point starts from, and the shape the pangenome sessions ship in.
export function createLaunchOutConfig() {
  const config = createDemoConfig()
  return {
    ...config,
    defaultSession: {
      ...config.defaultSession,
      views: [
        ...config.defaultSession.views,
        {
          id: GRAPH_ID,
          type: 'GraphGenomeView',
          loadedTrackId: RGFA_TRACK_ID,
          loadedRegion: {
            refName: REF_NAME,
            assemblyName: ASSEMBLY,
            start: DEMO_START,
            end: DEMO_END,
          },
          connectedViewId: LGV_ID,
        },
      ],
    },
  }
}

// A linear view on the reference with both tracks open: the graph track whose
// adapter can cut a subgraph, and the plain track that can't. That pair is what
// every launch entry point under test discriminates on.
export function createDemoConfig() {
  return {
    plugins: [{ name: 'GraphGenomeView', esmUrl: PLUGIN_ESM_URL }],
    assemblies: [
      {
        name: ASSEMBLY,
        sequence: {
          type: 'ReferenceSequenceTrack',
          trackId: `${ASSEMBLY}-ReferenceSequenceTrack`,
          adapter: {
            type: 'ChromSizesAdapter',
            uri: `${BASE_URL}/rgfa/K12.chrom.sizes`,
          },
        },
      },
    ],
    tracks: [
      {
        type: 'FeatureTrack',
        trackId: RGFA_TRACK_ID,
        name: 'minigraph graph segments (rGFA)',
        assemblyNames: [ASSEMBLY],
        adapter: {
          type: 'RgfaTabixAdapter',
          uri: `${BASE_URL}/rgfa/rgfa_ecoli`,
        },
      },
      {
        type: 'FeatureTrack',
        trackId: PLAIN_TRACK_ID,
        name: 'backbone regions (plain BED, cannot cut a graph)',
        assemblyNames: [ASSEMBLY],
        adapter: { type: 'BedAdapter', uri: `${BASE_URL}/${PLAIN_BED}` },
      },
    ],
    defaultSession: {
      name: 'graph launch demos',
      views: [
        {
          id: LGV_ID,
          type: 'LinearGenomeView',
          init: {
            assembly: ASSEMBLY,
            loc: `${REF_NAME}:${DEMO_START}-${DEMO_END}`,
            tracks: [RGFA_TRACK_ID, PLAIN_TRACK_ID],
          },
        },
      ],
    },
  }
}
