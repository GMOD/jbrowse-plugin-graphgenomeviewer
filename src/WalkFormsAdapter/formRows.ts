import { changeName, describeForm } from '@jbrowse/graph-walks'

import type {
  Form,
  Mark,
  MarkKind,
  StructuralForms,
} from '@jbrowse/graph-walks'

// A form's state at a site: R's structure, no call, or a rare change where
// most haplotypes have no call (structuralForms' REFERENCE, NO_CALL, RARER)
const REFERENCE = '0'
const NO_CALL = '.'
const RARER = '~'

export const CONSEQUENCES = [
  'loss',
  'gain',
  'shift',
  'inversion',
  'net',
] as const

export type Consequence = (typeof CONSEQUENCES)[number]

// `svType` in core's vocabulary (UNIVERSAL_FIELD_PRESETS) and `type` as a
// Sequence Ontology term, which VcfFeature gives `<DUP:TANDEM>` too
const KINDS: Record<
  MarkKind,
  { svType: string; type: string; alt: string; consequence?: Consequence }
> = {
  deletion: { svType: 'DEL', type: 'deletion', alt: '<DEL>' },
  insertion: { svType: 'INS', type: 'insertion', alt: '<INS>' },
  duplication: {
    svType: 'DUP',
    type: 'tandem_duplication',
    alt: '<DUP:TANDEM>',
  },
  replacement: { svType: 'CPX', type: 'complex_substitution', alt: '<CPX>' },
  inversion: {
    svType: 'INV',
    type: 'inversion',
    alt: '<INV>',
    consequence: 'inversion',
  },
  shift: {
    svType: 'CPX',
    type: 'complex_structural_alteration',
    alt: '<CPX>',
    consequence: 'shift',
  },
  net: {
    svType: 'CPX',
    type: 'complex_structural_alteration',
    alt: '<CPX>',
    consequence: 'net',
  },
}

const consequenceOf = (m: Mark): Consequence =>
  KINDS[m.kind].consequence ?? (m.delta < 0 ? 'loss' : 'gain')

export const formName = (i: number) => `F${i + 1}`

const placedCount = ({ forms }: StructuralForms) =>
  forms.reduce((n, f) => n + f.members.length, 0)

function percent(n: number, of: number) {
  const p = (100 * n) / of
  return p > 0 && p < 1 ? '<1%' : `${Math.round(p)}%`
}

/**
 * One row per form, largest first: "67% · 18 kb deletion"
 */
export function formSources(result: StructuralForms) {
  const placed = placedCount(result)
  return result.forms.map((f, i) => ({
    name: formName(i),
    label: `${percent(f.members.length, placed)} · ${describeForm(f)}`,
    haplotypes: f.members.length,
  }))
}

const LISTED_NAMES = 5

function names(haplotypes: string[]) {
  const listed = haplotypes.slice(0, LISTED_NAMES).join(', ')
  const more = haplotypes.length - LISTED_NAMES
  return more > 0 ? `${listed} and ${more} more` : listed
}

const haplotypeCount = (n: number) => `${n} haplotype${n === 1 ? '' : 's'}`

export function formWarnings({ abridged, unplaced }: StructuralForms) {
  return [
    ...(abridged.length > 0
      ? [
          `${haplotypeCount(abridged.length)} kept an abridged walk past the forms cut's step budget, which shows as a net change over its span: ${names(abridged)}`,
        ]
      : []),
    ...(unplaced.length > 0
      ? [
          `${haplotypeCount(unplaced.length)} ${unplaced.length === 1 ? 'has' : 'have'} no walk over the pinned window, so no form: ${names(unplaced)}`,
        ]
      : []),
  ]
}

const sameMark = (a: Mark, b: Mark) =>
  a.kind === b.kind &&
  a.refStart === b.refStart &&
  a.refEnd === b.refEnd &&
  a.delta === b.delta

export interface FormVariant {
  id: string
  start: number
  end: number
  name: string
  description: string
  type: string
  svType: string
  consequence: Consequence
  alt: string
  mark: Mark
  genotypes: Record<string, string>
}

// A duplication draws over the stretch it copies rather than its zero-width
// junction, as a VCF `<DUP>` spans its copy
function drawnSpan({ copied, refStart, refEnd }: Mark) {
  const [start, end] = copied ?? [refStart, refEnd]
  return { start, end: Math.max(end, start + 1) }
}

/**
 * The marks of each changed state at a site that tells forms apart, one
 * variant each, with genotype `1` in the forms in that state, `0` in the
 * others and `.` where a form has no call or only a rarer change. A site
 * every form shares gives its marks to all of them. Edge sites, which no form
 * key holds, give none.
 */
export function formVariants(result: StructuralForms): FormVariant[] {
  const { sites, informative, forms } = result
  const placed = placedCount(result)
  const keyIndex = new Map(informative.map((site, i) => [site, i]))
  return sites.flatMap((site, s) => {
    if (site.edge) {
      return []
    }
    const i = keyIndex.get(s)
    return site.states.flatMap(state => {
      const [first] = state.marks
      if (state.key === REFERENCE || first === undefined) {
        return []
      }
      const genotypeAt = (form: Form) => {
        if (i === undefined) {
          return form.marks.some(m => sameMark(m, first)) ? '1' : '0'
        }
        const key = form.states[i]!
        return key === state.key
          ? '1'
          : key === NO_CALL || key === RARER
            ? '.'
            : '0'
      }
      const genotypes: Record<string, string> = {}
      let carriers = 0
      forms.forEach((form, j) => {
        const genotype = genotypeAt(form)
        genotypes[formName(j)] = genotype
        if (genotype === '1') {
          carriers += form.members.length
        }
      })
      return carriers > 0
        ? state.marks.map((mark, k) => ({
            id: `${s}:${state.key}:${k}`,
            ...drawnSpan(mark),
            name: changeName(mark),
            description: `${carriers} of ${haplotypeCount(placed)}`,
            ...KINDS[mark.kind],
            consequence: consequenceOf(mark),
            mark,
            genotypes,
          }))
        : []
    })
  })
}
