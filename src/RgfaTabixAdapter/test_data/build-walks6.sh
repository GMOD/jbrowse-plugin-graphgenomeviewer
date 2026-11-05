#!/usr/bin/env bash
# Rebuilds the walk format 6 fixtures, walks6_*, from their GFAs with
# gfa-to-tabix 3.0 or later. Usage: build-walks6.sh <gfa-to-tabix binary>
# walks1_header and walks5_header are kept as they are, for the refusal test.
set -euo pipefail
cd "$(dirname "$0")"
B=${1:?the gfa-to-tabix binary}
build() {
  local name=$1 gfa=$2
  shift 2
  "$B" "$gfa" --walks -o "$name.tmp" "$@" >/dev/null 2>&1
  local out sample
  for out in "$name".tmp.*.walks.bed.gz; do
    sample=${out#"$name".tmp.}
    sample=${sample%.walks.bed.gz}
    mv "$out" "$name.$sample.walks.bed.gz"
    mv "$out.tbi" "$name.$sample.walks.bed.gz.tbi"
  done
}
build walks6_header walks6_header.GRCh38.gfa --refs GRCh38 --chunk 1000
build walks6_twopart walks6_twopart.GRCh38.gfa --refs GRCh38 --chunk 1000
build walks6_maxnode walks6_maxnode.GRCh38.gfa --refs GRCh38 --chunk 1000
build walks6_follow walks6_follow.GRCh38.gfa --refs GRCh38 --chunk 1000
build walks6_rejoin walks6_follow.GRCh38.gfa --refs GRCh38 --chunk 10000
build walks6_lanepairs walks6_lanepairs.GRCh38.gfa --refs GRCh38 --chunk 1000
build walks6_inversion walks6_inversion.GRCh38.gfa --refs GRCh38 --chunk 10000
build walks6_skip walks6_skip.GRCh38.gfa --refs GRCh38 --chunk 10
build walks6_skipfollow walks6_skipfollow.GRCh38.gfa --refs GRCh38 --chunk 1000
build walks6_skipinv walks6_skipinv.GRCh38.gfa --refs GRCh38 --chunk 1000
build walks6_gap walks6_gap.GRCh38.gfa --refs GRCh38 --chunk 1000
