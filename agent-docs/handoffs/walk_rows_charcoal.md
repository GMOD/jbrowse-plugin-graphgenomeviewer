# Handoff: decoding the charcoal in walk rows (2026-09-27)

Walk rows paint each haplotype walk on its own bp axis. Under the
reference-position scheme, sequence a walk shares with the reference takes the
hue of its reference coordinate, and off-reference sequence is flat charcoal
(fd92018, 562baed). On KIV-2, most of HG00133's 147 kb is charcoal: 116 kb of
extra repeat copies. The user finds the view compelling and wants the charcoal
decoded too.

## Where things live

- `packages/core/src/layout/walkRows.ts`: `WalkRun` carries `onReference`,
  `referenceStart` and `reversed`; runs split where the reference coordinate
  jumps
- `src/GraphGenomeView/components/WalkRowsOverlay.tsx`: `runFill` picks a flat
  fill or an SVG gradient per run; the legend is `WalkRowsLegend`
- `src/GraphGenomeView/components/referenceRampCss.ts`: `rampHue`, `rampStops`,
  `RAMP_GRADIENT_CSS`
- Data: `.test-jbrowse-variants/test_data/graphgenomeview/kiv2_eight.gfa`
  (GRCh38 + 8 HPRC haplotypes, 15,808 nodes); array window
  chr6:160,614,798-160,647,758, 5,548 bp unit
- Figure: `node scripts/shoot-figures.mjs walk_rows_kiv2 --out <dir>` after
  `pnpm build`

## Candidate designs, unmeasured

1. **Homology placement.** Place each off-reference node on GRCh38 by k-mer
   matching against the reference walk's sequence, which carries ~6 paralogous
   units. Paint placed sequence in the ramp hue, drawn distinctly (lighter,
   hatched or thinner) so it cannot read as shared sequence. A copy would then
   show which reference unit it resembles. Needs: fraction of nodes placed
   uniquely, scatter of placements, whether per-copy ramps come out coherent.
2. **Sharing count.** Shade off-reference sequence by how many of the walks
   carry its node: a common expansion versus private sequence. Cheap and honest.
3. **Node identity.** Colour off-reference nodes by id, so identical copies line
   up across rows (HG00097 and HG00099 look identical). Risk: noise from many
   tiny nodes.

Avoid encodings that are only a function of x, such as offset from the last
shared node modulo the unit: they restate the tile separators.

## Open questions

- Cost: the pass must fit ~100 ms on a 16k-node cut when the layout is chosen,
  or be precomputed
- Meaning on non-VNTR graphs (bubbles, SVs), which use the same view
- The canvas paints most KIV-2 off-reference nodes light grey (no midpoint
  within 4 backbone hops), so walk rows' charcoal differs from other layouts
- Legend wording states what a colour is; the user dislikes "X, not Y" framing
