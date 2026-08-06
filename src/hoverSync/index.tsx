import GraphNodeHighlight from './GraphNodeHighlight'

import type PluginManager from '@jbrowse/core/PluginManager'

// The graph-to-linear half of the hover sync. The reverse half needs no mount
// point: an LGV already publishes its hover to `session.hovered`, and the graph
// view's own autorun reads it (see GraphGenomeView/model.ts).
//
// The component is mounted through the extension point rather than imported by
// the LGV, so this plugin never imports @jbrowse/plugin-linear-genome-view at
// runtime — it is not one of JBrowse's shared globals, so a value import would
// bundle a second copy of that whole plugin.
export default function GraphHoverSyncF(pluginManager: PluginManager) {
  // `contributeToExtensionPoint`, not `addToExtensionPoint`. This point declares
  // `args: ReactNode[]`, which makes it *accumulating*, and the typed overload of
  // `addToExtensionPoint` excludes those by construction
  // (`Exclude<ExtensionPointName, AccumulatingPointName>`). Registering through
  // it therefore fell through to the untyped fallback, where `extendee` and
  // `props` are both loose — so the spread and the model prop were type errors
  // that read as "this extension point has no types", which sent a search off
  // toward declaration merging and symlink identity. It is the wrong method, not
  // a missing declaration.
  //
  // Contributing one element is also all this wants: the fold, the array and the
  // React key are the method's job.
  pluginManager.contributeToExtensionPoint(
    'LinearGenomeView-TracksContainerComponent',
    ({ model }) => (
      <GraphNodeHighlight key="graphgenomeview-hover-highlight" model={model} />
    ),
  )
}
