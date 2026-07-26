import { pushLaunchViewMenuItem } from '@jbrowse/core/ui'
import { getSession } from '@jbrowse/core/util'

import { regionFromViewport } from './launchSubgraphView'
import { subgraphMenuItems } from './subgraphMenuItems'
import { subgraphTracks } from './subgraphTracks'

import type PluginManager from '@jbrowse/core/PluginManager'
import type { PluggableElementType } from '@jbrowse/core/pluggableElementTypes'
import type ViewType from '@jbrowse/core/pluggableElementTypes/ViewType'
import type { LinearGenomeViewModel } from '@jbrowse/plugin-linear-genome-view'

const VISIBLE_LABEL = 'Graph genome view (visible region)'
const SELECTION_LABEL = 'Graph genome view of selection'

function isLinearGenomeView(elt: { name: string }): elt is ViewType {
  return elt.name === 'LinearGenomeView'
}

// Launch entry points on the linear view itself, rather than on a graph track's
// menu. Two reasons this is where they belong:
//
//   - The graph track need not be in the view, or even turned on. Scanning the
//     session for a subgraph-capable track gives a user browsing genes a way in;
//     before, the only entry point was the menu of a track they might never have
//     opened.
//   - The visible region is routinely wider than the 100 kb cap, so the
//     region-based item is unusable at the zoom people actually browse at. A
//     rubberband selection is the fix: it picks a legal window directly, with no
//     navigating first.
export default function LinearViewMenuItemsF(pluginManager: PluginManager) {
  pluginManager.addToExtensionPoint(
    'Core-extendPluggableElement',
    (pluggableElement: PluggableElementType) => {
      if (isLinearGenomeView(pluggableElement)) {
        pluggableElement.stateModel = pluggableElement.stateModel.extend(
          // Annotated rather than cast: the extension point hands over an
          // IAnyModelType, and stating the model shape here is what types
          // `getSelectedRegions`/`dynamicBlocks` below without an `as`.
          (self: LinearGenomeViewModel) => {
            const superMenuItems = self.menuItems
            const superRubberBandMenuItems = self.rubberBandMenuItems

            // Graph tracks for this view's assembly. Empty means every item
            // below is empty too, so a session with no graph data gains no menu
            // clutter.
            function tracks() {
              const assemblyName = self.assemblyNames[0]
              return assemblyName
                ? subgraphTracks(pluginManager, getSession(self), assemblyName)
                : []
            }

            return {
              views: {
                menuItems() {
                  const items = superMenuItems()
                  for (const item of subgraphMenuItems({
                    label: VISIBLE_LABEL,
                    region: regionFromViewport(
                      self.dynamicBlocks.contentBlocks,
                    ),
                    tracks: tracks(),
                    session: getSession(self),
                    connectedViewId: self.id,
                  })) {
                    pushLaunchViewMenuItem(items, item)
                  }
                  return items
                },

                // The rubberband menu is short and contextual, so these go in
                // flat rather than under a "Launch view" submenu — that grouping
                // earns its keep in the long track and view menus, not here.
                rubberBandMenuItems() {
                  return [
                    ...superRubberBandMenuItems(),
                    ...subgraphMenuItems({
                      label: SELECTION_LABEL,
                      region: self.getSelectedRegions(
                        self.leftOffset,
                        self.rightOffset,
                      )[0],
                      tracks: tracks(),
                      session: getSession(self),
                      connectedViewId: self.id,
                    }),
                  ]
                },
              },
            }
          },
        )
      }
      return pluggableElement
    },
  )
}
