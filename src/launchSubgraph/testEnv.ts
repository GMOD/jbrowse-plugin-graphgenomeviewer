import PluginManager from '@jbrowse/core/PluginManager'
import { ConfigurationSchema } from '@jbrowse/core/configuration'
import AdapterType from '@jbrowse/core/pluggableElementTypes/AdapterType'
import DisplayType from '@jbrowse/core/pluggableElementTypes/DisplayType'
import TrackType from '@jbrowse/core/pluggableElementTypes/TrackType'
import {
  createBaseTrackConfig,
  createBaseTrackModel,
} from '@jbrowse/core/pluggableElementTypes/models'
import { types } from '@jbrowse/mobx-state-tree'
import {
  linearBasicDisplayConfigSchemaFactory,
  linearBasicDisplayStateModelFactory,
} from '@jbrowse/plugin-canvas'
import {
  BaseLinearDisplayComponent,
  linearGenomeViewStateModelFactory,
} from '@jbrowse/plugin-linear-genome-view'

import LaunchSubgraphMenuItemF from './index'

import type { Instance } from '@jbrowse/mobx-state-tree'

// The real LinearBasicDisplay in a real LinearGenomeView, so the launch menu is
// exercised against the display API it actually extends (`trackMenuItems`,
// `contextMenuItems`, `contextMenuInfo`) rather than a stand-in that can't
// drift with it. Modelled on plugins/canvas's own LinearBasicDisplay testEnv.
export function createTestEnvironment({
  subgraphCapable = true,
}: { subgraphCapable?: boolean } = {}) {
  console.warn = jest.fn()
  console.error = jest.fn()
  const pluginManager = new PluginManager()

  pluginManager.addAdapterType(
    () =>
      new AdapterType({
        name: 'TestGraphAdapter',
        // explicitlyTyped so the config keeps its `type`, which is how the
        // menu finds the adapter type to ask for capabilities
        configSchema: ConfigurationSchema(
          'TestGraphAdapter',
          {},
          { explicitlyTyped: true },
        ),
        adapterCapabilities: subgraphCapable ? ['getSubgraph'] : [],
        getAdapterClass: () => {
          throw new Error('TestGraphAdapter is config-only in tests')
        },
      }),
  )

  pluginManager.addTrackType(() => {
    const trackConfigSchema = ConfigurationSchema(
      'FeatureTrack',
      {},
      {
        baseConfiguration: createBaseTrackConfig(pluginManager),
        explicitIdentifier: 'trackId',
      },
    )
    return new TrackType({
      name: 'FeatureTrack',
      configSchema: trackConfigSchema,
      stateModel: createBaseTrackModel(
        pluginManager,
        'FeatureTrack',
        trackConfigSchema,
      ),
    })
  })

  const configSchema = linearBasicDisplayConfigSchemaFactory(pluginManager)
  pluginManager.addDisplayType(
    () =>
      new DisplayType({
        name: 'LinearBasicDisplay',
        configSchema,
        stateModel: linearBasicDisplayStateModelFactory(configSchema),
        trackType: 'FeatureTrack',
        viewType: 'LinearGenomeView',
        ReactComponent: BaseLinearDisplayComponent,
      }),
  )

  // registered before createPluggableElements, which is when
  // Core-extendPluggableElement runs over each element
  LaunchSubgraphMenuItemF(pluginManager)
  pluginManager.createPluggableElements()
  pluginManager.configure()

  const LinearGenomeModel = linearGenomeViewStateModelFactory(pluginManager)
  const trackConfig = pluginManager.pluggableConfigSchemaType('track').create(
    {
      type: 'FeatureTrack',
      trackId: 'graph_track',
      assemblyNames: ['volvox'],
      adapter: { type: 'TestGraphAdapter' },
    },
    { pluginManager },
  )

  const assembly = {
    initialized: true,
    regions: [
      { refName: 'ctgA', start: 0, end: 50_000, assemblyName: 'volvox' },
    ],
    getCanonicalRefName: (refName: string) => refName,
    getGeneticCodeId: () => undefined,
    configuration: { sequence: undefined },
  }

  const Session = types
    .model({
      name: 'testSession',
      view: types.maybe(LinearGenomeModel),
      configuration: types.map(types.frozen()),
      displayTypeDefaults: types.frozen<
        Record<string, Record<string, unknown>>
      >({}),
    })
    .volatile(() => ({
      addedViews: [] as [string, Record<string, unknown>][],
      notifications: [] as string[],
      // isSessionModel keys on rpcManager + configuration; the launch menu
      // never calls it, but getSession has to find this node
      rpcManager: { call: jest.fn() },
      assemblyManager: {
        get: (name: string) => (name === 'volvox' ? assembly : undefined),
        waitForAssembly: () => Promise.resolve(assembly),
        isValidRefName: () => true,
      },
    }))
    .views(self => ({
      getTrackById(id: string) {
        return id === 'graph_track' ? trackConfig : undefined
      },
      getDisplayTypeDefault(displayType: string, slot: string): unknown {
        return self.displayTypeDefaults[displayType]?.[slot]
      },
    }))
    .actions(self => ({
      setView(view: Instance<typeof LinearGenomeModel>) {
        self.view = view
        return view
      },
      addView(type: string, snapshot: Record<string, unknown>) {
        self.addedViews.push([type, snapshot])
        return snapshot
      },
      notify(message: string) {
        self.notifications.push(message)
      },
      notifyError() {},
      queueDialog() {},
    }))

  function createDisplay() {
    const session = Session.create({ configuration: {} }, { pluginManager })
    const view = session.setView(
      LinearGenomeModel.create({
        type: 'LinearGenomeView',
        tracks: [
          {
            type: 'FeatureTrack',
            configuration: 'graph_track',
            displays: [{ type: 'LinearBasicDisplay' }],
          },
        ],
      }),
    )
    view.setWidth(800)
    view.setDisplayedRegions([
      { assemblyName: 'volvox', start: 0, end: 50_000, refName: 'ctgA' },
    ])

    const display = view.tracks[0]!.displays[0]!
    return { session, view, display }
  }

  return { createDisplay }
}
