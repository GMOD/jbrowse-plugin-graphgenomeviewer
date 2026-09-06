import { GBZBase, subgraphInInterval } from '@gmod/gbz-base'
import { cachedSetup } from '@jbrowse/core/data_adapters/BaseAdapter'
import { updateStatus } from '@jbrowse/core/util'
import { openLocation } from '@jbrowse/core/util/io'
import { ObservableCreate } from '@jbrowse/core/util/rxjs'

import { panSNMatchesPrefix, panSNSample } from '../pansn.ts'
import { ComparativeAdapterBase } from '../synteny/ComparativeAdapterBase.ts'
import SyntenyFeature from '../synteny/SyntenyFeature.ts'
import {
  assemblyByPanSNPrefix,
  resolvePanSNPrefix,
} from '../synteny/panSNAssemblies.ts'

import type { GbzBaseSyntenyAdapterConfig } from './configSchema.ts'
import type { GbzPath, HaplotypeAlignment, PathName } from '@gmod/gbz-base'
import type { BaseOptions } from '@jbrowse/core/data_adapters/BaseAdapter'
import type { Feature, SimpleFeatureSerialized } from '@jbrowse/core/util'
import type { FileLocation, Region } from '@jbrowse/core/util/types'

export class NoHaplotypeIndexError extends Error {
  override name = 'NoHaplotypeIndexError'

  constructor() {
    super(
      'this .gbz.db has no HaplotypeSamples/HaplotypeLengths tables, so its walks cannot be named; run gbz-haplotype-index (from @gmod/gbz-base) over it first',
    )
  }
}

export class NoReferenceSampleError extends Error {
  override name = 'NoReferenceSampleError'

  constructor(anchor: string, referenceSamples: string[]) {
    super(
      referenceSamples.length === 0
        ? `the graph names no reference sample (gbwt_reference_samples) and the anchor "${anchor}" maps to none; set referenceSample`
        : `the anchor "${anchor}" is none of the graph's reference samples (${referenceSamples.join(', ')}); set referenceSample or map it through assemblyNameToPanSN`,
    )
  }
}

export function haplotypePrefix(name: PathName) {
  return `${name.sample}#${name.haplotype}`
}

/**
 * The lane a haplotype draws on: the JBrowse assembly the config maps to it at
 * haplotype or sample depth, else its own PanSN prefix. The fallback stays at
 * haplotype depth, unlike the multi-genome PAF adapters', because a diploid
 * sample's two walks are two lanes here.
 */
export function laneAssemblyName(
  asmByPrefix: Record<string, string>,
  name: PathName,
) {
  const prefix = haplotypePrefix(name)
  return asmByPrefix[prefix] ?? asmByPrefix[name.sample] ?? prefix
}

export function resolveReferenceSample({
  configured,
  anchorPrefix,
  referenceSamples,
}: {
  configured: string
  anchorPrefix: string
  referenceSamples: string[]
}) {
  const fromAnchor = panSNSample(anchorPrefix)
  if (configured !== '') {
    return configured
  } else if (referenceSamples.includes(fromAnchor)) {
    return fromAnchor
  } else if (referenceSamples.length === 1) {
    return referenceSamples[0]!
  } else {
    throw new NoReferenceSampleError(anchorPrefix, referenceSamples)
  }
}

/**
 * The id of one haplotype fragment: the walk's GBWT position at its first node
 * in the window, which is a property of the graph, so the same fragment gets
 * the same id on a refetch of the same window and the display's hover and
 * selection survive it. `clipToRegion` suffixes the window.
 */
function fragmentId(name: PathName, alignment: HaplotypeAlignment) {
  return `${haplotypePrefix(name)}#${name.contig}@${alignment.start.node}.${alignment.start.offset}`
}

export function fragmentFeature({
  alignment,
  assemblyName,
  refName,
  lane,
}: {
  alignment: HaplotypeAlignment
  assemblyName: string
  refName: string
  lane: string
}) {
  const { name, hapStart, hapEnd, refStart, refEnd, strand, cigar } = alignment
  if (
    name === undefined ||
    hapStart === undefined ||
    hapEnd === undefined ||
    refEnd <= refStart
  ) {
    return undefined
  } else {
    const id = fragmentId(name, alignment)
    const data: SimpleFeatureSerialized = {
      uniqueId: id,
      assemblyName,
      refName,
      start: refStart,
      end: refEnd,
      type: 'match',
      strand: strand === '-' ? -1 : 1,
      CIGAR: cigar,
      syntenyId: id,
      mate: {
        refName: name.contig,
        start: hapStart,
        end: hapEnd,
        assemblyName: lane,
      },
    }
    return new SyntenyFeature(data)
  }
}

interface ReferenceFragment {
  path: GbzPath
  end: number
}

export default class GbzBaseSyntenyAdapter extends ComparativeAdapterBase<GbzBaseSyntenyAdapterConfig> {
  private graph = cachedSetup({
    label: 'Opening pangenome database',
    setup: async () => {
      const indexLocation: FileLocation = this.getConf('haplotypeIndexLocation')
      const hasCompanion = !('uri' in indexLocation) || indexLocation.uri !== ''
      const db = await GBZBase.open(
        openLocation(this.getConf('gbzDbLocation'), this.pluginManager),
        hasCompanion
          ? {
              haplotypeIndex: openLocation(indexLocation, this.pluginManager),
            }
          : {},
      )
      const anchor = this.getConf('assemblyNames')[0]
      if (anchor === undefined) {
        throw new Error(
          'GbzBaseSyntenyAdapter needs assemblyNames: its first entry is the assembly the reference sample is loaded as',
        )
      }
      const referenceSamples = ((await db.tag('gbwt_reference_samples')) ?? '')
        .split(/\s+/)
        .filter(sample => sample !== '')
      const referenceSample = resolveReferenceSample({
        configured: this.getConf('referenceSample'),
        anchorPrefix: resolvePanSNPrefix(this, anchor),
        referenceSamples,
      })
      return { db, anchor, referenceSample, referenceSamples }
    },
  })

  private async referenceFragments(refName: string, opts: BaseOptions) {
    const { db, referenceSample } = await this.graph(opts)
    const paths = (await db.paths()).filter(
      path =>
        path.isIndexed &&
        path.name.sample === referenceSample &&
        path.name.contig === refName,
    )
    return Promise.all(
      paths.map(async (path): Promise<ReferenceFragment> => {
        const length = await db.haplotypeLength(path.handle)
        return {
          path,
          end:
            length === undefined
              ? Number.POSITIVE_INFINITY
              : path.name.fragment + length,
        }
      }),
    )
  }

  async getHeader(opts: BaseOptions = {}) {
    const { referenceSample, referenceSamples } = await this.graph(opts)
    return { hasCoarseTier: false, referenceSample, referenceSamples }
  }

  async getRefNames(opts: BaseOptions = {}) {
    const { db, anchor, referenceSample } = await this.graph(opts)
    const { assemblyName } = opts
    const prefix =
      assemblyName === anchor
        ? undefined
        : resolvePanSNPrefix(this, assemblyName)
    const contigs = (await db.paths())
      .filter(path =>
        assemblyName === anchor
          ? path.isIndexed && path.name.sample === referenceSample
          : panSNMatchesPrefix(haplotypePrefix(path.name), prefix),
      )
      .map(path => path.name.contig)
    return [...new Set(contigs)]
  }

  /**
   * The graph view's cut of the window: the reference walk, every top-level
   * snarl contained in it, and one W line per haplotype walk, PanSN-named
   * when the database (or its companion) carries the haplotype index and
   * `unknown#N` otherwise. The reference walk is the first W line, which is
   * the one the view anchors on by default.
   */
  async getSubgraph(region: Region, opts: { context?: number } = {}) {
    const { db } = await this.graph()
    const { refName, start, end } = region
    const fragment = (await this.referenceFragments(refName, {})).find(
      f => f.path.name.fragment <= start && start < f.end,
    )
    if (!fragment) {
      return ''
    }
    const { sample, contig, haplotype } = fragment.path.name
    const subgraph = await subgraphInInterval(
      db,
      { sample, contig, haplotype },
      start,
      Math.min(end, fragment.end),
      {
        context: opts.context ?? this.getConf('context'),
        snarls: this.getConf('subgraphSnarls'),
        haplotypes: 'all',
        limit: this.getConf('nodeLimit'),
      },
    )
    if (db.hasHaplotypeIndex) {
      await subgraph.identifyPaths()
    }
    return subgraph.toGFA(false, { names: 'resolved' })
  }

  getFeatures(region: Region, opts: BaseOptions = {}) {
    return ObservableCreate<Feature>(async observer => {
      const { db, anchor } = await this.graph(opts)
      if (!db.hasHaplotypeIndex) {
        throw new NoHaplotypeIndexError()
      }
      const { assemblyName, refName, start, end } = region
      // a window on a haplotype lane has no direct answer: the display
      // composes lane-to-lane links through the anchor
      if (assemblyName === anchor) {
        const targetPrefix = resolvePanSNPrefix(this, opts.targetAssemblyName)
        const asmByPrefix = assemblyByPanSNPrefix(this)
        const context = this.getConf('context')
        const limit = this.getConf('nodeLimit')
        for (const fragment of await this.referenceFragments(refName, opts)) {
          const lo = Math.max(start, fragment.path.name.fragment)
          const hi = Math.min(end, fragment.end)
          if (hi > lo) {
            const { sample, contig, haplotype } = fragment.path.name
            const subgraph = await updateStatus(
              `Reading graph ${refName}:${lo}-${hi}`,
              opts.statusCallback,
              () =>
                subgraphInInterval(db, { sample, contig, haplotype }, lo, hi, {
                  context,
                  haplotypes: 'all',
                  limit,
                }),
            )
            await updateStatus('Naming haplotypes', opts.statusCallback, () =>
              subgraph.identifyPaths(),
            )
            for (const alignment of subgraph.alignments()) {
              const { name } = alignment
              if (
                name !== undefined &&
                (targetPrefix === undefined ||
                  panSNMatchesPrefix(haplotypePrefix(name), targetPrefix))
              ) {
                const feature = fragmentFeature({
                  alignment,
                  assemblyName,
                  refName,
                  lane: laneAssemblyName(asmByPrefix, name),
                })
                if (feature !== undefined) {
                  observer.next(feature)
                }
              }
            }
          }
        }
      }
      observer.complete()
    }, opts.stopToken)
  }
}
