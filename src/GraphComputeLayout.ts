import RpcMethodType from '@jbrowse/core/pluggableElementTypes/RpcMethodType'

import { PLUGIN_NAME } from './pluginName'

import type { Graph, LayoutResult } from './GraphGenomeView/types'
import type { PluginDefinition } from '@jbrowse/core/PluginLoader'
import type PluginManager from '@jbrowse/core/PluginManager'

export interface GraphComputeLayoutArgs {
  sessionId: string
  graph: { nodes: Graph['nodes']; edges: Graph['edges'] }
  options: Record<string, unknown>
  layoutUrl?: string
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

// esbuild substitutes the content-hashed filename it wrote to dist/, so a
// redeployed engine can never be served from cache under an old plugin's name.
declare const __BANDAGE_CHUNK__: string
const CHUNK_NAME = __BANDAGE_CHUNK__

// The engine is a ~425kb lazy chunk sitting next to the plugin bundle, so it
// only downloads when someone actually picks the force-directed layout. Keyed
// by url so a layoutUrl override doesn't reuse a module from a different build.
const modules = new Map<string, Promise<BandageModule>>()

// Each definition names its url under a different key depending on which plugin
// syntax the config used; baseUri is set when the uri is config-relative.
function definitionUrl(def: PluginDefinition) {
  return 'umdLoc' in def
    ? new URL(def.umdLoc.uri, def.umdLoc.baseUri).href
    : 'esmLoc' in def
      ? new URL(def.esmLoc.uri, def.esmLoc.baseUri).href
      : 'umdUrl' in def
        ? def.umdUrl
        : 'url' in def
          ? def.url
          : 'esmUrl' in def
            ? def.esmUrl
            : def.cjsUrl
}

// Resolved from the plugin's own definition rather than document.currentScript,
// because this runs in the RPC web worker where there is no document. The
// worker gets the same definitions the main thread loaded from (RpcManager
// passes pm.runtimePluginDefinitions through).
function chunkUrl(pluginManager: PluginManager) {
  const def = pluginManager.runtimePluginDefinitions.find(
    d => 'name' in d && d.name === PLUGIN_NAME,
  )
  if (!def) {
    throw new Error(
      `Could not locate the ${PLUGIN_NAME} plugin definition, so the Bandage layout engine's URL is unknown. Set layoutUrl on the view to point at a directory serving ${CHUNK_NAME}.`,
    )
  }
  return new URL(CHUNK_NAME, definitionUrl(def)).href
}

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
    const { graph, options, layoutUrl, statusCallback } = args
    const url = layoutUrl
      ? new URL(CHUNK_NAME, `${layoutUrl.replace(/\/$/, '')}/`).href
      : chunkUrl(this.pluginManager)

    statusCallback?.('Loading layout engine')
    const module = await ensureModule(url)

    statusCallback?.('Computing layout')
    const startTime = performance.now()
    const result = module.computeLayout(graph, options)
    const duration = performance.now() - startTime

    return { result, duration }
  }
}
