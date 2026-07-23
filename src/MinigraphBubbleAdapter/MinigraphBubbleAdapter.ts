import { TabixIndexedFile } from '@gmod/tabix'
import { BaseFeatureDataAdapter } from '@jbrowse/core/data_adapters/BaseAdapter'
import { SimpleFeature, updateStatus } from '@jbrowse/core/util'
import { openLocation, openTabixIndexFilehandle } from '@jbrowse/core/util/io'
import { ObservableCreate } from '@jbrowse/core/util/rxjs'

import {
  buildRefNameLookup,
  resolveRefName,
} from '../RgfaTabixAdapter/rgfaBed.ts'
import { panSNContig, panSNSample } from '../pansn.ts'
import { resolvePanSNPrefix } from '../util.ts'
import {
  bubbleDescription,
  bubbleLabel,
  parseBubbleLine,
} from './bubbleLine.ts'

import type { MinigraphBubbleAdapterConfig } from './configSchema.ts'
import type PluginManager from '@jbrowse/core/PluginManager'
import type { BaseOptions } from '@jbrowse/core/data_adapters/BaseAdapter'
import type { getSubAdapterType } from '@jbrowse/core/data_adapters/dataAdapterCache'
import type { Feature } from '@jbrowse/core/util'
import type { Region } from '@jbrowse/core/util/types'

export default class MinigraphBubbleAdapter extends BaseFeatureDataAdapter<MinigraphBubbleAdapterConfig> {
  public static capabilities = ['getFeatures', 'getRefNames']

  private readonly bubbles: TabixIndexedFile

  public constructor(
    config: MinigraphBubbleAdapterConfig,
    getSubAdapter?: getSubAdapterType,
    pluginManager?: PluginManager,
  ) {
    super(config, getSubAdapter, pluginManager)
    const pm = this.pluginManager
    this.bubbles = new TabixIndexedFile({
      filehandle: openLocation(this.getConf('bubblesLocation'), pm),
      ...openTabixIndexFilehandle(
        this.getConf(['index', 'location']),
        this.getConf(['index', 'indexType']),
        pm,
      ),
      chunkCacheSize: 50 * 2 ** 20,
    })
  }

  // Assembly-facing names, for the same reason as the segment adapter: a
  // Minigraph-Cactus graph's bubbles are PanSN, and reporting them raw makes
  // JBrowse skip the track for `chr6`.
  async getRefNames(opts: BaseOptions = {}) {
    const names = await this.bubbles.getReferenceSequenceNames(opts)
    const prefix = resolvePanSNPrefix(this, opts.assemblyName)
    const contigs = names
      .filter(n => panSNSample(n) === prefix)
      .map(n => panSNContig(n))
    return contigs.length > 0 ? contigs : names
  }

  // `gfatools bubble` names each row after the graph's stable sequence, so a
  // Minigraph-Cactus graph produces PanSN rows (`GRCh38#0#chr6`) where a plain
  // minigraph graph produces bare ones (`chr6`). Same resolution the segment
  // adapter does, via the same `assemblyNameToPanSN` slot.
  private refNameLookupCache: Promise<Map<string, string>> | undefined

  private refNameLookup(opts?: BaseOptions) {
    this.refNameLookupCache ??= this.bubbles
      .getReferenceSequenceNames(opts)
      .then(names => buildRefNameLookup(names))
    return this.refNameLookupCache
  }

  private async resolve(region: Region, opts?: BaseOptions) {
    const lookup = await this.refNameLookup(opts)
    return resolveRefName(
      lookup,
      resolvePanSNPrefix(this, region.assemblyName) ?? region.assemblyName,
      region.refName,
    )
  }

  public async hasDataForRefName() {
    return true
  }

  getFeatures(query: Region, opts: BaseOptions = {}) {
    const { statusCallback = () => {} } = opts
    return ObservableCreate<Feature>(async observer => {
      const tabixRefName = await this.resolve(query, opts)
      if (tabixRefName !== undefined) {
        await updateStatus('Downloading bubbles', statusCallback, () =>
          this.bubbles.getLines(tabixRefName, query.start, query.end, {
            lineCallback: (line, fileOffset) => {
              const bubble = parseBubbleLine(line)
              observer.next(
                new SimpleFeature({
                  uniqueId: `bubble-${fileOffset}`,
                  refName: query.refName,
                  start: bubble.start,
                  end: bubble.end,
                  // How variable this spot is, in two words, since that is the
                  // whole point of the track.
                  name: bubbleLabel(bubble),
                  description: bubbleDescription(bubble),
                  type: 'bubble',
                  score: bubble.segmentCount,
                  segmentCount: bubble.segmentCount,
                  inversion: bubble.inversion,
                  shortestAlleleLength: bubble.shortestAlleleLength,
                  longestAlleleLength: bubble.longestAlleleLength,
                  segments: bubble.segments,
                  shortestAllele: bubble.shortestAllele,
                  longestAllele: bubble.longestAllele,
                }),
              )
            },
          }),
        )
      }
      observer.complete()
    })
  }
}
