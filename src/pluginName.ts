// The name JBrowse knows this plugin by, and the one a config's `plugins` entry
// has to state beside its `esmUrl`.
//
// It used to say it was shared with a `bandageEngineUrl` that looked the
// plugin's own definition up by this name to find where the Bandage chunk is
// served from. There is no such function: `loadBandage` is a plain dynamic
// `import()`, so the browser resolves the chunk against this module's own url
// and nothing has to be told where it lives.
export const PLUGIN_NAME = 'GraphGenomeView'
