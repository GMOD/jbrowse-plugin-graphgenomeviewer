#!/usr/bin/env bash
# Builds c4.syng.gfa.gz, a syng graph of odgi's C4 test haplotypes, with impg.
# Needs impg (0.5.0+), samtools, python3 and curl. Render the figure with
#   npx -p @jbrowse/bandage-core bandage-figure c4.json -o c4.svg
set -euo pipefail
cd "$(dirname "$0")"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

curl -sL -o "$tmp/chr6.C4.gfa" \
  https://raw.githubusercontent.com/pangenome/odgi/master/test/chr6.C4.gfa

# impg's syng GFA puts a reverse-complemented haplotype on nodes of its own,
# splitting the graph in two, so every haplotype goes in on the reference strand
python3 paths.py fasta "$tmp/chr6.C4.gfa" >"$tmp/c4.fa"
samtools faidx "$tmp/c4.fa"

impg syng -f "$tmp/c4.fa" -o "$tmp/c4.syng" -t 4

# impg leaves the query path out of its output, so query from CHM13 to keep GRCh38
impg query -a "$tmp/c4.syng" \
  -r "chm13#chr6:31825251-31908851:0-83600" \
  -d 50k -o gfa:syng \
  --sequence-files "$tmp/c4.fa" \
  --force-large-region -O "$tmp/c4.syng"

python3 paths.py compose "$tmp/c4.syng.gfa" | gzip -9 >c4.syng.gfa.gz
