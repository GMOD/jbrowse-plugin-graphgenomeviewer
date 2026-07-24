import { PLUGIN_NAME } from './pluginName'

import type { PluginDefinition } from '@jbrowse/core/PluginLoader'
import type PluginManager from '@jbrowse/core/PluginManager'

// esbuild substitutes the content-hashed filename it wrote to dist/, so a
// redeployed engine can never be served from cache under an old plugin's name.
declare const __BANDAGE_CHUNK__: string

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

// The base the engine chunk resolves against: an explicit per-view directory
// override when set, otherwise the plugin's own bundle url.
function baseUrl(pluginManager: PluginManager, override?: string) {
  if (override) {
    return `${override.replace(/\/$/, '')}/`
  } else {
    const def = pluginManager.runtimePluginDefinitions.find(
      d => 'name' in d && d.name === PLUGIN_NAME,
    )
    if (!def) {
      throw new Error(
        `Could not locate the ${PLUGIN_NAME} plugin definition, so the Bandage layout engine's URL is unknown. Set layoutUrl on the view to point at a directory serving the engine chunk.`,
      )
    }
    return definitionUrl(def)
  }
}

// Resolve the Bandage engine chunk's absolute url on the main thread, where the
// plugin's own definition is always available. The RPC then imports this url
// directly, so the worker needs neither the plugin definitions nor knowledge of
// its own bundle url — resolving here keeps that lookup on the side that has it.
export function bandageEngineUrl(
  pluginManager: PluginManager,
  override?: string,
) {
  return new URL(__BANDAGE_CHUNK__, baseUrl(pluginManager, override)).href
}
