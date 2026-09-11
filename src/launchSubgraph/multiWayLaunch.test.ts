import PluginManager from '@jbrowse/core/PluginManager'
import { ConfigurationSchema } from '@jbrowse/core/configuration'
import AdapterType from '@jbrowse/core/pluggableElementTypes/AdapterType'
import DisplayType from '@jbrowse/core/pluggableElementTypes/DisplayType'
import TrackType from '@jbrowse/core/pluggableElementTypes/TrackType'
import ViewType from '@jbrowse/core/pluggableElementTypes/ViewType'
import {
  createBaseTrackConfig,
  createBaseTrackModel,
} from '@jbrowse/core/pluggableElementTypes/models'
import { LAUNCH_LABEL } from '@jbrowse/core/ui'
import { types } from '@jbrowse/mobx-state-tree'
import { linearGenomeViewStateModelFactory } from '@jbrowse/plugin-linear-genome-view'

import LaunchSubgraphMenuItemF from './index'
import LinearViewMenuItemsF from './linearViewMenuItems'
import {
  displayTestSessionModel,
  testAssembly,
} from '../../../../jbrowse-components/packages/display-test-utils/src/index.ts'
import { configSchemaFactory } from '../../../../jbrowse-components/plugins/linear-comparative-view/src/MultiWaySyntenyDisplay/configSchema.ts'
import { stateModelFactory } from '../../../../jbrowse-components/plugins/linear-comparative-view/src/MultiWaySyntenyDisplay/model.ts'

import type { MenuItem } from '@jbrowse/core/ui'

const LABEL = 'Graph genome view (this region)'

// Core's own MultiWaySyntenyDisplay on a GBZ lane track, in a plugin-extended
// LinearGenomeView. It comes from the sibling checkout the link: deps already
// require (CI clones the same layout), because the launch reads the lane pick
// off that display by duck type and only the real one pins the contract.
function createEnv(configLanes?: string[]) {
  console.warn = vi.fn()
  console.error = vi.fn()
  const pluginManager = new PluginManager()
  pluginManager.addAdapterType(
    () =>
      new AdapterType({
        name: 'GbzBaseSyntenyAdapter',
        configSchema: ConfigurationSchema(
          'GbzBaseSyntenyAdapter',
          {},
          { explicitlyTyped: true },
        ),
        adapterCapabilities: ['getSubgraph', 'headerLanes'],
        getAdapterClass: () => {
          throw new Error('config-only')
        },
      }),
  )
  pluginManager.addTrackType(() => {
    const schema = ConfigurationSchema(
      'SyntenyTrack',
      {},
      {
        baseConfiguration: createBaseTrackConfig(pluginManager),
        explicitIdentifier: 'trackId',
      },
    )
    return new TrackType({
      name: 'SyntenyTrack',
      configSchema: schema,
      stateModel: createBaseTrackModel(pluginManager, 'SyntenyTrack', schema),
    })
  })
  const displaySchema = configSchemaFactory()
  pluginManager.addDisplayType(
    () =>
      new DisplayType({
        name: 'MultiWaySyntenyDisplay',
        configSchema: displaySchema,
        stateModel: stateModelFactory(displaySchema),
        trackType: 'SyntenyTrack',
        viewType: 'LinearGenomeView',
        ReactComponent: () => null,
      }),
  )
  pluginManager.addViewType(
    () =>
      new ViewType({
        name: 'LinearGenomeView',
        stateModel: linearGenomeViewStateModelFactory(pluginManager),
        ReactComponent: () => null,
      }),
  )
  LaunchSubgraphMenuItemF(pluginManager)
  LinearViewMenuItemsF(pluginManager)
  pluginManager.createPluggableElements()
  pluginManager.configure()

  const track = pluginManager.pluggableConfigSchemaType('track').create(
    {
      type: 'SyntenyTrack',
      trackId: 'gbz_lanes',
      name: 'GBZ lanes',
      assemblyNames: ['volvox', 'HG00097.1', 'HG00099.1', 'HG00128.1'],
      adapter: { type: 'GbzBaseSyntenyAdapter' },
      displays: [
        {
          type: 'MultiWaySyntenyDisplay',
          displayId: 'gbz_lanes-MultiWaySyntenyDisplay',
          ...(configLanes ? { lanes: configLanes } : {}),
        },
      ],
    },
    { pluginManager },
  )
  const assembly = {
    ...testAssembly(),
    getRegionForRefName: (refName: string) =>
      refName === 'ctgA'
        ? { refName, start: 0, end: 50_000, assemblyName: 'volvox' }
        : undefined,
  }
  const LGV = pluginManager.getViewType('LinearGenomeView').stateModel
  const Session = types.compose(
    'MultiWayLaunchSession',
    displayTestSessionModel({
      viewModel: LGV,
      rpcManager: { call: async () => [] },
      assemblyManager: {
        get: () => assembly,
        waitForAssembly: () => Promise.resolve(assembly),
        getCanonicalAssemblyName: () => undefined,
        has: (name: string) => name === 'volvox',
        isValidRefName: (refName: string) => refName === 'ctgA',
      },
      getTrackById: (id: string) => (id === 'gbz_lanes' ? track : undefined),
    }),
    types
      .model({})
      .volatile(() => ({
        tracks: [track],
        connectionInstances: [],
        addedViews: [] as [string, Record<string, unknown>][],
      }))
      .views(() => ({
        get assemblies() {
          return []
        },
      }))
      .actions(self => ({
        addView(type: string, snapshot: Record<string, unknown>) {
          self.addedViews.push([type, snapshot])
          return snapshot
        },
      })),
  )
  const session = Session.create({ configuration: {} }, { pluginManager })
  const view = session.setView(
    LGV.create({
      type: 'LinearGenomeView',
      tracks: [
        {
          type: 'SyntenyTrack',
          configuration: 'gbz_lanes',
          displays: [
            {
              type: 'MultiWaySyntenyDisplay',
              configuration: 'gbz_lanes-MultiWaySyntenyDisplay',
            },
          ],
        },
      ],
    }),
  )
  view.setWidth(800)
  view.setDisplayedRegions([
    { refName: 'ctgA', start: 0, end: 1000, assemblyName: 'volvox' },
  ])
  const display = view.tracks[0]!.displays[0]!
  return { session, view, display }
}

function allLabels(items: MenuItem[]): string[] {
  return items.flatMap(item => [
    ...('label' in item ? [item.label] : []),
    ...('subMenu' in item && Array.isArray(item.subMenu)
      ? allLabels(item.subMenu)
      : []),
  ])
}

function launchRegion(view: { menuItems: () => MenuItem[] }) {
  const launch = view
    .menuItems()
    .find(i => 'label' in i && i.label === LAUNCH_LABEL)
  const item =
    launch && 'subMenu' in launch
      ? launch.subMenu.find(i => 'label' in i && i.label === LABEL)
      : undefined
  if (item && 'onClick' in item) {
    item.onClick(undefined)
  } else {
    throw new Error(`no ${LABEL} in the view menu`)
  }
}

// pangenome_hprc_part3 sends readers to the linear view's menu for this, since
// the lane track's own menu is core's and carries no graph launch.
test("the GBZ cut is on the linear view's menu, not the lane track's", () => {
  const { view, display } = createEnv()
  expect(allLabels(view.menuItems())).toContain(LABEL)
  expect(allLabels(display.trackMenuItems())).not.toContain(LABEL)
})

test('a launch cuts for the lanes the reader picked over the config lanes', () => {
  const { session, view, display } = createEnv(['HG00097.1', 'HG00099.1'])
  display.setSelectedLanes(['HG00128.1'])
  launchRegion(view)
  expect(session.addedViews[0]![1].subgraphHaplotypes).toEqual(['HG00128.1'])
})

test('a launch cuts for the pick where the config names no lanes', () => {
  const { session, view, display } = createEnv()
  display.setSelectedLanes(['HG00128.1'])
  launchRegion(view)
  expect(session.addedViews[0]![1].subgraphHaplotypes).toEqual(['HG00128.1'])
})

test('with no pick a launch cuts for the config lanes', () => {
  const { session, view } = createEnv(['HG00097.1', 'HG00099.1'])
  launchRegion(view)
  expect(session.addedViews[0]![1].subgraphHaplotypes).toEqual([
    'HG00097.1',
    'HG00099.1',
  ])
})
