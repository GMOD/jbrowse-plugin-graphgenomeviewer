# syng graphs from impg

- [impg](https://github.com/pangenome/impg) builds a
  [syng](https://github.com/richarddurbin/syng) syncmer index with no alignment
  step
- `impg query -o gfa:syng` cuts a region from the index as a blunt GFA
- The plugin opens that GFA like any other, with Add → **Graph genome view**

![C4 as a syng graph, with walk rows: HG02080's 51 kb haplotype goes round the loop once, GRCh38 twice and HG01978's 116 kb haplotype three times](../img/syng_c4.png)

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
  [c4.json](../test_data/syng/c4.json): force-directed along GRCh38, with walk
  rows for GRCh38, HG02080, HG00735 and HG01978

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
one copy's nodes. GRCh38 walks the ring twice, and a haplotype's copy count is
how often it goes round:

- A node takes the colour of GRCh38's first visit, so the ring shows C4A's hues.
  The blue specks are nodes GRCh38 walks only in C4B, where C4B differs from C4A
- A walk row follows each copy to the GRCh38 copy it continues, and switches
  where it walks a node only C4A or only C4B holds. GRCh38's own row stays a
  smooth gradient
- A syng branch repeats the reference's sequence on both sides of a variant, so
  a SNP draws as an off-path run of tens of bp, the charcoal specks on the ring,
  where a pggb graph draws a 1 bp bubble
