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
- The live demo configs match the repo copies apart from those type lines
  (checked 2026-09-27), so deploying them changes nothing else.

## Left to do

1. **Deploy**, with the user's go-ahead, from jbrowse-components:
   `scripts/deploy-demo.sh demos/<d>/config.json` for `hprc`, `hprc_multiway`,
   `ecoli_pangenome` and `arabidopsis_pangenome`.
2. **After the deploy**, `pnpm gen:hosted-configs` in `website/`:
   `hostedConfigs.generated.ts` fetches the live configs, so it still says
   `FeatureTrack`/`SyntenyTrack` until then.
3. **Reshoot the graph figures** on the latest plugin. Session -41 was going to;
   it is no longer running.
4. **Saved sessions and copied configs** keep working: 4.0.9 still accepts
   `FeatureTrack` and `SyntenyTrack`.
