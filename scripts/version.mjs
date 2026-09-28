import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const { version } = JSON.parse(readFileSync('package.json', 'utf8'))
writeFileSync('src/version.ts', `export const version = '${version}'\n`)
execSync('git add src/version.ts')
execSync(`git-cliff --tag v${version} --unreleased --prepend CHANGELOG.md`)
execSync('git add CHANGELOG.md')

// One release, one version: publish-core.yml publishes @jbrowse/bandage-core
// from the same v* tag as the plugin, at the plugin's version.
const core = 'packages/core/package.json'
writeFileSync(
  core,
  readFileSync(core, 'utf8').replace(
    /"version": "[^"]+"/,
    `"version": "${version}"`,
  ),
)
execSync(`git add ${core}`)
