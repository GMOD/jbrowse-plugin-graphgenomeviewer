# Handoff: decoding the charcoal in walk rows (2026-09-27)

Walk rows paint each haplotype walk on its own bp axis. On KIV-2 most of each
bar was charcoal, sequence off the reference walk. The charcoal is now decoded
by repeat unit: a VCF 4.5 `<CNV:TR>` record that states each allele's repeat
sequences paints every copy of every bar, GRCh38's included, in its unit's
colour (`docs/layouts.md`, `img/walk_rows_kiv2.png`). The ramp and its key step
aside while it does.

## What the charcoal is

Measured on `kiv2_eight.gfa` (GRCh38 + 8 HPRC haplotypes):

- No walk revisits a node; extra copies are new nodes
- Most of it is shared: a 68.7 kb block carried by 5 of the 8 haplotypes, 21.7
  kb by the 3 short ones; no row carries more than 5.7 kb alone
- Split at the reference array's first 24 bases, the 138 copies form two units
  2.3% apart (within a unit ≤ 0.47%), the same under minimap2 asm20 and 16-mer
  distance and at any cut from 0.8% to 2%. Long-read LPA studies report the same
  two repeat types. Which unit is KIV-2A has not been checked against the exon-1
  diagnostic sites (bases 14, 41, 86)
- The graph threads 32 copies through GRCh38 copies, and 13 of those through a
  reference copy of the other unit, so a ramp hue in an array states the
  aligner's pick, not homology. Within a unit a copy's nearest GRCh38 copy wins
  by 2-4 bp of 5.5 kb, which is noise

## Candidates rejected, with the number that rejected each

- Placing off-reference nodes on GRCh38 by k-mers: 92-99% of their 31-mers hit
  several reference copies, 0-4% one
- Grey by how many walks carry a node, or colour by which set carries it: both
  stripe at every SNP node, and the set colours collide with the ramp
- Clustering copies in the app: Colin prefers loading a finder's results, and
  the classes are a property of the locus rather than a rule. The generator does
  it offline instead

## What was built

- `repeats/repeatFeatures.ts` reads `<CNV:TR>` alleles: RN splits
  RUS/RUL/RUC/RB, RUB gives each copy's bases, a sample's GT picks alleles. The
  array starts after POS's padding base (JBrowse's VCF feature starts on it)
- `repeats/walkCalls.ts`: a phased GT's k-th allele pairs with PanSN haplotype
  k; unphased alleles still pair by length
- `WalkRowsOverlay.tsx`: units numbered by copies across the record's alleles,
  Tableau 10; a call stating runs replaces the tick; the readout counts copies
- `scripts/tandem-repeat-vcf.mjs` writes the record from a GFA cut and a BED
  row. The hosted `demos/hprc/hprc_kiv2_copies.vcf` (jbrowse-components) came
  from it, and the figure reads that track

## Why a script and not a finder

Colin prefers loading a dedicated finder's output. None states KIV-2 per copy
from assemblies today. TRGT needs HiFi reads spanning the array, which 53-147 kb
alleles are not. DRAGEN's VNTR caller writes `<CNV:TR>` from short reads, one
repeat sequence per allele. vamos 3.1.1 (`--contig`, a custom catalogue holding
the two units) reproduces the script's GRCh38 decomposition, A A A B A A, but
skips any allele over 30,000 bp (`src/vntr.cpp:198`, a constant `-L` does not
reach), and wrote no record for any haplotype contig, whatever the region, under
a graph-derived alignment (flank M, array I, flank M). Trial inputs: the session
scratchpad's `vamos/`.

## Open

- **Tutorial**: converting TRGT (`MOTIFS` + `MS`) and vamos (`RU` +
  `ALTANNO_H1/H2`) output to spec VCF 4.5 `<CNV:TR>` fields, which walk rows
  then read. Colin's framing; the app reads only the spec
- **vamos upstream**: a patch that lets `-L` govern the 30 kb allele cap, and
  finding why contig mode drops these alignments, would make vamos the finder
  for KIV-2 and leave the script only the unit discovery. Colin's call
- **The whole panel**: the generator compares every distinct copy with every
  other, so all 464 haplotypes at KIV-2 need sketches first
- **Other VNTRs**: run the generator on ABCA7 and the CFHR window. If each is
  one unit, per-copy colour is a KIV-2 story and the tiles already say the rest
- **JBrowse core**: `VcfFeature` places a symbolic allele from POS − 1 to
  start + SVLEN, one base left of the spec's span
- **Host compatibility**: the bundle binds `@jbrowse/core/util/colorBits` to the
  host (it is in ReExports now), and 5.0.0-beta.4 has no `packAbgr` there, so
  the plugin fails to load on it. `.test-jbrowse-variants` is beta.4; the e2e
  ran on `.test-jbrowse-beta9`. `renderer/colorBits.ts`'s header still says the
  path is bundled
