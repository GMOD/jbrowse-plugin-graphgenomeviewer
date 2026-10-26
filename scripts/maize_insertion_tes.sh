#!/usr/bin/env bash
#
# Prints how much of each founder insertion of 1 kb or more its carrier's own
# MaizeGDB TE annotation covers, from a build_maize_nam_graph.sh output dir:
# the insertion's B73 position and length, the carrier, where minimap2 places
# the inserted sequence in the carrier's slice, the bp a TE covers, and the two
# TEs that cover most.
#
# Requires: bcftools, minimap2, curl
# Usage:    bash scripts/maize_insertion_tes.sh <build dir> <chr>
#
set -euo pipefail

BUILD="$1"
CHR="$2"
VCF="$BUILD/maize_nam_$CHR.nested.vcf.gz"
WORK="$BUILD/insertion_tes"
mkdir -p "$WORK"

bcftools query -f '%POS\t%REF\t%ALT[\t%SAMPLE=%GT]\n' -i 'INFO/SVTYPE="INS"' "$VCF" |
  awk -F'\t' '{
    for (i = 4; i <= NF; i++) {
      split($i, sg, "=")
      if (sg[2] == "1" && length($3) - length($2) >= 1000)
        print ">" $1 "|" length($3) - length($2) "|" sg[1] "\n" $3 > ("'"$WORK"'/" sg[1] ".ins.fa")
    }
  }'

for ins in "$WORK"/*.ins.fa; do
  g=$(basename "$ins" .ins.fa)
  gff="$WORK/$g.te.gff3.gz"
  [ -s "$gff" ] || curl -sf -o "$gff" \
    "https://download.maizegdb.org/All_assembly_TE_GFF/Zm-$g-REFERENCE-NAM-1.0.TE.gff3.gz"
  zcat "$gff" | awk -F'\t' -v chr="$CHR" '$1 == chr && $3 !~ /repeat_region|target_site|long_terminal|knob/' |
    cut -f3,4,5,9 > "$WORK/$g.te.tsv"
  minimap2 -c -x asm5 --secondary=no "$BUILD/fa/$g.fa" "$ins" 2>/dev/null |
    awk -v g="$g" '$10 > 0.9 * $2 { print $1 "\t" $8 "\t" $9 "\t" g }'
done | python3 -c '
import sys
work = sys.argv[1]
for line in sys.stdin:
    q, s, e, g = line.split()
    pos, size, _ = q.split("|")
    s, e = int(s), int(e)
    tes = []
    for t in open(f"{work}/{g}.te.tsv"):
        kind, ts, te, attr = t.rstrip("\n").split("\t")
        overlap = min(e, int(te)) - max(s, int(ts))
        if overlap > 0:
            name = next((a[5:] for a in attr.split(";") if a.startswith("Name=")), "")
            tes.append((overlap, f"{kind} {name}"))
    covered = min(sum(o for o, _ in tes), e - s)
    top = "; ".join(n for _, n in sorted(tes, reverse=True)[:2])
    print(f"{pos}\t{size}\t{g}\t{g}:{s}-{e}\t{covered}/{e - s} bp TE\t{top}")
' "$WORK" | sort -n
