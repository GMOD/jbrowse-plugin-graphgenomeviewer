import { TabixIndexedFile } from '@gmod/tabix'
import { BaseFeatureDataAdapter } from '@jbrowse/core/data_adapters/BaseAdapter'
import { SimpleFeature, updateStatus } from '@jbrowse/core/util'
import { openLocation, openTabixIndexFilehandle } from '@jbrowse/core/util/io'
import { ObservableCreate } from '@jbrowse/core/util/rxjs'

import { panSNContig, panSNMatchesPrefix } from '../pansn.ts'
import { resolvePanSNPrefix } from '../util.ts'
import {
  buildRefNameLookup,
  formatSubgraph,
  linkKey,
  parseLinkLine,
  parseSegmentLine,
  resolveRefName,
  segmentSamples,
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
  // immediate neighbours, each round costing one tabix query per off-reference
  // segment newly reached. One round is what closes a bubble, so it is the
  // default the view asks for; see the frontier in getSubgraph.
  hops?: number
}

// What a hop follows: alleles, never the backbone. A rank-0 segment reached
// through a link is flanking backbone, usually outside the window, so querying
// its links walks the reference away from the region, brings back more backbone,
// and closes nothing. Every segment that closes a bubble is an allele interior,
// and an allele interior is rank > 0 in both index formats (rGFA's SR tag, and
// pggb's rank 0-or-1 against the anchor path). Reached backbone still becomes a
// node and its edge still draws; it is only not walked through.
//
// This is gfabase's rule, arrived at from the other end. `gfabase sub` expands
// from a seed either to the whole connected component (`--connected`, which its
// own README calls overkill) or with `--cutpoints 1`, which takes the biconnected
// component by *stopping at cutpoints*, the segments every end-to-end walk of
// the chromosome must traverse. In a reference-anchored pangenome the cutpoints
// are the backbone, and rank is what the index already states about it, so
// `rank > 0` is that stopping rule without a connectivity index to build. The
// third tool is the same shape again: `gfatools view -R` maps the region onto its
// precomputed bubble decomposition and returns whole overlapping bubbles
// (gfa_query_by_reg), which is complete for the same reason. Bandage's own
// `--distance` is a node-step radius, but Bandage holds the entire graph in
// memory, so its scope is a drawing filter rather than a fetch strategy.
//
// Measured with this rule: the E. coli paa window converges at one hop (17
// segments at 1 and at 2), so the cut closes and stays closed. HPRC's amylase
// window keeps growing (63 at 0, 78 at 1, 92 at 2) because its alleles have
// alleles, and wall-clock is flat across all three, since a hop's queries go out
// together and the remote index dominates.
//
// The exact version, when a graph ships a bubble index beside its segments:
// gfatools' bubble rows carry the member segment ids of every bubble, so the
// bubbles overlapping the region state which segments a complete cut must
// contain. That turns the hop count into a termination condition rather than a
// setting, and MinigraphBubbleAdapter already parses those rows.
function offReference(segments: RgfaSegment[]) {
  return segments.filter(segment => segment.rank > 0)
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
      .filter(n => panSNMatchesPrefix(n, prefix))
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
              // `samples` is who, `carriers` is how many, and the second is not
              // just a convenience: a lane colored by carriage is a jexl
              // expression in a config, where counting a list means relying on
              // jexl resolving `.length` through a member access on an array.
              // The count is the axis the color reads, so the index states it.
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
                  ...(samples && { samples, carriers: samples.length }),
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
    const { hops = 0 } = opts
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
      let frontier = offReference(
        await addLinksOver(tabixRefName, region.start, region.end),
      )
      for (let hop = 0; hop < hops; hop++) {
        // One hop's queries are independent of each other, so they go out
        // together rather than one round-trip at a time. Their callbacks share
        // the segment and link maps, which is safe because only one of them runs
        // at a time, and the output is sorted at the end regardless of the order
        // they arrive in.
        const reached = await Promise.all(
          frontier.map(segment =>
            addLinksOver(segment.refName, segment.start, segment.end),
          ),
        )
        frontier = offReference(reached.flat())
      }
    }

    return formatSubgraph(segments, links)
  }
}
