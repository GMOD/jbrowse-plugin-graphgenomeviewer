---
name: walk-lanes-assembly-aliases
description:
  WalkTabixSyntenyAdapter compares the anchor assembly by raw name and takes no
  assemblyNames from its track, so an aliased or track-named walk track shows
  empty lanes or throws.
metadata:
  category: ready
  area: adapters
  first_move:
    "Rewrite the lane adapters' assemblyNames to canonical names in
    trackAdapterConfig, and key withGbzAnchor on LANE_ADAPTERS."
  order: 4
---

# The walk lanes adapter misses assembly aliases

- `WalkTabixSyntenyAdapter.ts` 93 and 257 compare a region's assembly with the
  anchor by `===`; the display canonicalizes both. The GBZ half is in
  [loose-ends](../ideas/collections/loose-ends.md)
- The worker has no assembly manager, so `trackAdapterConfig`
  (`src/panSNAliases/trackAdapterConfig.ts`) is where to write canonical names
  in
- `withGbzAnchor` (`src/graphTrackDefaults/index.ts` 26) copies the track's
  `assemblyNames` into the adapter only for `GbzBaseSyntenyAdapter`, so a walk
  track naming its assemblies on the track alone throws "needs assemblyNames"
