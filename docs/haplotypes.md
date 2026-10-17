# Haplotypes

This page covers walks: lifting them, comparing them in panels, colouring them,
and reading them as walk rows. Walks need a gbz-base or walk-indexed graph
([data.md](data.md)).

A node draws thicker the more walks visit it, and each route through a bubble is
labelled with its haplotypes and length.

## Lifting walks

The Highlight picker lifts walks out of the drawing, and the rest fades to grey.
Tube maps have no picker, since their tubes are the walks.

- Past a dozen walks, **Haplotypes** lists only lifted ones and **Choose
  haplotypes...** searches the rest
- A walk lifted alone shades light to dark along itself. Its key is a bar of
  that gradient with `contig:start-end (length)` under it
- Walks lifted together each take a flat colour and a lane, like a metro map.
  The reference is grey
- A walk that crosses the reference the other way runs the other way along it,
  so an inversion reads as red to yellow where the reference reads yellow to red
  (HG002's H2 haplotype at MAPT)

### Example: GSTM1

HG00133 lifted alone runs cyan to navy past the 18 kb its deletion skips:

![HG00133's walk lifted at GSTM1 under the eight haplotypes' alignment rows](../img/force_gstm1_walk.png)

Lifting three haplotypes together shows three routes:

- HG01960 runs through GRCh38's GSTM1
- HG00133 skips it
- HG03041 loops round a copy the graph never merged with GRCh38's. HPRC's wfmash
  alignment runs HG03041 straight through, so the loop reflects how the graph
  was built. 84 of 463 haplotypes have it

A panel per haplotype draws each route alone. HG00133's dashed arc is the 18.4
kb it skips, and HG03041's loop is its own copy:

![HG01960, HG00133 and HG03041 lifted at GSTM1, a panel each](../img/force_gstm1_three_ways.png)

## Facets

With two or more lifted, **Haplotypes › Arrange** facets the pane.

- **A panel per haplotype** draws the layout once per walk on a shared scale,
  yellow at the walk's start and red at its end. A panel's title is its key, and
  clicking it lifts that walk alone
- **A row per sample** puts a haplotype in each column, like
  `facet_grid(sample ~ haplotype)`
- Panels share one view, so a pan, zoom or hover in one applies to all. As many
  go across as draw each panel largest; `columns` fixes the count
- Hovering a node gives its position on each walk's contig in the key

Through KIV-2, HG00097 adds one loop to GRCh38's (+22.2 kb), HG01960 skips most
of GRCh38's for the big loop (+49.9 kb), and HG00133 takes both (+116.4 kb):

![The KIV-2 array side by side: GRCh38, HG00097, HG01960 and HG00133](../img/force_kiv2_facet.png)

A session states walks and facet:

```json
"walkLayers": [
  { "walk": "GRCh38#0#chr6" },
  { "walk": "HG00133#1#CM090050.1", "color": { "scheme": "purple" } }
],
"facet": { "field": "walk", "domain": ["HG00133#1#CM090050.1"], "columns": 2 }
```

`domain` lists the walks or samples whose panels come first.

## Colouring lifted walks

**Haplotypes › Color highlighted...** sets a field and a scheme per walk.

| Field                   | Meaning                                               |
| ----------------------- | ----------------------------------------------------- |
| Progress along the walk | light at the start, dark at the end                   |
| One colour for the walk | which walk the lane is                                |
| Reference position      | where the node sits on the reference, charcoal off it |

Schemes run light to dark in distinct hues: grey to black for the reference,
then cyan to navy, yellow to red, pink to plum and lime to forest. The first two
stay apart for red-green colour blindness. The rainbow ramp is for reference
position only.

## Walk rows

Walk rows draw one bar per haplotype. Under the reference-position ramp:

- A stretch on the reference's path takes the hue of the reference stretch it
  runs through. A stretch off it is charcoal (blue and purple under other
  schemes)
- Charcoal is an alternative route through the graph, and may be sequence the
  reference has. In the HPRC amylase cut, HG00133#1 has GRCh38's three AMY1
  copies in order, yet 75 kb of its bar is purple. Count copies from the gene
  boxes instead
- Each bar boxes genes from the assembly named by its PanSN name (`HG00097#1`).
  In the HPRC config every release 2 haplotype has one, with its CAT annotation
- Right-click a bar to open its span in a linear view on its own assembly
- Node lengths are not labelled while walks are lifted

The **Repeat** picker tiles bars by a repeat annotation's unit and marks the
allele a genotyper called. With the curated VNTR track, each KIV-2 bar is tiled
by the 5,548 bp kringle: about 6 copies in GRCh38 and 27 in HG00133:

![KIV-2 walk rows under LPA and the curated KIV-2 annotation](../img/walk_rows_kiv2.png)

In a tandem array the copy hue is the aligner's pick among near-identical
copies: at KIV-2, 13 of 32 threaded copies take the hue of a reference copy of
the other repeat type. To colour by the true unit, load
[jbrowse-plugin-tandem-repeat](https://github.com/GMOD/jbrowse-plugin-tandem-repeat)
and right-click a VCF 4.5 `<CNV:TR>` record.
