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

// Discovery is by declared capability, not adapter name. The old launcher
// hardcoded `GfaTabixAdapter`/`GfaServerAdapter`, which is exactly what left it
// dead when those were removed; any adapter implementing getSubgraph joins by
// declaring the capability.
function canCutSubgraph(
  pluginManager: PluginManager,
  track: AbstractTrackModel,
) {
  const adapterConfig = getConf(track, ['adapter'])
  return pluginManager
    .getAdapterType(adapterConfig.type)
    .adapterCapabilities.includes('getSubgraph')
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
                      })
                    }
                  },
                })
              }
              return items
            },
            // The right-clicked segment. `contextMenuInfo.item` already carries
            // the feature's bp span, so this needs no feature fetch.
            contextMenuItems() {
              const items = superContextMenuItems()
              const info = self.contextMenuInfo
              const track = getContainingTrack(self)
              if (info && canCutSubgraph(pluginManager, track)) {
                const view = getContainingView(self) as LinearGenomeViewModel
                const displayedRegion =
                  view.displayedRegions[info.displayedRegionIndex]
                if (displayedRegion) {
                  pushLaunchViewMenuItem(items, {
                    label: 'Graph genome view (this segment)',
                    icon: BubbleChartIcon,
                    onClick: () => {
                      launchSubgraphView({
                        session: getSession(self),
                        region: regionAroundSegment({
                          refName: displayedRegion.refName,
                          assemblyName: displayedRegion.assemblyName,
                          start: info.item.startBp,
                          end: info.item.endBp,
                        }),
                        trackId: getConf(track, 'trackId'),
                      })
                    },
                  })
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
