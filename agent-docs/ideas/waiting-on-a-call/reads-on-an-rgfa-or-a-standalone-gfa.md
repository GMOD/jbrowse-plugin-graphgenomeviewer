---
name: reads-on-an-rgfa-or-a-standalone-gfa
description:
  Only gbz-base tracks take reads because no tabix GAF index can key s1, s2
  segment names; an unindexed GAF read whole would work on rGFA and standalone
  GFA.
---

# Reads on an rGFA or a standalone GFA

Only gbz-base tracks take reads. A tabix GAF index keys each read by its lowest
and highest numeric node id, and Minigraph's rGFA names its segments `s1`, `s2`,
…, so no index can key them. An unindexed GAF, read whole up to 50 MB, would
work on `RgfaTabixAdapter` and on a GFA opened with **Add → Graph genome view**,
neither of which has a reads input today.

The GBZ route is deprecated, so the reads follow-ups below wait on this call:

- Fetch reads only for the tube map layouts. A track that names reads fetches
  them in every layout (`namesReads` in `pane/loadActions.ts`), though only a
  tube map draws them, so a switch into a tube map then has to fetch.
- Keep mismatch text visible in a squeezed track; today it shows only once the
  track is dragged taller.
- Add a hover leader on read marks.
- Genes per haplotype as GAF transcripts:
  [genes-per-haplotype-through-gaf.md](genes-per-haplotype-through-gaf.md).
