## [4.0.10](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v4.0.9...v4.0.10) (2026-09-27)

### Other Changes

- The tube map draws GAF reads aligned to the graph ([a4c8946](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/a4c8946dddd24cd56bcb9cb93d6b491da975c7f6))
- A GBZ graph track reads its GAF alignments into the tube map ([2847939](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/28479395efc4f005b53553de064c7442ec586610))
- The tube map paints its reads' mismatches ([7f51140](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/7f51140ee8717ce7467179ec92e799cee7f7ab26))
- GAF reads in the tube map ([0dee69b](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/0dee69bd2691d27f0e438fe3860560fae5aafa14))
- A GBZ track's GAF reads in a tube map track, on a port of its own ([a19da14](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/a19da142e8af199875e4101b06b475162e4c5bfb))
- The GraphTrack config migration, what is done and the deploy order ([c23e335](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/c23e3353848dab7d2c9980fc8660b5f5f48dbae7))
- Tube map reads, and what the GAF index still waits on ([01a7a4a](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/01a7a4adb8c753287a39f718d1dbd5c0d33ed18b))
- 4.0.9 reads both track shapes, so the configs can move in any order ([a4d6655](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/a4d66558b9c5f9c61305387963c27cb0abc3c1ab))
- GraphTrack, Add track for rGFA and gbz-base, and paint readiness ([6cd95c2](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/6cd95c22af68142210ca15aa4c169e4837e2df92))
- Fold layout-experiments.md into ADR-042 ([85fe286](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/85fe286e53d0c71b6739c927bb118c72c280e5e5))
- Fix the ordered width formula, tighten prose ([6f45534](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/6f45534193bc7e90c8a63e653417131be67fce0b))
- Pin the tube map exports BandageJS imports; drop clampZoom, which it no longer does ([490e79c](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/490e79cf663f1f5325ecda22ca8607d79075a1bf))
- Drop misc.md: the core-published export pin landed in 490e79c ([d72a62a](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/d72a62a151910550dd0ea9f9f4f7385e0e7347e7))
- Prune agent-docs of shipped handoffs; drop unused images ([5a19563](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/5a195632e57705e1238ad918fdd453e492812288))
- Fold the three GBZ docs into agent-docs/GBZ.md; trim the reads handoff ([eb5490f](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/eb5490fddde7ccb6498f2723b080b70240a80655))
- GraphTrack configs landed on jbrowse-components main; the demo deploy waits on a go-ahead ([b017dcd](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/b017dcdf2439c272cf55f162c5e8f556ce2a2f3b))
- The GraphTrack demo configs are deployed; figures remain ([b79f470](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/b79f470747111792f1fc2fb871130eecc0e6ac82))
- Add track recognises a graph file whose url carries a query string ([e2bc30e](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/e2bc30e09197a8b33087adc0bad635a91112f999))
- Paint readiness keys on one stamp: the build record on the canvas ([2b70d3f](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/2b70d3f58e957be04b4c5c2aba585084be2d8f2b))
- Force layout e2e waits for app-ready, not the stats line ([d444399](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/d444399c06883d973717921d699f432a5e37e360))
- Query-string urls, one paint stamp, and the served launch check ([addf58d](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/addf58d827b84e1d9f86a0739b159a8b8dbeddf5))
- Arrowheads sized by their edge and stopped at the node outline ([4becf67](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/4becf67a1b4581890e03323fa92aaff38c09294f))
- Self-loops sized in screen px from their node ([5b8c9f6](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/5b8c9f64e411bcef69238c381c1a7d471bbed6e6))
- Arrowheads lie along the curve they end, not its end tangent ([1c03d02](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/1c03d022adaa434514612134101dd88440d49087))
- Hairpin links draw as a teardrop off the end they name ([31b759d](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/31b759d3148f43c8afb86a31750ffd0b412f8b1b))
- A joint's arrowhead needs room on the node it leaves ([6f8fa25](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/6f8fa2590e16ec2e5e73a7036bea81a064b672e1))
- The force layout attaches a link at the ends its strands name ([ec10976](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/ec109762f5047f8a2a5e22f90907723eeadcf193))
- Arrowhead halo and pointed node ends, and what blocks them ([baa69ca](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/baa69ca2222c725993b670566f4040c49363077e))
- A gbz-base GraphTrack opens in synteny, dotplot and circular views ([482cf17](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/482cf1751446d05a9f65493ba27c1cbdca19c574))

## [4.0.9](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v4.0.8...v4.0.9) (2026-09-27)

### Other Changes

- Mismatch marks for tube map reads, in tube coordinates ([b5b7b08](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/b5b7b08413ff7b31511ebb263400a10961e6b817))
- The graph display registers for FeatureTrack and SyntenyTrack again, beside GraphTrack ([68e9c80](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/68e9c80e0a288200317a1065a8dfab001895fc86))

## [4.0.8](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v4.0.7...v4.0.8) (2026-09-27)

### Other Changes

- The gbz-base window cut is a core function the adapter and BandageJS share ([e3e05bc](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/e3e05bc2f68bd56c2b7e7b7029a1926d854a2653))
- Tube map layouts: sequenceTubeMap's drawing, on its own axis or the reference's ([14ff594](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/14ff59426742269070e394c75b04e75dfe43fb47))
- Trim the README to bullets, and the tube map docs with it ([1c675d4](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/1c675d482f8c2eb1c45acd10a3b59894f05ef8cb))
- Vendor @gmod/tubemap-core until it is on npm, and let the core entry draw tube maps ([a224ef2](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/a224ef2b908111a9c3ac283b8ca40242380c8a4f))
- One track type for rGFA and gbz-base, both openable through Add track ([036f617](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/036f617005f338bc160c9e0f821af66d1b90a13f))
- Restore e3e05bc..a224ef2, which the GraphTrack commit reverted ([511d5b6](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/511d5b68743b8f213698bb6c63b6b20636b45632))
- Graph readiness no longer shadows core's painted, and a tube map reads ready ([968ac66](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/968ac6691283a58917781ec8c86482ed89dc4329))
- Take @gmod/tubemap-core 0.1.0 from npm and drop the vendored build ([13091af](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/13091af1fb3379de747f206ffde20d02c8350475))
- The tube map's transform and box hit test are core functions ([89f13d8](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/89f13d8be8087c2afd7ac105ce413e907041afe4))
- The graph display lives on GraphTrack alone ([82b2ead](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/82b2ead0e4579e20d922652960b2ac0d6ef31d89))
- Viewport and zoom arithmetic are core functions, and core.test pins what BandageJS imports ([131b728](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/131b728cb44f77b7c528e5ff9ddbc7f2d23f990a))
- Depend on @testing-library/dom directly, so import-x resolves screen ([a60791e](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/a60791ebc2a3e16dc94a540d07b27e1c1ae3b459))
- A 4.0 pane entry is not reported as an unknown key, and the legend measures nothing once its track is closed ([f00ebc9](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/f00ebc9f279619e660ffefdeafb7c9eb045b9dc4))
- Drop an unused binding the lint gate rejects ([54dad76](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/54dad76a4e27dc160e1ec494e1938db8961fc07d))

## [4.0.7](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v4.0.6...v4.0.7) (2026-09-27)

### Other Changes

- Every label over the graph places from one occupancy, above all the ink ([d1ed651](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/d1ed6513216a95129e6014b604a40e2e672aa762))
- The legend reserves the box it measures, the variant map's names share the pass, and a scrolled row layout keeps its bubble names ([c68612f](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/c68612f729d41fb2fb8f7a8092786d0ece3ab410))
- Trim README to core ideas and two screenshots; move layouts, config and development to docs/ ([3be69c8](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/3be69c8acfbd78d34f816b601312b80eed45347f))
- One title per developing doc ([f58c673](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/f58c6733fe62f2977338cbdad782d20669144a2d))
- Tighten README and docs; fold configuration into the README's usage ([9f64a28](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/9f64a28b0fd48442df7fe8ec28f16c3ebde9a5f2))
- The graph pane is a mixin, the standalone view composes it, and a dead launch path goes ([6d16c3a](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/6d16c3a7e64f51eba127df19e13fcfcd995b4613))
- The graph display composes the pane instead of nesting it ([d1e133c](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/d1e133c9b7eef8bd191f007832df96969d4def33))
- The graph track owns its cut and reports its phase through core's chrome ([154c11f](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/154c11f4147cc489941a33bf47234d5a5df90858))
- The graph track refactor's state and next steps ([bc20245](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/bc202452212c8ea6f453969afed28c00506ad909))
- Review fixes to the graph track, and the e2e suite drives the track ([05776b4](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/05776b4fa5773cfcc28ad81841def0aea692cd52))
- The graph track design as composed, and what the refactor leaves ([19b27a1](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/19b27a1e3b76fece74d713121a089099e41ecd04))
- A bubble is a repeat array only where the repeat track has one ([f5fb3b4](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/f5fb3b4b98de728af0f4597b26d3c6d27594e367))
- What the repeat classifier asks of the hosted HPRC demo ([b55204a](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/b55204a613609253313bcfbe9818ed5e34fbb09c))
- Graph files open through Add track, as the graph display by default ([7a3081a](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/7a3081a3dcf2ee47639390f03d76f5b40953fde1))
- Lint ignores .claude, whose worktrees failed a release's preversion lint ([24d1cb7](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/24d1cb77ff740b7d508537ed6fa0df963e2df2f2))
- The graph's load, layout and fit are a pure pipeline, and src/core.ts is the viewer without JBrowse ([eabd71c](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/eabd71cfd6db7501c723279a9a99fad1246aabd5))
- The drawing's bounds, the hit test's ink and the resolved colour scheme are core functions ([e464e7b](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/e464e7b38bd639919583a7d728be522588a0d006))

## [4.0.6](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v4.0.5...v4.0.6) (2026-09-26)

### Other Changes

- Walk rows are cut to the window alone: the margin is the layout's, not the axis's ([65b15db](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/65b15dbf02f1a9ba444e0efd814a1b857692110d))

## [4.0.5](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v4.0.4...v4.0.5) (2026-09-26)

### Other Changes

- A cut never exceeds its cap, a held cut tolerates a base of rounding, and a linear view bands the hover of the graph pane in its own tracks ([05c105b](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/05c105b834fd22dad04d5960b5d0aa3f855712a8))

## [4.0.4](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v4.0.3...v4.0.4) (2026-09-26)

### Other Changes

- A layout that draws its own picture is cut to the window alone, the display says when it is loading, and the add-track form writes the graph display ([31df954](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/31df954f7d9bb65c8e475623e3bc8ae752baf5b1))

## [4.0.3](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v4.0.2...v4.0.3) (2026-09-26)

### Other Changes

- A GBZ track cuts for the lanes it names, the track menu carries the Repeat picker, and only force and ordered draw in their own coordinates ([c3962bf](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/c3962bfb2c31f22c212ad6d293c28a889b55aa6f))

## [4.0.2](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v4.0.1...v4.0.2) (2026-09-26)

### Other Changes

- A launch keeps the pane props it states and takes the rest from the config ([10766db](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/10766dbbd4b79cf3dd4a04794a59644c8b996da7))

## [4.0.1](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v4.0.0...v4.0.1) (2026-09-26)

### Other Changes

- A launch states the pane's props without its type and keeps them, and the display's root says its tier, layout and node count ([4753895](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/475389540ee21506993957b6fd436e68d37edcae))

## [4.0.0](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v3.1.0...v4.0.0) (2026-09-26)

### Other Changes

- The graph is a track: LinearGraphDisplay hosts the pane in a linear view, and the follow and the launch entries go ([10bebd2](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/10bebd2f29f132e288077fb0d8e67ca6c8f76844))
- The display starts the pane's host clocks on attach, and the candidate server serves the store's path ([060c079](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/060c079e7f1721fa553e87bc0f1401873da58d89))

## [3.1.0](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v3.0.5...v3.1.0) (2026-09-26)

### Other Changes

- Follow the linear view: a frame clock on its window, a settle clock that re-cuts past the margin ([0fb3c0e](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/0fb3c0e581f5dcdf473d5519ff327fb10fd7b210))
- Pin the follow's alignment at engage and under the fit button, and a y pan across a re-cut ([1d2976c](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/1d2976c9bec7e1e5a74adc694f6bf6c553b9eb56))
- Say in the toolbar whether the graph is following and why not, and offer the toggle ([64b621e](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/64b621e97e1a2bb854e22b7462f47f5018b338c4))
- Clear the follow's cap note on every settle, not only on a re-cut ([443e37b](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/443e37b224db71ef5c105f400f56f07b3059cf9a))
- Keep the follow off a GBZ cut, and say so ([b9e7a79](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/b9e7a792f40354d5ad809aff231adfe25a202eec))
- Say where f103 is rather than how far ([a17b55f](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/a17b55f53af11beb659e095fedf76a3ed35d2103))
- The coarse tier is the graph track's: RgfaTabixAdapter's `coarse` pair ([efcef9f](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/efcef9f3e61713275f6a932072738f13a210d04f))
- Keep the sample rows where they are across a follow's re-cut ([04b9522](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/04b95223c4aa98da89f4358793dbe34149a25fda))
- A graph launched from a linear view follows it ([8ada4ce](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/8ada4ce5d1e760d0ce4b0242f8084785f3a6f85d))
- The toolbar says Following or Pinned, and its one button is Pin or Follow ([e71c143](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/e71c1430345af55c35978673d15758404f6819b5))
- Record the follow as shipped, and point the tier idea at the adapter slot ([0ae2564](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/0ae256449fae67e6c61ba2a64207ac00c35c554f))
- Pin the coarse shorthand through the schema, not the bare normalizer ([655b3d8](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/655b3d8a4eca31e355059b7a271e24b5e78f9183))
- A launch that follows opens anchored, with force one click away behind Pin ([b9b36cc](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/b9b36cce6d7a720b0ee7c14f868f607058ba8744))
- Revert "Delete the lane-pair route: the adapter answers no pair, and no aligner runs" ([63b9e20](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/63b9e201c4f8507fd841e61f667d9e29e27ac4c9))
- A lane pair is the alignment the graph states: no base is compared ([169ec60](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/169ec600f3597117134083433b77c183707912a6))
- GBZ handoff: a lane pair is the alignment the graph states ([6a66212](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/6a66212d77e07790ccd68b43768f5add8f630429))
- A clipped record keeps its ops when the display asks: keepAlignment ([b45fa44](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/b45fa44b861393e01b5c425b8aa74a5ab8bcf33b))
- Bump deps ([f205d20](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/f205d2041b2ea085e1f02e0991aef513df57b787))
- Gbz-base ^2.8.0, which pairAlignments' bases: false needs ([9935a26](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/9935a264e9cf149a914b83700afde1952a71f65e))
- The host probe draws a force layout on every host, so the Bandage chunk is tested ([9ad7458](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/9ad7458bd73b75650ac11f465dc9fa789b088f54))

## [3.0.5](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v3.0.4...v3.0.5) (2026-09-26)

### Other Changes

- Retire betabuild.sh; README names the unpkg url ([393d7bd](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/393d7bd0811095feebca6775a4f011f2a4ca41c3))
- README names the unpkg url; drop the betabuild script entry ([62ea47b](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/62ea47b7ced0b388556bb3d4b24aefdefb5fab6b))
- Delete the lane-pair route: the adapter answers no pair, and no aligner runs ([f4b0a97](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/f4b0a9715829448138032d48433b6e90b914dc5d))
- Remove unused test helpers ([b89cbd9](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/b89cbd946162616f4341bb551c163139e64bfe30))

## [3.0.4](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v3.0.3...v3.0.4) (2026-09-24)

### Other Changes

- GBZ lanes answer two lanes aligned to each other, read inside the anchor window ([1a840f0](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/1a840f0b9deba1432f3169c2b731b8f1a46613f7))
- GBZ handoff: a lane pair on the anchor window answers directly ([ae7d5eb](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/ae7d5ebacd1d6b66b7cb5b1ff669430a1fa3d0b2))
- A lane pair cuts each reference fragment its window overlaps ([63ffc99](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/63ffc99f57925004166195e38f36f8ac08a2d80b))

## [3.0.3](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v3.0.2...v3.0.3) (2026-09-24)

### Other Changes

- Name the repository in package.json, and fetch the e2e host by url ([e3b1934](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/e3b1934d6f366aa5562f45205aba10c4ba47b1ae))

## [3.0.2](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v3.0.1...v3.0.2) (2026-09-24)

### Other Changes

- Switch to published npm versions for jbrowse dependencies ([ad55d4a](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/ad55d4afc59a451f439c1f31b7a8565e269ab7b2))
- Fix lint errors after switching to published jbrowse packages ([d0190c1](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/d0190c136bb0dd32f05e560a1a0b29b2122d2a69))
- Depend on jbrowse 5.0.0-beta.9, the first release whose RPC cancellation is an AbortSignal ([d8b5a40](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/d8b5a4073127c19debc403a1e3e51c9a93c818c6))
- Repair the tests the package switch left behind, and read a channel-shaped lane color back ([1427c05](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/1427c059c0bc8715f9e5beb9dcc9de73d6f5af25))
- Fix what the review turned up in the drawing: tiles, label midpoints, chip keys, walk rows, spare rows, bubble routes, links indexes ([f874417](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/f8744172cbf3843c2bc0d7997d3960e3ed1142d1))
- Drop what nothing reads and fold the copies into one ([f1f68dd](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/f1f68dd9e90e2a44b38e4eb714e698b979404c06))
- Boot the built bundle on hosted releases before a tag, and check against the published packages ([7e23fdd](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/7e23fdd6e4bf35542335a298c9498ac3507fbe04))
- Say what is true now: published deps, a beta.9 floor, six layouts, no host fallback ([1791658](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/1791658d618b3cbca81fcb2adba1e37ac0e84988))

## [3.0.1](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v3.0.0...v3.0.1) (2026-09-22)

### Other Changes

- Configure typos-cli to ignore technical terms and intentional misspellings ([f113f81](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/f113f813561aa9e9d92fd22d0fd8510378ada449))
- Enable e2e tests with stable jbrowse release (v4.3.0) ([8496428](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/8496428b6737fea15904c6a083d015c52c7ec8c9))
- Update e2e tests to use jbrowse v5.0.0-beta.8 ([2603c2a](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/2603c2a672c93d7349d2792051af8168ef5bfb6a))

## [3.0.0](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v1.0.0...v3.0.0) (2026-09-22)

### Other Changes

- Npm publish workflow: OIDC trusted publishing and git-cliff changelog generation ([de56536](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/de56536144d2a2eec33f3c7c10c7acb36638b1c0))
- Bump ([25c296e](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/25c296e9c038314d135ec1efb132b930379d521f))

# Changelog

All notable changes to this project are documented in this file.
