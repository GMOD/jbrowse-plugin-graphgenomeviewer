# Layouts, bubbles and genes

| Layout                | x axis                                       | Needs                        |
| --------------------- | -------------------------------------------- | ---------------------------- |
| Force-directed        | graph shape, seeded along the reference      | any graph                    |
| Ordered               | reference order, so a bubble reads as a lens | rGFA or reference path       |
| Anchored              | reference bp, a row per stable rank          | rGFA or reference path       |
| Sample rows           | reference bp, a row per assembly             | W or P lines                 |
| Walk rows             | each walk's own bp, a bar per haplotype      | W or P lines                 |
| Tube map              | node order, widths log-scaled                | W or P lines                 |
| Tube map on reference | reference bp                                 | W or P lines and a reference |

- **Force-directed** uses Bandage's OGDF FMMM engine. It lays out unbranching
  runs, so a 15,000-node cut draws in a few seconds. A graph track uses the
  stress engine, which holds the reference straight along x, so zooming in crops
  one picture. The Layout menu and the settings dialog switch engines
- **Walk rows** make a repeat expansion read as bar length. See
  [haplotypes.md](haplotypes.md#walk-rows)
- **Tube maps** follow
  [sequenceTubeMap](https://github.com/vgteam/sequenceTubeMap). See
  [tube-maps.md](tube-maps.md)

## Reference strip

In a linear view's track, a force-directed or ordered drawing has no bp axis. A
strip along the top draws each reference segment at its bp, in its node's
colour.

- Touching segments alternate between two tiers while 12 px or more wide on
  average. A base-level cut draws as one band
- Hovering a node or bubble name boxes its reference span on the strip and draws
  a leader to the node. An allele's span runs between its flanks
- While haplotypes are lifted, the strip gives each walk a row, pale where the
  walk skips a segment. A deletion is a pale gap
- A triangle at either end marks where the graph draws reference past that edge
- **Show... › Show reference strip** turns it off

Hovering HG02391's 68 kb segment boxes its span on the strip, and the linear
view bands the same bp across the curated KIV-2 array:

![KIV-2's 68 kb allele hovered: the strip boxes the span between its flanks, and the linear view bands it over the KIV-2 annotation](../img/force_kiv2_hover.png)

A linear view of a haplotype's own assembly, such as a synteny row or one opened
from the node menu, bands where that haplotype carries the hovered node on its
own contig. Each walk through the node gives one band, so a node a haplotype
walks twice bands twice.

## Bubbles

A bubble is a place where paths split and rejoin, such as a SNP, an indel or a
repeat array. The node layouts can mark each one.

- **Sources:** `<prefix>.bubbles.bed.gz` beside an rGFA index holds
  `gfatools bubble` records, and `gfa-to-tabix bubbles` writes the same file
  from a plain GFA's snarl VCF. A GBZ cut, a pggb file or an open bubble gets
  bubbles derived from the ordered layout
- **Show... › Show bubble halos** (off by default) draws each structural variant
  as a halo along its nodes, coloured by kind, named in the legend
- A variant under 50 bp is a tick above its nodes, named on hover
- Clicking a label opens the bubble in place: its nodes get the full colour ramp
  and the rest greys. Bubbles inside get labels, so a superbubble opens level by
  level. Click the label or the legend's **close** to shut it
- A linear view's bubbles track and a `vg deconstruct` VCF (IDs like
  `>1234>1240`) name whole bubbles: hovering a record rings its bubble in the
  graph, halos on or off, and clicking the record opens it

The HPRC bubbles track draws the same records at their bp. The 3,018–174,966 bp
record, 29 segments and up to 129 paths, is the KIV-2 halo:

![KIV-2 with its bubbles marked, under the HPRC bubbles track](../img/force_kiv2_bubbles.png)

Opened, the KIV-2 array takes the whole ramp:

![The KIV-2 array open in the track](../img/force_kiv2_open.png)

## Genes

The view draws each of the session's exons as a goldenrod outline around the
stretch of node it sits on, and pins the gene's name under its midpoint.

- The view draws exons on the backbone's nodes and on a coarse tier's bubble
  nodes
- A name never covers a node its gene is not on, so it moves a row or is left
  off
- The label of a gene partly in the cut gives how much of it the cut holds:
  `LPA · 35 of 132.8 kb`
- In a graph genome view, a tube map draws genes in rows above the tubes. In a
  linear view the gene track shows them ([tube-maps.md](tube-maps.md#axes))
- Where the linear view shows genes as a lane, the graph names only what the
  lane draws
- Records spanning a whole sequence (RefSeq's `region`) and records with no
  `gene_name`, `Name`, `gene` or `gene_id` get no name

In MHC class II, HLA-DRB5, HLA-DRB6 and HLA-DRB1 sit over their exons. Hovering
HG01071's 46.9 kb allele shows it replaces 173 bp of GRCh38 between HLA-DRB5 and
HLA-DRB6:

![MHC class II under its genes, HG01071's 46.9 kb allele hovered](../img/force_mhc.png)

### Which assembly

A backbone names a sample by PanSN (`GRCh38#0#chr6`), not an assembly. The view
draws genes on a backbone only for the assembly it read them for.

- A walk names the cut's assembly when its sample or haplotype is the assembly's
  name, a session alias, a prefix that `assemblyNameToPanSN` maps, or a
  reference's well-known sample (hg38 is GRCh38, hs1 is CHM13)
- A path graph draws x along the first walk, which for gbz-base is the adapter's
  `referenceSample`, the database's only reference sample, or vg's `_gbwt_ref`.
  The track config puts that walk on the cut's assembly, whatever its name
- After "Draw x along" picks another walk, genes stay only where that walk names
  their assembly
- A sample-level name (`HG002`) names no haplotype of a diploid, and a bare
  (`chr6`) or generic name names none

## Export

- **Export SVG** in the graph genome view saves the drawing, keys and panels
- In a linear view, the view's **Export SVG** draws the track as shown
