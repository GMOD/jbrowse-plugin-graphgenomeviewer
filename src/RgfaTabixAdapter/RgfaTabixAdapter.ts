import { TabixIndexedFile } from '@gmod/tabix'
import { BaseFeatureDataAdapter } from '@jbrowse/core/data_adapters/BaseAdapter'
import { SimpleFeature, updateStatus } from '@jbrowse/core/util'
import { openLocation, openTabixIndexFilehandle } from '@jbrowse/core/util/io'
import { ObservableCreate } from '@jbrowse/core/util/rxjs'

import { panSNContig, panSNSample } from '../pansn.ts'
import { resolvePanSNPrefix } from '../util.ts'
import {
  buildRefNameLookup,
  formatSubgraph,
  linkKey,
  parseLinkLine,
  parseSegmentLine,
  resolveRefName,
} from './rgfaBed.ts'

import type { RgfaTabixAdapterConfig } from './configSchema.ts'
import type { RgfaLink, RgfaSegment } from './rgfaBed.ts'
import type PluginManager from '@jbrowse/core/PluginManager'
import type { BaseOptions } from '@jbrowse/core/data_adapters/BaseAdapter'
import type { getSubAdapterType } from '@jbrowse/core/data_adapters/dataAdapterCache'
import type { Feature } from '@jbrowse/core/util'
import type { Region } from '@jbrowse/core/util/types'

export interface SubgraphOptions {
  // extra rounds of link-following past the region's own segments and their
  // immediate neighbours. Each round costs one tabix query per newly reached
  // segment, so it stays 0 unless a caller asks for more graph around the view.
  context?: number
}

export default class RgfaTabixAdapter extends BaseFeatureDataAdapter<RgfaTabixAdapterConfig> {
  public static capabilities = ['getFeatures', 'getRefNames']

  private readonly segments: TabixIndexedFile
  private readonly links: TabixIndexedFile
  private refNameLookupP?: Promise<Map<string, string>>

  public constructor(
    config: RgfaTabixAdapterConfig,
    getSubAdapter?: getSubAdapterType,
    pluginManager?: PluginManager,
  ) {
    super(config, getSubAdapter, pluginManager)
    const pm = this.pluginManager
    const open = (
      location: 'segmentsLocation' | 'linksLocation',
      index: 'segmentsIndex' | 'linksIndex',
    ) =>
      new TabixIndexedFile({
        filehandle: openLocation(this.getConf(location), pm),
        ...openTabixIndexFilehandle(
          this.getConf([index, 'location']),
          this.getConf([index, 'indexType']),
          pm,
        ),
        chunkCacheSize: 50 * 2 ** 20,
      })

    this.segments = open('segmentsLocation', 'segmentsIndex')
    this.links = open('linksLocation', 'linksIndex')
  }

  // The stable sequences the graph is anchored to, read once from the segment
  // index and keyed for both PanSN and bare spellings.
  private async refNameLookup(opts?: BaseOptions) {
    this.refNameLookupP ??= this.segments
      .getReferenceSequenceNames(opts)
      .then(names => buildRefNameLookup(names))
      .catch((e: unknown) => {
        this.refNameLookupP = undefined
        throw e
      })
    return this.refNameLookupP
  }

  // Report the names the *assembly* uses, not the graph's own. A minigraph
  // graph's stable names are already bare (`chr6`) and pass straight through;
  // a Minigraph-Cactus graph's are PanSN, and returning `GRCh38#0#chr6` here
  // makes JBrowse decide the track has no data for `chr6` and never query it —
  // the graph view still worked, because it resolves per region rather than
  // through this list, which is exactly how the empty tracks were spotted.
  async getRefNames(opts: BaseOptions = {}) {
    const names = await this.segments.getReferenceSequenceNames(opts)
    const prefix = resolvePanSNPrefix(this, opts.assemblyName)
    const contigs = names
      .filter(n => panSNSample(n) === prefix)
      .map(n => panSNContig(n))
    return contigs.length > 0 ? contigs : names
  }

  public async hasDataForRefName() {
    return true
  }

  // The rGFA's own stable name for a region, or undefined when the graph has no
  // sequence answering to it.
  // The graph's stable names may be PanSN (`GRCh38#0#chr1`), in which case the
  // assembly name is not the sample prefix; `assemblyNameToPanSN` maps the two,
  // the same slot and helper the all-vs-all PAF adapters use.
  private async resolve(region: Region, opts?: BaseOptions) {
    const lookup = await this.refNameLookup(opts)
    return resolveRefName(
      lookup,
      resolvePanSNPrefix(this, region.assemblyName) ?? region.assemblyName,
      region.refName,
    )
  }

  getFeatures(query: Region, opts: BaseOptions = {}) {
    const { statusCallback = () => {} } = opts
    return ObservableCreate<Feature>(async observer => {
      const tabixRefName = await this.resolve(query, opts)
      if (tabixRefName !== undefined) {
        await updateStatus('Downloading segments', statusCallback, () =>
          this.segments.getLines(tabixRefName, query.start, query.end, {
            lineCallback: line => {
              const segment = parseSegmentLine(line)
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
                }),
              )
            },
          }),
        )
      }
      observer.complete()
    })
  }

  // Extract the graph around a region as GFA text, for GraphGenomeView. The
  // region's own segments come from segs.bed.gz; links.bed.gz supplies the edges
  // incident to them *and* the coordinates of the segments on the other end,
  // which typically sit on a different stable sequence (a rank>0 bubble) and so
  // are not reachable by any coordinate query on this region.
  async getSubgraph(region: Region, opts: SubgraphOptions = {}) {
    const { context = 0 } = opts
    const segments = new Map<string, RgfaSegment>()
    const links = new Map<string, RgfaLink>()
    const tabixRefName = await this.resolve(region)

    const addLinksOver = async (
      refName: string,
      start: number,
      end: number,
    ) => {
      const reached: RgfaSegment[] = []
      await this.links.getLines(refName, start, end, {
        lineCallback: line => {
          const link = parseLinkLine(line)
          links.set(linkKey(link), link)
          for (const segment of [link.sourceSegment, link.targetSegment]) {
            if (!segments.has(segment.id)) {
              segments.set(segment.id, segment)
              reached.push(segment)
            }
          }
        },
      })
      return reached
    }

    if (tabixRefName !== undefined) {
      await this.segments.getLines(tabixRefName, region.start, region.end, {
        lineCallback: line => {
          const segment = parseSegmentLine(line)
          segments.set(segment.id, segment)
        },
      })
      let frontier = await addLinksOver(tabixRefName, region.start, region.end)
      for (let hop = 0; hop < context; hop++) {
        const next: RgfaSegment[] = []
        for (const segment of frontier) {
          next.push(
            ...(await addLinksOver(
              segment.refName,
              segment.start,
              segment.end,
            )),
          )
        }
        frontier = next
      }
    }

    return formatSubgraph(segments, links)
  }
}
