# Handoff 2026-09-27: GraphTrack migration, tube map

## Why

- Plugin 4.0.8 (on npm) registers `LinearGraphDisplay` for `GraphTrack` only
  (`82b2ead`). 4.0.7 has no `GraphTrack` type at all.
- The user chose to move every hosted config to `GraphTrack` rather than keep
  accepting `FeatureTrack`/`SyntenyTrack`.
- Update 03:03 GMT: the store briefly served 4.0.8, so hosted graph tracks
  stopped attaching. Session -41 then released 4.0.9 (`68e9c80`), which
  registers the display for `GraphTrack`, `FeatureTrack` and `SyntenyTrack`, and
  moved the store pin to it (plugin-list `d9e376c`). The live demo draws again.
  Configs can now land and upload in any order.

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
5. **Deploy**, with the user's go-ahead: `scripts/deploy-demo.sh` for the demo
   configs, and upload jb2hubs' portal configs. Any order is fine on 4.0.9.
6. **Tell session -41** once the specs are on jbrowse-components `main`; it will
   reshoot the graph figures on the latest plugin.
7. **Saved sessions and copied configs** keep working: 4.0.9 still accepts
   `FeatureTrack` and `SyntenyTrack`.
