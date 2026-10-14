import { resolvePanSNPrefix } from '@jbrowse/bandage-core/pansn'
import { BaseFeatureDataAdapter } from '@jbrowse/core/data_adapters/BaseAdapter'
import { SimpleFeature, updateStatus } from '@jbrowse/core/util'
import { ObservableCreate } from '@jbrowse/core/util/rxjs'
import { WalkReader, referenceNodes } from '@jbrowse/graph-walks'

import { locationIsSet } from '../locationName.ts'
import { PanSNRefNames, openTabixSlot } from '../panSNTabix.ts'
import { getLines } from '../tabixRange.ts'
import { parseSegmentRow, segmentSamples } from './rgfaBed.ts'
import { rgfaCut } from './rgfaCut.ts'
import { walkSubgraph } from './walkReader.ts'

import type { RgfaTabixAdapterConfig } from './configSchema.ts'
import type { SubgraphAdapterOptions, SubgraphTier } from '../GetSubgraph.ts'
import type { WalkCut } from './walkRowRuns.ts'
import type { TabixIndexedFile } from '@gmod/tabix'
import type PluginManager from '@jbrowse/core/PluginManager'
import type { BaseOptions } from '@jbrowse/core/data_adapters/BaseAdapter'
import type { getSubAdapterType } from '@jbrowse/core/data_adapters/dataAdapterCache'
import type { Feature } from '@jbrowse/core/util'
import type { FileLocation, Region } from '@jbrowse/core/util/types'

interface GraphIndex {
  segments: TabixIndexedFile
  links: TabixIndexedFile
  walks?: WalkReader
  walkFile?: TabixIndexedFile
  refNames: PanSNRefNames
}

export default class RgfaTabixAdapter extends BaseFeatureDataAdapter<RgfaTabixAdapterConfig> {
  public static capabilities = ['getFeatures', 'getRefNames']

  private readonly fine
  private coarse: GraphIndex | undefined

  public constructor(
    config: RgfaTabixAdapterConfig,
    getSubAdapter?: getSubAdapterType,
    pluginManager?: PluginManager,
  ) {
    super(config, getSubAdapter, pluginManager)
    this.fine = this.openIndex([])
  }

  // refNames off the SEGMENT index: it is the one that names every stable
  // sequence the graph is anchored to, where the link index only names those a
  // link touches. A walk-indexed graph's walk file names the same sequences,
  // and it has no segment file.
  private openIndex(under: string[]): GraphIndex {
    const segments = openTabixSlot(
      this,
      [...under, 'segmentsLocation'],
      [...under, 'segmentsIndex'],
    )
    const walksLocation: FileLocation = this.getConf('walksLocation')
    const hasWalks = under.length === 0 && locationIsSet(walksLocation)
    const links = openTabixSlot(
      this,
      [...under, 'linksLocation'],
      [...under, 'linksIndex'],
    )
    const walkFile = hasWalks
      ? openTabixSlot(this, ['walksLocation'], ['walksIndex'])
      : undefined
    return {
      segments,
      links,
      walkFile,
      walks: walkFile ? new WalkReader(walkFile) : undefined,
      refNames: new PanSNRefNames(walkFile ?? segments, this),
    }
  }

  /**
   * The haplotypes a walk-indexed graph's header names, `sample#haplotype`
   * in byte order, or undefined when it names none
   */
  async getHaplotypeNames(opts: BaseOptions = {}) {
    const header = await this.fine.walks?.header(opts)
    return header?.haplotypes.length ? header.haplotypes : undefined
  }

  private index(tier: SubgraphTier = 'fine') {
    if (tier === 'fine') {
      return this.fine
    }
    this.coarse ??= this.openIndex(['coarse'])
    return this.coarse
  }

  async getRefNames(opts: BaseOptions = {}) {
    return this.fine.refNames.assemblyRefNames(opts)
  }

  public async hasDataForRefName() {
    return true
  }

  getFeatures(query: Region, opts: BaseOptions = {}) {
    const { signal, statusCallback } = opts
    return ObservableCreate<Feature>(async observer => {
      const tabixRefName = await this.fine.refNames.resolve(query, opts)
      if (tabixRefName !== undefined) {
        // a walk-indexed node row names only its chunk's first base, and a
        // node crossing in from a chunk before is filed there
        const { walks, walkFile } = this.fine
        const start = walks
          ? await walks.queryStart(query.start, opts)
          : query.start
        if (walkFile && walks) {
          // a walk-indexed graph's reference nodes are its ref rows' steps
          await walks.header(opts)
          const refRows: string[][] = []
          await updateStatus('Downloading walks', statusCallback, () =>
            getLines(walkFile, tabixRefName, start, query.end, {
              signal,
              lineCallback: line => {
                const cols = line.split('\t')
                if (cols[3] === 'ref') {
                  refRows.push(cols)
                }
              },
            }),
          )
          const seen = new Set<number>()
          for (const node of referenceNodes(refRows)) {
            if (
              node.refName === tabixRefName &&
              node.end > query.start &&
              node.start < query.end &&
              !seen.has(node.id)
            ) {
              seen.add(node.id)
              const id = String(node.id)
              observer.next(
                new SimpleFeature({
                  uniqueId: id,
                  refName: query.refName,
                  start: node.start,
                  end: node.end,
                  name: id,
                  type: 'segment',
                  rank: 0,
                  stableName: node.refName,
                }),
              )
            }
          }
          observer.complete()
          return
        }
        await updateStatus('Downloading segments', statusCallback, () =>
          getLines(this.fine.segments, tabixRefName, start, query.end, {
            signal,
            lineCallback: line => {
              const { segment, anchored } = parseSegmentRow(line)
              // An anchored index also returns the alleles under the region,
              // which lie on other stable sequences and have no place on this
              // one; a lookback chunk returns nodes ending before it
              if (
                (anchored && segment.refName !== tabixRefName) ||
                segment.end <= query.start
              ) {
                return
              }
              // `samples` lists the haplotypes whose paths visit the segment and
              // `sampleCount` counts them. A lane's color reads the count, and
              // a count in jexl would otherwise rely on `.length` resolving
              // through a member access on an array.
              const samples = segmentSamples(segment)
              observer.next(
                new SimpleFeature({
                  uniqueId: segment.id,
                  refName: query.refName,
                  start: segment.start,
                  end: segment.end,
                  name: segment.id,
                  type: 'segment',
                  rank: segment.rank,
                  stableName: segment.refName,
                  ...(samples && { samples, sampleCount: samples.length }),
                }),
              )
            },
          }),
        )
      }
      observer.complete()
    }, signal)
  }

  // The graph around a region for GraphGenomeView: GFA text (rgfaCut), or a
  // walk-indexed graph's tables (walkSubgraph). `tier: 'coarse'` reads the
  // `coarse` pair instead, the same way.
  async getSubgraph(
    region: Region,
    opts: SubgraphAdapterOptions = {},
  ): Promise<string | WalkCut> {
    const { hops, signal, tier } = opts
    const index = this.index(tier)
    const tabixRefName = await index.refNames.resolve(region, { signal })
    if (tabixRefName === undefined) {
      throw new Error(
        `${region.assemblyName} ${region.refName} is not in this graph's index; a graph with PanSN names (GRCh38#0#chr1) needs ${region.assemblyName} mapped to its prefix in assemblyNameToPanSN`,
      )
    }
    if (index.walks) {
      return walkSubgraph(index.walks, tabixRefName, region, {
        signal,
        prefixes: opts.haplotypes?.map(lane => resolvePanSNPrefix(this, lane)),
        walkRows: opts.walkRows,
        stepBudget: this.getConf('walkStepBudget'),
        byteBudget: this.getConf('walkByteBudget'),
      })
    }
    return rgfaCut(
      index,
      { refName: tabixRefName, start: region.start, end: region.end },
      { hops, signal },
    )
  }
}
