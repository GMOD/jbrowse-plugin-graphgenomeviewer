import { getAdapter } from '@jbrowse/core/data_adapters/dataAdapterCache'
import { RpcMethodTypeWithRenameRegion } from '@jbrowse/core/pluggableElementTypes'

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

// RpcMethodTypeWithRenameRegion, not the plain RpcMethodType: the base class is
// what maps `region.refName` from the assembly's spelling onto the adapter's own
// before the call crosses to the worker. Without it a launch on an hg38 whose
// contigs are bare (`6`, which is what every GRCh38 FASTA on jbrowse.org uses)
// asked RgfaTabixAdapter for `GRCh38#0#6`, matched nothing, and opened a view
// reading "0 nodes, 0 edges" with no error. The segments track drew the whole
// time, because CoreGetFeatures renames and this did not, so the graph looked
// broken while its own track looked fine. `assemblyNameToPanSN` covers the
// sample half of a PanSN name only; the contig half is refName aliasing, which
// the assembly already knows and this now consults.
export default class GetSubgraph extends RpcMethodTypeWithRenameRegion {
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
