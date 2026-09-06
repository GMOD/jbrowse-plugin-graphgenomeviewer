import AdapterType from '@jbrowse/core/pluggableElementTypes/AdapterType'

import configSchema from './configSchema.ts'

import type PluginManager from '@jbrowse/core/PluginManager'

export default function GbzBaseSyntenyAdapterF(pluginManager: PluginManager) {
  pluginManager.addAdapterType(
    () =>
      new AdapterType({
        name: 'GbzBaseSyntenyAdapter',
        displayName: 'gbz-base pangenome adapter',
        configSchema,
        // The same opened database serves the graph view's subgraph, so the
        // launch menu offers this track too (launchSubgraph/subgraphTracks).
        adapterCapabilities: ['getSubgraph'],
        adapterMetadata: {
          category: 'Synteny adapters',
        },
        getAdapterClass: () =>
          import('./GbzBaseSyntenyAdapter.ts').then(r => r.default),
      }),
  )
}
