# Handoff 2026-09-26: GraphTrack

## Shipped

- **GraphTrack** (`src/GraphTrack/index.ts`) is the one track type for a graph.
  It lists LinearGraphDisplay, LinearBasicDisplay, and a copy of core's
  MultiWaySyntenyDisplay that asks for `headerLanes`, so only gbz-base offers
  lanes on hosts newer than 5.0.0-beta.9. LinearGraphDisplay registers for
  GraphTrack alone. A gbz-base database stays a SyntenyTrack when the user wants
  lanes or a synteny view.
- **Add track** (`src/graphTrackDefaults/index.ts`): `.segs.bed.gz` guesses
  RgfaTabixAdapter, `.gbz.db` guesses GbzBaseSyntenyAdapter, and both guess
  GraphTrack. A gbz adapter with no `assemblyNames` takes the track's.
- **Reference samples** (`gbzWindow.ts`): an exact name wins, then a
  case-insensitive match, then an alias (hg38→GRCh38, hs1→CHM13).
- **Readiness**: `geometryPainted` in `GraphGenomeView/model.ts` holds loading
  until the backend has rendered geometry built for the settled viewport; it is
  ANDed with core's `painted`. The first geometry after a cut is often built
  against a stale viewport with 0 strokes, which is what this catches.
- **e2e**: `waitForAppReady`, `addTrackThroughMenu` and `openTrackState` in
  `test/setup.ts`; `test/addTrack.test.ts` and `test/addGbzTrack.test.ts`.
- **Released**: 4.0.8 on npm, promoted in jbrowse-plugin-list (`latest/`,
  invalidated). jb2hubs pangenome configs migrated to GraphTrack (752aea1),
  and HPRC gained `hprc_v2_1_gbz_graph`; `upload.sh` has run.

## Open

- `checkPangenomeLaunches --local`: 59/61 pass. `nphp1: haplotypes` fails on
  both the live and the new configs (the lane for HG00544#1 is empty; it's in
  the data, not this change). Rerun after the CloudFront invalidation to
  confirm `nphp1: graph` passes on the served config.
- The jb2hubs primary checkout has uncommitted `.X-uploaded.json` stamps from
  another session plus this upload; commit them.
- Beta.9 hosts can't filter displays by adapter capability, so an rGFA
  GraphTrack's menu lists lanes. 5.0.0-beta.10 fixes that, but
  jbrowse-components isn't ready to release: origin/main CI is failing and
  local main has unpushed commits.
- Add track doesn't recognise a url with a query string after `.gbz.db` or
  `.segs.bed.gz` (a presigned url).
- The review suggested folding `paintedGeometryVersion` and
  `geometryViewportDirty` into one stamp.

## Lesson

Squash onto the merge-base, never `git reset --soft main`: main moves under
other sessions here, and 036f617 reverted four of their commits (fixed forward
in 511d5b6).
