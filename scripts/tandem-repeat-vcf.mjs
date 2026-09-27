#!/usr/bin/env node
//
// States each haplotype's copies of a tandem repeat array as a VCF 4.5
// <CNV:TR> record, from a graph cut that holds the array and its flanks.
//
//   node scripts/tandem-repeat-vcf.mjs cut.gfa --bed arrays.bed [--name KIV-2]
//     [--divergence 0.01] > array.vcf
//
// The BED row (chrom, start, end, name, unit) names the array on the
// reference walk. Each W walk is cut between the reference nodes flanking it,
// as walk rows cut it, and split into copies wherever the reference array's
// first 24 bases recur. Copies whose k-mer containment puts them within
// --divergence of each other, average linkage, share a unit, and a unit's
// RUS is its medoid copy. Consecutive copies of one unit are one repeat
// sequence (RN), with RUC copies, RB bases and each copy's bases in RUB. A
// phased GT's k-th allele is PanSN haplotype k; the reference walk is a sample
// of its own, so its copies are stated too.
//
// It stands in for a repeat finder only where none reaches: TRGT needs reads
// spanning the array, and vamos 3.1.1, the assembly-mode finder, skips any
// allele over 30,000 bp (src/vntr.cpp) and wrote no record for these contigs
// under a graph-derived alignment. On GRCh38's array, which fits, vamos with
// this script's two units as its motifs decomposes the copies identically.
import fs from 'node:fs'
import { parseArgs } from 'node:util'

const K = 15
const PROBE = 24

const { values: opts, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    bed: { type: 'string' },
    name: { type: 'string' },
    divergence: { type: 'string', default: '0.01' },
  },
})
const [gfaPath] = positionals
if (!gfaPath || !opts.bed) {
  console.error(
    'usage: tandem-repeat-vcf.mjs cut.gfa --bed arrays.bed [--name NAME] [--divergence 0.01]',
  )
  process.exit(1)
}
const divergence = Number(opts.divergence)

const bedRow = fs
  .readFileSync(opts.bed, 'utf8')
  .split('\n')
  .map(line => line.split('\t'))
  .find(f => f.length >= 3 && (!opts.name || f[3] === opts.name))
if (!bedRow) {
  throw new Error(`no array ${opts.name ?? ''} in ${opts.bed}`)
}
const [chrom, bedStart, bedEnd, arrayName = '.'] = bedRow
const array = { start: Number(bedStart), end: Number(bedEnd) }

const segments = new Map()
const walks = []
let referenceSample
for (const line of fs.readFileSync(gfaPath, 'utf8').split('\n')) {
  const f = line.split('\t')
  if (f[0] === 'S') {
    segments.set(f[1], f[2])
  } else if (f[0] === 'H') {
    referenceSample ??= f.find(t => t.startsWith('RS:Z:'))?.slice(5)
  } else if (f[0] === 'W') {
    walks.push({
      sample: f[1],
      haplotype: Number(f[2]),
      start: Number(f[4]),
      steps: [...f[6].matchAll(/([<>])([^<>]+)/g)].map(m => ({
        id: m[2],
        reverse: m[1] === '<',
      })),
    })
  }
}
const reference =
  walks.find(w => w.sample === referenceSample && w.haplotype === 0) ?? walks[0]

const COMPLEMENT = { A: 'T', C: 'G', G: 'C', T: 'A' }
const revcomp = s =>
  [...s]
    .reverse()
    .map(b => COMPLEMENT[b] ?? 'N')
    .join('')
const stepSequence = ({ id, reverse }) => {
  const s = segments.get(id)
  return reverse ? revcomp(s) : s
}

const span = new Map()
let pos = reference.start
for (const step of reference.steps) {
  const len = segments.get(step.id).length
  if (!span.has(step.id)) {
    span.set(step.id, { start: pos, end: pos + len })
  }
  pos += len
}
const referenceSequence = reference.steps.map(stepSequence).join('')
const referenceBase = bp => referenceSequence[bp - reference.start]
const probe = referenceSequence.slice(
  array.start - reference.start,
  array.start - reference.start + PROBE,
)

// The walk's sequence between the nearest reference nodes it visits on either
// side of the array, read along the reference.
function sliceOf(walk) {
  let i0 = -1
  let i1 = -1
  walk.steps.forEach(({ id }, i) => {
    const s = span.get(id)
    if (
      s?.end <= array.start &&
      (i0 < 0 || s.end > span.get(walk.steps[i0].id).end)
    ) {
      i0 = i
    }
    if (
      s?.start >= array.end &&
      (i1 < 0 || s.start < span.get(walk.steps[i1].id).start)
    ) {
      i1 = i
    }
  })
  if (i0 < 0 || i1 < 0) {
    return undefined
  }
  const inner = walk.steps.slice(Math.min(i0, i1) + 1, Math.max(i0, i1))
  const text = inner.map(stepSequence).join('')
  return i0 < i1 ? text : revcomp(text)
}

function copiesOf(sequence) {
  const starts = []
  for (
    let i = sequence.indexOf(probe);
    i >= 0;
    i = sequence.indexOf(probe, i + 1)
  ) {
    starts.push(i)
  }
  return starts.map((start, i) =>
    sequence.slice(start, starts[i + 1] ?? sequence.length),
  )
}

const haplotypes = []
for (const walk of walks) {
  const sequence = sliceOf(walk)
  const copies = sequence === undefined ? [] : copiesOf(sequence)
  if (copies.length === 0) {
    console.error(
      `${walk.sample}#${walk.haplotype}: ${sequence === undefined ? 'does not reach both flanks' : 'no copy of the array start'}; left out`,
    )
    continue
  }
  haplotypes.push({ ...walk, copies })
}

const distinct = [...new Set(haplotypes.flatMap(h => h.copies))]
const referenceBp = array.end - array.start
const lengths = distinct.map(c => c.length).sort((a, b) => a - b)
const typical = lengths[lengths.length >> 1]
const longest = lengths.at(-1)
if (longest > 1.5 * typical) {
  console.error(
    `a ${longest} bp copy against a typical ${typical}: the array start may be mutated in one`,
  )
}

function kmers(s) {
  const out = new Set()
  for (let i = 0; i + K <= s.length; i++) {
    const k = s.slice(i, i + K)
    const r = revcomp(k)
    out.add(k < r ? k : r)
  }
  return out
}
const sets = distinct.map(kmers)
// Containment rather than Jaccard, so the array's last, partial copy measures
// against the part of a full copy it covers.
function distance(a, b) {
  const [small, large] =
    sets[a].size < sets[b].size ? [sets[a], sets[b]] : [sets[b], sets[a]]
  let shared = 0
  for (const k of small) {
    if (large.has(k)) {
      shared++
    }
  }
  return shared === 0 ? 1 : -Math.log(shared / small.size) / K
}
const n = distinct.length
const D = Array.from({ length: n }, () => new Float64Array(n))
for (let a = 0; a < n; a++) {
  for (let b = a + 1; b < n; b++) {
    D[a][b] = D[b][a] = distance(a, b)
  }
}

let clusters = distinct.map((_, i) => [i])
const linkage = (x, y) => {
  let sum = 0
  for (const a of x) {
    for (const b of y) {
      sum += D[a][b]
    }
  }
  return sum / (x.length * y.length)
}
for (;;) {
  let best
  for (let x = 0; x < clusters.length; x++) {
    for (let y = x + 1; y < clusters.length; y++) {
      const d = linkage(clusters[x], clusters[y])
      if (d <= divergence && (!best || d < best.d)) {
        best = { x, y, d }
      }
    }
  }
  if (!best) {
    break
  }
  const merged = [...clusters[best.x], ...clusters[best.y]]
  clusters = clusters.filter((_, i) => i !== best.x && i !== best.y)
  clusters.push(merged)
}

// A unit's sequence is its medoid among the copies of full length, so RUS is
// a copy some haplotype carries rather than a consensus none does.
const unitOf = new Map()
for (const members of clusters) {
  const full = members.filter(i => distinct[i].length >= 0.9 * typical)
  const pool = full.length > 0 ? full : members
  const medoid = pool.reduce((best, i) =>
    linkage([i], members) < linkage([best], members) ? i : best,
  )
  for (const i of members) {
    unitOf.set(distinct[i], distinct[medoid])
  }
}
console.error(
  `${haplotypes.length} walks, ${haplotypes.reduce((s, h) => s + h.copies.length, 0)} copies (${n} distinct), ${clusters.length} units at ${divergence * 100}% divergence`,
)

function runsOf(copies) {
  const runs = []
  for (const copy of copies) {
    const unit = unitOf.get(copy)
    const last = runs.at(-1)
    if (last?.unit === unit) {
      last.copyBp.push(copy.length)
    } else {
      runs.push({ unit, copyBp: [copy.length] })
    }
  }
  return runs
}

const alleles = []
const alleleIndex = new Map()
const samples = new Map()
for (const h of haplotypes) {
  const runs = runsOf(h.copies)
  const key = JSON.stringify(runs)
  if (!alleleIndex.has(key)) {
    alleles.push(runs)
    alleleIndex.set(key, alleles.length)
  }
  const calls = samples.get(h.sample) ?? new Map()
  calls.set(h.haplotype, alleleIndex.get(key))
  samples.set(h.sample, calls)
}

const sum = xs => xs.reduce((a, b) => a + b, 0)
const alleleBp = runs => sum(runs.map(r => sum(r.copyBp)))
const cn = bp => Number((bp / referenceBp).toFixed(4))
const info = [
  `SVLEN=${alleles.map(() => referenceBp).join(',')}`,
  `CN=${alleles.map(runs => cn(alleleBp(runs))).join(',')}`,
  `RN=${alleles.map(runs => runs.length).join(',')}`,
  `RUS=${alleles.flatMap(runs => runs.map(r => r.unit)).join(',')}`,
  `RUC=${alleles.flatMap(runs => runs.map(r => r.copyBp.length)).join(',')}`,
  `RB=${alleles.flatMap(runs => runs.map(r => sum(r.copyBp))).join(',')}`,
  `RUB=${alleles.flatMap(runs => runs.flatMap(r => r.copyBp)).join(',')}`,
].join(';')

function genotype(calls) {
  const numbers = [...calls.keys()]
  if (numbers.length === 1 && numbers[0] === 0) {
    return {
      gt: String(calls.get(0)),
      bp: [alleleBp(alleles[calls.get(0) - 1])],
    }
  }
  const top = Math.max(2, ...numbers)
  const fields = Array.from({ length: top }, (_, k) => calls.get(k + 1))
  return {
    gt: fields.map(a => a ?? '.').join('|'),
    bp: fields.flatMap(a => (a ? [alleleBp(alleles[a - 1])] : [])),
  }
}

const names = [...samples.keys()]
const columns = names.map(name => {
  const { gt, bp } = genotype(samples.get(name))
  return `${gt}:${cn(sum(bp))}`
})
const lines = [
  '##fileformat=VCFv4.5',
  `##source=tandem-repeat-vcf.mjs ${gfaPath.split('/').at(-1)} divergence=${divergence}`,
  `##contig=<ID=${chrom}>`,
  '##ALT=<ID=CNV:TR,Description="Tandem repeat">',
  '##INFO=<ID=SVLEN,Number=A,Type=Integer,Description="Length of structural variant">',
  '##INFO=<ID=CN,Number=A,Type=Float,Description="Copy number of allele">',
  '##INFO=<ID=RN,Number=A,Type=Integer,Description="Total number of repeat sequences in this allele">',
  '##INFO=<ID=RUS,Number=.,Type=String,Description="Repeat unit sequence of the corresponding repeat sequence">',
  '##INFO=<ID=RUC,Number=.,Type=Float,Description="Repeat unit count of corresponding repeat sequence">',
  '##INFO=<ID=RB,Number=.,Type=Integer,Description="Total number of bases in the corresponding repeat sequence">',
  '##INFO=<ID=RUB,Number=.,Type=Integer,Description="Number of bases in each individual repeat unit">',
  '##FORMAT=<ID=GT,Number=1,Type=String,Description="Genotype">',
  '##FORMAT=<ID=CN,Number=1,Type=Float,Description="Copy number">',
  [
    '#CHROM',
    'POS',
    'ID',
    'REF',
    'ALT',
    'QUAL',
    'FILTER',
    'INFO',
    'FORMAT',
    ...names,
  ].join('\t'),
  [
    chrom,
    array.start,
    arrayName,
    referenceBase(array.start - 1),
    alleles.map(() => '<CNV:TR>').join(','),
    '.',
    '.',
    info,
    'GT:CN',
    ...columns,
  ].join('\t'),
]
process.stdout.write(`${lines.join('\n')}\n`)
