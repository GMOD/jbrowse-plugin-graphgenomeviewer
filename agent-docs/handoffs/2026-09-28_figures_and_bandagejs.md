# Handoff: reproducible figures, and BandageJS on the new core (2026-09-28)

## Landed here, unreleased (main after 4.0.24)

- Figures draw genes: exon outlines masked round each node's ink and gene labels
  with leaders (`figureSvg({ genes })`), plus row labels on row layouts. The
  labels use `geneLabelCandidates` from `labelLayout.ts`, shared with the view.
- The SVG's `<metadata>` holds
  `{ generator: '@jbrowse/bandage-core@<version>', spec }`.
  `packages/core/src/version.ts` is stamped by `scripts/version.mjs` at release,
  beside `src/version.ts`.
- `figure.test.ts` keeps a saved figure
  (`packages/core/src/__snapshots__/figure_walks.svg`); accept an intended
  change with `vitest -u`.
- Core gained `gbzCut.ts` (`HPRC_GBZ`, `parseRegion`, `openGbz`, `cutGbzRegion`,
  with a source's `context` and `snarls`) and `genes/geneFiles.ts`
  (`genesFromGff3Lines`, `genesFromBed`, `genesFromText`, moved from BandageJS's
  `src/geneModels.ts`), and `@gmod/tabix` as a dependency. The CLI
  (`src/cli/figure.ts`) uses them and reads a spec's
  `genes: { file, index?, format? }` for the backbone's contigs.
  `figures/mapt_sample.json` now pins RefSeq genes.
- `walkPosition(walk, nodeId, length)`: the plugin's walk keys (legend rows and
  facet titles) show the hovered node's stretch on each walk, or "not on this
  walk" (`model.hoveredOn`).
- Plugin **Copy figure spec** (`model.figureSpec()`): a graph cut from a
  `GbzBaseSyntenyAdapter` track or read from a GFA url, genes from a
  `Gff3TabixAdapter` gene track. Export SVG passes genes and the spec.
  `cutHaplotypes` and `sourceGfaLocation` are overridden by the view and the
  track display.
- CI: push.yml's `bandagejs` job packs the core, installs it into BandageJS's
  main and runs its tests. **Check it goes green on its first run** (it was
  written blind: `pnpm pack` in packages/core, `pnpm add -D <tgz>` in the
  checkout).

## Next steps

1. Watch the first `BandageJS on this core` run and fix it if the job itself is
   wrong.
2. BandageJS (`~/src/BandageJS`, work in a `git worktree` under
   `.claude/worktrees/`, `pnpm install --frozen-lockfile` there):
   - delete `src/geneModels.ts` and `test/unit/geneModels.test.ts`; import
     `genesFromText`, `genesFromGff3Lines`, `genesFromBed` from the core
     (`genes.ts`, `tabixGenes.ts`)
   - `src/gbz.ts`: use the core's `HPRC_GBZ`, `parseRegion`, `openGbz`,
     `cutGbzRegion` (keep its db cache and status callbacks); `query.ts` and
     `figure.ts` import `HPRC` from it
   - hover readout: in `view.ts` draw, write
     `walkPosition(...) ?? 'not on this walk'` into each facet title's and
     legend row's second line while `state.hoveredNode` is set (`walkKeyHtml`
     needs an `at` argument, and a class on that line to update it without
     reparsing)
   - `figure.ts`: pass `genes: settings.showGenes ? state.genes : undefined` and
     `spec` (not `metadata`) to `figureSvg`; add `genes` to `figureSpec()` from
     the bound gene track (`geneTrackOf(referenceWindow())` gives
     `{ file, index, format }`)
   - these need core 4.0.25: release first (step 3), then
     `pnpm add -D @jbrowse/bandage-core@^4.0.25`, run
     `TEST_PORT=<free> pnpm test`, land, push (Pages deploys on push)
3. Release: in the plugin's primary checkout, `pnpm version patch` (4.0.25,
   plugin and core together), then the store:
   `cd ~/src/jbrowse-plugin-list && pnpm dep && pnpm invalidate`, and wait for
   the invalidation to complete. If the version commit fails with
   `cannot lock ref 'HEAD'`, another session landed mid-run:
   `git restore --staged --worktree CHANGELOG.md package.json packages/core/package.json src/version.ts packages/core/src/version.ts`
   and rerun.
4. Check
   `npx -y -p @jbrowse/bandage-core@4.0.25 bandage-figure figures/mapt_sample.json -o x.svg`
   matches `img/figure_mapt_sample.svg`.
5. `pnpm deploy` in BandageJS updates jbrowse.org/demos/bandagejs (needs the
   user's AWS credentials).

## Hazards

- /tmp is a per-user tmpfs quota that other sessions' scratchpads fill (5 GB
  from jbrowse-components alone); when tool output fails with EDQUOT, write
  large outputs under a worktree's gitignored `test-screenshots/`.
- Other sessions land on main often; rebase before landing.
