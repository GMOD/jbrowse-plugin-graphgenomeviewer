import { makeIndex, makeIndexType } from '@jbrowse/core/util/tracks'

import type { FileLocation } from '@jbrowse/core/util'

export type GraphFileChoice = 'RgfaTabixAdapter' | 'MinigraphBubbleAdapter'

export const GRAPH_FILE_LABELS: Record<GraphFileChoice, string> = {
  RgfaTabixAdapter: 'rGFA segments (tabix BED pair)',
  MinigraphBubbleAdapter: 'Minigraph bubbles (tabix BED)',
}

export const GRAPH_FILE_FIELDS: Record<GraphFileChoice, string> = {
  RgfaTabixAdapter:
    'Path to segments BED (.segs.bed.gz from build_rgfa_tabix.sh; the .links.bed.gz and both .tbi are assumed beside it)',
  MinigraphBubbleAdapter:
    'Path to bubbles BED (.bed.gz from gfatools bubble; the .tbi is assumed beside it)',
}

const SEGMENTS_SUFFIX = '.segs.bed.gz'

export const STABLE_RANK_COLOR =
  "jexl:feature.rank==0 ? 'rgb(52,152,219)' : 'rgb(237,137,44)'"

function locationName(loc: FileLocation) {
  return 'uri' in loc ? loc.uri : 'localPath' in loc ? loc.localPath : ''
}

function linksLocation(loc: FileLocation) {
  const name = locationName(loc)
  if (!name.endsWith(SEGMENTS_SUFFIX)) {
    throw new Error(
      `Expected a segments BED ending in ${SEGMENTS_SUFFIX}, got ${name || 'a blob'}`,
    )
  }
  const links = `${name.slice(0, -SEGMENTS_SUFFIX.length)}.links.bed.gz`
  return 'uri' in loc
    ? { ...loc, uri: links }
    : 'localPath' in loc
      ? { ...loc, localPath: links }
      : loc
}

function tabixIndex(loc: FileLocation, indexLoc: FileLocation | undefined) {
  return indexLoc
    ? {
        location: indexLoc,
        indexType: makeIndexType(locationName(indexLoc), 'CSI', 'TBI'),
      }
    : { location: makeIndex(loc, '.tbi'), indexType: 'TBI' }
}

function panSN(assembly: string, sample: string) {
  const name = sample.trim()
  return name ? { assemblyNameToPanSN: { [assembly]: name } } : {}
}

export function buildAdapterConfig({
  choice,
  loc,
  indexLoc,
  assembly,
  sample,
}: {
  choice: GraphFileChoice
  loc: FileLocation
  indexLoc: FileLocation | undefined
  assembly: string
  sample: string
}) {
  if (choice === 'MinigraphBubbleAdapter') {
    return {
      type: 'MinigraphBubbleAdapter',
      bubblesLocation: loc,
      index: tabixIndex(loc, indexLoc),
      ...panSN(assembly, sample),
    }
  }
  const links = linksLocation(loc)
  return {
    type: 'RgfaTabixAdapter',
    segmentsLocation: loc,
    segmentsIndex: tabixIndex(loc, indexLoc),
    linksLocation: links,
    linksIndex: tabixIndex(links, undefined),
    ...panSN(assembly, sample),
  }
}

export function buildTrackConfig(args: {
  choice: GraphFileChoice
  loc: FileLocation
  indexLoc: FileLocation | undefined
  assembly: string
  sample: string
  trackId: string
  name: string
}) {
  const { choice, assembly, trackId, name } = args
  return {
    type: 'FeatureTrack',
    trackId,
    name,
    assemblyNames: [assembly],
    adapter: buildAdapterConfig(args),
    ...(choice === 'RgfaTabixAdapter'
      ? { displayDefaults: { color: STABLE_RANK_COLOR, showLabels: 'none' } }
      : {}),
  }
}
