import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const { version } = JSON.parse(readFileSync('package.json', 'utf8'))
writeFileSync('src/version.ts', `export const version = '${version}'\n`)
execSync('git add src/version.ts')
execSync(`git-cliff --tag v${version} --unreleased --prepend CHANGELOG.md`)
execSync('git add CHANGELOG.md')

// Every plugin release ships @jbrowse/bandage-core too: publish-core.yml
// publishes it from the same v* tag, so the core takes a patch bump here.
execSync('npm version patch --no-git-tag-version', { cwd: 'packages/core' })
execSync('git add packages/core/package.json')
