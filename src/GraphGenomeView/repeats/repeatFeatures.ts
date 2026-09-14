import type { Feature } from '@jbrowse/core/util'

// A tandem repeat array as the walk rows need it: its span on the reference,
// which is what the bars measure between, and its unit length, which is what
// they tile by. Read off whatever repeat annotation the session has, since the
// tools all state the same two facts under different names: VCF 4.5's
// `<CNV:TR>` allele gives `RUL` and `RUS` (one entry per repeat sequence,
// grouped by `RN`), UCSC simpleRepeat and TRF give `period` and the consensus
// `sequence`, TRGT gives `MOTIFS` and `TRID`, ExpansionHunter `RU` and `REPID`,
// HipSTR and GangSTR `PERIOD`, vamos its `motifs`. A VCF record's INFO is
// searched as well as its top level, and a list's first entry is the unit the
// bars tile by: for a compound array that is the first repeat sequence, which
// is the expanding one at every such locus in the common catalogues.
export interface RepeatArray {
  key: string
  name: string
  refName: string
  start: number
  end: number
  unit: number
  motif?: string
}

export const REPEAT_ADAPTER_TYPES = new Set([
  'BedAdapter',
  'BedTabixAdapter',
  'BigBedAdapter',
  'VcfAdapter',
  'VcfTabixAdapter',
])

const REPEAT_TRACK_HINT =
  /repeat|tandem|\bstr\b|vntr|trf|trgt|vamos|expansion|microsat/i

export function pickRepeatTrack<
  T extends { trackId: string; name?: string; adapterType: string },
>(tracks: T[], named: string) {
  if (named) {
    return tracks.find(t => t.trackId === named)
  }
  const candidates = tracks.filter(t => REPEAT_ADAPTER_TYPES.has(t.adapterType))
  return candidates.find(t =>
    REPEAT_TRACK_HINT.test(`${t.trackId} ${t.name ?? ''}`),
  )
}

type FeatureLike = Feature | Record<string, unknown>

function field(f: FeatureLike, name: string): unknown {
  const top =
    typeof (f as Feature).get === 'function'
      ? (f as Feature).get(name)
      : (f as Record<string, unknown>)[name]
  if (top !== undefined) {
    return top
  }
  const info =
    typeof (f as Feature).get === 'function'
      ? (f as Feature).get('INFO')
      : (f as Record<string, unknown>).INFO
  return (info as Record<string, unknown> | undefined)?.[name]
}

const MOTIF_FIELDS = [
  'RUS',
  'MOTIFS',
  'RU',
  'motifs',
  'motif',
  'sequence',
  'consensus',
]
const PERIOD_FIELDS = [
  'RUL',
  'period',
  'PERIOD',
  'consensusSize',
  'unit',
  'unitLength',
]
const NAME_FIELDS = ['TRID', 'REPID', 'VARID', 'name', 'ID', 'id']

// The first entry of a list-valued field, whether it arrived parsed or as
// the comma-joined text a VCF INFO or a BED column holds; VCF's missing "."
// counts as absent.
function first(f: FeatureLike, names: string[]) {
  for (const name of names) {
    const value = field(f, name)
    const one = String((Array.isArray(value) ? value[0] : value) ?? '')
      .split(',')[0]!
      .trim()
    if (one !== '' && one !== '.') {
      return one
    }
  }
  return undefined
}

const IUPAC = /^[ACGTURYSWKMBDHVN]+$/i

// The unit in bp: a stated period, else the length of the first motif.
export function repeatUnitOf(f: FeatureLike) {
  const period = Number(first(f, PERIOD_FIELDS))
  if (Number.isFinite(period) && period > 0) {
    return Math.round(period)
  }
  const motif = first(f, MOTIF_FIELDS)
  return motif && IUPAC.test(motif) ? motif.length : undefined
}

export function repeatArraysFrom(features: FeatureLike[]): RepeatArray[] {
  const arrays: RepeatArray[] = []
  for (const f of features) {
    const start = field(f, 'start') as number
    const end = field(f, 'end') as number
    const unit = repeatUnitOf(f)
    if (!(end > start) || unit === undefined) {
      continue
    }
    const refName = field(f, 'refName') as string
    const motif = first(f, MOTIF_FIELDS)
    arrays.push({
      key: `${refName}:${start}-${end}`,
      name:
        first(f, NAME_FIELDS) ??
        (motif && motif.length <= 12
          ? `(${motif})n`
          : `${refName}:${(start + 1).toLocaleString()}-${end.toLocaleString()}`),
      refName,
      start,
      end,
      unit,
      motif,
    })
  }
  return arrays.sort((a, b) => a.start - b.start)
}
