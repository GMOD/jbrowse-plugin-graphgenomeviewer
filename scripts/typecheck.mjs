// Runs tsc but only fails on errors in this repo's own files.
//
// @jbrowse/core, render-core and the plugins are consumed as `link:` deps
// pointing at unbuilt source packages, so tsc pulls their .ts into the program
// and typechecks it. skipLibCheck only skips .d.ts, so it does not apply. Those
// errors belong to the jbrowse-components working copy and are fixed there —
// reporting them here makes our own typecheck permanently red and useless.
//
// Upstream errors are still printed, just not fatal.

import { spawnSync } from 'node:child_process'

const { stdout } = spawnSync('npx', ['tsc', '--noEmit', '--pretty', 'false'], {
  encoding: 'utf8',
})

const lines = stdout.split('\n').filter(Boolean)
// tsc emits "path(line,col): error TS…"; continuation lines are indented
const isOurs = line => /^src[/\\]/.test(line)
const errorLines = lines.filter(l => / error TS\d+:/.test(l))
const ours = errorLines.filter(isOurs)
const upstream = errorLines.filter(l => !isOurs(l))

if (upstream.length > 0) {
  console.log(
    `${upstream.length} pre-existing error(s) in linked jbrowse-components packages (not failing this repo):`,
  )
  for (const line of upstream) {
    console.log(`  ${line}`)
  }
  console.log('')
}

if (ours.length > 0) {
  console.error(`${ours.length} error(s) in src/:`)
  for (const line of lines) {
    if (isOurs(line)) {
      console.error(line)
    }
  }
  process.exit(1)
}

console.log('typecheck ok: no errors in src/')
