import { getAdapter } from '@jbrowse/core/data_adapters/dataAdapterCache'
import RpcMethodType from '@jbrowse/core/pluggableElementTypes/RpcMethodType'

import type { Region } from '@jbrowse/core/util'

export interface GetSubgraphArgs {
  adapterConfig: Record<string, unknown>
  region: Region
  sessionId: string
  opts?: { context?: number }
}

declare module '@jbrowse/core/rpc/RpcRegistry' {
  interface RpcRegistry {
    GetSubgraph: {
      args: GetSubgraphArgs
      return: string
    }
  }
}

// Adapters that can cut a local subgraph out of a graph file implement this;
// RgfaTabixAdapter is the one that does today.
interface SubgraphAdapter {
  getSubgraph(region: Region, opts?: { context?: number }): Promise<string>
}

function isSubgraphAdapter(adapter: object): adapter is SubgraphAdapter {
  return (
    'getSubgraph' in adapter &&
    typeof (adapter as SubgraphAdapter).getSubgraph === 'function'
  )
}

export default class GetSubgraph extends RpcMethodType {
  name = 'GetSubgraph'

  async execute(args: GetSubgraphArgs, rpcDriverClassName: string) {
    const { adapterConfig, region, sessionId, opts } =
      await this.deserializeArguments(args, rpcDriverClassName)

    const { dataAdapter } = await getAdapter(
      this.pluginManager,
      sessionId,
      adapterConfig,
    )
    if (isSubgraphAdapter(dataAdapter)) {
      return dataAdapter.getSubgraph(region, opts)
    }
    // An empty result is how the view and the launch menu detect "this track
    // can't do subgraphs" — see GraphGenomeView.loadFromTabixSubgraph.
    console.warn(
      `[GetSubgraph] ${dataAdapter.constructor.name} does not implement getSubgraph`,
    )
    return ''
  }
}
