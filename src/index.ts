import Plugin from '@jbrowse/core/Plugin'
import { isAbstractMenuManager } from '@jbrowse/core/util'
import BubbleChartIcon from '@mui/icons-material/BubbleChart'

import GetSubgraph from './GetSubgraph'
import GraphComputeLayout from './GraphComputeLayout'
import GraphGenomeViewF from './GraphGenomeView/index'
import LaunchGraphGenomeViewF from './LaunchGraphGenomeView'
import LaunchSubgraphMenuItemF from './launchSubgraph/index'
import { version } from './version'

import type PluginManager from '@jbrowse/core/PluginManager'
import type { AbstractSessionModel } from '@jbrowse/core/util'

export default class GraphGenomeViewPlugin extends Plugin {
  name = 'GraphGenomeView'
  version = version

  install(pluginManager: PluginManager) {
    GraphGenomeViewF(pluginManager)
    LaunchGraphGenomeViewF(pluginManager)
    LaunchSubgraphMenuItemF(pluginManager)
    pluginManager.addRpcMethod(() => new GraphComputeLayout(pluginManager))
    pluginManager.addRpcMethod(() => new GetSubgraph(pluginManager))
  }

  configure(pluginManager: PluginManager) {
    if (isAbstractMenuManager(pluginManager.rootModel)) {
      pluginManager.rootModel.appendToSubMenu(['Add'], {
        label: 'Graph genome view',
        icon: BubbleChartIcon,
        onClick: (session: AbstractSessionModel) => {
          session.addView('GraphGenomeView', {})
        },
      })
    }
  }
}
