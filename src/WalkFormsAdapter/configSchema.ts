import { ConfigurationSchema } from '@jbrowse/core/configuration'

import {
  fileLocationSlot,
  tabixIndexSchema,
  walksLocations,
} from '../panSNTabix.ts'

import type { Instance } from '@jbrowse/mobx-state-tree'

/**
 * #config WalkFormsAdapter
 * #trackType VariantTrack
 * #fileFormat variant | Walk-file structural forms | Built by `gfa-to-tabix --walks`; one row per group of haplotypes making the same structural changes
 * Groups the haplotypes of a
 * [gfa-to-tabix](https://github.com/GMOD/gfa-to-tabix) `--walks` file by the
 * structural changes their walks make over one pinned window, through
 * @jbrowse/graph-walks' `formsCut` and `structuralForms`. Each group is a
 * form, which `LinearMultiSampleVariantDisplay` draws as one row, and each
 * change a variant whose genotype is `1` in the forms that make it.
 *
 * - The adapter cuts the pinned window once, whatever the view shows; outside
 *   it the rows stay and draw empty
 * - A variant's `consequence` is `loss`, `gain`, `shift`, `inversion` or
 *   `net`, for colouring the cells; `svType` and `type` follow core's names
 * - `walksUri` takes the prefix of one reference's walk file and resolves
 *   `<walksUri>.walks.bed.gz` and its `.tbi`, as the other walk adapters do
 *
 * #example
 * ```js
 * {
 *   type: 'WalkFormsAdapter',
 *   walksUri: 'https://jbrowse.org/demos/hprc/hprc-v2.1-mc-grch38-f5.GRCh38',
 *   pinned: { refName: 'chr1', start: 109680000, end: 109715000 },
 *   exclude: ['CHM13'],
 * }
 * ```
 */
const WalkFormsAdapter = ConfigurationSchema(
  'WalkFormsAdapter',
  {
    /**
     * #slot
     * a `gfa-to-tabix --walks` file in walk format 5
     */
    walksLocation: fileLocationSlot('/path/to/graph.walks.bed.gz'),
    /**
     * #slot
     */
    walksIndex: tabixIndexSchema('WalkFormsWalksIndex'),
    /**
     * #slot
     * The window the forms come from, `{ refName, start, end }`, 0-based and
     * half-open. `refName` is the contig as the walk file's reference sample
     * names it (`chr1`), or its full PanSN name (`GRCh38#0#chr1`).
     */
    pinned: {
      type: 'frozen',
      defaultValue: {},
    },
    /**
     * #slot
     * The smallest change that tells two forms apart: `auto`, which follows
     * the pinned window's width (50 bp under 25 kb, 1 kb to 300 kb, 10 kb
     * past it), or 50, 1000 or 10000. A change of floor regroups the same
     * cut.
     */
    floorBp: {
      type: 'frozen',
      defaultValue: 'auto',
    },
    /**
     * #slot
     * Samples or `sample#haplotype`s left out of every form, such as a second
     * reference the walk file carries as a haplotype (`CHM13` in HPRC's
     * GRCh38 file)
     */
    exclude: {
      type: 'stringArray',
      defaultValue: [],
    },
  },
  {
    explicitlyTyped: true,

    /**
     * #preProcessSnapshot
     * preprocessor to allow the minimal config
     * ```json
     * {
     *   "type": "WalkFormsAdapter",
     *   "walksUri": "chr22.GRCh38",
     *   "pinned": { "refName": "chr22", "start": 0, "end": 50000 }
     * }
     * ```
     */
    preProcessSnapshot: walksLocations,
  },
)

export type WalkFormsAdapterConfig = Instance<typeof WalkFormsAdapter>

export default WalkFormsAdapter
