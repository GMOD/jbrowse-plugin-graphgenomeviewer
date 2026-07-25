#!/usr/bin/env bash
# Build the plugin and publish it to the beta demo bucket.
#
# Publishing this by hand has two traps, both hit on 2026-07-24:
#
#   1. uploading a stale dist/ — so this always builds, and gates on lint+tests
#      first, because the artifact is public the moment it lands.
#   2. an upload nobody can see. jbrowse.org sits behind CloudFront and these
#      objects carried no Cache-Control, so the entry point kept being served
#      from the edge for 8+ hours after a successful S3 write. Cache-Control is
#      now set explicitly and the entry point is invalidated every time.
#
# Cache policy follows from how esbuild names things: everything under chunks/
# is content-hashed, so it can be immutable forever, while the entry point has a
# fixed name and must go live promptly.
#
# Finishes by downloading what the CDN actually serves and comparing it to what
# was just built. That comparison is the whole point — it is what caught trap 2.
#
# Env overrides: BUCKET, PREFIX, DISTRIBUTION_ID, SKIP_CHECKS=1
set -euo pipefail

BUCKET="${BUCKET:-jbrowse.org}"
PREFIX="${PREFIX:-demos/graphgenomeviewer}"
DISTRIBUTION_ID="${DISTRIBUTION_ID:-E13LGELJOT4GQO}"
ENTRY="jbrowse-plugin-graphgenomeviewer.esm.js"
BASE_URL="https://${BUCKET}/${PREFIX}"

echo "==> publishing to s3://${BUCKET}/${PREFIX}/"

if [ "${SKIP_CHECKS:-0}" != "1" ]; then
  echo "==> lint"
  pnpm lint
  # Not optional, and not covered by the unit tests: a bundle that imports a name
  # a host global does not actually export builds and unit-tests clean, then
  # throws the moment the view mounts. That shipped once (useRenderingBackend from
  # @jbrowse/core/util) while typecheck had been reporting it the whole time.
  # scripts/typecheck.mjs fails only on errors under src/, so linked-package noise
  # cannot make this advisory.
  echo "==> typecheck"
  pnpm typecheck
  echo "==> tests"
  pnpm test
fi

echo "==> build"
NODE_ENV=production node esbuild.mjs

if [ ! -f "dist/${ENTRY}" ]; then
  echo "no dist/${ENTRY} after build" >&2
  exit 1
fi

# Hashed chunks first, so the entry point never references something not yet
# uploaded. No --delete: old hashes stay reachable for anyone still holding a
# cached entry point.
echo "==> upload chunks (immutable)"
aws s3 cp dist/chunks/ "s3://${BUCKET}/${PREFIX}/chunks/" --recursive \
  --cache-control "public, max-age=31536000, immutable"

echo "==> upload entry point (short ttl)"
aws s3 cp dist/ "s3://${BUCKET}/${PREFIX}/" --recursive --exclude "chunks/*" \
  --cache-control "public, max-age=60"

# Only the fixed-name entry point and its map need this; the chunks are
# content-addressed, so a changed chunk is a new path the edge has never seen.
echo "==> invalidate entry point"
invalidation=$(aws cloudfront create-invalidation \
  --distribution-id "$DISTRIBUTION_ID" \
  --paths "/${PREFIX}/${ENTRY}" "/${PREFIX}/${ENTRY}.map" \
  --query 'Invalidation.Id' --output text)
echo "    $invalidation"

until [ "$(aws cloudfront get-invalidation --distribution-id "$DISTRIBUTION_ID" \
  --id "$invalidation" --query 'Invalidation.Status' --output text)" = "Completed" ]; do
  sleep 10
done

echo "==> verify what the CDN serves matches what was built"
served=$(mktemp)
trap 'rm -f "$served"' EXIT
curl -fsS -o "$served" "${BASE_URL}/${ENTRY}"
local_md5=$(md5sum "dist/${ENTRY}" | cut -d' ' -f1)
served_md5=$(md5sum "$served" | cut -d' ' -f1)
if [ "$local_md5" != "$served_md5" ]; then
  echo "MISMATCH: built $local_md5 but ${BASE_URL}/${ENTRY} serves $served_md5" >&2
  exit 1
fi
echo "    ok, $local_md5"

# A plugin that loads but cannot resolve a lazy chunk fails at the moment the
# user opens the view, which is far worse than failing to load at all.
echo "==> verify referenced chunks resolve"
missing=0
for chunk in $(grep -o '\./chunks/[A-Za-z0-9_-]*\.js' "dist/${ENTRY}" | sort -u | sed 's|^\./||'); do
  code=$(curl -s -o /dev/null -w '%{http_code}' "${BASE_URL}/${chunk}")
  if [ "$code" != "200" ]; then
    echo "    $chunk -> $code" >&2
    missing=1
  fi
done
[ "$missing" = "0" ] || { echo "some chunks are not reachable" >&2; exit 1; }

echo "==> done: ${BASE_URL}/${ENTRY}"
