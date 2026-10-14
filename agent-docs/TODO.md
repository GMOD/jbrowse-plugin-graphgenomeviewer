---
name: todo
description:
  Index of the open action items in todo/, grouped by what to do first. Read
  when picking up work, and before filing anything new here.
---

# Todo

One file per item under [todo/](todo/). Each carries its table row in its own
frontmatter: `metadata.category` picks the table, `area` and `first_move` are
the columns, `order` is where it sits. This index has no generator, so add or
remove a row here when you add or remove an entry.

Commitment, not size, separates an item here from a proposal in
[ideas/](ideas/).

## Ready to take

| Item                                                                                                   | Area                 | First move                                                                                      |
| ------------------------------------------------------------------------------------------------------ | -------------------- | ----------------------------------------------------------------------------------------------- |
| [Each row's own genes in bandage-figure](todo/figure-rows-own-genes.md)                                | walk strip           | Add a spec field mapping each sample to its gene file.                                          |
| [Strip under LinearGraphDisplay](todo/strip-under-linear-graph-display.md)                             | walk strip           | Pass `host: false` to walkStripApplies from a track and see what the track needs.               |
| [The SVG export leaves out an open bubble's greying](todo/svg-export-open-bubble.md)                   | export               | Add one drawnHighlight view (walkLift ?? openBubbleFocus) and use it in PaneSvg and the canvas. |
| [The legend measures wrong around hovers](todo/legend-measure-during-hover.md)                         | legend               | Gate the legend ResizeObserver on an at-rest view and re-measure when the pane returns to rest. |
| [Undoing the reference path does not re-anchor](todo/reference-path-undo.md)                           | layout               | Move re-anchoring into a reaction on referencePath, and drop the dialog's recomputeLayout call. |
| [Two repeat arrays over one span share a key](todo/repeat-key-collision.md)                            | repeats              | Add the motif, unit or record index to the key in repeatFeatures.ts.                            |
| [wholeGraph re-parses a cut without anchoring, folding or reads](todo/whole-graph-skips-derivation.md) | loading              | Factor parseAndLayout's post-parse steps into deriveGraph and call it from wholeGraph.          |
| [A tube map asks for whole-walk cuts for a strip it never draws](todo/tube-map-whole-walk-cuts.md)     | walk strip           | Pass walkStrip: self.walkStrip && self.modeDrawsNodes to cutsWholeWalks in both places.         |
| [RgfaTabixAdapter has no samplesTsvLocation slot](todo/rgfa-samples-tsv-slot.md)                       | adapters             | Share the walk-file slots, samplesTsvLocation among them, from panSNTabix.ts.                   |
| [A layout change during the settle debounce cuts with the old fold](todo/relayout-stale-fold.md)       | linear graph display | Have recutAt set settledWindow to the window it cuts at.                                        |
| [The gene chip readout prints a 0-based start and the PanSN name](todo/gene-chip-readout.md)           | genes                | Print gene.start + 1 on the contig name in LabelLayer.tsx, or use core regionLabel.             |
| [The reference walk row gets every gene unfiltered](todo/reference-row-gene-filter.md)                 | walk rows            | Filter the reference row's genes as BandageJS's genesOnRow does.                                |
| [A samples TSV row named HG00097#01 never matches](todo/column-key-haplotype.md)                       | tube map             | Use core panSNHaplotype in columnKeyOf in tubeMapPanels.ts.                                     |
| [An unknown layoutMode or hover in a track config throws](todo/lenient-track-enums.md)                 | linear graph display | Use GraphGenomeView/lenientEnum.ts for both slots in LinearGraphDisplay/configSchema.ts.        |

## Needs a visual call

| Item                                                                         | Area       | First move                                                         |
| ---------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------ |
| [Halo behind arrowheads](todo/halo-behind-arrowheads.md)                     | drawing    | Prototype the barb-only stroke and look at an abutting joint.      |
| [The lifted walk's colour on its bar](todo/lifted-walk-colour-on-its-bar.md) | walk strip | Pick between a chip beside the label and an outline round the bar. |
