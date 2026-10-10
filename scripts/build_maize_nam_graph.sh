#!/usr/bin/env bash
#
# Builds a Minigraph-Cactus graph of B73 v5 and the 25 NAM founders over one
# B73 window, the recipe MaizeGDB's Pangenome Viewer uses chromosome-wide
# (bioRxiv 10.64898/2026.08.31.748368), and writes it as a gbz-base database.
#
# MaizeGDB serves every assembly bgzipped with .fai/.gzi, so samtools fetches
# each founder's slice by range request instead of downloading 26 genomes. The
# window starts at the telomere, so B73 path coordinates are B73's own. Each
# founder's slice runs MARGIN bp past its last forward alignment to the window;
# Cactus clips whatever of the margin aligns to nothing.
#
# Requires: docker, samtools (built with libcurl), minimap2, vg, gbz-base,
#           gbz-haplotype-index
# Usage:    bash scripts/build_maize_nam_graph.sh [outdir]
#
set -euo pipefail

OUTDIR="${1:-maize_nam_graph_build}"
mkdir -p "$OUTDIR/fa"
cd "$OUTDIR"

CHR=chr8
END=1600000
SLICE=4000000
MARGIN=100000
NAME=maize_nam_${CHR}
BASE=https://download.maizegdb.org/Genomes/NAM_Founders
CACTUS_IMAGE=quay.io/comparative-genomics-toolkit/cactus:v2.9.9

FOUNDERS="B97 CML103 CML228 CML247 CML277 CML322 CML333 CML52 CML69 HP301
Il14H Ki11 Ki3 Ky21 M162W M37W Mo18W Ms71 NC350 NC358 Oh43 Oh7B P39 Tx303 Tzi8"

fasta_url() {
  local v=1.0
  [ "$1" = B73 ] && v=5.0
  echo "$BASE/Zm-$1-REFERENCE-NAM-$v/Zm-$1-REFERENCE-NAM-$v.fa.gz"
}

fetch() { samtools faidx "$(fasta_url "$1")" "$CHR:1-$2" | sed "1s/.*/>$CHR/"; }

[ -s fa/B73.fa ] || fetch B73 "$END" > fa/B73.fa

echo "B73 fa/B73.fa" > seqfile
for g in $FOUNDERS; do
  if [ ! -s "fa/$g.fa" ]; then
    [ -s "slice/$g.fa" ] || { mkdir -p slice; fetch "$g" "$SLICE" > "slice/$g.fa"; }
    stop=$(minimap2 -x asm10 -t "$(nproc)" "slice/$g.fa" fa/B73.fa 2>/dev/null |
      awk -v margin="$MARGIN" -v cap="$SLICE" '
        $5 == "+" && $12 >= 5 && $11 >= 10000 && $9 > m { m = $9 }
        END { m += margin; print (m > cap ? cap : m) }')
    samtools faidx "slice/$g.fa" "$CHR:1-$stop" | sed "1s/.*/>$CHR/" > "fa/$g.fa"
    echo "$g: $CHR:1-$stop"
  fi
  echo "$g fa/$g.fa" >> seqfile
done

if [ ! -s "out/$NAME.full.gbz" ]; then
  rm -rf js
  docker run --rm -u "$(id -u):$(id -g)" -e HOME=/data -v "$PWD":/data -w /data "$CACTUS_IMAGE" \
    cactus-pangenome ./js seqfile --outDir out --outName "$NAME" --reference B73 \
    --gbz clip full --gfa clip full --vcf --maxCores "$(nproc)"
fi

for tier in "" .full; do
  gbz="out/$NAME$tier.gbz"
  vg snarls -T "$gbz" > "$NAME$tier.snarls"
  vg chains "$gbz" "$NAME$tier.snarls" > "$NAME$tier.chains"
  gbz-base construct --overwrite -c "$NAME$tier.chains" -o "$NAME$tier.gbz.db" "$gbz"
  gbz-haplotype-index "$gbz" "$NAME$tier.gbz.db" "$NAME$tier.haplotype-index.db"
done
