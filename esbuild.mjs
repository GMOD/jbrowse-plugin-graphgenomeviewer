import fs from 'node:fs'
import http from 'node:http'
import * as esbuild from 'esbuild'
import { globalExternals } from '@fal-works/esbuild-plugin-global-externals'
import JBrowseReExports from '@jbrowse/core/ReExports/list'
import prettyBytes from 'pretty-bytes'

const isWatch = process.argv.includes('--watch')
const PORT = process.env.PORT ? +process.env.PORT : 9000

// Plugins must reuse the React/MUI/mobx instances JBrowse already loaded via
// window.JBrowseExports — bundling a second copy causes duplicate-React errors.
function createGlobalMap(jbrowseGlobals) {
  return {
    ...Object.fromEntries(
      jbrowseGlobals.map(g => [g, { varName: `JBrowseExports["${g}"]`, type: 'cjs' }]),
    ),
    // v4+ package name, but JBrowse exports it as 'mobx-state-tree' for back-compat.
    '@jbrowse/mobx-state-tree': {
      varName: `JBrowseExports["mobx-state-tree"]`,
      type: 'cjs',
    },
  }
}

const rebuildLogPlugin = {
  name: 'rebuild-log',
  setup({ onStart, onEnd }) {
    let time = 0
    onStart(() => {
      time = Date.now()
    })
    onEnd(({ metafile, errors, warnings }) => {
      console.log(
        `Built in ${Date.now() - time} ms with ${errors.length} error(s) and ${warnings.length} warning(s)`,
      )
      if (metafile) {
        for (const [file, metadata] of Object.entries(metafile.outputs)) {
          console.log(`Wrote ${prettyBytes(metadata.bytes)} to ${file}`)
        }
      }
    })
  },
}

const globals = JBrowseReExports
const config = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  // Native ESM plugin. The Bandage engine is a plain `import(...)` in
  // loadBandage.ts; splitting emits it as a content-hashed sibling chunk that
  // the browser resolves relative to the plugin's own module url — no manual
  // url plumbing, and it works the same on the main thread and in the RPC
  // worker (import.meta.url is defined in a module worker, currentScript is
  // not). Loaded via an `esmUrl` plugin definition.
  format: 'esm',
  splitting: true,
  outdir: 'dist',
  chunkNames: 'chunks/[name]-[hash]',
  // Automatic JSX runtime; react/jsx-runtime is a JBrowse global (ReExports).
  jsx: 'automatic',
  metafile: true,
  plugins: [globalExternals(createGlobalMap(globals)), rebuildLogPlugin],
  ...(isWatch
    ? { entryNames: 'out' }
    : {
        entryNames: 'jbrowse-plugin-graphgenomeviewer.esm',
        sourcemap: true,
        minify: true,
      }),
}

if (isWatch) {
  const ctx = await esbuild.context(config)
  // Proxy esbuild's server so we can inject CORS headers — esbuild dropped
  // CORS support in v0.25.0 and JBrowse Web needs it to fetch the bundle.
  const internalPort = PORT + 400
  const { hosts } = await ctx.serve({ servedir: '.', port: internalPort })

  http
    .createServer((req, res) => {
      const proxyReq = http.request(
        {
          hostname: hosts[0],
          port: internalPort,
          path: req.url,
          method: req.method,
          headers: req.headers,
        },
        proxyRes => {
          // restore CORS after https://github.com/evanw/esbuild/releases/tag/v0.25.0 disabled it
          res.writeHead(proxyRes.statusCode, {
            ...proxyRes.headers,
            'Access-Control-Allow-Origin': '*',
          })
          proxyRes.pipe(res, { end: true })
        },
      )
      req.pipe(proxyReq, { end: true })
    })
    .listen(PORT)

  console.log(`Serving at http://${hosts[0]}:${PORT}`)
  await ctx.watch()
  console.log('Watching files...')
} else {
  const result = await esbuild.build(config)
  // Analyze bundle sizes/imports at https://esbuild.github.io/analyze/
  fs.writeFileSync('meta.json', JSON.stringify(result.metafile))
}
