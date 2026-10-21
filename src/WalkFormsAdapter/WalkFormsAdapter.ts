import { BaseFeatureDataAdapter } from '@jbrowse/core/data_adapters/BaseAdapter'
import { SimpleFeature, updateStatus } from '@jbrowse/core/util'
import { ObservableCreate } from '@jbrowse/core/util/rxjs'
import {
  WalkReader,
  formsCut,
  panSNContig,
  panSNMatchesPrefix,
  structuralForms,
} from '@jbrowse/graph-walks'

import { formSources, formVariants, formWarnings } from './formRows.ts'
import { openTabixSlot } from '../panSNTabix.ts'

import type { WalkFormsAdapterConfig } from './configSchema.ts'
import type { BaseOptions } from '@jbrowse/core/data_adapters/BaseAdapter'
import type { Feature } from '@jbrowse/core/util'
import type { Region } from '@jbrowse/core/util/types'
import type { HaplotypeDepartures, StructuralForms } from '@jbrowse/graph-walks'

interface Pinned {
  refName: string
  start: number
  end: number
}

function pinnedOf(value: unknown): Pinned | undefined {
  const { refName, start, end } = (value ?? {}) as Partial<Pinned>
  return typeof refName === 'string' &&
    Number.isFinite(start) &&
    Number.isFinite(end) &&
    start! < end!
    ? { refName, start: start!, end: end! }
    : undefined
}

function floorOf(value: unknown) {
  const n = Number(value)
  return value !== 'auto' && Number.isFinite(n) ? n : 'auto'
}

// The departures of each pinned window, shared across adapter instances:
// dataAdapterCache keys an adapter on its whole config, so a new floor or
// exclude list makes a new adapter, which regroups these without a new cut.
// A cut at the MHC takes 8 s.
const CUTS_KEPT = 8
const cuts = new Map<string, Promise<HaplotypeDepartures[]>>()

function cachedCut(key: string, cut: () => Promise<HaplotypeDepartures[]>) {
  const kept = cuts.get(key)
  const read = kept ?? cut()
  cuts.delete(key)
  cuts.set(key, read)
  if (!kept) {
    read.catch(() => {
      if (cuts.get(key) === read) {
        cuts.delete(key)
      }
    })
    for (const old of cuts.keys()) {
      if (cuts.size <= CUTS_KEPT) {
        break
      }
      cuts.delete(old)
    }
  }
  return read
}

export default class WalkFormsAdapter extends BaseFeatureDataAdapter<WalkFormsAdapterConfig> {
  public static capabilities = ['getFeatures', 'getRefNames']

  private readonly reader = new WalkReader(
    openTabixSlot(this, ['walksLocation'], ['walksIndex']),
  )

  private formsRead: Promise<StructuralForms> | undefined

  private async referenceSample(opts: BaseOptions) {
    const { references } = await this.reader.header(opts)
    return references[0] ?? ''
  }

  // The reference sample's contigs, as the assembly names them
  async getRefNames(opts: BaseOptions = {}) {
    const names = await this.reader.referenceSequences(opts)
    const sample = await this.referenceSample(opts)
    const contigs = names
      .filter(n => panSNMatchesPrefix(n, sample))
      .map(n => panSNContig(n))
    return contigs.length > 0 ? [...new Set(contigs)] : names
  }

  private pinned() {
    const pinned = pinnedOf(this.getConf('pinned'))
    if (!pinned) {
      throw new Error(
        'WalkFormsAdapter needs `pinned`, the window its forms come from: { refName, start, end }',
      )
    }
    return pinned
  }

  // Read once per adapter, and so once per floor and exclude list. The cut
  // takes no caller's signal, since every later caller shares it.
  private forms(opts: BaseOptions) {
    if (!this.formsRead) {
      const pinned = this.pinned()
      const key = `${JSON.stringify(this.getConf('walksLocation'))}\t${pinned.refName}:${pinned.start}-${pinned.end}`
      const read = cachedCut(key, () =>
        updateStatus('Cutting walks', opts.statusCallback, () =>
          formsCut(this.reader, pinned),
        ),
      ).then(departures =>
        structuralForms(departures, {
          window: pinned,
          floorBp: floorOf(this.getConf('floorBp')),
          exclude: this.getConf('exclude'),
        }),
      )
      read.catch(() => {
        if (this.formsRead === read) {
          this.formsRead = undefined
        }
      })
      this.formsRead = read
    }
    return this.formsRead
  }

  /**
   * One source per form, which core's multi-sample variant display draws as
   * a row, and warnings naming the haplotypes left abridged or unplaced
   */
  async getSourcesAndWarnings(opts: BaseOptions = {}) {
    const result = await this.forms(opts)
    return { sources: formSources(result), warnings: formWarnings(result) }
  }

  async getSources(_regions: Region[], opts: BaseOptions = {}) {
    return formSources(await this.forms(opts))
  }

  private async onPinnedSequence(refName: string, opts: BaseOptions) {
    const sample = await this.referenceSample(opts)
    const [query, pinned] = await Promise.all([
      this.reader.sequenceFor(sample, refName, opts),
      this.reader.sequenceFor(sample, this.pinned().refName, opts),
    ])
    return query !== undefined && query === pinned
  }

  getFeatures(query: Region, opts: BaseOptions = {}) {
    return ObservableCreate<Feature>(async observer => {
      if (await this.onPinnedSequence(query.refName, opts)) {
        const result = await this.forms(opts)
        for (const v of formVariants(result)) {
          if (v.start < query.end && v.end > query.start) {
            observer.next(
              new SimpleFeature({
                uniqueId: `forms-${result.floorBp}-${v.id}`,
                refName: query.refName,
                start: v.start,
                end: v.end,
                name: v.name,
                description: v.description,
                type: v.type,
                svType: v.svType,
                consequence: v.consequence,
                REF: 'N',
                ALT: [v.alt],
                INFO: { SVTYPE: [v.svType], SVLEN: [v.mark.delta] },
                mark: v.mark,
                genotypes: v.genotypes,
              }),
            )
          }
        }
      }
      observer.complete()
    }, opts.signal)
  }
}
