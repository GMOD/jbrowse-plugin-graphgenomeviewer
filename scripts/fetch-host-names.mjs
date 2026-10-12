#!/usr/bin/env node
//
// Saves the export names a hosted JBrowse serves to plugins, per ABI key, as
// scripts/host-names/<ref>.json. esbuild.mjs binds the bundle's host imports to
// the support floor's names, and `pnpm host-names` builds against every saved
// ref to find an import a newer host dropped.
//
// A release tag never changes, so its file is committed. `main` moves, so
// `pnpm host-names` fetches it fresh and does not save it.
//
// Usage:
//   node scripts/fetch-host-names.mjs v5.0.0-beta.13
//
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const MANIFEST = 'packages/core/src/ReExports/reExports.generated.json'

export async function fetchHostNames(ref) {
  const url = `https://raw.githubusercontent.com/GMOD/jbrowse-components/${ref}/${MANIFEST}`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`)
  }
  const { framework, modules } = await res.json()
  return {
    ...framework,
    ...Object.fromEntries(
      Object.entries(modules).map(([key, { names }]) => [key, names]),
    ),
  }
}

const filename = fileURLToPath(import.meta.url)

if (filename === process.argv[1]) {
  const ref = process.argv[2]
  if (!ref) {
    throw new Error('usage: fetch-host-names.mjs <tag>')
  }
  const out = path.join(path.dirname(filename), 'host-names', `${ref}.json`)
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, `${JSON.stringify(await fetchHostNames(ref))}\n`)
  console.log(`wrote ${out}`)
}
