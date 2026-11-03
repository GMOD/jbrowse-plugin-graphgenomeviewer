import { makeIndexType } from '@jbrowse/core/util/tracks'

import {
  GRAPH_SUFFIX,
  SEGMENTS_SUFFIX,
  WALKS_SUFFIX,
  locationName,
  readsSiblings,
  renamed,
} from '../locationName'

import type { FileLocation } from '@jbrowse/core/util'

// 'RgfaTabixWalks' is an RgfaTabixAdapter read from a walk file
export type GraphFileChoice =
  | 'RgfaTabixAdapter'
  | 'RgfaTabixWalks'
  | 'WalkTabixSyntenyAdapter'
  | 'GbzBaseSyntenyAdapter'
  | 'MinigraphBubbleAdapter'

export const BUBBLES_SUFFIX = '.bubbles.bed.gz'

function sibling(loc: FileLocation, suffix: string) {
  return renamed(loc, name => name + suffix)
}

// The suffix of a gfa-to-tabix index file: format 1's segments BED or format
// 2's graph BED
function indexSuffix(loc: FileLocation) {
  const name = locationName(loc)
  return [SEGMENTS_SUFFIX, GRAPH_SUFFIX].find(suffix => name.endsWith(suffix))
}

// A segments BED, or format 2's graph BED, the rest of the index can be found
// beside
export function isGraphIndexLocation(loc: FileLocation) {
  return readsSiblings(loc) && indexSuffix(loc) !== undefined
}

// `<prefix><suffix>` beside `<prefix>.segs.bed.gz` or `<prefix>.graph.bed.gz`
function segmentsSibling(segs: FileLocation, suffix: string) {
  const own = indexSuffix(segs) ?? SEGMENTS_SUFFIX
  return renamed(segs, name => `${name.slice(0, -own.length)}${suffix}`)
}

function linksLocation(loc: FileLocation) {
  if (!locationName(loc).endsWith(SEGMENTS_SUFFIX)) {
    throw new Error(
      `Expected a segments BED ending in ${SEGMENTS_SUFFIX}, got ${locationName(loc)}`,
    )
  }
  return segmentsSibling(loc, '.links.bed.gz')
}

function tabixIndex(loc: FileLocation, indexLoc: FileLocation | undefined) {
  return indexLoc
    ? {
        location: indexLoc,
        indexType: makeIndexType(locationName(indexLoc), 'CSI', 'TBI'),
      }
    : { location: sibling(loc, '.tbi'), indexType: 'TBI' }
}

// The links file's index is assumed beside it, of the kind the segments' is.
function siblingIndex(loc: FileLocation, indexLoc: FileLocation | undefined) {
  const csi =
    indexLoc !== undefined &&
    makeIndexType(locationName(indexLoc), 'CSI', 'TBI') === 'CSI'
  return csi
    ? { location: sibling(loc, '.csi'), indexType: 'CSI' }
    : { location: sibling(loc, '.tbi'), indexType: 'TBI' }
}

function walkFile(loc: FileLocation) {
  if (!locationName(loc).endsWith(WALKS_SUFFIX)) {
    throw new Error(
      `Expected a walk file ending in ${WALKS_SUFFIX}, got ${locationName(loc)}`,
    )
  }
  return loc
}

export function buildAdapterConfig({
  choice,
  loc,
  indexLoc,
}: {
  choice: GraphFileChoice
  loc: FileLocation
  indexLoc: FileLocation | undefined
}) {
  if (choice === 'RgfaTabixWalks' || choice === 'WalkTabixSyntenyAdapter') {
    return {
      type: choice === 'RgfaTabixWalks' ? 'RgfaTabixAdapter' : choice,
      walksLocation: walkFile(loc),
      walksIndex: tabixIndex(loc, indexLoc),
    }
  }
  if (choice === 'GbzBaseSyntenyAdapter') {
    return {
      type: 'GbzBaseSyntenyAdapter',
      gbzDbLocation: loc,
      ...(indexLoc ? { haplotypeIndexLocation: indexLoc } : {}),
    }
  }
  if (choice === 'MinigraphBubbleAdapter') {
    return {
      type: 'MinigraphBubbleAdapter',
      bubblesLocation: loc,
      index: tabixIndex(loc, indexLoc),
    }
  }
  if (locationName(loc).endsWith(GRAPH_SUFFIX)) {
    return {
      type: 'RgfaTabixAdapter',
      graphLocation: loc,
      graphIndex: tabixIndex(loc, indexLoc),
    }
  }
  const links = linksLocation(loc)
  return {
    type: 'RgfaTabixAdapter',
    segmentsLocation: loc,
    segmentsIndex: tabixIndex(loc, indexLoc),
    linksLocation: links,
    linksIndex: siblingIndex(links, indexLoc),
  }
}

function isGbzLocation(loc: FileLocation) {
  return locationName(loc).toLowerCase().endsWith('.gbz.db')
}

function guessChoice(
  file: FileLocation,
  index: FileLocation | undefined,
  adapterHint: string | undefined,
): GraphFileChoice | undefined {
  const name = locationName(file)
  const allows = (type: GraphFileChoice) => !adapterHint || adapterHint === type
  // a file picked in the browser has no index beside it to assume
  const indexReachable = index !== undefined || readsSiblings(file)
  return isGbzLocation(file)
    ? allows('GbzBaseSyntenyAdapter')
      ? 'GbzBaseSyntenyAdapter'
      : undefined
    : isGraphIndexLocation(file)
      ? allows('RgfaTabixAdapter')
        ? 'RgfaTabixAdapter'
        : undefined
      : !indexReachable
        ? undefined
        : name.endsWith(WALKS_SUFFIX)
          ? // lanes beside the graph, unless the hint asks for the rGFA
            // adapter, which reads the file without them
            adapterHint === 'RgfaTabixAdapter'
            ? 'RgfaTabixWalks'
            : allows('WalkTabixSyntenyAdapter')
              ? 'WalkTabixSyntenyAdapter'
              : undefined
          : allows('MinigraphBubbleAdapter') &&
              (name.endsWith(BUBBLES_SUFFIX) || adapterHint !== undefined)
            ? 'MinigraphBubbleAdapter'
            : undefined
}

export function guessGraphAdapter(
  file: FileLocation,
  index?: FileLocation,
  adapterHint?: string,
) {
  const choice = guessChoice(file, index, adapterHint)
  return choice
    ? buildAdapterConfig({ choice, loc: file, indexLoc: index })
    : undefined
}
