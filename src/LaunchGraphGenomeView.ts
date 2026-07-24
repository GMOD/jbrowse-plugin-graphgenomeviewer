import type PluginManager from '@jbrowse/core/PluginManager'
import type { AbstractSessionModel } from '@jbrowse/core/util'
import type { FileLocation } from '@jbrowse/core/util/types'

// GraphGenomeView has no assembly/track resolution — every field is a plain
// persisted view prop, so the launch spec forwards straight onto the view
// snapshot. `afterAttach` loads `gfaLocation` once the view is created.
export interface LaunchGraphGenomeViewArgs {
  session: AbstractSessionModel
  id?: string
  gfaLocation?: FileLocation
  colorScheme?: string
  linearLayout?: boolean
  drawPaths?: boolean
}

declare module '@jbrowse/core/PluginManager' {
  interface ExtensionPointRegistry {
    'LaunchView-GraphGenomeView': {
      args: LaunchGraphGenomeViewArgs
      result: LaunchGraphGenomeViewArgs
    }
  }
}

export default function LaunchGraphGenomeViewF(pluginManager: PluginManager) {
  /** #extensionPoint LaunchView-GraphGenomeView | async | Programmatically launch a graph genome view */
  pluginManager.addToExtensionPoint('LaunchView-GraphGenomeView', args => {
    const { session, ...spec } = args
    session.addView('GraphGenomeView', spec)
    return args
  })
}
