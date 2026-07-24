import RpcMethodType from '@jbrowse/core/pluggableElementTypes/RpcMethodType'

import type { Graph, LayoutResult } from './GraphGenomeView/types'

export interface GraphComputeLayoutArgs {
  sessionId: string
  graph: { nodes: Graph['nodes']; edges: Graph['edges'] }
  options: Record<string, unknown>
  // absolute url of the engine chunk, resolved on the main thread by
  // bandageEngineUrl (the worker has no way to derive its own bundle url)
  engineUrl: string
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

interface BandageModule {
  computeLayout(
    graph: { nodes: Graph['nodes']; edges: Graph['edges'] },
    options: Record<string, unknown>,
  ): LayoutResult
}

type BandageModuleFactory = () => Promise<BandageModule>

// The engine is a ~425kb lazy chunk sitting next to the plugin bundle, so it
// only downloads when someone actually picks the force-directed layout. Keyed
// by url so a layoutUrl override doesn't reuse a module from a different build.
const modules = new Map<string, Promise<BandageModule>>()

async function ensureModule(url: string) {
  let pending = modules.get(url)
  if (!pending) {
    pending = import(/* webpackIgnore: true */ url)
      .then((mod: { default: BandageModuleFactory }) => mod.default())
      .catch((e: unknown) => {
        // let a later attempt retry rather than caching the failure forever
        modules.delete(url)
        throw e
      })
    modules.set(url, pending)
  }
  return pending
}

export default class GraphComputeLayout extends RpcMethodType {
  name = 'GraphComputeLayout'

  async execute(args: GraphComputeLayoutArgs) {
    const { graph, options, engineUrl, statusCallback } = args

    statusCallback?.('Loading layout engine')
    const module = await ensureModule(engineUrl)

    statusCallback?.('Computing layout')
    const startTime = performance.now()
    const result = module.computeLayout(graph, options)
    const duration = performance.now() - startTime

    return { result, duration }
  }
}
