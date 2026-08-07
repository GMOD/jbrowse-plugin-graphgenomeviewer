import type { ReactNode } from 'react'

import GraphNodeHighlight from './GraphNodeHighlight'

import type PluginManager from '@jbrowse/core/PluginManager'
import type { LinearGenomeViewModel } from '@jbrowse/plugin-linear-genome-view'

// The graph-to-linear half of the hover sync. The reverse half needs no mount
// point: an LGV already publishes its hover to `session.hovered`, and the graph
// view's own autorun reads it (see GraphGenomeView/model.ts).
//
// The component is mounted through the extension point rather than imported by
// the LGV, so this plugin never imports @jbrowse/plugin-linear-genome-view at
// runtime — it is not one of JBrowse's shared globals, so a value import would
// bundle a second copy of that whole plugin.
const POINT = 'LinearGenomeView-TracksContainerComponent'

function highlightFor(model: LinearGenomeViewModel) {
  return <GraphNodeHighlight key="graphgenomeview-hover-highlight" model={model} />
}

// The `props` an accumulating point hands a callback, at the untyped boundary
// below. A guard rather than a cast: on the fallback path the host is an older
// JBrowse whose registry this plugin's types do not describe, so what arrives is
// genuinely unknown until it is checked.
function hasModel(props: Record<string, unknown>): props is {
  model: LinearGenomeViewModel
} {
  return 'model' in props && props.model !== null
}

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
  //
  // **But it is a method the HOST may not have**, and this is not a hypothetical:
  // it landed in core on 2026-08-05 and is unreleased, so on every published
  // JBrowse `pluginManager.contributeToExtensionPoint` is undefined and calling
  // it throws while the plugin is still installing — which takes the whole
  // plugin down, not just the hover sync. There is no view type, no adapter, and
  // no error a reader can act on. A third-party plugin is loaded by whatever
  // JBrowse the reader is running, so the version it needs is the OLDEST one it
  // can work on, not the newest one that exists.
  //
  // The fallback is exact rather than approximate: `contributeToExtensionPoint`
  // is itself a fold over `addToExtensionPoint` that appends the callback's
  // return to the accumulated array (PluginManager.ts), so doing that here is
  // the same registration by the same mechanism.
  if (typeof pluginManager.contributeToExtensionPoint === 'function') {
    pluginManager.contributeToExtensionPoint(POINT, ({ model }) =>
      highlightFor(model),
    )
  } else {
    pluginManager.addToExtensionPoint<ReactNode[]>(POINT, (entries, props) =>
      hasModel(props) ? [...entries, highlightFor(props.model)] : entries,
    )
  }
}
