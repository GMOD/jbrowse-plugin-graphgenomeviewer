import BubbleChartIcon from '@mui/icons-material/BubbleChart'

import { launchSubgraphView, subgraphRegionProblem } from './launchSubgraphView'

import type {
  SubgraphLaunchSession,
  SubgraphRegion,
} from './launchSubgraphView'
import type { SubgraphTrack } from './subgraphTracks'
import type { MenuItem } from '@jbrowse/core/ui'

// Menu items that cut `region` out of each graph track that can supply it.
//
// One capable track is the common case and gets a single flat item — a submenu
// of one is a needless extra click. Several become a submenu naming each track,
// since which graph the subgraph comes from is then a real choice.
//
// A region past the cap yields a *disabled* item rather than none: an item that
// vanishes teaches the user nothing, while one greyed out with the size in its
// tooltip says what to do about it.
export function subgraphMenuItems({
  label,
  region,
  tracks,
  session,
  connectedViewId,
}: {
  label: string
  region: SubgraphRegion | undefined
  tracks: SubgraphTrack[]
  session: SubgraphLaunchSession
  connectedViewId?: string
}): MenuItem[] {
  let items: MenuItem[] = []
  if (region && tracks.length > 0) {
    const problem = subgraphRegionProblem(region)
    const launch = (track: SubgraphTrack) => () => {
      launchSubgraphView({
        session,
        region,
        trackId: track.trackId,
        connectedViewId,
        haplotypes: track.haplotypes,
      })
    }
    items =
      tracks.length === 1
        ? [
            {
              label,
              icon: BubbleChartIcon,
              disabled: problem !== undefined,
              disabledHelpText: problem,
              onClick: launch(tracks[0]!),
            },
          ]
        : [
            {
              label,
              icon: BubbleChartIcon,
              type: 'subMenu',
              subMenu: tracks.map(track => ({
                label: track.name,
                disabled: problem !== undefined,
                disabledHelpText: problem,
                onClick: launch(track),
              })),
            },
          ]
  }
  return items
}
