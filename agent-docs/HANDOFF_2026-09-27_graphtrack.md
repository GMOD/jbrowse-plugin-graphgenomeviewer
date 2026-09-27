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

- **jb2hubs**: the four portal configs (`752aea1`) are uploaded; live
  `jbrowse.org/pangenome/hprc-grch38/config.json` says `GraphTrack`. There
  `hprc_v2_1_gbz_lanes` stays a `SyntenyTrack` beside a `hprc_v2_1_gbz_graph`
  `GraphTrack`. The uncommitted `.*-uploaded.json` stamps belong to that upload.
- **jbrowse-components `main`** (local, not pushed) has `b551f14431` (demo
  configs) and `bbb3899f18` (fixtures, generators, website specs, doc fences,
  `liveLinks.generated.ts`). Every config whose adapter is
  `RgfaTabixAdapter`/`GbzBaseSyntenyAdapter` says `GraphTrack`, except carriage
  lanes (`ecoli_pggb_carriage`, `ecoli_cactus_carriage`, the tutorial's
  `graph_carriage`), which open a plain feature display and stay `FeatureTrack`.
  The demos' `hprc_v2_1_gbz_lanes` is a `GraphTrack`; the plugin's lanes display
  copy covers it.
- **Deployed 2026-09-27**: `hprc`, `hprc_multiway`, `ecoli_pangenome` and
  `arabidopsis_pangenome` under `jbrowse.org/demos/` are served byte-identical
  to the repo copies. `5530926383` regenerated `hostedConfigs.generated.ts` from
  them.

## Left to do

1. **Reshoot the graph figures** on the latest plugin. Session -41 was going to;
   it is no longer running.
2. **Saved sessions and copied configs** keep working: 4.0.9 still accepts
   `FeatureTrack` and `SyntenyTrack`.
