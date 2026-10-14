---
name: aliased-region-breaks-hover-sync
description:
  A graph cut on an assembly or refName alias draws, but hover sync, the linked
  band and "Open in" pairing compare the alias with canonical names and never
  match.
metadata:
  category: ready
  area: hover sync
  first_move:
    'Canonicalize the region once, assembly and refName, before cutSubgraph
    stores it.'
  order: 3
---

# An aliased loadedRegion breaks hover sync and view pairing

- `offReference` (`src/GraphGenomeView/model.ts` 38-48) canonicalizes both
  names, so the cut goes ahead, but `resetCut` stores the region as written
  (`pane/loadActions.ts` 307)
- Raw comparisons: `hoverInRegion` (`hoverSync/lgvHover.ts` 90-97),
  `isOnAssembly` (`hoverSync/graphViewHighlights.ts` 76-84),
  `pane/launchActions.ts` 82, `launchFromGraph/graphMenuItems.ts` 179
- Repro: `loadedRegion.assemblyName: 'GRCh38'` in a session whose assembly is
  `hg38` with that alias; a refName alias such as `6` for `chr6` breaks
  `hoverInRegion` too
