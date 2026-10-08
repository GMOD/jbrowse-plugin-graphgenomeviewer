import fs from 'node:fs'
import http from 'node:http'
import * as esbuild from 'esbuild'
import { parseArgs } from 'node:util'
import JBrowseReExports from '@jbrowse/core/ReExports/list'
import prettyBytes from 'pretty-bytes'

import { hostShim } from './scripts/hostShim.mjs'

const PORT = process.env.PORT ? +process.env.PORT : 9000

// The names the bundle's host imports bind to. The default is the installed
// @jbrowse/core's own host, the support floor; `pnpm host-names` passes each
// newer host's file with --check to find an import that host dropped.
const { values } = parseArgs({
  options: {
    watch: { type: 'boolean', default: false },
    check: { type: 'boolean', default: false },
    'host-names': { type: 'string' },
  },
})
const floor = `v${JSON.parse(fs.readFileSync('node_modules/@jbrowse/core/package.json', 'utf8')).version}`
const hostNamesFile = values['host-names'] ?? `scripts/host-names/${floor}.json`
if (!fs.existsSync(hostNamesFile)) {
  throw new Error(
    `${hostNamesFile} is missing: run \`node scripts/fetch-host-names.mjs ${floor}\``,
  )
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
  plugins: [
    hostShim({
      keys: JBrowseReExports,
      names: JSON.parse(fs.readFileSync(hostNamesFile, 'utf8')),
      pluginName: 'GraphGenomeView',
      host: hostNamesFile,
    }),
    ...(values.check ? [] : [rebuildLogPlugin]),
  ],
  ...(values.watch
    ? { entryNames: 'out' }
    : {
        entryNames: 'jbrowse-plugin-graphgenomeviewer.esm',
        sourcemap: true,
        minify: true,
      }),
}

if (values.watch) {
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
} else if (values.check) {
  await esbuild
    .build({ ...config, write: false, logLevel: 'error' })
    .catch(() => process.exit(1))
} else {
  const result = await esbuild.build(config)
  // Analyze bundle sizes/imports at https://esbuild.github.io/analyze/
  fs.writeFileSync('meta.json', JSON.stringify(result.metafile))
}
