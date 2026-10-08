#!/usr/bin/env node
//
// Builds the bundle against the export names of every host in
// scripts/host-names/ and of jbrowse-components main, without writing it. An
// import a host does not serve fails that build with the file and line, which
// is the version-ceiling half of what host-compat finds by drawing the track:
// main dropped DisplayStatusChrome and 6.9.0 was tagged against it hours later.
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { fetchHostNames } from './fetch-host-names.mjs'

const dir = path.join(import.meta.dirname, 'host-names')
const main = path.join(
  fs.mkdtempSync(path.join(os.tmpdir(), 'host-names-')),
  'main.json',
)
fs.writeFileSync(main, JSON.stringify(await fetchHostNames('main')))

const files = [...fs.readdirSync(dir).map(f => path.join(dir, f)), main]
const failed = files.filter(file => {
  const { status } = spawnSync(
    'node',
    ['esbuild.mjs', '--check', '--host-names', file],
    { stdio: 'inherit' },
  )
  console.log(
    `${path.basename(file, '.json').padEnd(16)} ${status === 0 ? 'ok' : 'FAILED'}`,
  )
  return status !== 0
})
if (failed.length > 0) {
  process.exit(1)
}
