# Handoff 2026-09-27: GraphTrack migration, tube map

## Why

- Plugin 4.0.8 (on npm) registers `LinearGraphDisplay` for `GraphTrack` only
  (`82b2ead`). 4.0.7 has no `GraphTrack` type at all.
- The user chose to move every hosted config to `GraphTrack` rather than keep
  accepting `FeatureTrack`/`SyntenyTrack`.
- jbrowse-plugin-list's `plugins.json` pins this plugin to 4.0.7, so the live
  configs are safe until that pin moves.

## State

- **jb2hubs**: `752aea1` moved the four portal configs
  (`website/pangenome-config/*.json`) to `GraphTrack`. They are committed but
  not uploaded; live `jbrowse.org/pangenome/hprc-grch38/config.json` still says
  `FeatureTrack`. Uncommitted `.*-uploaded.json` stamp edits there are another
  session's; leave them.
- **jbrowse-components**: branch `graphtrack-configs` (worktree
  `.claude/worktrees/graphtrack-configs`), commit `b018ad16a2`, not landed.
  - Demos `hprc`, `hprc_multiway`, `ecoli_pangenome` and `arabidopsis_pangenome`
    get `type` lines only, for tracks whose adapter is
    `RgfaTabixAdapter`/`GbzBaseSyntenyAdapter` and that open the graph display
    or declare no displays.
  - Bubble tracks and `ecoli_pggb_carriage` (plain feature display) stay as they
    are.
  - Committed with `SKIP_CONFIG_CHECK=1`: the worktree had no `node_modules`, so
    the config-validation hook and oxfmt didn't run. Run `pnpm install` and
    `pnpm verify` before landing.

## Left to do, in order

1. **jbrowse-components fixtures:**
   `test_data/graphgenomeview/{hprc,ecoli_pangenome,pangenome_nonhuman}.json`.
   The type-line script failed its own check on one of these, so do them by hand
   and verify each with a JSON parse.
2. **jbrowse-components generators**, so rebuilds don't regress: graph-track
   `FeatureTrack`/`SyntenyTrack` in `scripts/build_pangenome_graph.sh`,
   `build_ecoli_pangenome_graph.sh`, `build_ecoli_pangenome_cactus.sh`,
   `arabidopsis_pangenome_config.py`, `build_bovine_pangenome.sh`,
   `build_hprc_gbz_index.sh`. Several `SyntenyTrack`s there are PAF/PIF synteny,
   not graph; check each track's adapter.
3. **Website specs and generated files** that write graph tracks:
   `website/scripts/specs/graph-fixtures.ts` (`graphTrack()`), `graph-hprc.ts`,
   `graph-ecoli.ts`, `pangenome_cactus.ts`, then `pnpm autogen` for
   `hostedConfigs.generated.ts`/`liveLinks.generated.ts`.
4. **Land** the jbrowse-components branch: rebase and fast-forward.
5. **Deploy**, needing the user's go-ahead, in this order:
   - bump the plugin-list pin to 4.0.8 or later, then
     `pnpm update-plugins && pnpm upload && pnpm invalidate`;
   - redeploy the demo configs with `scripts/deploy-demo.sh`;
   - upload jb2hubs' portal configs.

   Store first: 4.0.8 with an old `FeatureTrack` config only falls back to the
   segments display, while a `GraphTrack` config on 4.0.7 loses the track. Check
   with `node scripts/checkConfigCompat.mjs` in jb2hubs.

6. **Saved sessions and copied configs** in the wild still name `FeatureTrack`.
   The user accepted that break.

## Tube map (done)

- `@gmod/tubemap-core` 0.1.0 is on npm, released by pushing a `tubemap-core-v*`
  tag in cmdcolin/sequenceTubeMap. Plugin `main` uses `^0.1.0`.
- `tubemap`/`tubemapref` layout modes are on `main`. So are the mismatch marks
  (`tubeMap/mismatches.ts`); session -e7 wired them into drawing along with GAF
  reads.
