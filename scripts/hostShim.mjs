// The esbuild plugin that resolves a host import to what the running JBrowse
// serves on `JBrowseExports`. Plugins must reuse the React, MUI and mobx
// instances JBrowse already loaded; bundling a second copy causes
// duplicate-React errors.
//
// Each host module becomes an ES module with one export per name the host
// serves, so:
//   - an import of a name the host does not serve fails the build, where a
//     `module.exports = JBrowseExports[key]` shim reads `undefined` at runtime
//   - a name a different host lacks at runtime is a stub that throws naming
//     the export when called or rendered, where `undefined` rendered as a
//     component is React error #130
//   - a default import of a module the host serves as a namespace with a
//     default reads that default; esbuild's interop for a `"type": "module"`
//     package hands back the namespace
//
// `names` maps each ABI key to its export names (scripts/host-names/). A key
// with no names is served whole and keeps the `module.exports` shim.

// v4+ package name, but JBrowse serves it under the pre-fork key.
const HOST_KEY = { '@jbrowse/mobx-state-tree': 'mobx-state-tree' }
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/

export function shimSource(key, names, pluginName) {
  const hostKey = JSON.stringify(HOST_KEY[key] ?? key)
  const named = names.filter(n => n !== 'default' && IDENTIFIER.test(n))
  if (names.length === 0) {
    return `module.exports = JBrowseExports[${hostKey}]`
  }
  return [
    `const host = JBrowseExports[${hostKey}]`,
    `const read = name =>`,
    `  host != null && name in Object(host)`,
    `    ? host[name]`,
    `    : Object.assign(`,
    `        function () {`,
    `          throw new Error(`,
    `            "This JBrowse does not provide '" + name + "' from '" + ${hostKey} + "' to plugins: ${pluginName} was built for a different JBrowse version, so update the plugin or JBrowse",`,
    `          )`,
    `        },`,
    `        { jbrowseHostMissing: name },`,
    `      )`,
    ...named.map(
      n => `export const ${n} = /* @__PURE__ */ read(${JSON.stringify(n)})`,
    ),
    `export default host && host.__esModule ? host.default : host`,
  ].join('\n')
}

export function hostShim({ keys, names, pluginName, host }) {
  const filter = new RegExp(
    `^(${[...keys, ...Object.keys(HOST_KEY)]
      .map(k => k.replaceAll(/[.*+?^${}()|[\]\\/]/g, '\\$&'))
      .join('|')})$`,
  )
  return {
    name: 'host-shim',
    setup(build) {
      build.onResolve({ filter }, ({ path }) => ({
        path,
        namespace: 'host',
        sideEffects: false,
      }))
      build.onLoad({ filter: /.*/, namespace: 'host' }, ({ path }) =>
        names[path]
          ? { contents: shimSource(path, names[path], pluginName) }
          : {
              errors: [{ text: `${host} does not serve '${path}' to plugins` }],
            },
      )
    },
  }
}
