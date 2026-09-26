import { lazy } from 'react'

import { ConfigurationReference, getConf } from '@jbrowse/core/configuration'
import { BaseDisplay } from '@jbrowse/core/pluggableElementTypes'
import { getSession } from '@jbrowse/core/util'
import TrackHeightMixin from '@jbrowse/display-kit/TrackHeightMixin'
import { types } from '@jbrowse/mobx-state-tree'
import SettingsIcon from '@mui/icons-material/Settings'

import { GraphPaneMixin } from '../GraphGenomeView/model'
import { trackLanes } from '../graphTrackConfig'

import type { LinearGraphDisplayConfigModel } from './configSchema'
import type { ColorScheme } from '../GraphGenomeView/colorSchemes'
import type { LayoutModeValue } from '../GraphGenomeView/layoutModes'
import type { MenuItem } from '@jbrowse/core/ui'
import type { Instance } from '@jbrowse/mobx-state-tree'

const GraphSettingsDialog = lazy(
  () => import('../GraphGenomeView/components/GraphSettingsDialog'),
)

export function stateModelFactory(configSchema: LinearGraphDisplayConfigModel) {
  return (
    types
      .compose(
        'LinearGraphDisplay',
        BaseDisplay,
        TrackHeightMixin(),
        GraphPaneMixin(),
        types.model({
          type: types.literal('LinearGraphDisplay'),
          configuration: ConfigurationReference(configSchema),
        }),
      )
      // a 4.0 session nests the graph's state under `pane`
      .preProcessSnapshot(snapshot => {
        const { pane, ...rest } = snapshot as { pane?: { type?: string } }
        if (!pane) {
          return snapshot
        }
        const { type: _type, ...props } = pane
        return { ...props, ...rest } as typeof snapshot
      })
      .views(self => ({
        get defaultLayoutMode(): LayoutModeValue {
          return getConf(self, 'layoutMode')
        },
        get defaultColorScheme(): ColorScheme {
          return getConf(self, 'colorScheme')
        },
        get canvasHeight() {
          return self.height
        },
        trackMenuItems(): MenuItem[] {
          return [
            ...self.graphMenuItems(),
            {
              label: 'Settings',
              icon: SettingsIcon,
              onClick: () => {
                getSession(self).queueDialog(onClose => [
                  GraphSettingsDialog,
                  { model: self, open: true, onClose },
                ])
              },
            },
            ...self.launchMenuItems(),
          ]
        },
      }))
      .actions(self => ({
        afterAttach() {
          self.adoptTrack(getConf(self.parentTrack, 'trackId'))
          if (
            self.subgraphHaplotypes === undefined &&
            self.adapterConfig.type === 'GbzBaseSyntenyAdapter'
          ) {
            self.setSubgraphHaplotypes(
              trackLanes(self.parentTrack.configuration),
            )
          }
          self.startHosting()
        },
      }))
  )
}

export type LinearGraphDisplayStateModel = ReturnType<typeof stateModelFactory>
export type LinearGraphDisplayModel = Instance<LinearGraphDisplayStateModel>
