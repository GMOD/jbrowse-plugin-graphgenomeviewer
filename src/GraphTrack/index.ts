import { ConfigurationSchema } from '@jbrowse/core/configuration'
import {
  TrackType,
  createBaseTrackConfig,
  createBaseTrackModel,
} from '@jbrowse/core/pluggableElementTypes'

import type PluginManager from '@jbrowse/core/PluginManager'
import type DisplayType from '@jbrowse/core/pluggableElementTypes/DisplayType'

// The first display is the one a track opens with. The lanes display is listed
// as a copy that asks for `headerLanes`, so only gbz-base offers it; core's
// own registration is left alone.
function displaysInOrder(pluginManager: PluginManager): DisplayType[] {
  const displays = pluginManager.getElementTypesInGroup(
    'display',
  ) as DisplayType[]
  const named = (name: string) => displays.find(d => d.name === name)
  const lanes = named('MultiWaySyntenyDisplay')
  return [
    named('LinearGraphDisplay'),
    named('LinearBasicDisplay'),
    lanes &&
      Object.assign(Object.create(lanes) as DisplayType, {
        adapterCapabilities: ['headerLanes'],
      }),
  ].filter((d): d is DisplayType => d !== undefined)
}

export default function GraphTrackF(pluginManager: PluginManager) {
  pluginManager.addTrackType(() => {
    const configSchema = ConfigurationSchema(
      'GraphTrack',
      {},
      {
        baseConfiguration: createBaseTrackConfig(pluginManager),
        explicitIdentifier: 'trackId',
      },
    )
    const track = new TrackType({
      name: 'GraphTrack',
      displayName: 'Pangenome graph track',
      configSchema,
      stateModel: createBaseTrackModel(
        pluginManager,
        'GraphTrack',
        configSchema,
      ),
    })
    for (const display of displaysInOrder(pluginManager)) {
      track.addDisplayType(display)
    }
    return track
  })
}
