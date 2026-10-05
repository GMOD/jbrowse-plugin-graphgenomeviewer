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
