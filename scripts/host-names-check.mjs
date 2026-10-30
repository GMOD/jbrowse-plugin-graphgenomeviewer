#!/usr/bin/env node
//
// Builds the bundle against the export names of every release in
// hostReleases.mjs and of jbrowse-components main, without writing it. An
// import a host does not serve fails that build with the file and line, which
// is the version-ceiling half of what host-compat finds by drawing the track:
// main dropped DisplayStatusChrome and 6.9.0 was tagged against it hours later.
// The oldest release is the floor half: `pnpm build` binds to the installed
// @jbrowse/core, so a dependency bump would otherwise raise the floor silently.
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { fetchHostNames } from '@jbrowse/core/ReExports/hostShim'

import { HOST_RELEASES, SUPPORT_FLOOR } from './hostReleases.mjs'

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'host-names-'))

const failed = []
for (const ref of [...HOST_RELEASES, 'main']) {
  const file = path.join(dir, `${ref}.json`)
  fs.writeFileSync(file, JSON.stringify(await fetchHostNames(ref)))
  const { status } = spawnSync(
    'node',
    ['esbuild.mjs', '--check', '--host-names', file],
    { stdio: 'inherit' },
  )
  console.log(`${ref.padEnd(16)} ${status === 0 ? 'ok' : 'FAILED'}`)
  if (status !== 0) {
    failed.push(ref)
  }
}
if (failed.includes(SUPPORT_FLOOR)) {
  console.error(
    `The bundle imports what ${SUPPORT_FLOOR}, the support floor, does not serve, so it throws at that import on hosts still running it. Drop the import, or raise the floor in scripts/hostReleases.mjs.`,
  )
}
if (failed.length > 0) {
  process.exit(1)
}
