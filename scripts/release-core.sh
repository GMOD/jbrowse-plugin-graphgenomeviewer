#!/usr/bin/env bash
# Releases @jbrowse/bandage-core: bumps packages/core, then pushes a core-v*
# tag, which .github/workflows/publish-core.yml publishes. Not `pnpm version`,
# whose v* tag is the plugin's release trigger.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -n "$(git status --porcelain)" ]; then
  echo "commit first: the release commit must hold only the version bump" >&2
  exit 1
fi

pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm --dir packages/core build

version=$(cd packages/core && npm version "${1:-patch}" --no-git-tag-version)
version=${version#v}
git commit -m "@jbrowse/bandage-core $version" packages/core/package.json
git tag -a "core-v$version" -m "@jbrowse/bandage-core $version"
git push origin HEAD "core-v$version"
