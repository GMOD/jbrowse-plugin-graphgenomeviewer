import { getConf } from '@jbrowse/core/configuration'
import { pushLaunchViewMenuItem } from '@jbrowse/core/ui'
import {
  getContainingTrack,
  getContainingView,
  getSession,
} from '@jbrowse/core/util'
import BubbleChartIcon from '@mui/icons-material/BubbleChart'

import {
  launchSubgraphView,
  regionAroundSegment,
  regionFromViewport,
} from './launchSubgraphView'
import { subgraphMenuItems } from './subgraphMenuItems'
import { adapterCanCutSubgraph, subgraphTracks } from './subgraphTracks'

import type { SubgraphTrack } from './subgraphTracks'
import type PluginManager from '@jbrowse/core/PluginManager'
import type { PluggableElementType } from '@jbrowse/core/pluggableElementTypes'
import type DisplayType from '@jbrowse/core/pluggableElementTypes/DisplayType'
import type { AbstractTrackModel } from '@jbrowse/core/util'
import type { LinearGenomeViewModel } from '@jbrowse/plugin-linear-genome-view'

// An RgfaTabixAdapter track is an ordinary feature track, so its segments
// already draw in the LGV's basic display; these two items are the only
// graph-specific UI a linear view needs.
function isTargetDisplay(elt: { name: string }): elt is DisplayType {
  return elt.name === 'LinearBasicDisplay'
}

function canCutSubgraph(
  pluginManager: PluginManager,
  track: AbstractTrackModel,
) {
  return adapterCanCutSubgraph(pluginManager, getConf(track, ['adapter']).type)
}

// The graph track a launch from this display draws from, when the display's own
// track is the graph. One entry, so the menu offers no choice that isn't one.
function ownTrack(track: AbstractTrackModel): SubgraphTrack[] {
  return [{ trackId: getConf(track, 'trackId'), name: getConf(track, 'name') }]
}

export default function LaunchSubgraphMenuItemF(pluginManager: PluginManager) {
  pluginManager.addToExtensionPoint(
    'Core-extendPluggableElement',
    (pluggableElement: PluggableElementType) => {
      if (!isTargetDisplay(pluggableElement)) {
        return pluggableElement
      }
      pluggableElement.stateModel = pluggableElement.stateModel.extend(self => {
        const superTrackMenuItems = self.trackMenuItems
        const superContextMenuItems = self.contextMenuItems
        return {
          views: {
            trackMenuItems() {
              const items = superTrackMenuItems()
              const track = getContainingTrack(self)
              if (canCutSubgraph(pluginManager, track)) {
                const view = getContainingView(self) as LinearGenomeViewModel
                pushLaunchViewMenuItem(items, {
                  label: 'Graph genome view (this region)',
                  icon: BubbleChartIcon,
                  onClick: () => {
                    const region = regionFromViewport(
                      view.dynamicBlocks.contentBlocks,
                    )
                    if (region) {
                      launchSubgraphView({
                        session: getSession(self),
                        region,
                        trackId: getConf(track, 'trackId'),
                        connectedViewId: view.id,
                      })
                    }
                  },
                })
              }
              return items
            },
            // The right-clicked feature. `contextMenuInfo.item` already carries
            // its bp span, so this needs no feature fetch.
            //
            // The graph the subgraph comes from need not be this track. A bubble
            // marks exactly where haplotypes diverge and is the most natural
            // thing to right-click, but MinigraphBubbleAdapter reads a summary
            // index and cannot cut a graph; a gene is worth asking the same
            // question of. So a track that can't cut one falls back to the
            // session's graph tracks, and the item appears only when there is
            // one to draw from.
            contextMenuItems() {
              const items = superContextMenuItems()
              const info = self.contextMenuInfo
              const track = getContainingTrack(self)
              if (info) {
                const view = getContainingView(self) as LinearGenomeViewModel
                const displayedRegion =
                  view.displayedRegions[info.displayedRegionIndex]
                const own = canCutSubgraph(pluginManager, track)
                if (displayedRegion) {
                  const launchItems = subgraphMenuItems({
                    label: own
                      ? 'Graph genome view (this segment)'
                      : 'Graph genome view (this feature)',
                    region: regionAroundSegment({
                      refName: displayedRegion.refName,
                      assemblyName: displayedRegion.assemblyName,
                      start: info.item.startBp,
                      end: info.item.endBp,
                    }),
                    tracks: own
                      ? ownTrack(track)
                      : subgraphTracks(
                          pluginManager,
                          getSession(self),
                          displayedRegion.assemblyName,
                        ),
                    session: getSession(self),
                    connectedViewId: view.id,
                  })
                  for (const item of launchItems) {
                    pushLaunchViewMenuItem(items, item)
                  }
                }
              }
              return items
            },
          },
        }
      })
      return pluggableElement
    },
  )
}
