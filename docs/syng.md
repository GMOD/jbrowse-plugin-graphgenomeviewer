# syng graphs from impg

- [impg](https://github.com/pangenome/impg) builds a
  [syng](https://github.com/richarddurbin/syng) syncmer index with no alignment
  step
- `impg query -o gfa:syng` cuts a region from the index as a blunt GFA
- The plugin opens that GFA like any other, with Add → **Graph genome view**

![The syng graph of C4 with three walks lifted together, each shaded light to dark along its own length: grch38 grey, HG01978#2 cyan to blue and HG01952#1 peach to rust. Each walk draws a thread per pass round the ring, grch38 two, HG01978#2 three and HG01952#1 two. Grey and blue threads run round the HERV-K loop at the left, and the orange ones cut across it](../img/syng_c4.png)

## Building the C4 example

[test_data/syng/build.sh](../test_data/syng/build.sh) builds
`test_data/syng/c4.syng.gfa.gz` from odgi's 90 C4 haplotypes. It needs impg
0.5.0 or later, samtools, python3 and curl.

```console
test_data/syng/build.sh
npx -p @jbrowse/bandage-core bandage-figure test_data/syng/c4.json -o c4.svg
```

- `build.sh` writes each haplotype as FASTA, runs `impg syng`, and queries the
  83.6 kb around C4 from CHM13
- `bandage-figure` draws the figure above from
  [c4.json](../test_data/syng/c4.json): force-directed along GRCh38, with
  GRCh38, HG01978#2 and HG01952#1 lifted together. ggbandage's `syng_overlay`
  draws the same graph and walks

## impg 0.5.0 quirks

`build.sh` works around three quirks of impg 0.5.0's output:

- impg puts a reverse-complemented haplotype on nodes of its own, splitting the
  graph in two, so orient the input to one strand
- impg leaves the query path out of the output, so query from a path you can
  spare. `build.sh` queries from CHM13 to keep GRCh38
- Path names nest a range in a range (`chr6:31972046-32055647:0-83601`), and the
  walk keys read only the last one. `paths.py compose` rewrites `name:a-b:c-d`
  as `name:(a+c)-(a+d)`

## Reading the figure

GRCh38 has C4A and C4B, two copies of a 32.7 kb module, and syng folds both onto
one copy's nodes. A haplotype's copy count is how often it goes round the ring:

- Each lifted walk draws a thread per pass through a node, so grch38 runs two
  threads round the ring and HG01978#2 three, its extra copy
- Each walk shades light to dark along its length, so a darker thread is a
  later pass
- The loop at the left is the HERV-K in C4's intron 9, which makes a C4 long.
  Both of GRCh38's copies run round it, and both of HG01952#1's cut across
- A syng branch repeats the reference's sequence on both sides of a variant, so
  a SNP draws as an off-path run of tens of bp,
  where a pggb graph draws a 1 bp bubble
