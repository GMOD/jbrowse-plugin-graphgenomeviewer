---
name: two-part-walk-names-in-graph-tables
description:
  bandage-core's graphFromTables turns a two-part walk name like `grch38#chr1`
  into `grch38#NaN#`, while this plugin's walk rows keep the raw name.
---

# Two-part walk names in bandage-core's graphFromTables

- gfa-to-tabix passes pggb P-line names such as `chm13#chr1` through unchanged,
  so a walk file can hold two-part names.
- bandage-core 10.2.6 still mangles them, in `walkFields` of
  `~/src/bandage-core/src/gfa/graphTables.ts`:
  - `graphFromTables` builds each path name as
    `${sample}#${+haplotype}#${contig}`, so `grch38#chr1` becomes `grch38#NaN#`,
    and walks on two contigs of one sample merge into one path.
  - The GFA writer in the same file emits `W grch38 chr1 <empty> …`, a W line
    whose haplotype field is not a number.
- This plugin's walk rows keep the raw name: `walkPath` in
  `src/RgfaTabixAdapter/walkRowRuns.ts` reads sample, haplotype and contig
  through bandage-core's PanSN helpers. Walk rows and a full graph parse
  therefore name such a walk differently. A search of `src/` found no code that
  matches walk-row names against graph path names, but nobody traced hover sync
  end to end.
- Three-part names come out the same both ways.
- Fix upstream: have `walkFields` read through `panSNSample`, `panSNHaplotype`
  and `panSNContig`, or keep the raw name, and test it on a two-part fixture.
  `src/RgfaTabixAdapter/test_data/walks2_twopart.GRCh38.walks.bed.gz` here is
  one.
