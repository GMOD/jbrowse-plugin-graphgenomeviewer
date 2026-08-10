import { RpcMethodType } from '@jbrowse/core/pluggableElementTypes'

import loadBandage from './loadBandage'

import type { Graph, LayoutResult } from './GraphGenomeView/types'

export interface GraphComputeLayoutArgs {
  sessionId: string
  graph: { nodes: Graph['nodes']; edges: Graph['edges'] }
  options: Record<string, unknown>
  statusCallback?: (message: string) => void
}

declare module '@jbrowse/core/rpc/RpcRegistry' {
  interface RpcRegistry {
    GraphComputeLayout: {
      args: GraphComputeLayoutArgs
      return: { result: LayoutResult; duration: number }
    }
  }
}

export default class GraphComputeLayout extends RpcMethodType {
  name = 'GraphComputeLayout'

  async execute(args: GraphComputeLayoutArgs) {
    const { graph, options, statusCallback } = args

    statusCallback?.('Loading layout engine')
    const module = await loadBandage()

    statusCallback?.('Computing layout')
    const startTime = performance.now()
    const result = module.computeLayout(graph, options)
    const duration = performance.now() - startTime

    return { result, duration }
  }
}
