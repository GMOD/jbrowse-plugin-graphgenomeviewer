import type { MinigraphBubble } from '../../MinigraphBubbleAdapter/bubbleLine'

// What kind of variation a bubble is, read off the numbers `gfatools bubble`
// states: the reference interval it replaces, its shortest and longest route,
// how many routes, and whether one of them inverts. The reference route is one
// of the routes and its length is the interval, so the shortest and longest
// against the interval say whether the alternatives add sequence, remove it,
// or swap it.
export type BubbleKind =
  | 'snp'
  | 'substitution'
  | 'insertion'
  | 'deletion'
  | 'inversion'
  | 'repeat'
  | 'superbubble'
  | 'complex'

export interface BubbleClass {
  kind: BubbleKind
  label: string
}

// gfatools counts routes into an int32 and clamps at its maximum; a nested
// superbubble's count is combinatorial and reaches it.
const SATURATED_ROUTES = 2147483647
const SUPERBUBBLE_SEGMENTS = 40

export function formatBp(bp: number) {
  if (bp >= 10_000) {
    return `${(bp / 1000).toFixed(0)} kb`
  }
  if (bp >= 1000) {
    return `${(bp / 1000).toFixed(1)} kb`
  }
  return `${bp} bp`
}

function routes(count: number) {
  if (count >= SATURATED_ROUTES) {
    return 'more routes than gfatools counts'
  }
  if (count >= 100_000) {
    return `${(count / 1000).toFixed(0)}k routes`
  }
  return `${count} routes`
}

export function classifyBubble(b: MinigraphBubble): BubbleClass {
  const c = classifyShape(b)
  return b.partial ? { ...c, label: `${c.label}, reaches outside the cut` } : c
}

function classifyShape(b: MinigraphBubble): BubbleClass {
  const refSpan = b.end - b.start
  const {
    shortestAlleleLength: shortest,
    longestAlleleLength: longest,
    pathCount,
    segmentCount,
    inversion,
  } = b
  const range = `${formatBp(shortest)}–${formatBp(longest)}`
  if (segmentCount >= SUPERBUBBLE_SEGMENTS) {
    return {
      kind: 'superbubble',
      label: `superbubble: ${segmentCount} segments, ${routes(pathCount)}, ${range}${inversion ? ', with an inversion' : ''}`,
    }
  }
  if (inversion) {
    return { kind: 'inversion', label: `inversion, ${formatBp(longest)}` }
  }
  if (pathCount >= 8 && longest > 5 * Math.max(shortest, 1)) {
    return {
      kind: 'repeat',
      label: `${routes(pathCount)}, ${range}: repeat array`,
    }
  }
  const alleles = pathCount > 2 ? `, ${pathCount} alleles` : ''
  if (shortest === longest && shortest === refSpan) {
    return refSpan <= 1
      ? { kind: 'snp', label: 'SNP' }
      : { kind: 'substitution', label: `${formatBp(refSpan)} substitution` }
  }
  if (refSpan === 0 || shortest === refSpan) {
    return {
      kind: 'insertion',
      label: `insertion, up to ${formatBp(longest - refSpan)}${alleles}`,
    }
  }
  if (longest === refSpan) {
    return {
      kind: 'deletion',
      label: `deletion of ${formatBp(refSpan - shortest)}${alleles}`,
    }
  }
  return {
    kind: 'complex',
    label: `${pathCount} alleles, ${range} for ${formatBp(refSpan)} of reference`,
  }
}

// One hue per kind, the deletion arc's near-black and the reference blue kept
// clear of, so a glyph is not mistaken for either.
export const BUBBLE_KIND_COLORS: Record<BubbleKind, string> = {
  snp: '#5b6b7a',
  substitution: '#5b6b7a',
  insertion: '#2f8fd6',
  deletion: '#c94040',
  inversion: '#e07b00',
  repeat: '#8e3fbf',
  superbubble: '#8e3fbf',
  complex: '#8e3fbf',
}

export function bubbleSegmentIds(b: MinigraphBubble) {
  return b.segments.split(',').filter(Boolean)
}
