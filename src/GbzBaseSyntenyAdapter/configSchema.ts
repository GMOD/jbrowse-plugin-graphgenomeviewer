import { ConfigurationSchema } from '@jbrowse/core/configuration'

import type { Instance } from '@jbrowse/mobx-state-tree'

/**
 * #config GbzBaseSyntenyAdapter
 * #trackType SyntenyTrack
 * #fileFormat synteny | gbz-base pangenome database | Haplotype alignments read from the graph at query time, no PAF conversion
 * Serves a pangenome graph stored as a gbz-base SQLite database (`.gbz.db`) as
 * haplotype-versus-reference alignments, the shape `MultiWaySyntenyDisplay`
 * draws as one lane per haplotype. A window on the reference is located on the
 * graph's reference path, every haplotype's walk through the nodes it covers
 * is recovered, and each run of shared nodes becomes one alignment record with
 * a CIGAR, so the graph is read through HTTP range requests with no offline
 * conversion. The database has to carry the `HaplotypeSamples` and
 * `HaplotypeLengths` side tables that `gbz-haplotype-index` (shipped with
 * `@gmod/gbz-base`) writes into an upstream-built database; without them the
 * graph cannot say which haplotype a walk belongs to.
 *
 * Only the fine tier exists: a whole-chromosome view stays on a PIF's coarse
 * tier. A query on a haplotype lane answers nothing, so the multi-way display
 * composes its lane-to-lane links through the reference.
 *
 * #example
 * ```js
 * {
 *   type: 'GbzBaseSyntenyAdapter',
 *   uri: 'hprc-v2.gbz.db',
 *   assemblyNames: ['hg38'],
 *   assemblyNameToPanSN: { hg38: 'GRCh38#0' },
 * }
 * ```
 */
const GbzBaseSyntenyAdapter = ConfigurationSchema(
  'GbzBaseSyntenyAdapter',
  {
    /**
     * #slot
     * The first entry is the anchor: the JBrowse assembly the graph's reference
     * sample is loaded as. Further entries are haplotypes also loaded as
     * JBrowse assemblies, named by their PanSN prefix (`HG002#1`) or mapped to
     * it through `assemblyNameToPanSN`; a haplotype not listed is still a lane,
     * labelled by its PanSN prefix.
     */
    assemblyNames: {
      type: 'stringArray',
      defaultValue: [],
    },
    /**
     * #slot
     * The `.gbz.db` written by `gbz-base construct` and augmented by
     * `gbz-haplotype-index`; read by HTTP range requests, so it can be large.
     */
    gbzDbLocation: {
      type: 'fileLocation',
      defaultValue: {
        uri: '/path/to/graph.gbz.db',
        locationType: 'UriLocation',
      },
    },
    /**
     * #slot
     * The graph sample the anchor window is located on. Empty means the sample
     * the anchor's PanSN prefix names, or the database's one reference sample
     * (`gbwt_reference_samples`) when the anchor names none; a database with
     * several reference samples then needs this set.
     */
    referenceSample: {
      type: 'string',
      defaultValue: '',
    },
    /**
     * #slot
     * Maps a JBrowse assembly name to its PanSN prefix in the graph, sample or
     * haplotype level (`{ hg38: 'GRCh38#0', 'HG002.1': 'HG002#1' }`). Defaults
     * to identity.
     */
    assemblyNameToPanSN: {
      type: 'frozen',
      defaultValue: {},
    },
    /**
     * #slot
     * Graph context around the reference walk, in bp. At 0 a haplotype's walk
     * breaks into a new record at every bubble it takes a private path through;
     * a positive context keeps such a walk one record with the bubble as a
     * mismatch or indel in its CIGAR, at the cost of reading more nodes.
     */
    context: {
      type: 'number',
      defaultValue: 0,
      advanced: true,
    },
    /**
     * #slot
     * The most graph nodes one window may load before the query fails rather
     * than reading a whole chromosome into the worker.
     */
    nodeLimit: {
      type: 'number',
      defaultValue: 100000,
      advanced: true,
    },
  },
  {
    explicitlyTyped: true,

    /**
     * #preProcessSnapshot
     *
     *
     * preprocessor to allow minimal config:
     * ```json
     * {
     *   "type": "GbzBaseSyntenyAdapter",
     *   "uri": "graph.gbz.db",
     *   "assemblyNames": ["hg38"]
     * }
     * ```
     */
    preProcessSnapshot: snap => {
      return snap.uri
        ? {
            ...snap,
            gbzDbLocation: {
              uri: snap.uri,
              baseUri: snap.baseUri,
            },
          }
        : snap
    },
  },
)

export type GbzBaseSyntenyAdapterConfig = Instance<typeof GbzBaseSyntenyAdapter>

export default GbzBaseSyntenyAdapter
