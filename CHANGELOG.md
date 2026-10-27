## [8.0.0](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/compare/v7.7.0...v8.0.0) (2026-10-27)

### Other Changes

- An rGFA track's add-track config hides its labels as label parts ([f57dd4d](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/f57dd4db05e51835f4b3fe533cf8cdd35cedbf15))
- Test configs, docs and figure specs write main's display spellings ([dfd6082](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/dfd6082fe1b6bd06c2a4c9b100e1d6c727de06ad))
- A facet orders its panels and walk-row sections by sort, as core's facet does ([5e4a26f](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/5e4a26f9dbae50341dec56a8f365ac825ebca293))
- Bundle render-core's shader modules instead of reading them from the host ([d5af255](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/d5af255090fe603eb5c152cf53265398c9d1c55f))
- Revert the shader-key filter in the host shim ([bf17f41](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/bf17f41c9562b7d33b1705b72d3b93b6e2675ba6))
- Require JBrowse 5.0.0-beta.18, reading session tracks as frozen entries ([bc0882f](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/bc0882fdb7db4cebbd57497f5acbe524d1833a14))

## [7.7.0](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/compare/v7.6.0...v7.7.0) (2026-10-26)

### Documentation

- A variant track of the founders' insertions over the walk rows ([82a87d4](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/82a87d473e586f3abdfe3711d9e5873508d79af9))

### Other Changes

- Move to bandage-core 11.17.0 ([05d66a8](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/05d66a8728e83f7e0e5738e84bf13106f2faaa5f))
- Key dashed deletion links and the faded drawing in core's words ([67e187c](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/67e187c98117f09077eac610095cd6b4dd6457e7))
- Keep a node width of frequency through the session's size ([09e81c9](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/09e81c94f0530f1c8b759d2b67e78339823df642))
- Draw the syng C4 figure as threads round the ring, as ggbandage does ([2cc4aff](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/2cc4aff5773be16f9ae085a11511edb27f1cfa63))
- Read a lifted walk in full where the walk file abridged it ([2decf1b](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/2decf1bbb2a1c5ba3ff8b05d0cd656d6f4dce1f4))
- Shoot the figures from the walk-file track, and pair four with ggbandage ([bb4d513](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/bb4d513c431eda0ca26f6c1f4ec05b98d01f30aa))
- Show the KIV-2 overlay in the gallery and haplotype docs, and note abridged walk rows ([417286b](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/417286b42b3eca72b23084a3d1309b96d16a053b))
- Box each maize founder's own TEs in its walk row, and key them as TEs ([1d27145](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/1d271450738afa2daf1a161dff803258007f1f2b))

## [7.6.0](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/compare/v7.5.0...v7.6.0) (2026-10-24)

### Other Changes

- Spell the graph track's node color as encoding.color ([2f2b020](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/2f2b0205be595d08d410c6cff51aa879cb26b88e))
- Write the graph track's color and the forms track's key as encoding.color in docs and figure specs ([c5d60e4](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/c5d60e445aac72e4696057ee054200fb7ad92c0d))
- Expect bandage-core 11.14.0's faded key in the exported SVG ([47c6613](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/47c661366dd130b5d19a61bf6806437698614261))
- Move to bandage-core 11.14.0 ([919feb1](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/919feb1fc4463a188e78c179dffff2bdb8f3096c))

## [7.5.0](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/compare/v7.4.4...v7.5.0) (2026-10-22)

### Other Changes

- Open a launched linear view with one gene track, not every FeatureTrack ([d5679d9](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/d5679d97a239177d0d5e8481731ebff6beff563a))
- Pan a bubble-label drag once, and never through a stale strip flag ([e36b1d8](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/e36b1d872f4d80f94f7d66355a051ad48d8c2b2d))
- Clamp the wheel zoom's frame gap at zero so a late wheel never zooms backwards ([54a86c7](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/54a86c7eaa6b8d8f226cff9ac2a5bb36de1a54ce))
- Cut again for whole walks only on a GBZ track, and never for a tube map ([4c722d9](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/4c722d9664749520311048110763b47c602909e7))
- Keep the node cap when walk rows or a tube map fall back to force ([fef57e1](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/fef57e1214782ff5b5b31b823180523fd80cc74a))
- Name a contig the graph lacks as such, and drop walk-file detail names ([e75e422](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/e75e4225861392b732f8d566775e4fa7c072aff5))
- Stop asking for a bubble index a graph lacks on every re-cut ([6404a23](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/6404a231e6dd4ee2f9a614a60b0c3d6de06c332f))
- Keep the haplotype field's focus when it applies its own change ([cd60578](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/cd6057884ed9dc65ed2411e2a6e29ba8c4d070c8))
- Land an abandoned morph's last frame, since the layout cache keeps it ([b86b0bc](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/b86b0bcb2abcec9c08b935b4b541677ffcad4731))
- Show a graph track's render error once, in the canvas banner ([00f41d4](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/00f41d4e499f0e4060b4174938f1daf0353e0e11))
- Don't open two haplotypes sharing a contig name on one bare-sample assembly ([9bc087b](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/9bc087b6975be2327c7abe35bd77a0f2312bff42))
- Ring and open a graph's bubble from a bubble or vg deconstruct record ([b8b9091](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/b8b90911bf94342c1d5acf3880b46cc9902d05c7))
- Band a hovered node on each haplotype's own assembly ([91e64a0](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/91e64a0046c1acdd8ac1d96330964a50e986576a))
- Drop a force layout aborted while it waited for the worker ([e88aed6](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/e88aed659420a736823273b5e134460b082ceb09))
- Lift the next lane row once the pointer settles on it ([057759b](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/057759b020189dec63d84fb25195bbcdc2c776ce))
- Test a tube-map bundle's path for the hovered box once, not per member ([3402f6b](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/3402f6b3fc7df9e4d09b54ec7ac3f6759cad4435))
- Draw each loaded haplotype's own genes on its nodes off the reference ([55c232e](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/55c232eb7d9e523a66da1f87c9c35e04bd97ebb4))
- Draw ribbons between neighbouring walk rows, as ggbandage does ([ff64d1c](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/ff64d1cb9e8f8696b8605acc57a3d2dcbb2d6b8d))
- Open a strain with no gene-looking track on its first feature track ([e4d3007](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/e4d3007f68e0c1efbdd247980b6cdf1c86e729da))
- Export the haplotypes' own genes with the figure, as the screen draws them ([09d2067](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/09d206775dd8d381c46dea5f5defbb2ba39e4706))
- Add a Link width setting that draws each link by the walks taking it ([c04533a](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/c04533afa41ad613da9510b30d3e4fc6cc9d8f7f))
- Letter shared blocks on walk rows, and order rows by shared sequence ([252981e](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/252981e53af864fdad5c5f94d4f181ab6c5521a7))
- Ignore a hover from a linear view other than the one a graph is paired with ([9247510](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/9247510f2cc9a5bda7d84f8ac5ef21834b517ed0))

## [7.4.4](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/compare/v7.4.3...v7.4.4) (2026-10-21)

### Other Changes

- Remove Copy figure spec and the spec embedded in exported SVGs ([421e825](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/421e825ce3f43f3b1928558f26b4b6d20420b76f))
- Drop the README tagline ([4afcee8](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/4afcee8cf3e3208741074c9281468f951817dfc1))
- Say the walk adapters read walk format 5, from gfa-to-tabix 1.4 ([ac17546](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/ac17546a037d7fe776d48927bbc3344ad2930610))
- Rename the walks4_ test fixtures walks5_, the format they hold ([e3b3f2b](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/e3b3f2b610c146e3f5c43a76eaba69ac3738fbe1))
- Give the syng example its own page and keep data.md to data setup ([cf5593b](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/cf5593b2a6c93aa5e86f9da4ac85301e9db2256b))
- Fold bubbles.md and genes.md into layouts.md ([86af8ef](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/86af8ef08836c863e77b3253c16479c4adf9b981))
- Fold test/README.md into developing.md's end-to-end section ([9ffa8ae](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/9ffa8aef816bb72b2145dab03c115f3eb1329fae))
- Reword the merged e2e notes around who does each thing ([0e97840](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/0e9784024eb3c22eccb8111e9c485b72d890f526))
- Keep the graph genome view qualifier on tube map genes ([08e62ab](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/08e62ab4074f038194cd9355401fdbb34aa0e1a2))
- Point two agent notes at the docs' new homes ([2747db5](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/2747db5f28dcab45a4ed08121d7607564a213cbb))
- Rewrap the two agent notes the link fixes lengthened ([3e0a288](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/3e0a2887f8ac87b4a2ed69531f820c0284c324cf))
- Require @jbrowse/graph-walks 4.1.0 for structural forms ([d130889](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/d130889c20de3521d1012616b2687510e346637a))
- Add WalkFormsAdapter: a walk file's structural forms as variant rows ([e67bd98](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/e67bd984a5246d58839ff679c100db895a4e6232))
- Document a structural forms track in data.md ([27f5988](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/27f5988cf0c0ad99a50a2b166b4498c51cbeb2d7))
- Cap forms at maxForms rows, label them short, bound the cut by bytes ([28f628c](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/28f628ca3c8dbd55ab7f116cfaf0f9e2cce99bc0))
- Document maxForms, walkByteBudget and the short labels in data.md ([ff59a6d](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/ff59a6dc17ba2b0190a5f70cb79ce5a190ae01cb))
- Install @jbrowse/graph-walks 4.1.0, and keep a test's marks in a site too wide to sum ([a828ae8](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/a828ae8523e20449613e0c1482a494f52615ac2a))
- Add a forms track menu: the pinned window, re-pin, and the floor ([8e93657](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/8e9365706565f0f04bc2584e26b9d02e5e3899b0))
- Pan, re-pin, floor and an over-budget re-pin on the LPA forms track ([d940690](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/d940690f916437d56d08c89bfdcee5bfb0385339))
- Draw a structural forms track at GSTM1 and find its menu ([512f9e1](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/512f9e1af739e14844f1de6200c2f4e51cb29503))
- Document the forms track menu and where a re-pin is kept ([461323d](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/461323d2979af14b1bc81e44d0ffc833f1e24336))
- Take bandage-core 11.9.0 ([a46e014](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/a46e014effaab39ef431fc62ee388a7d4dacde1a))
- Install @jbrowse/graph-walks 4.2.0: token labels, lopsided colours, whole expansion ([cfe0015](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/cfe001542746aaf43b32955de1d39b76ceedb051))
- Give a forms query with no change a reference placeholder, for core before beta.14 ([d83c51d](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/d83c51dbf120058c2ed929067bc9fc8a280ebbdc))
- Take a forms track's old warning toasts down when its forms change ([c7f5a45](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/c7f5a4535269e6424b718e98117a5d897d98756a))
- Document the forms track's token labels, whole expansion and window-named warnings ([2a4b787](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/2a4b787bddac9fc7aa127d8e0d3177dbadb3c86d))

## [7.4.3](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/compare/v7.4.2...v7.4.3) (2026-10-21)

### Other Changes

- Name each input file in the README and lead Quick start with a walk file ([ee5ec17](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/ee5ec1735e20a1f0c6fb3f066a7fc0791864b8fc))
- Swap the README's full-size screenshots for a card gallery and list maize.md ([7238103](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/7238103bc0f8b43a0a6d5c4530140bee720d4779))
- Lead data.md with walk files and drop the bandage-core 11.6.1 history ([8a12e9f](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/8a12e9f43e4b4463370a3604daf516fd4ae356f3))
- Open haplotypes.md on where walks come from, walk files first ([e3be369](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/e3be3690a60594900ab36771851aa0fe33bedd16))
- Give drawn things literal verbs and fragment captions a subject in the docs ([4ba3794](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/4ba3794183d8c21d7d5c85bd23fca6cf0b57aa7c))
- Take bandage-core 11.7.3 and fold a cut as a cut ([f6decc7](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/f6decc73eff5476dbece8a30ba46d6cd34cf0535))

## [7.4.2](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/compare/v7.4.1...v7.4.2) (2026-10-21)

### Other Changes

- Take bandage-core 11.7.1, which stops calling a window edge a deletion ([c7f1217](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/c7f1217fde7e22a169c8e760e1486b5eb1a58ad5))

## [7.4.1](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/compare/v7.4.0...v7.4.1) (2026-10-21)

### Other Changes

- Lanes load the walks they name in full where format 5 abridged them ([f56c3c1](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/f56c3c14bd22205bb2b5440dd1ead58c12df2ab1))

## [7.4.0](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/compare/v7.3.2...v7.4.0) (2026-10-21)

### Other Changes

- Forbid spread arguments ([e2f65a9](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/e2f65a9235ace329553c4728244f2bf2f9eef38c))
- Load an abridged walk in full from its walk row's context menu ([02bf042](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/02bf04209f5fa1f00885b8c5e13a84041516de79))
- Point examples at the format 5 HPRC walk files ([c035b4d](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/c035b4df1ff1e79cc44dfe12fa3a48b2af79e260))

## [7.3.2](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/compare/v7.3.1...v7.3.2) (2026-10-20)

### Other Changes

- Note why the linear track's segment-only read keeps the index two files ([60846f7](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/60846f7ec9970d2edf9d20c422d763e96a888b23))
- Name the node-only reader exactly: LinearBasicDisplay, not the linear track ([ea1b42f](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/ea1b42f7f42c94458a111b2dc4b63f72708d2ac8))
- Drop the comment that blamed LinearBasicDisplay for the two index files ([873678f](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/873678ffb446cea0cd34d07e5af8367f077863f8))
- Take bandage-core 11.6.1, and explain the syng C4 figure's colours ([5288d40](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/5288d403e9e980fc3020acf44b1b409b9b33ab2e))
- Take graph-walks 3.1, and give queryStart the window's refName and end ([86d6e5b](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/86d6e5b3502f5206ade1b98f6052cf488f94f112))

## [7.3.1](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/compare/v7.3.0...v7.3.1) (2026-10-20)

### Other Changes

- Demo a syng graph from impg at C4 ([19bd5df](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/19bd5df51fd179a36c5897d2302240bb6938415e))
- Explain the dashed loops in the syng C4 figure ([a996658](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/a996658ab3e62943b02757c32a0d1758cf048f81))
- Read walk format 4 with graph-walks 3.0.0 ([d742401](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/d7424016858c745bf87936bc3a5afe6d7b889369))
- Host probe reads synteny from the walk lane track ([6e78cc0](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/6e78cc0a840018c2d5ddd2690a5e639c57a3c92b))

## [7.3.0](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/compare/v7.2.1...v7.3.0) (2026-10-19)

### Other Changes

- A walk turned against the reference gains a reverse-strand record ([1a19e45](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/1a19e45ddd411707b14d5eeb21049d0cfd66d809))
- Prettier ([89da663](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/89da663c947f02ae11ac571d4e5190231ed89f93))

## [7.2.1](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/compare/v7.2.0...v7.2.1) (2026-10-18)

### Other Changes

- Move to bandage-core 11.2.0, whose gene pins also give each exon stretch as points ([49a16d0](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/49a16d059f6a8e41ad97eb452d644aab54cc7324))
- Cut segment indexes with graph-walks' rgfaCut, which moved there from here ([5f1e898](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/5f1e8987cc2e6864d3c78ffeba784ec828a0be73))
- Take walk-row runs from bandage-core's walkRowRuns, and drop the port ([72622fd](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/72622fd1e43ce4666cec7f87345089429518ee94))
- Key the reference ramp with one off-reference row, as bandage-core 11.4.0 paints it ([4273473](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/42734735cae9323da77e17611182d0c355bae5cb))
- Key the ramp's charcoal only where nodes take scheme colours ([d5599e5](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/d5599e5a26e2d78ad2af87c45ec8930d73454b3e))
- Move to bandage-core 11.4.0, which paints every node off the backbone charcoal ([7a325f3](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/7a325f303a9509ba3457b097c4b840445879e674))
- Reshoot walk_rows_kiv2, whose key names the charcoal once, and tube_map_micb without a stray tooltip ([c9832ef](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/c9832efab521ff0b7c40df94b2c74c0ce60eac11))

## [7.2.0](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/compare/v7.1.13...v7.2.0) (2026-10-17)

### Other Changes

- Reshoot figures on bandage-core 11 and the hosted config's phased callset track ([4ed0ebb](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/4ed0ebb9a065965c12c0f1cb005ad5a0f4839415))
- Shoot the KIV-2 walk rows on the position ramp, not uniform blue and purple ([1d9ec33](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/1d9ec33fcbf9f129c7985d14ffc0555b381cd61f))
- Show GSTM1's three routes a panel each, and use the MICB view and C4 grouped figures ([a7a04a7](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/a7a04a7ae4354e95b8b7eae54fa87475f2091ba3))
- Refit a hosted drawing when its height changes, so split tube maps start at the top ([332fc1a](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/332fc1a355a1436e7f0b0de2904f11f756b65b9d))
- Flag the graph display's color, size, layers, facet and rows as plot settings ([5cfd693](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/5cfd6934ae44091d82d16d6213f8400bf347ae20))

## [7.1.13](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/compare/v7.1.12...v7.1.13) (2026-10-17)

### Other Changes

- Lane zoom-in notices name how far to zoom, not a span wider than the view ([af51c8a](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/af51c8a3aa68e6d225da2aab3d11db8aadf6065d))
- Pin how an inversion between two lanes draws under each aligner ([1d421ed](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/1d421ed4fa0f418401dc3222d9d94db567a01d1d))
- Lane pairs align by weighted subsequence unless an inversion lies between them ([4e553be](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/4e553be50ec0e0f163ced9ca0d803949df9e0ec9))
- Lane pairs' aligner and its measured cost, and lane zoom notices ([1b4df45](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/1b4df450fc76afab02fe3ce767d7bbe16888b2cd))

## [7.1.12](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/compare/v7.1.11...v7.1.12) (2026-10-17)

### Other Changes

- Clipped synteny pieces carry the recordId of the record they were cut from ([a84486a](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/a84486afe1c9d7724615e5aac2016bdb8abeb1c7))

## [7.1.11](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/compare/v7.1.10...v7.1.11) (2026-10-16)

### Other Changes

- Bump deps ([536b843](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/536b84396f0cdcb229a08e51b8a75342392c42ad))
- Status chrome hands each overlay model props and plain props ([8d5f951](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/8d5f951dfde7c7d458967e1619fd16a9ad18cd2b))

## [7.1.10](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/compare/v7.1.9...v7.1.10) (2026-10-16)

### Other Changes

- Name what each walk-row gap leaves out, and read walk format 3 ([a6c0ae4](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/a6c0ae4a9505bdb08701cd0964683829c5482a02))
- Depend on graph-walks 2.0.0 and bandage-core 11.0.0 ([3aaa2a6](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/3aaa2a6ea82e553c1bf7dfff4c291420982dca53))

## [7.1.9](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/compare/v7.1.8...v7.1.9) (2026-10-15)

### Other Changes

- Keep a GFA opened by URL in the saved session ([7c5c60c](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/7c5c60ce3a720cdf14ce464f6e3b26643f22f34d))
- Read a GFA and a samples TSV through the session's internet accounts ([c91690f](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/c91690fc70c62dff4dabb5bc95532e23c8926cbd))
- Let go of the drawn geometry and any morph when a graph is dropped ([b263885](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/b26388591fd6ec8f64626e8a86252f4863d8911e))
- Give a walk-indexed rGFA track's cut the session's PanSN aliases ([21576c1](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/21576c1a6901051bdb9e3d30f668544c7b5a43cf))
- Use tabix's own chunk cache size for graph files ([5ffaa3b](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/5ffaa3b0c672f733bbfef140954234c5bc3e2d79))
- Name the Graph context select for screen readers; wrap a narrow toolbar ([810ee35](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/810ee35eda66e122843f1196b2c3f0bd965536b4))
- Keep the walk strip's tip in the pane and its hover off the whole strip ([b47563e](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/b47563ebdbfd7f4e362b842810a7daaac0026e6c))
- Read gzipped GFAs, and show a picked file's read as part of the load ([0dd3498](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/0dd349828d9bf5cdbbd5700f753505911148dbd1))
- Read a cut's annotations alongside its layout, not after it ([77f4280](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/77f428031748e33cc642d7c93611ca576a31e1f9))
- Report an unmapped PanSN prefix on the segments and bubbles tracks ([ebc586f](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/ebc586fa41fdf450de806cfc4bb65ff62bdf618f))
- Label the add-track name field, and show the manifest read on Submit ([90b2d96](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/90b2d96d093cfe5e37d3a5109d4d05fdff58b2b3))
- Keep the tube map key's transform-free parts cached through a pan ([e2928a3](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/e2928a34b646a53aa183a22b4076130aac84c123))
- Look up a session track in one place; correct comments that drifted ([abe3c68](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/abe3c680157c0e89fca969c9de34aa909b7a4653))
- Let the keyboard open and close bubbles ([bfced0d](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/bfced0dfc429a9c8ef19256601da79c2a71ac4b8))
- Add a gfa-to-tabix walk file as a graph track ([9a36f6c](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/9a36f6ca96e8d4ad6fb6fdd5ce286e367a745f26))
- Commit a typed haplotype on blur without MUI's autoSelect ([cc62605](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/cc6260525945f2b3953835e9ea49a211e69088b1))
- Raise the unmapped-prefix error only where every name is PanSN ([e08de46](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/e08de46f3e400d1ccd40aabbe399bdba05201390))
- Fall back to the automatic track pick when the saved one is gone ([5f69e48](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/5f69e488c32dbedc13990b52c2249de02793fe99))
- Leave the status line to the load that replaced a superseded one ([373b6c1](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/373b6c1477c19ce37e2a6c79bcadbd7b96ae7162))
- Drop a name taken from a cleared GFA with the GFA ([b806694](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/b806694424c209a891182eb3bb4b6b1a0c7b1230))

## [7.1.8](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/compare/v7.1.7...v7.1.8) (2026-10-15)

### Other Changes

- Show loading while a restored view waits on its assembly; let a lone track be picked ([e3b41e1](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/e3b41e15c26ead575df331712353ffe993c35c25))
- Keep a typed haplotype on blur; keep haplotype names across assembly changes ([b7b1be6](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/b7b1be654735982e03180158cffc08e6f549c7a7))
- Leave a linear view of its own reference out of a graph track's launches ([2dbdeeb](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/2dbdeebc2fc7a56247917af3d572e5d8fd942098))
- Keep highlighted walks a picker can't list when it sets the highlight ([01be3f2](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/01be3f217e8693c594816f1fb2ac5db02789abe9))
- Format GraphSettingsDialog and WalkSelect ([edc3eae](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/edc3eae3c44fafd3e7bd7bfbe639d58113a9e6ab))
- Repaint the pane when the device pixel ratio changes ([b2b686f](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/b2b686fad7611724635682f32e9437bcd568673f))
- Type the launch test's labels as strings, for tsconfig.test.json ([fa2ad9c](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/fa2ad9c5ba6d941652c4e8dbe740b064d479e47a))
- Say why the track's Graph genome view launch is disabled ([57f97a6](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/57f97a6b22e9cfcaf874f4bfe54442142563ab8f))
- Label the toolbar's colours as the menu does; build repeat options once ([a108504](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/a108504cfedab1e308153b87992a4cfa0fd61e61))
- Launch synteny views through launchView alone ([5b83d9c](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/5b83d9ca91d4a2e0a65a190e93eed2c23f853e1d))
- Keep pan frames and row hovers from rebuilding overlays that didn't change ([2031c65](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/2031c65493ef5cc210cc6cea56513a5a5e46e42a))
- Ease wheel zoom, drag from bubble labels, and scroll the view from the strip ([a4e7af9](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/a4e7af99069851d4d86c617b09a33444cb4b8c75))
- Let the linear view drive a force-layout track's drag and zoom ([484088a](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/484088a7d86fc1fcab06b3ae91fb2ecc5a678cde))

## [7.1.7](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/compare/v7.1.6...v7.1.7) (2026-10-15)

### Other Changes

- Follow the linear view's wheel rules on a graph track, and pinch to zoom ([ca96562](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/ca9656266418fe0af010863e4a9f7e087c9cc93e))
- Show a move cursor over a node a press would drag ([0aea6ba](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/0aea6ba1da981983473a812e774ff163e31e478c))

## [7.1.6](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/compare/v7.1.5...v7.1.6) (2026-10-15)

### Other Changes

- Keep a self-panning graph track's drag and wheel from moving the linear view ([97b017f](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/97b017fab5ee516c6dfb146d69cb566e80175910))
- Type the second-finger test's model as a record, for tsconfig.test.json ([6ed71fa](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/6ed71fa50b1599b4db5f2b6a4f9036b75e0dd6a7))

## [7.1.5](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/compare/v7.1.4...v7.1.5) (2026-10-14)

### Other Changes

- Depend on bandage-core 10.2.7, which keeps a two-part walk name ([9068eb9](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/9068eb98094f802f2dce1dab40575970994450a8))
- Close the SVG export check: vector and raster match 7.1.1's ([5a8ea50](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/5a8ea509597597b0d4e62a76fb026f4ace79dae2))

## [7.1.4](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/compare/v7.1.3...v7.1.4) (2026-10-14)

### Other Changes

- Keep a graph view's region by canonical assembly and refName ([154af4a](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/154af4a22c3ad8b74a5f2e8fc76d393d7d7286bc))
- Send lane adapters canonical assembly names ([563c37e](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/563c37e6cd1457acd37bc8d0512c9c8adf324242))
- Drop a recut's graph when a stop lands before its layout ([37a1d34](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/37a1d344e39ed7ef4cdc4a1d8738819956f78945))
- Grey an open bubble's surroundings in the SVG export too ([adadb57](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/adadb576a24f25811445512cdf1c8cfcba4c6445))
- Measure the legend only at rest, and again on returning to rest ([7157425](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/715742553e7508af08bce656a79bea6b516e2005))
- Give the dense-chunk walk-file test its own 60 s timeout ([0a657fc](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/0a657fc24a0d02475c35e82f9cfed787e9891d78))
- End the strip hover before the bubble legend grows in the hover e2e ([a69f1e9](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/a69f1e9454b5e8a26ae41bde8ea130b97a6f8137))
- Trim preversion to what can change after CI, and publish.yml's no-ops ([94f0e09](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/94f0e09f3fc650b0706a04b07de6f8b56794aca8))
- Drop setPaneHeight and highlightInLinearView's return value, which only tests used ([eadfedd](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/eadfedd3dd00eb22ed7de0d2bd3ae8d95f605497))
- Colour walk-row hsl() runs with bandage-core's hslToRgb ([fe47e6c](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/fe47e6c3f9d9ffda5548b9daf6e49f5b39225436))
- Move the morph gate and frame loop into morph.ts ([abf9842](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/abf9842ccaf36ce955a10ca8426f1d20e8d49564))

## [7.1.3](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/compare/v7.1.2...v7.1.3) (2026-10-14)

### Other Changes

- File the review's skipped cleanups and open items ([52c3734](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/52c3734b879528f65292f36c49723dc15c8338ff))
- File the review's open bugs as todos and its remaining cleanups ([5f30eae](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/5f30eae24940dbd854ba1a43994ad32c7ef579f7))
- Lint against tsconfig.test.json and drop tsconfig.eslint.json ([786be27](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/786be27a3a0d6c30fd00970a61964cf19dd9f6a0))
- Move isNodeLimitError out of the display into src/nodeLimitError.ts ([453a2a1](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/453a2a130bbfd054c1bdcfbe2c1e87c3d40304e5))
- Correct three comments on lane pairs, lane-offering adapters and subgraph cutters ([62bfe9b](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/62bfe9bbe65d6da3066024e773bc959e63865df6))
- Draw the screen legend's swatches with the SVG export's SvgSwatch ([1610e76](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/1610e76a7c25cd9671d4e894985fb1b4bf0dc4f5))

## [7.1.2](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/compare/v7.1.1...v7.1.2) (2026-10-14)

### Other Changes

- Skip a missing genotype instead of calling it reference ([aeaac2e](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/aeaac2e1a33d5240968d2488ceeb2f0ac545f146))
- Give a phased allele to one walk of its haplotype ([2579a7a](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/2579a7a3ec1db9e6f5ddef0740ee094395aefe51))
- Group walk rows by sample without copying the list per row ([61dc3ab](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/61dc3abd6116a14aad82f39ddaa560e4e1ac3ded))
- Share the feature accessor and track lookup of genes and repeats ([38d0854](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/38d0854c86f87098141746dd37b2498ae0d7e8fe))
- Pack walk row colours with bandage-core's packAbgr ([f8990b9](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/f8990b9ca25cee11ee9cd8797fdf54840d3207e2))
- Measure the longest walk row once per span cut, not per repaint ([74a3ced](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/74a3ced983e93dbf8d0805b422fe89eb51ba9532))
- Read graph layer settings through the shared isRecord ([1312d1f](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/1312d1f0428be9595a2a34f12977caf26486f805))
- Group walk rows and tube map panels by column through one helper ([ae3d18e](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/ae3d18ef3a84c3e46b95fd871e9834a160c1b40c))
- Build the tube, read and faded legend rows from one helper each ([65cba8e](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/65cba8e27e16a9202161b92c3ac176c2fe059589))
- Write the ramp key's bp in en-US whatever the viewer's locale ([ccd2e9c](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/ccd2e9c47c157d697095745aaae284293da33a70))
- Stop exporting names only their own module uses ([7011bd8](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/7011bd8817759ad4c32550fb41643cfd8b2fbc4e))
- Push the release commit and its tag atomically ([1882d6b](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/1882d6be062a181b5d62257530ef855a7bb45eed))
- Drop vitest shims the suite no longer needs ([5972d57](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/5972d5769e2a6e8547b2a2d94c448b8bdcfee2c2))
- Keep shooting figures after one fails ([76583a5](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/76583a5083fd2103149a56a6ffda360ef17d794c))
- Fail host-compat when the candidate bundle was never served ([5cbf676](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/5cbf67641f90c9900adf8e887369801bc6fa8b68))
- Read supported hosts from scripts/host-names ([76a5cd9](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/76a5cd9d8f43658a47f01b90691936b00f4ed08d))
- Share browser launch and readiness waits in hostedBrowser.mjs ([9a7867f](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/9a7867ff6c5af3a60e5a88aba08210b6eede7342))
- Drop the explicit Chrome install from CI ([acabb5f](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/acabb5f35b9eaa8e567052d9193c6b9b6a6501f6))
- Remove dead config and document preview-candidate ([646b262](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/646b262731af9b7a550b55a2e959e038fe1ec2b4))
- Fail the build on a namespace import of a name the host lacks ([b208b09](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/b208b094825a22c2bda23eb65fdf43b25706f903))
- Keep a reference walk with a two-part name when haplotypes are filtered ([4adef12](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/4adef125a18029d4fc4a8cc6da36f498ac5a42be))
- Group walk rows by the walk's whole name ([08ccd55](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/08ccd5511657e711c771e3e035608f395f21fd2b))
- Label walkRowLayoutOf's rows with bandage-core's walkRowLabels ([6314d9d](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/6314d9db0bb5edffa491a0031a6e32b6f1a50e6b))
- Leave a walk-indexed graph's nodes past the window out of its features ([9c45a5f](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/9c45a5fe7ead8e6f1c7456dc78347ff07a20aa22))
- Run dump-subgraph.ts on the adapter's own cut ([a4aa855](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/a4aa8551c2ba14876ca234588730b41bfc09bc7e))
- Open MinigraphBubbleAdapter's file in field initializers ([0072c43](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/0072c4384e84c9f8c829d4dde7788f0e704b63ff))
- Share the walk-indexed cut between the two walk-file adapters ([3a3abdb](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/3a3abdb0877dd21d2b6371f4db9be25f686a70c3))
- Estimate the tabix graph adapters' region bytes for the byte gate ([54d6e11](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/54d6e1117768d43741bc60b106c9aa08e12bd10d))
- Let AdapterType take the shorthand from each schema's preprocessor ([1b09963](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/1b09963d05972abd22f1da818380982deef3eb71))
- Share the walksUri shorthand and file slot helper across schemas ([8fafbae](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/8fafbae1641284f4a223ef0a4d8d95aeaa631619))
- Write walk lanes' CIGAR with gbz-base's pairCigar ([d054a74](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/d054a74da0e15801db2b3893e9cace54f80e2e05))
- Drop header fields and exports that only tests read ([0e056ce](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/0e056ce8099fabb8185ef6bb01d792a1deac69b6))
- Mark every backbone span needed without a set of all held ids ([f78f57f](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/f78f57ffe5049aa0ae9be4387b095a39b3d50cc8))
- Build both synteny adapters' pair records with one matchFeature ([95e14fb](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/95e14fb8b57468f1e4bf95682a191fd92653e45b))
- Name gfa-to-tabix as the actor in the walk and link filing comments ([35f42af](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/35f42af50998a0d28d26ed17e3c524e0716f264b))
- Leave a split tube map's boxes to the colour scheme beside reads ([c9ff209](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/c9ff209c902beb139cd45076ab5294fba1c32d88))
- Choose a tube map's tube colouring in one place ([26842c0](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/26842c04a552b8f1501dd6d1daf7f1352c4665fc))
- Keep a lane row's hover from redrawing a split tube map's panels ([9bd7ee5](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/9bd7ee5bd0b8f497f123b98f40ec61dcd80281e5))
- Share one reference ramp between the nodes and the lanes ([86e700a](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/86e700a017200a69f551f48c2a60b76d29c49936))
- Offer a track configured on an alias of the cut's assembly ([20570b5](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/20570b598d806df750f60b38014d44b66cc3df82))
- Read the pane transform from one view ([34437df](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/34437df6c711093a7276a360863241fbb713a553))
- Hold the fit's pads and usable height in views ([13e1d36](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/13e1d368d8d3334016be05ae9b720a6d0bf9e690))
- Place a walk row on its contig in one helper ([9ed862a](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/9ed862a479519a7cc10f91d2406621e4e5e30328))
- Work out the figure spec once per SVG export ([aa9d1f0](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/aa9d1f0fafe07670f05480e13f80c056416797ab))
- Drop the rowLabels view and the KEEP_IN_VIEW_PX export ([0ad9ba9](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/0ad9ba9949e1c0defc31efd22e892287d9211abd))
- Share the pane views' repeated lookups ([aa00b4a](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/aa00b4a6aa03c682ee3e49ced1372ac8eef3017c))
- Stop re-cutting on every pan below 0.05 bp per pixel ([1e4b2ff](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/1e4b2ff38de8c32e5d07bfb4555ec4713e1ee8b5))
- Keep an outrun cut from narrowing the refused window ([d364c3b](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/d364c3bcccd3ea8dd8e1e43f9f00656967eba2e4))
- Re-cut the window on screen when a setting changes after a refused cut ([152bc7e](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/152bc7ed710c7d870235248e9c3fe1b531fddb1a))
- Export the graph pane model directly ([357d13a](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/357d13a990cbee0c0147211c40cd1b559abc208a))
- Read the track display's adapter and track from the pane ([6b0c916](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/6b0c91692979112e36fdb3a3cb44563ab9444d6d))
- Share the cut options between the graph view and the track display ([b3cf793](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/b3cf79380f48e9f89ee57f20157029641dca7dfc))
- Match a track's reference to the window's assembly through aliases ([19481a3](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/19481a339fca90ce42b4f7e8a7e03dbf6d098c85))
- Carry every pane setting into the graph view a track opens ([4e3ddc5](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/4e3ddc5c5b8b1e128b32216bc9845562f86efdbb))
- Forget the index location when Add track's file type changes ([427d7de](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/427d7de26e8b9984784d58da1f8045d7bf49b83e))
- Abort a track's haplotype name read when it is superseded or removed ([6cb76ff](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/6cb76ffa8250dd792c16e84670279a217b23ae99))
- Look up an RPC method's adapter in one helper ([df04869](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/df0486991427ccfa72f9c435914c0da560b4709b))
- Name the files beside a segments BED in one place ([8300825](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/83008258ccf82ad1523ff74812dc69bcb78a0a9e))
- Drop dead types and fields around the track display and launches ([ed3df32](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/ed3df321614810ef85f134d682068241fc3aeb5e))
- Clear a declined graph's stale drawing ([787de8e](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/787de8ebbd540559a034e0e1ffae1fa50563d471))
- Keep the spinner up for a layout that replaced a load's ([080f288](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/080f288061bd95baab40acd47ddd6bd60d2d725e))
- Lay out again on any engine setting or node cap change ([da7e2f2](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/da7e2f22376e52308088d46f816b636ee001a2b7))
- Read annotation features through one helper ([512a50e](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/512a50e90da702ff22536ed89b5e8fe68b364f9f))
- Run both loads through one lifecycle helper ([0696597](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/069659793ecb49cf4b37a6e35e00a960861cd5c9))
- Read a declared file's annotations inside its load ([d82af5e](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/d82af5eb3dff2c0368037c9c1321ae8304d72b52))
- Reset a cut's state in one place, and drop the layout's with it ([7f989d8](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/7f989d8810d941d79d6f53449409843549f080b6))
- Clear the pane's hover with one action ([831417a](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/831417a7dc45177af05a61e040023e344de202f4))
- Build the radio submenus through one helper ([e7712e3](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/e7712e330a0c21c50ff785755f0868786c1b4290))
- Toggle the Show menu's layers through setLayer ([be6e00d](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/be6e00d62203b200cb3faff12faa43c6e7dcffbd))
- Drop a status that never paints and a cache clear that does nothing ([62ffc63](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/62ffc63814ded93522694e77c56d3353970d1c2f))
- Put uriOf's comment on uriOf ([a130a41](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/a130a419bfdbf7b187f40a99908e5417c06819ef))
- Drop a test's stale node-limit step ([a3ebea5](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/a3ebea5a8908f2d8c859e12b9d493e7166353cae))
- Tighten three comments around the load and hover helpers ([300a891](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/300a8913e2e5539dc7ac8a1bab48170f3a82d252))
- Read the morph's transforms and the hosted fit's pads from shared views ([84314e5](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/84314e55a525533a3efb90f31f00be4830ea79bb))
- Move the tube map's views out of fitViews into their own stage ([2555b25](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/2555b25c4fa03669fd181dfaa6a5b83e9c356a95))
- Name an unnamed repeat's locus in en-US digits in every locale ([544147e](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/544147e5aba3515260aba8743ec34ca5a2243f3b))
- Give TEST_JBROWSE_VERSION's default as beta13, as setup.ts has it ([9da6ca2](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/9da6ca283ccb10b31e6740743ba3803c0018008b))
- Set the e2e track's layers through setLayer ([458e38a](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/458e38aaf682d9c6d0c6c1ba66ee88c845add378))
- Read every piece of a cut's reference walk as the reference in walkRowRuns ([1834416](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/1834416e16c9bd1059ba3d0040464bc8e61efc8a))
- Keep a gene or repeat read from landing over the track picked after it ([9b062e2](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/9b062e2109020258b08d8fc01c01dd1248848335))
- Take walk-file naming, the keep filter and budgets from graph-walks ([f139504](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/f1395043d53c156a1284416e9de7b5351f30c1e6))
- Use bandage-core's regionLabel in place of the identical locLabel ([5caa75c](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/5caa75c602e3af58dab836bacdf6180e04dd0078))
- Drop the darkMode view and the dark branches it never took ([5d23de2](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/5d23de28a0d1be1150050de246884a80a45fcbe0))
- Share one overlay canvas and one SVG layer across the pane's overlays ([6a9763e](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/6a9763e5b8925aedc25023da5bd7b2bebc98f8a0))
- Read out one hover tooltip, not a tube's and a walk row's at one spot ([74f0254](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/74f02543fec94c2507b366c98c5b524a986c8359))
- Open the node and walk-row menus through core's ContextMenu ([8515a1f](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/8515a1f63a3c601f4e3b405d6de992d381a08f69))
- Give SettingSelect a caption slot, as SettingSwitch has ([fb9e87a](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/fb9e87a746b6cd6deb7d712ac94ce33c8a48ddb0))
- Queue the graph settings dialog through the session ([c624ee5](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/c624ee5b11ca6c02d2f30332a5f853e4f026777c))
- Clear the pending hover every frame, and hit-test in pane px ([27abd05](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/27abd057bc87f4d46a0d566d846c9e679f3efeec))
- Place row labels and walk-row marks through toScreen ([be3a79d](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/be3a79d3de4dc7cacf81d2b623a570c50b94d3c2))
- Set up PaneSvg's renderer once for raster and vector ([446993e](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/446993eed3aa5a40d0f584694e690f51fd7eb562))
- Return the pane canvas's pointer style from usePaneGestures ([f6ef264](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/f6ef264903749ab860e7a0499956076365a57cef))
- Share one SVG-safe useId, and import EXON_COLOR from bandage-core ([a8ee84b](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/a8ee84bf349045ce435a092ee54c87b57e004711))
- Trim small duplications in the legend, chips, toolbar and SVG export ([8899b0b](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/8899b0b066ce9875de3c23c70f6aa09a585e5398))
- Resize facet panels inside their autoruns, keeping the renderers ([8c93cef](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/8c93cef4facc6554ca18b398d56fe6452545ee53))
- Move walkRowTrees beside sectionPlacement in walkRowGroups ([880124d](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/880124d3c97d44340a7851d3b09f9faeadbcf01f))
- Depend on bandage-core 10.2.6, whose walk rows find a split or tagged reference ([2fcb118](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/2fcb11897d31a9e243c3c5346fb581e25f05baad))

## [7.1.1](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/compare/v7.1.0...v7.1.1) (2026-10-14)

### Other Changes

- Organize see also ([0eb5fb5](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/0eb5fb541a094c1d5cf918b5d21815d2bb1fe263))
- Bump deps ([da2837b](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/da2837b9a50a8cbf7af3fb6df5f0e51c442c272e))
- Triage agent-docs todos ([140feba](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/140feba4eba01f125e4483e3891910789c0c1d1b))
- File ideas by what they now wait on ([dd86dce](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/dd86dce9210829bfc0ce57060e3cf696daa26f9e))
- Bump @jbrowse/bandage-core to 10.2.5 ([be80de1](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/be80de180bf4ffc5738040cf0b9ab19840f8e7a2))

## [7.1.0](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/compare/v7.0.0...v7.1.0) (2026-10-12)

### Other Changes

- Update bandage-core to 10.2.3 ([381faf6](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/381faf684d213deb2e1d8eefe2bb0e142a3e0a5a))
- Pare README and docs, split layouts.md into topic files ([ab200d2](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/ab200d23bacc4b13f208e4a88450ac54bfdd1488))
- Order the README as quick start then docs; move Export to layouts ([584f5c1](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/584f5c114cc5b6a1c5a3e3f9cdc5bfadb984d73d))
- Drop the maize page from the README index ([f4c20a2](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/f4c20a2285d05edccfb08dcb9d43b2cbf822bd38))
- Match Arrange menu labels in docs ([ccfadb6](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/ccfadb6a6a3e1add666f88b8d3da8e69b26526d9))
- Drop route chips, which bandage-core no longer places ([fedee4e](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/fedee4e56aacf8c5f73b28187524fa239172fa81))
- Bump @jbrowse/bandage-core to 10.2.4 ([ff3572b](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/ff3572b655e16d8f4df723fd40d22dbecec12f6a))
- Track menu: force-directed once per engine (FMMM, stress) ([79a43bb](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/79a43bbf26b44c23c7fff5286579fa0c895ae947))
- Track menu: name the engine in the Layout header ([5592502](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/55925029527f48c26f73a6080e627f2983e4e063))
- Format docs; add a pre-push hook for the fast CI checks ([c64596e](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/c64596e8cfdae1e9f8fec4d197dea6f46d8acc5c))

## [7.0.0](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/compare/v6.27.0...v7.0.0) (2026-10-12)

### Other Changes

- Read walk files with @jbrowse/graph-walks, walk format 2 only ([c786390](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/c78639099de1d9cbcac987cb83b1831faf6fc0b9))
- Point the walk-lane example at the hosted format 2 file ([7fc6858](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/7fc6858eaf991a67280490f3ee3d9787e96e2a70))

## [6.27.0](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/compare/v6.26.1...v6.27.0) (2026-10-12)

### Other Changes

- Faceted pane keys its faded grey on a line under the panels ([5593dcf](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/5593dcfbb9fbbf67ec43ee004d3c8cdbff531eb0))
- A track's "Force-directed" layout runs the stress engine's placement ([990e5a2](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/990e5a21d383f9f7ed63134a4549cb36ad1fd1e4))
- Prettier on the force-label item and its row ([a0849b9](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/a0849b9878bb4eed8a078a4ab105fb777cc7bc6a))
- Graph track launches pair with its host and carry its layout settings ([99647fa](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/99647fa468d878a6b2648c52d3f790184a67afe3))
- A click on empty canvas deselects without closing open bubbles ([6c4d047](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/6c4d047476e2eb82934aa1cb5f3a85b83acc9474))
- Gene and route chips read out in the hover tooltip; legend takes the pointer ([a521031](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/a521031c66e94fc45e68ace27fcb8d1da1ede8c5))
- A repeat-named track is never the gene track unless named ([7c09c4d](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/7c09c4d7600b08a6319bb214dfc6cb00e1f119ed))
- The too-large chrome keeps the track's test id and data attributes ([2f5709e](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/2f5709e8ad385329d2cdd7c505dcb1e38d791f2b))
- Settings hide what the cut or engine ignores ([72502b0](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/72502b06d3903285a057566b69440ed5f56fd296))
- One trackAssemblies helper for the three session track scans ([c30ca0b](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/c30ca0b83c915ce57069bcb13523f5330681c68b))
- Cut the launch types' history comments to their one-line why ([d2e460e](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/d2e460ed64fefbfd203de5741f3699b3030e530c))
- Walk row spans paint from an autorun keyed on the model ([c8b2683](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/c8b26830c168499ffa8ca35b8d5805e8877fc7db))
- Walk strip tip renders from the model's strip hover; key drops its prose ([82ef1d6](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/82ef1d62bd4a1c3a79cdda81d08ae7a7433d84ab))
- Name graphManifest's array-rejecting record test isPlainRecord ([6bd3015](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/6bd3015e5c4e357b28c329911f70f530fc092276))
- One walkSubgraph cuts a walk-indexed window for both walk adapters ([e16f85f](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/e16f85fb65bae78df486b3b4276cdbc737219609))
- One tabix index schema and tbiBeside serve the four tabix adapters ([57c190a](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/57c190ad43c10028f01dc33d74ec34c90ee0a366))
- LocationIsSet and snapshotNamesFile answer whether a file slot is set ([5b0dc2e](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/5b0dc2e80d23d24239de1b8df36f0beac5033468))
- SEGMENTS_SUFFIX lives in locationName.ts, imported where it was private ([0a5255f](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/0a5255fe85daad6a89f42d11f5e8e3edd837b649))
- One laneAssemblyName in lanePairs.ts names a haplotype's lane ([06e185a](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/06e185a431e932c17de3af02775307ece7f78824))
- Step notice names the walkStepBudget slot and the 8x a read may hold ([b6fbe12](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/b6fbe122b2986499c0da9697fb89cae7a60dc44d))
- A walk cut on a signal already aborted throws before reading ([f585a08](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/f585a0834980ab09b066089e7b0e177e9583ce20))
- TabixRange.ts moves to src/ and guards the bubble adapter's reads too ([133a4ec](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/133a4ecb5b4521d5a61a2a368a24ef63d85b74ce))
- Walk-indexed getFeatures drops lookback nodes that end before the window ([5168226](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/5168226d4b1c0f8fc093c869551c48ef8420f535))
- Walk-indexed lane tracks learn the session's PanSN aliases too ([08851d9](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/08851d9b9645bbb2f33dc3bd12a1fa445af70cf7))
- Prune GBZ adapter exports nothing imports, and a check its caller makes ([d44d90f](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/d44d90f2ef699be8ba8bed4c78b37720c19776a0))
- Cliff.toml links compare and commit urls to GMOD's repo ([f7e47d3](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/f7e47d3da5b2cf76914f02063f85ef72960c5308))
- Bring reroot_maf.py beside the E. coli build script that runs it ([dc17572](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/dc175721a64ef2feb5d45b058c67f3640bcda6e2))
- Host-name scripts find themselves with fileURLToPath ([37a902c](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/37a902c3095fed93e0fbc9c1b8b4c7e16c1aed6a))
- Host-compat probes 5.0.0-beta.11 again, the floor the README promises ([9ecab19](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/9ecab1913b639576ba07ee7bceb4d54dac6a0dd5))
- An aborted cut leaves the fold note and reads count of the graph on screen ([1578721](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/1578721c6cf27df364395d728c7b95b613cdf0c9))
- Clear the tube, row walks, strip and pointer hovers with the rest ([f338607](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/f3386070bdcb359894bf526d45aaefca2ca1ccde))
- DrawsNodes reads the mode that drew the layout on screen ([3d171a3](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/3d171a3ac7a22b812df311ce56c4364a4441690f))
- A tube map fold relayouts through the reaction its routes and panels use ([d9e7a43](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/d9e7a439828c7f35cdd7da4723c660a60e2a18fe))
- Retry a samples TSV that failed, and drop the table with the graph ([96c4f99](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/96c4f990a130559c070f4121c03dcbde34674576))
- Only the force run the live layout waits on writes the status line ([714e017](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/714e01791faaa5efd4694cae9b923b25cd8124a1))
- One hostBpFrame for the host's bp frame, one fitRoom for the fit's height ([bfb9cff](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/bfb9cffeb312d4bb476106e37757b3e0f01e6ce0))
- Node launch targets and details read nodeSpan ([bbb923f](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/bbb923f9dc603c76624b7598f7ebaf67ca5bb55b))
- Genes and repeats load and reload through one annotation loader ([2daeb95](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/2daeb9531e9296e7ee5dcf45bb49520b864b90c6))
- Delete canAnchorLayout and setFacetColumns, which only tests read ([acc76b9](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/acc76b99c219d9aecf32a3a130ef9853470b406c))
- Move dropGraph's comment from wholeGraph onto dropGraph ([f3aba5c](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/f3aba5c0d41663a1b1608808b8373dea150af0d9))
- A stated colour domain survives a switch to another scheme and back ([abed671](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/abed6711131eba082afc3c8b5b6b210081ce8893))
- CI runs once per PR, pins typos and pnpm 11 everywhere ([60111f7](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/60111f77c4fab6c3848d897a9b7527e4e59a3de0))
- Figure scripts skip too-large tracks; one build script; strip reads hostBpFrame ([2d317ce](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/2d317cef6190f243706de54f6792a2991a344f3e))
- Lint the release scripts; drop three unused devDependencies ([c8d49e7](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/c8d49e7f8c148d6e599fd7ffcaee3c3f24afea9d))
- RGFA tests narrow a cut to GFA text before reading it as a string ([28ce646](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/28ce646a25524949dfc83d5ff43702ef9796fd10))
- Adapter and RPC tests type their spies and fixtures instead of casting ([e1f95f0](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/e1f95f0b4c6c4a5fbce052ba53c1ccd31fbee634))
- View, display and e2e tests type what they read instead of inferring any ([5eef2a1](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/5eef2a1dfef03a4d8c451f6637effcca4e17b6a8))
- Tests runs in preversion and CI; eslint's program sees vitest's globals ([e851f43](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/e851f436036f259a7724931739fb92fd93766598))
- Take @jbrowse/tubemap-core 1.1.0 through bandage-core ([6ad20e9](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/6ad20e97420d84f5a70dbc9f2eb819fbbc07808d))
- Read gfa-to-tabix's walk format 2: one walk file of ref, nodes, route and walk rows ([c5f28fe](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/c5f28feada6b8b1bcd3ddbcafa3909e5fa28646e))
- Take @jbrowse/bandage-core 10.2.2 ([5777c96](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/5777c960d7d35fca8d735289ec4452706b39cf51))
- Bump deps ([819715d](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/819715de3544f2da6faf9ffd016eac9eab6788ca))
- Prettier-format GRAPH_TRACK.md ([52ac2ca](https://github.com/GMOD/jbrowse-plugin-graphgenomeviewer/commit/52ac2cadfa0a847ddc0d59a195e501ce31a4b0ea))

## [6.26.1](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v6.26.0...v6.26.1) (2026-10-11)

### Documentation

- MaizeGDB's NAM founder graph at Zm00001eb332160, three launch links ([579d9ca](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/579d9ca451efafd2d67ced634743f7452c95717c))
- B73 chr8:1-450kb, its genes and TEs, and the NAM clip and full graphs ([eb82517](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/eb82517f74920bd7cc75c478ea7a3b4ebb75e44f))
- The chr8 rebuild's founder lengths, clip vs full and force layout, and Tzi8 lifted in MaizeGDB's GFA ([3c9c030](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/3c9c0305efacdb8603635bb139f428b4e8e403d4))

### Other Changes

- The stress engine draws anchored graphs by placement alone ([9b71b4e](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/9b71b4e53586ca750adea77fcb1a447c7d12f9bb))
- Link × link, seed independence, and the early-shipped caption ([2ba5b79](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/2ba5b7949be9b8a54758ed8793c4a5d1ebb553ee))
- The placement follow-up and the view's engine default ([a02abc6](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/a02abc644e2a391a4fc00a3f6fef975c28966c28))
- The placement commits of the review round, as a table ([ec7fc64](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/ec7fc64df67b813b207ac9a36622541087cc0b5e))
- Updates ([bc850d1](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/bc850d1ca796914e2e8f5e9dccdff6a5fbe0e19f))
- One panel of left-aligned keys, ramp as bar plus start-end (length) ([8b67f27](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/8b67f2703dd6c570f61748c6cc675786f1eb5ed0))
- Aligned bars per section, muted notes, shorter strip and halo rows ([20ca860](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/20ca8606b388687bc05bbfff7a5960a2e647ee0b))
- 'Graph settings...' with a help tip listing its contents, rocket on Launch ([79eed2f](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/79eed2fe642bdedc2ded8f998a50eae894b17487))
- Reshoot every figure for the one-panel legend ([5007c25](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/5007c25fcd6ff54895f793120e42cfb73e60c19b))
- Graph settings: Subgraph, Drawing and Force-directed layout groups ([17b7882](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/17b7882b477cbe8d752a4b127993afb84a0e0b3b))
- Layout menu: 'Force-directed' like its heading, not 'Force-directed layout' ([57d853e](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/57d853e83409589d52643e83945621e149db5abe))
- Maize NAM recipe: pass Toil a --maxMemory ([13d6792](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/13d679240357c706b066eaaadc906564b0bfb1de))
- Maize NAM recipe: run cactus in a memory-capped systemd scope ([82e962d](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/82e962dce18e2082eaf421068deb8b287daf6294))
- A fold of a fold closely matches a single fold, not exactly ([a84e609](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/a84e609efebe642456ef3f41303ba436677c2110))
- Rewrap the fold paragraph for prettier ([1fa0d9c](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/1fa0d9cf9b036201020e34dc2cd3280484f2ba75))
- Tube map beside tinted boxes: grey role tubes keyed reference and haplotype ([155ec1d](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/155ec1d91f4a4f9cb92d5aac544a4a768c6f341a))
- One list of rows drawn by both the screen and the SVG export ([7c9f49f](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/7c9f49f5bb750230e1ad9cf09815bfe0dbe84f6c))
- Terser tube map and strip rows ([2e7e804](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/2e7e8048c69fa96b42b8cdc715e7fcb4943d0517))
- Hover tooltip moves beside a legend that reaches its corner ([3a26bd2](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/3a26bd2475dfaa2e3e8c2a6af2b2915a1db15baa))
- Legend review fixes: grey role key beside reads, facet tooltip, read marks named ([3e6488a](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/3e6488a0a00706df5d553eb7a719124089c675d3))
- Reshoot figures for the shared legend rows and grey role tubes ([2b7497f](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/2b7497f9655b2a58f7fba8d38bdbe2359539b4eb))

## [6.26.0](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v6.25.0...v6.26.0) (2026-10-11)

### Other Changes

- Build a Minigraph-Cactus graph of B73 and the 25 NAM founders over chr8:1-1.6Mb ([23526a9](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/23526a9542a2c314b0d60ec9300bacf02afb3a4e))
- Cut each NAM founder slice at the end of its collinear chain with B73 ([50abfa4](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/50abfa4a2bfe7a4bd1d34c9dd211d63520f1ea43))
- Build a whole maize chromosome, or a window of it, under docker or singularity ([4edb173](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/4edb17310c855dc5eaf9091030b2f279afd575b2))
- Serve fixture byte ranges whatever case the Range header arrives in ([3adcd3c](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/3adcd3cfa48af5c0e64ef2e4cd96ffdc0b34dbed))
- Run cactus-pangenome natively where installed, else its docker image ([b3e9a4d](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/b3e9a4d473c758609e880a1c2abb50676f0a6757))
- Bump @jbrowse/bandage-core to 10.1.0, for vg fragment path names and sub-kb walk-row deltas ([e408fdd](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/e408fdd8709573d7fcfa2a1cf329c7f56b72085a))
- Let typos read NAM, the maize founder panel ([2295863](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/2295863065c513a0be00b97449fe11721def7fea))

## [6.25.0](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v6.24.1...v6.25.0) (2026-10-10)

### Other Changes

- Point the fold and index references at bandage-fold and gfa-to-tabix ([6f88713](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/6f8871340c70f3da59fc06c14a99ecae99006b33))
- The paths and bubbles commands ([a91095b](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/a91095ba61854cb5bb5586ee741ce3dc0e41d4f9))
- Point the fold references at gfa-to-tabix fold ([47830ba](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/47830ba396ecfa61a840a05ec1757cd747dd0c6b))
- Read the graph.json manifest in Add pangenome graph track; coarse.foldBelowBp ([81aea67](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/81aea674bfd5029e384046baafb41f5f23c12143))
- Gfa-to-tabix build replaces the script ([1539985](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/1539985479889ef48001b8f69c8dc8eaa19bd361))

## [6.24.1](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v6.24.0...v6.24.1) (2026-10-10)

### Other Changes

- Update README.md ([68b5997](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/68b59977a46dd9a390b2d4e9da347f9804e38eff))
- GBZ cuts cross as tables built from gbz-base's typed arrays ([35a82ad](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/35a82adf565d74139e7c3dd02d191112b26504d0))
- Link the do-it-yourself tutorials and outline the data formats and tools ([4254ae4](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/4254ae40840c001f096b4535c52f01c468b5865b))
- README's see-also lists the graph repos and pangenome tutorials ([a7ba21e](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/a7ba21eac6413974560339c476e0aeeb34f95e1c))
- README's see-also leaves the tutorials to the list at the top ([66bba7c](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/66bba7c327f192f25f33625f2c532ba884a325c4))
- Data formats as a list, not a table; fix the coarse tier script name ([7ed5aad](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/7ed5aadf3b72a79b199fe47af675bb970cadc1d3))
- GBZ walk rows cross as runs, as walk-file cuts' do ([0c60ca2](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/0c60ca206c0d04f2d3c2aad503cd5b6461db8884))
- The alleles command; name the fold tier script in two comments ([3c3997b](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/3c3997bf4000bfa0e18122ffcc632ebda51cf5ea))
- Drop the rGFA index script; gfa-to-tabix writes the index ([3d363fb](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/3d363fb5d3445f4ed967a340c7b0ec1ba5103be9))
- Bubble file sources, reflowed ([41db0b0](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/41db0b050a28d274bd49aa6a1d46f8b56b1ee7df))
- Bump @jbrowse/bandage-core to 10.0.1, for walkRows read by node index ([cb8d3a0](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/cb8d3a0a59af1ff84b02bb1994f1e7ec0924ba07))

## [6.24.0](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v6.23.0...v6.24.0) (2026-10-10)

### Other Changes

- A panel's hover counts the bp under the pointer, not a whole merged run ([8dd869b](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/8dd869bb5baa7014a3dbdcadff677b3d618fc73e))
- Shoot-figures --compare keeps an unchanged figure's file ([146ec23](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/146ec23f7d2c999575b242cd7c3d9559afb0f693))
- TubeMapReads e2e no longer writes the reads figure's frame ([c625e33](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/c625e335fa5caab02e67dd58f4d810673d1940bb))
- A reference-axis tube map labels the long boxes it squeezes with their length ([9e6d4bd](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/9e6d4bdafb26a35aa538cc86b7543fe0c4243a5c))
- Figure watch: a weekly reshoot of img/ uploading what moved ([87d2f70](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/87d2f7017155dcaecb6af85043864b82e9049acb))
- The squeezed boxes' length labels ([28571c1](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/28571c1f6e871b687c152c32a63195c4cd5123dc))
- Bump @jbrowse/bandage-core to 9.10.0, for force-laid nodes that bend as curves ([76dfa6e](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/76dfa6ef16cbf141546fa3ded83eb1a5dd88fe8c))
- Reshoot the tube map figures on bandage-core 9.9.2's curves ([9a3ce7a](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/9a3ce7acf2009ba5a6333a368907dd468bd6547d))

## [6.23.0](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v6.22.1...v6.23.0) (2026-10-10)

### Other Changes

- Reshoot on bandage-core 9.8.1: unbroken tubes at the C4 hover and the reads ([873f4ad](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/873f4ad0cc7536cc1cb9ac16402e83c62953d018))
- What a re-cut brings in fades in with its links as it moves ([68e5d72](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/68e5d72b59b9062741edc88811c2f149861b089d))
- Format morph.test.ts ([e1aa17c](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/e1aa17cebec40cee27d7dde9c46e33536a9ae7cb))
- Bump @jbrowse/bandage-core to 9.9.1, for steep tubes that keep their width ([9a4ff18](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/9a4ff1823e26f4eed19307fcb06f1af1f5572e7e))

## [6.22.1](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v6.22.0...v6.22.1) (2026-10-10)

### Other Changes

- Every figure in img/ is a spec in shoot-figures.mjs ([7586116](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/758611650d940cad3e3c265e8d646f77dd91250c))
- Bump @jbrowse/bandage-core to 9.8.1, for unbroken tubes on the reference axis ([d311ed6](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/d311ed6dec57b066e822dbb523338c881b890832))
- A text cut crosses from the worker as tables ([68db630](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/68db630a609f694925c066d3406927ce6cdcdd2a))
- A morph cut short finishes its cached layout; new nodes attach as the renderer does ([e3d579d](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/e3d579d81e4373629bee4eed3b5c4f8d7b83a6ab))
- Host-compat reads a gbz-base track into a synteny view ([bfb0f29](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/bfb0f290e38d4f9e9cd01dc27d679ad2f0035ea6))
- Force_gstm1_walk on a 260 px track, its caption naming the chord over GSTM1 ([56fd207](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/56fd2073215ef8abe9f16fb6dd5d6074b6752bac))
- Shoot-figures --compare: changed pixels per figure, and an old | new | diff strip ([9c751e7](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/9c751e7adbfa1b5bb5c4d1b17a9674edfb747f80))
- Panel figures over CFHR3-CFHR1 instead of GSTM1 ([13e59e9](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/13e59e9a6e18db0e82f7a09cdcf760f68cdd9155))
- The thin tubes named, and the one-copy route hovered ([ccf8b3a](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/ccf8b3a02f4e62e0937ad5b50a5ffabdef0b120d))

## [6.22.0](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v6.21.0...v6.22.0) (2026-10-10)

### Other Changes

- Tube map routes figures over C4's RCCX module instead of GSTM1 ([a2c2e96](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/a2c2e96f37a0fc3349c280dc37624249f83b8a67))
- A bubble's label opens it in place instead of cutting it out ([d0475d2](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/d0475d213ef90c61180a02f197351754fd2edc4f))
- Bump @jbrowse/bandage-core to 9.8.0, for an open bubble's focus ([65d4d14](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/65d4d14835ef893a16fe8aeb67ff48cb9db8ab5f))
- A node new to a re-cut starts at the mean of where its links attach ([657f37d](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/657f37d3ec085fea08288ee8e2f1bae8fcf71d58))
- A re-cut landing mid-morph starts from where the drawing is ([ae04a4b](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/ae04a4bf15055fa2b64230bcd0f080288e6acf1a))
- Gbz-base windows at fractional bp read the whole bp around them ([fc23912](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/fc239127e34952e27d45bf6eb2617a137fb1b194))
- Reshoot every figure on main; captions follow the track's stress drawing ([b12ed69](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/b12ed6917fe57c61e216a8b67ce8ba0e0c706716))

## [6.21.0](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v6.20.1...v6.21.0) (2026-10-10)

### Other Changes

- A re-cut or relayout slides the drawing from where it was to where it lands ([66bde2b](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/66bde2b5488b287f89e82f62625025b7879df8c9))
- A morph moves deletion routes with their nodes, and a slow frame delays it rather than skipping it ([9363a6e](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/9363a6e173701f79449c52498dbafac7337fb58e))
- A force drawing follows the linear view at once, stretched as a screen map, until its re-cut lands ([dde1aac](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/dde1aac798962f61d65d9d91b245407df162e425))
- Layout → Routes: a tube per route, as wide as the haplotypes taking it ([a4a6e0f](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/a4a6e0f219619ec36e8936bbfc0facbadbdd0c85))
- Tube color by a sample table column, and routes grouped without merging ([407bd0d](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/407bd0df1e491c99be8193e63064f6e980608393))
- Bump @jbrowse/bandage-core to 9.7.0; docs and figures for routes and tube colour ([27679ea](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/27679ea0af2af28eb73520fce031c40e23ebc496))

## [6.20.1](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v6.20.0...v6.20.1) (2026-10-10)

### Other Changes

- Bump @jbrowse/bandage-core to 9.6.0 ([c2bb2a9](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/c2bb2a9973a343c345dd83213b6db036b8cf1c05))

## [6.20.0](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v6.19.0...v6.20.0) (2026-10-10)

### Other Changes

- Reshoot the popped KIV-2 figure: the array names itself again above its copies ([96df326](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/96df3264fcacff1e2a77b94dce45f6c8eedf12af))
- A graph track lays out with the stress engine, so a zoom re-cut keeps its drawing ([da080a3](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/da080a38ffbb5eb10ba3788da81b4e36f133c72c))

## [6.19.0](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v6.18.1...v6.19.0) (2026-10-10)

### Other Changes

- Tube map tubes by role where no key names a hue per walk ([a54483a](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/a54483abc74a4f472a2752a13a9d661a23ef6024))
- The bubble the drawing is keeps its name, without the click to reopen it ([5ced7d3](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/5ced7d308db253777b8ff4b10c7434e1fe2533d9))
- Bump @jbrowse/bandage-core to 9.4.0 ([f2a9c89](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/f2a9c892eb1a2e6773f5455ef35dede06f899b4c))

## [6.18.1](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v6.18.0...v6.18.1) (2026-10-10)

### Other Changes

- The legend states the fold whenever one applies ([2fe5753](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/2fe575319337368fa950e0e55ad6aeee2aa500bc))
- Tube maps split into a panel per sample or per haplotype ([79b9f3d](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/79b9f3df25348de221882247664703deb84a0cff))
- A ruler under the last on the reference axis, titles only where they fit ([0f9c70f](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/0f9c70f4cf198a4e6e3573ab90f7ac24796ab03a))
- Tube map panels by a sample table column, and a count per panel on hover ([262edaa](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/262edaa3a1a47ff2cd15d77e9b86001254bfa6b8))
- Test against the latest release, 5.0.0-beta.13, not beta.11 ([8500c7c](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/8500c7c8d1fbe3f8da066bb4d364e830314672bd))

## [6.18.0](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v6.17.0...v6.18.0) (2026-10-10)

### Other Changes

- GPU note: the tube map with reads is inside a frame budget ([f99ccbe](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/f99ccbeed54dd3fdc403295ea6f7eafc668e0738))
- Reshoot the popped KIV-2 figure, its copies now bubbles of their own ([b457d80](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/b457d801a7e6df05c22d02ec022b916921dea069))
- The track folds each cut by its zoom, and the coarse tier is the same fold ([169fcc7](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/169fcc7a30f83c17a877056c84dbf8ab2fa96b86))
- Bump @jbrowse/bandage-core to 9.2.0 ([c5932ab](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/c5932ab1bcdfcd505590b2bd9fc4107cda66cfc5))
- A coarse cut hops as a fine one does, and the fold is a whole bp ([4c44e2f](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/4c44e2f8b586acb29f3de6ec64c9e2311c80b7a1))
- Small variants draw as ticks: a hover names one, a click opens it ([3f4ef32](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/3f4ef32ddfe026f62d5de8382a0cfa815184a136))
- Ticks are rects, so a pointer and a test both find their box ([40b34ab](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/40b34abb89e7812f1bcf182b2b9472131140a0fb))
- Bump @jbrowse/bandage-core to 9.3.0 ([4c4bb27](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/4c4bb277ee750878053fadf865b0a3471f31bb20))

## [6.17.0](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v6.16.0...v6.17.0) (2026-10-10)

### Other Changes

- Hover paints on a canvas of its own ([36015e9](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/36015e9619ec5c7de598c63d9dd973720c3a9c87))
- Tube map legend keys compare by value ([84bd74a](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/84bd74a6b1d32ae06a4fb7b5a00e5aa159e187ec))
- Bump @jbrowse/bandage-core to 9.1.0 ([70e52a8](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/70e52a853b94103ae3090640ac9c8ac6c9d0ea44))
- Pops descend: a bubble that is the whole drawing opens into its superbubbles ([bcafa69](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/bcafa6918b6d632b19939952acd09bfd1ccc5a79))

## [6.16.0](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v6.15.0...v6.16.0) (2026-10-10)

### Other Changes

- Rejoin parity on the hosted 0.6.0 walk files, amylase's leftovers counted ([da0291d](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/da0291dbe808a0003e22a6a8a52cc216cbda49c2))
- A window edge inside the amylase array has no parity yardstick ([8a42c4f](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/8a42c4f267577792b1c1b45a489cb809c568096b))
- Tube map reads the graph its boxes address ([31eb53b](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/31eb53b86633ac192f551feb194af6ec17676cfa))
- Hovering a tube names its haplotype, or its read's MAPQ and strand ([d648a5d](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/d648a5d3d208fcffed376fa1a7ee22e7a7902f0f))
- Pass the tube map drawing to referenceBoxes and deviationMarks ([206f413](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/206f413b300d1dd5f726e9915edbfbd8cbc319df))
- Bump @jbrowse/bandage-core to 9.0.0 ([9555433](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/95554330864580276b01449de6159c7820a56fcd))
- Walk lanes import gbz-base's alignment subpaths, leaving its database reader out ([b7be33d](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/b7be33d168a28c8b2e3b724c533e30204512c7f4))

## [6.15.0](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v6.14.0...v6.15.0) (2026-10-09)

### Other Changes

- Only a hovered node highlights by default ([ef61501](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/ef61501877fb5b83826e794793a6ec92817e44b2))
- Hover setting reads as a Show... item; GRAPH_TRACK notes it ([6367f38](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/6367f38effec1ea1176bda1080ad89d316590a3b))
- Hover highlight is one submenu: Off, Nodes, Everything ([d5ab5e3](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/d5ab5e3b97fc62c99778d64c7a677aa340149063))
- Hover is one enum slot: off, nodes, everything ([5297c60](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/5297c605ec6c4575c963dbe89d4924561dfc42ce))
- The graph's paper follows the host theme ([f1a0c79](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/f1a0c79f1d3543355d7578e38d33db8029395c48))
- A track's layout, color and hover are config slots; color is an object ([58d6cd4](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/58d6cd42ee51d38def32306ede451b65e75630e0))
- Drop the old-spelling lifts and the 4.0/5.x display shims ([ec2225f](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/ec2225f672666c8b026d6660412402f80a8a7a9b))
- Node thickness is one size slot ([cf8838b](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/cf8838bc188047aa49b7ae75f50ff57809ee2d00))
- The drawing's extras are one layers list ([19244c1](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/19244c177e465f0746c7587c3bd73e28af55f0bf))
- One facet splits panels or walk-row sections; rows names the kept samples ([7d2b621](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/7d2b62183260edb074452da3ea601aecf1d6f491))
- Layers state only what differs from the defaults ([281053e](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/281053e75b9af50f3589eeecf70403d8bbb4fe2f))
- Fixes from review: layout from any writer redraws; facet clears its own half ([5d85e6f](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/5d85e6f3505bb1e57da2b24b172cb9afabc946d1))

## [6.14.0](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v6.13.0...v6.14.0) (2026-10-09)

### Other Changes

- A walk leaving the window is followed to where it rejoins the reference ([45f8de7](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/45f8de7e2afbbe5b9cc58d6938f8fa1bc4002da1))
- Walk-file rows say why a partial walk stops, as bandage-core 8.2.0's do ([a0dc4ee](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/a0dc4ee699ff79ee799e4781f50655928d78c12d))
- A walk that does not rejoin is kept through the steps off the reference the read holds ([0a3d854](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/0a3d854074113be37b8dddc3127c89827d4d46f2))
- A walk rejoining past the context measures whole from walk files ([0c14a01](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/0c14a01b6c94a07888acead5813fcb8817cb8ded))
- A walk the read cuts off is read on to the chunk its row says it goes on in ([04cd036](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/04cd0368e04ea0e47f3135bbaaa9904d5eec42a8))
- Walks followed to where they rejoin, and the neighbour-tag follow, measured ([e8b5766](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/e8b5766d1de86a9ef76128942a0eaf123fac13c2))
- Bump deps ([af89a7e](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/af89a7e3fe9c4755d0f185f74bf2ccafa85c28e8))

## [6.13.0](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v6.12.0...v6.13.0) (2026-10-09)

### Other Changes

- Walk rows as spans, runs from the worker ([8355cae](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/8355cae8131f75a73d60613e1d9b9727920dd0dd))
- Walk rows take their runs from the worker and skip the step budget ([d7fc010](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/d7fc0103bbfee86c3648de07310b963926e4056d))
- Walk rows paint their runs as spans through render-core's spanMark ([ab4f7ac](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/ab4f7ac257e6924310f23003565c9d3aede4ef47))
- Walk rows as spans, with the measurements ([84798b3](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/84798b38b566b87e1ad3a68834405524176aca0e))
- Name a walk-file cut's reference walk, so walk keys measure against it ([00cb6b5](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/00cb6b583656a0636c05a5e4daef73bf893d7a07))
- A walk reaching one flank measures from it, not from the cut's start ([628f27c](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/628f27c56ed8fe2dbfc30b687b73a37316abc9e0))

## [6.12.0](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v6.11.0...v6.12.0) (2026-10-09)

### Other Changes

- Walk lanes align to the reference by heaviest common subsequence, as gbz-base does ([b171772](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/b17177226520a8bd8cf81318aa74f75c4604e6f4))
- The walk step budget bounds the steps a cut keeps, and rows are read to eight times it ([9dbfd9a](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/9dbfd9aa10f6f8d74cb922c97bf0743fdbab1b48))
- How lanes align to the reference, the kept-step budget, and both routes at the tutorial figures' loci ([47db26f](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/47db26f1c27c81b3c711eed42fec331275781b40))
- Depend on @gmod/gbz-base 7.3.0, which exports weightedLcs ([9ce4a11](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/9ce4a11f2f7b00cc9abff404a5a97001e43eccdf))

## [6.11.0](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v6.10.0...v6.11.0) (2026-10-09)

### Other Changes

- Move the walk-indexed cut's reads into WalkReader, which can leave the link file unread ([14354ed](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/14354edd2b875704f6f4f5f5819c5090135d9f53))
- Haplotype lanes and lane pairs from a walk-indexed graph's files ([cc120a3](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/cc120a352b41200443349ce1f0750b38a2c693d1))
- Test walk lanes against gbz-base on chr22, and tidy lint ([7fb559f](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/7fb559f10d4600c49373dc5417405357e6abd466))
- Walk lanes come back in the order the fetch names them ([d73bc42](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/d73bc42f5d5a3dfe55883e2696bfbbed83d17764))
- Document WalkTabixSyntenyAdapter: config, how lanes are aligned, parity with gbz-base and the browser trace ([2f9a819](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/2f9a819a07cdef8f88bcfdde6f36886e3e8cdc31))
- A target lane outside the lanes asked for reads nothing ([f0c13c6](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/f0c13c60ac20c1c33b3231ebbd5f5b2782617199))
- Where the lane trace's clock starts, and its results file ([3452d39](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/3452d398feeb99aeb84814cde7ac4224d7983096))
- Depend on @gmod/gbz-base 7.2.0, which exports pairAlignments ([553ec11](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/553ec115c64cf4e36c84e97176e0fd0c52dc22c5))

## [6.10.0](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v6.9.2...v6.10.0) (2026-10-09)

### Other Changes

- Probe the published bundle on hosted JBrowse daily ([a27d2ba](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/a27d2ba507db0fac2382bf66901c27e9af6984e5))
- Host imports bind to served names, and a name a host lacks throws naming it ([45745a9](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/45745a9eb32e1ef9a7caba0bd2ddedc0d1e25326))
- A walk-indexed cut crosses to the main thread as typed arrays ([8ecc0a2](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/8ecc0a2080a4b54a6cd5a239a6272d1e6039ed1f))
- The walk cut's tables handoff, measured against GFA text ([04e35e5](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/04e35e5db109fc444cb6cff6c6b5201960324a25))
- What bounds every-haplotype views, measured ([765213e](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/765213e1a870eb22f2d3eea6744ec0684ba28fad))
- Depend on @jbrowse/bandage-core 8.1.0, which builds a graph from typed arrays ([c7fbd4d](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/c7fbd4de2732e4286faee7f7684ded84a66fb4a9))

## [6.9.2](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v6.9.1...v6.9.2) (2026-10-08)

### Other Changes

- RgfaTabixAdapter refuses a query range that is not finite ([00cc369](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/00cc369550bb8b40d3b51b12e78e1d38b41fc88b))
- A walk-indexed cut looks back as far as the header's maxnode reaches ([a758122](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/a758122cbc2cd8e3060772dacd682c42c7274766))
- WalksUri docs name the per-reference prefix gfa-to-tabix 0.5.0 writes ([8566f3c](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/8566f3c097c96b1cc96cfd61ceede79d8e369e83))
- SubgraphHaplotypes [] is every haplotype ([0ad018a](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/0ad018aac1ce71a24eb82dc6cb0f223d785e30de))
- Say which NaN tabix-js spins on: an end, while a start reads nothing ([4865284](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/4865284378b5598e89e9b7fc95e993867e8e9cca))

## [6.9.1](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v6.9.0...v6.9.1) (2026-10-08)

### Other Changes

- The graph track draws its own status chrome, since jbrowse-web main removed DisplayStatusChrome ([b8172c6](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/b8172c60dcecb36d29bac06f81054e78acaa2b2e))
- Host-compat draws the graph track in a linear view, on beta.11, beta.13 and main ([7c21a4f](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/7c21a4ffbf609ce477ab47042a484df3fb8c5fa9))
- A cut for every haplotype past the step budget is offered fewer haplotypes beside the zoom ([5a00ecb](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/5a00ecb2c2653a9d3ac0615b192f6ed14863dab7))
- GRAPH_TRACK.md and developing.md: the plugin's own status chrome, and host-compat drawing the track ([95c86b5](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/95c86b5fb90e690a8c5ffa931014d2129bd56204))

## [6.9.0](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v6.8.0...v6.9.0) (2026-10-08)

### Other Changes

- WalksUri names a walk-indexed build's three files from one prefix ([583a763](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/583a763172547cdb6cd53668709e7fdecc5406d6))
- A walk cut over walkByteBudget is refused from the Tabix indexes, before any row is read ([11da8d2](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/11da8d2478f312b36e155f03992820e622770fca))
- The haplotype picker lists the haplotypes a walk file's header names ([1a59ea6](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/1a59ea65ed56677a0a69a923b65ef6e110549afb))
- DefaultHaplotypes names the set a walk-indexed track is cut for until the user picks others ([ed1e5a9](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/ed1e5a9a514efd9aee883ac903a3d503497f10cb))
- Test the haplotype header on chr22 as gfa-to-tabix 0.4.0 writes it ([4db5940](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/4db594002f0c96c03dd5347dfe310e93fae7aa5a))
- WalksUri, the header's haplotypes, the default set and the byte budget ([aace097](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/aace09758a011b0184ef1f4b1557e3418e4d6422))

## [6.8.0](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v6.7.0...v6.8.0) (2026-10-08)

### Other Changes

- Quiet test console logging ([26c3f20](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/26c3f2041e1b4ab735b6f953ae767654185be47c))
- Read walk pieces beside the anchored node and link files, emitting W fragments trimmed to the window ([26dd881](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/26dd8817c734fe01f4a43f8a1e830692785dbb4f))
- Walk cut decodes only the haplotypes asked for, under a step budget, from chunk-start queries ([709e2f7](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/709e2f77d4f63cf05f65ad85da5317f06da83325))
- Walk cut parses node and link rows as they arrive and writes its own S and L lines ([aa20da2](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/aa20da2f6e128df2efe9b779a0f01d0d2de5ab88))
- Walk cut sorts its nodes without a map lookup per comparison ([0203cd3](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/0203cd3626e42c6fe4046f65005a1f15924605a8))
- Tests for the walk cut: haplotype filter, continuation rows, run-on, step budget ([99286e2](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/99286e2ed96c7c4a56c3f109905ed682d226809d))
- The haplotype menu and Settings field open on a walk-indexed rGFA track ([a7758c3](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/a7758c3330c2c1b949757d7631573b5cd0b3d2fd))
- Walk cut writes the reference's walk first, the rest by name ([c5f717b](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/c5f717bdecf2dd7dd72cd4f2429d5b62c86fe701))
- Test the Rust builder's first-base rows against the spike's whole-chunk rows ([a950b80](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/a950b8012a00b99692cf9812d9c5d08f90aeed35))
- Walk-indexed cuts, what they read and what they cost ([da050a4](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/da050a48d92f0c079138405a11cde942edd05ed2))
- Walk-indexed getFeatures reads from the chunk before the window ([624dbcc](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/624dbcce0917c1043b5cea36c0c7af802bc1bd0f))
- Take @jbrowse/bandage-core 8.0.2 ([6b81900](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/6b81900cedece7582742954bf76b0b62b8b337bc))

## [6.7.0](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v6.6.0...v6.7.0) (2026-10-08)

### Other Changes

- Walk strip toggle returns to the view's menu; Graph context hides on a GBZ track ([4c87d7a](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/4c87d7a88600558e126a0dcf4da0d0285015c134))
- The view's menu reaches what the track's does; a slow drag is no click ([845df4f](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/845df4f2f3bcd61ddd59da29597664a1e1dad889))
- GBZ and rGFA config edge cases, and cuts that say why they failed ([18a80cb](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/18a80cb3c39dfffc89842eb2adf534b85c88df87))
- A pop no longer aborts the cut in flight; a stop mid-layout draws nothing stale ([26c082f](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/26c082f0ab0dc345f2e7137a3c4346b3680fd6d5))
- Gestures take captured pointer events; the SVG stacks as the screen does ([c897b37](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/c897b379f372669ab075e30c679a6803223e6521))
- One labelled select and one pick dialog; the node limit gets a setting ([95e8133](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/95e813331e276607a40efddecf8277bdafec3173))
- Add pangenome graph track takes a .gbz.db, with its index and reads ([d282dee](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/d282dee453799055ba1543914b68712324644480))
- Reflow layouts.md after the picker rename ([1c78b4b](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/1c78b4b659a43f77c8f55284584866483a932489))
- The add-track workflow drops its GBZ option and names gfa-to-tabix ([92a50d1](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/92a50d17064a5eda43124d57e5d5d15a061910d9))
- Restore the add-track workflow's GBZ option, keeping the gfa-to-tabix naming ([61112f8](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/61112f81e98b4787c7671c823929f9b33dce67a9))

## [6.6.0](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v6.5.0...v6.6.0) (2026-10-07)

### Other Changes

- The HPRC2 ancestry painting names its row field rows ([1694e56](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/1694e569337c5de0d080e0fa0b646a4859ce9421))
- The PCLAI build script's comments name the rows field ([095bce4](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/095bce4a6e2556e322a319c828d1c01a4ca82c1c))
- Read gfa-to-tabix's anchored layout in one query per file ([adaf1ce](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/adaf1ce238698ef4bbd6eeff19fb9416321e7786))
- Anchored cut keeps a backbone link that jumps the window ([f5827ec](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/f5827ec0cf4345af04925f4f5a3026499686710b))

## [6.5.0](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v6.4.0...v6.5.0) (2026-10-07)

### Other Changes

- Bump deps ([841bb1f](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/841bb1fcd07238c779c98f276e09c61406154a48))
- Stop a canvas drag from panning the browser sideways ([fb90aab](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/fb90aab75dee361410ebd83b0e2ed173da6cc55b))
- Offer the stress engine beside FMMM under Graph settings ([1482b14](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/1482b146c7b1a2abf59dd3bd2ce751fd073ae0b8))
- Test that a track's engine choice reaches the layout request ([77fdc2e](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/77fdc2eb530bd3185b32d650912fd41df19e33eb))
- LinearGraphDisplay's config schema is closed, as jbrowse-components ADR-214 now requires of every display ([b43dd8a](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/b43dd8a6712d47baa0903b60a076a8472b74736e))
- Revert the closed-schema one-liner: sessions from 4.0 and 5.0 carry overviewRowsChoice, overviewRowOrder and pane on LinearGraphDisplay, which a closed schema rejects as unknown keys (2 tests). Closing the schema needs those legacy keys handled first. ([4d07795](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/4d077957bc4d51132068a3c63b01e12456919d5e))

## [6.4.0](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v6.3.1...v6.4.0) (2026-10-05)

### Other Changes

- Trust a restored view's first layout; forget the view when the graph is cleared ([96a00b3](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/96a00b35f4b2f52844a4f7863d02ede057e951b9))
- Keep a view only across layouts that share the reference axis; clamp only a measured pane ([22d1b43](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/22d1b4399b9f32bcc17152fbf817077b43a9dd02))
- Draw the graph track in the linear view's Export SVG ([f7dbbf7](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/f7dbbf7c1bdaee66928fe6c80546099a4d9c20a7))

## [6.3.1](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v6.3.0...v6.3.1) (2026-10-05)

### Other Changes

- Group the track menu: toggles under Show..., layout options under Layout, Zoom and Export submenus ([26eb1d9](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/26eb1d9f9be6cbca3fbdfdab28d64b2a8eebb1a8))
- Hover highlight is fainter and can be turned off ([a6d595b](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/a6d595b12543291dc668d4c8cc51612b9d695546))
- Narrow the track menu the way BandageJS narrowed its bar ([f3195ab](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/f3195ab2fa92ddaa92a8ca0a1415b79e9d67bc30))
- Move Export SVG and Copy figure spec from the track menu to the graph genome view's menu ([1b044df](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/1b044dfea2cca55e2c24a592a1ec5a63d98acd16))
- Take @jbrowse/bandage-core 8.0.1 ([4d6fd7d](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/4d6fd7d2a715f38167186583ffdf924bb9a6cb3e))
- Keep the drawing on screen across pans, zooms and new layouts ([271c0d8](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/271c0d8c8e3146c54e6f96358bc52271ac9a85ce))

## [6.3.0](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v6.2.0...v6.3.0) (2026-10-05)

### Other Changes

- Triage agent-docs into reference, ideas, ADRs and TODO ([f8ae6e7](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/f8ae6e780caae2ce4140f47cc3dbb24abd9fab7e))
- Split TODO.md into one file per item under todo/ ([e092bdb](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/e092bdb981f43fe762c68bad33cc1c0d0e704e36))
- Point the test README at ~/src/sequenceTubeMapModern ([13031bc](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/13031bccbd278c1d6bfb581ee810c91aee6e6ac1))
- Drop the direct @gmod/tubemap-core dependency ([279ca6a](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/279ca6a40b6476aca09c452294d2dba74ccb5707))
- Name @jbrowse/tubemap-core in the docs, and note it lifts the worker blocker ([8faf3cb](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/8faf3cb1e4a91388d09bc073a026af731b209129))
- Take @jbrowse/bandage-core 8.0.0 ([7668fa5](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/7668fa5593edb12ded68fd27c1ba0b02ec5e059a))
- Format agent-docs with prettier ([c8f7137](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/c8f71378d98b688cfc7e3e1c8cf17f7994c8cdf7))

## [6.2.0](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v6.1.4...v6.2.0) (2026-10-05)

### Other Changes

- A window's lane pairs come from one cut: lanePairs and the lanePairBatches capability ([1bfbd62](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/1bfbd62b55adf867d68099f922aaad2b55e9bb21))
- Depend on @gmod/gbz-base 7.1.0 ([e65bad1](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/e65bad1d1f9eef4b6957fcac54a6b501179dca0d))
- A pair cut widens its context to take in a detour its lanes share ([0b3b215](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/0b3b215f7fc3d7603b9aa8e47f7fa0ef2404d1bd))

## [6.1.4](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v6.1.3...v6.1.4) (2026-10-05)

### Other Changes

- Read the layout's drawing facts from core ([0533dbc](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/0533dbc162cbb21e27a75947bfb6861b4c9ea180))
- Depend on @jbrowse/bandage-core 7.4.0 ([be113bb](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/be113bb9b08830f0b45fc8f748c943b386d8d5b8))
- Read the walk-strip rules from core ([43d2776](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/43d2776c2ff7c9a4d3f52cb6874f19f22dc2d58a))
- Depend on @jbrowse/bandage-core 7.5.0 ([a50ce9e](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/a50ce9eb8606f3738dcfa72218467c7bb4011191))
- The facet picker reads core's list of fields ([2b5bdf3](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/2b5bdf3c0afdc368c3e9ebbd38eb0ab85b37a734))
- Depend on @jbrowse/bandage-core 7.5.1 ([b21d227](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/b21d2277145ae4a4563cd7d2395435eb244c282f))
- Group by… stacks walk rows into a section per samples TSV column value ([8f23d78](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/8f23d782eed8b5fb5e8a4289e4f8e6d08b32bedc))
- Walk-row sections draw at their own place, not stacked on the first ([01dbcb9](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/01dbcb9afef6da9d2ce89d6755d03df3dbc0ce37))

## [6.1.3](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v6.1.2...v6.1.3) (2026-10-05)

### Other Changes

- One reading of the settings a figure is drawn from ([346ecf8](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/346ecf86c79c332fd7ad05164c66fe8945d40d9b))
- Depend on @jbrowse/bandage-core 7.3.0, and keep a popped bubble out of a spec ([1a22e33](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/1a22e33bc984c7d985279cb84bd839f19a502ac9))
- Packed walk rows key genes as left out, as the walk strip does ([4d9bfb9](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/4d9bfb976b9ecacb442691f62607a28e40dcea37))
- Prettier formats walkRowGeneKey ([919d83b](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/919d83b28009c00f80875705a8124b04f700e8b1))

## [6.1.2](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v6.1.1...v6.1.2) (2026-10-04)

### Other Changes

- Walk rows pack into the pane, names and readouts on hover ([e5f71fc](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/e5f71fc4cb47dde46cdf54a47519cc4c3985d790))
- Pick haplotypes and samples from menus ([909f477](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/909f4778eb381acba1d5627cdd798116529bfcc0))
- Walk rows draw a graph past the node cap, and outline the hovered row ([796a387](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/796a387c8123d4591a562e6e735a9440092e9607))
- Depend on @jbrowse/bandage-core 7.1.0 ([1b452d8](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/1b452d8ef2e7fd18507de5830b4a00ff8e43271e))
- Samples menu labels are literal, so a doc can name them ([39955b9](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/39955b9b1a37aa916ab415ea2b5a64e722f43d6d))
- Bump deps ([d57f085](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/d57f085e263b48454ef3a5282c5e1d47a6d176c1))

## [6.1.1](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v6.1.0...v6.1.1) (2026-10-04)

### Other Changes

- Draw deletions by bandage-core's deletionDrawing ([f787f30](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/f787f304f23798052603b36416b50036111b9b3a))
- Depend on @jbrowse/bandage-core 7.0.0 ([424fb7c](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/424fb7c4a1c2b1c57dd1c7ef6878de01ca01b9cb))
- A gene record named only by gene_id gets its chip again ([d809e53](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/d809e53b5ba0bc8354cc85942f8b61a583e29f46))
- MinigraphBubbleAdapter's example reads the v2.1 bubbles file ([9d91c87](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/9d91c8775e3141262e7ca2d25d8f62c7a51f7465))

## [6.1.0](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v6.0.3...v6.1.0) (2026-10-04)

### Other Changes

- Turning deletion edges off in a force layout lays it out without them ([409e502](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/409e502ff172e8fd31c7c7766a35f882830f4ebf))

## [6.0.3](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v6.0.2...v6.0.3) (2026-10-04)

### Other Changes

- Lock @jbrowse/bandage-core 6.1.0 ([c6e4c0a](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/c6e4c0a88154979525bd911d94d7c6a8aab6c2b9))

## [6.0.2](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v6.0.1...v6.0.2) (2026-10-04)

### Other Changes

- Install @jbrowse/bandage-core from npm ([aad9513](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/aad9513973e6136aff2171584676a91a4d8748ad))
- Format the files the core split touched ([e32afd0](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/e32afd08a2ad9b94a27ba0121b7850ff062d8386))
- Lock @jbrowse/bandage-core 6.0.2 ([2fbcc21](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/2fbcc21bc898c6b232d2898cab46ba6e21dcabc6))
- Allow the core's chunk hash in the engine chunk name ([2026b52](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/2026b52625f4fd953572bbec8bb6906e45b92c67))
- Lock @jbrowse/bandage-core 6.0.3, which holds a dragged node's link ends ([212f54a](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/212f54a719b596c4ec1d052849fce8da5bab5326))
- Take getDpr from the core and lock bandage-core 6.0.4 ([3593d38](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/3593d386b9c2107717f27a14e88cd0ef29729210))

## [6.0.1](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v5.2.0...v6.0.1) (2026-10-04)

## [5.2.0](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v6.0.0...v5.2.0) (2026-10-04)

## [6.0.0](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v5.1.0...v6.0.0) (2026-10-04)

### Other Changes

- The overview's rows can be clustered by divergence, as the variant display clusters samples ([7708211](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/77082118ed209abfc3bb35b69d5b93834d720ff8))
- The graph's gene chips name what the gene lane draws ([393ee0b](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/393ee0bf73c2caf40135fbcf892084beaf77de6c))
- A gene's chip covers only nodes the gene lies on ([95e23dd](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/95e23dd7a99740db58bd3256806b436c5a91c32e))
- Exons outline the same way in every host, from one core element tree ([ef72f24](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/ef72f24df95442ba8b7458c2a538ae4c627efa92))
- A lanes window past nodeLimit reads as a zoom-in notice ([682c4ad](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/682c4ad15c4e381c877ebaa7c13c35907a8f54de))
- Past the cut the graph track asks to zoom in; the haplotype overview is retired ([c71a5db](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/c71a5db740086332c46efb478cdd2c17ce4bd8c6))

## [5.1.0](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v5.0.1...v5.1.0) (2026-10-04)

### Other Changes

- Links join the ends their strands name under the force layout ([c528024](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/c528024ba316d8a807c24d2a9f19bb08fbe87230))
- Stranded self links, lane ends and figure reference names follow review ([ba555be](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/ba555beeacea54706f64b4370633b64c22cc29d4))
- A gene read only over its intron has no exons there ([7d7e14f](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/7d7e14f835da2d3ddcf8fc95b3a33f54b626edf7))
- Arrowheads keep a plain link's size and wait for three heads of link ([ac489e5](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/ac489e51388e85dfe6509019bb5d61545b895980))
- The Node length colour scheme's label takes sentence case ([0e8bd67](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/0e8bd6790f4cc08fc582e8341e03eeb1a5e9bacd))
- README's rGFA force figures reshot: the cut's closing reads add the deletion edges and close the KIV-2 and DRB loops ([8047f2e](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/8047f2e92ba57f370985cb946cbc5afb7a27ee02))

## [5.0.1](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v5.0.0...v5.0.1) (2026-10-04)

### Other Changes

- An rGFA cut reads its last round's links, so an allele reached from both ends draws as a loop ([b62b236](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/b62b2364fccc8aa4574b5ba0c53125070add6b9c))
- A gbz-base lanes track reads each haplotype's PanSN name from its assembly's aliases ([7c56c31](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/7c56c31c9c9ac098b48eff7f25ac83e789732fd4))
- Document assemblyNameToPanSN as the override of the PanSN aliases ([4d505b3](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/4d505b3ced1154457bd2a21cd12a8151d6d679b2))

## [5.0.0](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v4.8.0...v5.0.0) (2026-10-03)

### Other Changes

- A GBZ track past the cut draws the haplotype index's overview ([6258110](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/62581101e17c8aa60c60e4172eadac01e918264c))
- The HPRC preset names the format 3 index, which gbz-base 7 reads ([471aabc](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/471aabca231fafa268de2b9b70d840f25b27a99e))

## [4.8.0](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v4.7.0...v4.8.0) (2026-10-03)

### Other Changes

- The BandageJS job tests core-next when it exists, and why TypeScript is on two versions ([7041363](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/7041363282c28c8b3c6f57806050ab5275557651))
- Figures.md documents walkRowSamples, strip genes on the reference row, and checkLayout ([6984fc1](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/6984fc1487ce32b1fbb86b0b778bee362a15f0aa))
- IDEAS gains the tube map worker and reads on rGFA; README states the presigned url limit ([6ce9be0](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/6ce9be061668c427266e65e4e086a2ef7ab63c3f))
- Walk strip follow-ups and tube map reads, from the retiring handoffs ([8f55109](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/8f551090c6e7f9e02efbdc2fa6833e4bb20d2e4b))
- Say why the tabix GAF query asks for hi + 1 ([e333727](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/e33372719e371d0ae14aa3a3d85320ab256736b5))
- Why walk rows keep charcoal off the path while unplaced nodes are grey ([f7eddcc](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/f7eddcc26f8cd30b3643d5d118a6a310fab66927))
- Retire the handoff docs ([9d5d6b3](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/9d5d6b332dbd7ddf015ce05e49c1bba069d09137))
- A graph track's menu no longer offers the walk strip it can't show ([eb984f6](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/eb984f693b31fab8945e802165141b5ec05b7818))
- The tube map legend says how many of a sampled read set's reads it draws ([478aaed](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/478aaed0dc9920aca38a4fab312b54824744408f))
- Cancelling a load drops everything the graph derived, and node details count the samples ([55dd418](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/55dd41818ac9344a40668bc799b934fb2b4ad937))
- Past a dozen walks the Walk menu lists the lifted ones and offers Choose walks... ([1ed1f75](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/1ed1f7537385bbff0b33e878dd19197d55f71bcc))
- The settings dialog builds its switches and dropdowns from two components ([031fda6](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/031fda6f49c82a94195ab5dceb591bbadfd13acc))
- The pane model is built in stages under pane/, one module each ([595df72](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/595df72367ccda2029307fa1d872e1177febf13e))

### Tests

- E2e from a worktree needs the primary checkout's host dir; where the cactus reads live ([7abc6c0](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/7abc6c040eebebd54d72d8531a33493f190f30e7))
- Test/README lists every e2e suite, and the flake note gives advice, not stale counts ([9767c30](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/9767c30f31a30b1045283c1d44128a1a6d43565c))

## [4.7.0](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v4.6.0...v4.7.0) (2026-10-03)

### Other Changes

- Bandage-figure boxes the reference row's genes in the strip ([4009f02](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/4009f02d0b674bbada9e7b52057ed5c135094eb4))
- Copy figure spec is off for layouts bandage-figure refuses, and says why ([f31a219](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/f31a219c430bea2ce25d67ef80b3684567689bab))

## [4.6.0](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v4.5.0...v4.6.0) (2026-10-03)

### Other Changes

- The figure spec keeps the strip's sample filter, and bandage-figure applies it ([ab67f0c](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/ab67f0cdbf7863231c6d023546e588ebfd86580e))
- An SVG walk-rows key paints its on-path swatch as the reference ramp ([e2648b2](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/e2648b2eb90ce293d1bbc091a18befc41d48863f))

## [4.5.0](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v4.4.1...v4.5.0) (2026-10-03)

### Other Changes

- JBrowse 5.0.0-beta.11, latest deps, stripGeneGaps(frame, rowGenes, gaps) ([0f87136](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/0f87136d4078e40b5a07f0059712b30f6d7143f5))

## [4.4.1](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v4.4.0...v4.4.1) (2026-10-02)

### Other Changes

- Strip review fixes: a crowded strip always notes its genes, specs keep the cut ([7ab451c](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/7ab451cc22243c002b88b3c79b0d03a7214b0057))
- StripGeneGaps takes the row genes as an optional third argument ([102f214](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/102f214a437f94c94269997c2f9be62ff4a83229))

## [4.4.0](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v4.3.0...v4.4.0) (2026-10-02)

### Other Changes

- Walk-strip handoff: released in 4.3.0, ported to BandageJS ([3b82cf9](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/3b82cf9068095624061d58261108a34c1aaf3a79))
- Walk strip boxes each row's genes; crowded rows leave them out ([195b555](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/195b555af0c4dd257ec0b932041dec691789d38d))
- Export SVG and bandage-figure draw the walk strip under the drawing ([d369feb](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/d369feb4e88f4fc3b6a68a4535f91a35471a0c09))

## [4.3.0](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v4.2.0...v4.3.0) (2026-10-02)

### Other Changes

- Core for walk rows under a node layout: ticks for a node's visits, the node under a bar point, a strip that fits every row ([0c24bce](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/0c24bceedcaf6a70bb880223eb3a8dcef4718e1d))
- Walk rows under a node layout, linked to the drawing ([8afeafe](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/8afeafe2e162467ee497ed3535e1b94df252dc4d))
- Walk-strip e2e waits for the force layout before hovering a bar; the page fits the whole strip ([69c2522](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/69c2522508c39615363240c231b4ff0a7887abde))
- Prettier on the walk-strip handoff ([b4dca1e](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/b4dca1e15f920563c3939ccc5fead19d95435a61))
- Force layouts route each deletion edge through the simulation ([6d0aa5a](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/6d0aa5a96622757bdff86834d63694c0af50c98c))

## [4.2.0](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v4.1.1...v4.2.0) (2026-10-02)

### Other Changes

- Segments count their samples as sampleCount; the node popup lists samples ([94b6f39](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/94b6f39711d43a5191f7108af770e3205e09d2ba))

## [4.1.1](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v4.1.0...v4.1.1) (2026-10-02)

### Other Changes

- Walk-row colours say on or off the reference's path ([f8eb16a](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/f8eb16afc892d69d1603acd3ebf2fc2793a1c5f9))

## [4.1.0](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v4.0.30...v4.1.0) (2026-10-02)

### Other Changes

- The MICB tube map figure keeps Auto colour, so its tubes keep their path hues; figures reshot on 4.0.30 ([c7392db](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/c7392db28cfa57f0e9c809a254a6e656b54baf01))
- The KIV-2 figure spec states its columns inside the facet, as 4.0.29 reads them; figure regenerated by 4.0.30 ([dbcfba6](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/dbcfba6349dbc736565d82fe7a149a5637e46712))
- Gbz-base 6.0.1: one options object per query, and gbz-base cuts the window by fragment ([eeabbe7](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/eeabbe73bb8b901752ca8530839f7a0e2ffc4e74))
- Walk rows: each row's contig axis, genes placed on bars, shared drawing helpers ([dc61e39](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/dc61e392a250ee092821b3cf0d7610d1d4fdc107))
- Walk rows draw each haplotype's own genes, read from its assembly's gene track ([5cc1fe1](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/5cc1fe14d6d94fbbaf47659ee2744f86782e0c0a))
- Walk rows export to SVG, open a bar in a linear view, and say what purple means ([61ccbe9](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/61ccbe98771ce2fc9f44db20efa5cf5f6083a68c))
- Walk rows are one element tree that each host renders ([28bbc6d](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/28bbc6d541738983d94679b4acaa90ec55365db9))

## [4.0.30](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v4.0.29...v4.0.30) (2026-10-01)

### Other Changes

- A haplotype returned in pieces is one walk row, with the contig between the pieces as a gap run ([ac905af](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/ac905afdc8557f9bf613ebe1cc27d79b865754e7))
- Gbz-base 5.0.0: the keep route walks stray rows, and the hosted HPRC index carries them ([03b8807](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/03b88074edbff1b5ea4bb2ba3fd6bbbd68cb3357))

## [4.0.29](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v4.0.28...v4.0.29) (2026-10-01)

### Other Changes

- README names the store's latest/ url on jbrowse.org, not unpkg ([718b33d](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/718b33dbd3aed2e0fbee7ea178690a52efda98fd))
- A haplotype index that could not be checked says so instead of asking for one ([4000f64](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/4000f6485ed2b5279c5c4e52f9b3a7b7906035c4))
- The facet is one object, as every JBrowse display writes it ([2f31ab9](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/2f31ab9e99a5226684bc673413d899557fd50902))
- A walk bridging a reference gap draws once, and unnamed walks keep apart across the gap ([00fa84b](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/00fa84b96efc6df6be1f1ed7b9f86704bfd20ccb))
- A lane pair answers without anchor rows, and whatever route gbz-base took ([47d9b66](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/47d9b66e3aa8f2387d83f711db88fd88644d9791))
- Pieces that meet across a gap join with their link, and a later piece's node limit counts from the window ([9cdf5c9](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/9cdf5c98942c14ab684696d759be061d23ef0d48))
- Pieces that meet join only across an edge the graph has, and the reference's stray pieces fold into its walks ([7ce547f](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/7ce547f30970befe7eae83a429847402191b7851))
- Pieces that meet stay apart where one of the haplotype's paths starts, linked or not ([6133b98](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/6133b9840d31a95584af7fddb23f292578dc1183))
- Walk rows lay out row 0 from the backbone over the window, sharing the tube map's overlap test ([ccfe3aa](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/ccfe3aa0afa38dcd9659ddadbf983369c22c94eb))
- Drop an assertion eslint now reports as unnecessary ([fa9380b](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/fa9380b06134a2187be807df2e1e2ba982c7e8d0))
- Format the walk-rows layout test ([84fa9de](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/84fa9de87a47945b134c151ef410fccdbac1a1d6))
- Failing tests: a haplotype in several pieces loses all but the first ([9665fb2](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/9665fb2367b4368cd0ce40ae628c6f99b795322b))
- A lifted walk holds every record of its name ([00885db](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/00885dbbece645838eae51bf43e19dcc7a9086bd))
- Walk rows measure against every record of the reference and keep every piece ([40215cc](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/40215cc894efb611214ede0d0d3f663b2066cc06))
- Comments and GBZ.md describe the keep route, not the anchored one ([4e93611](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/4e93611ea2c7762e6d5c3cc6c26991947ecf56c4))
- FigureSpec reads a shorthand gene track's index; the view menu no longer throws on the HPRC portal ([37c546d](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/37c546d6f369db7a37da4de8eced5ab60c4790e1))
- Index fixtures carry stray rows, so keep queries in the tests take the keep route ([e248627](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/e2486272b212c73c898318c3c0e18c71e2e3868f))

## [4.0.28](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v4.0.27...v4.0.28) (2026-09-30)

### Other Changes

- A hovered lane row lifts nothing over walk rows; the lift's fade is one colour ([d615114](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/d6151142ad8dd1a9ae933f9c330730533000ee6c))
- The row hover figure finds its cell along one row, and shows the lift's fade ([f127b7b](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/f127b7b72788e9ad213fffc3c4938342de04df11))
- The row hover's docs leave walk rows out, which draw no nodes to lift over ([b7ed82b](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/b7ed82b67033aa9a1b20dc654f4c850de439b30a))
- A gbz-base cut's defaults are stated once, for the track and for a standalone cut ([cb6b6d6](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/cb6b6d677732490a63e22602e9ddd6e627c853f1))
- Pnpm version refuses unless CI passed on the commit it releases ([da5a874](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/da5a8740c176b39d6a157435061ecb1b07de688d))
- One isRecord for the modules that read host state structurally ([64a6b84](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/64a6b844072c7794edb757a96c2d2a68fa3cffa9))
- Highlight in <assembly> writes the session's highlight, which hosts now draw ([12a538c](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/12a538c33eed9716f57f23e64188269d389fc0c8))
- A graph track in a synteny panel bands its hover in that panel ([0bdb1cc](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/0bdb1cc4b16efa8c09164e27ed092fc5654a97ee))
- A file picked in the browser asks for a URL where Add track needs its siblings ([977ee67](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/977ee67939e0c71f177d642d63e0971bc39ee2c9))
- A lane row named like an accession finds its walks as a bare sample ([3dd95ba](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/3dd95baece6255cb38968c4f7ebab15eaa49cb08))
- A synteny track naming its assemblies by alias is offered and fills its panels ([70ce360](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/70ce360670917f40331d30be33c391a0dbb1e433))
- A graph track tells the linear view when its x is not genomic, so highlight bands skip it ([61bf916](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/61bf916a26db02db7eaeac170233ab724cbb9c9e))
- Side by side grows a track too short for its panels ([97be388](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/97be388e827cd01fd4096d1af19da83f0a3b8bca))
- A superseded read no longer fails the reads sharing an unindexed GAF's download ([c1c1b13](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/c1c1b13c79fdeca7fa6e3ee8434a24eac3c8a9a3))
- A graph cut across a reference gap draws every fragment in the window ([7ef3aea](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/7ef3aea3b1ac3ea299bd95a0f4a8657c5ad49754))
- Segments at one position keep one order in an rGFA cut ([d208d9b](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/d208d9b78fae360b9c16628f18ed02c9b9abf6bd))
- The GAF reads index opens through openTabixSlot like the other tabix slots ([077bd7a](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/077bd7ad0cbe07c6a104aaaacee76de2f5bc6b72))

## [4.0.27](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v4.0.26...v4.0.27) (2026-09-30)

### Other Changes

- Hovering a callset cell lifts that haplotype's walk in the graph ([b2fa5ff](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/b2fa5ffaae58153bb9a0567cd61bc44c2ebf0bc6))
- A row hover takes the graph's hover from the node at its bp; a figure shows it ([7f6aa7f](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/7f6aa7f12517bea9fb419fb843d79dc262d6bbb2))
- Genes bind to a contig by chr6 or 6, or by the name a spec states for it ([0df9ce9](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/0df9ce9cad09c7ee13fce00d520c2aa746f69c4a))
- One drawsNodes answers what four features each asked the layout ([0a58a3a](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/0a58a3a386bf4c3182495fc3dbf6991b49e3c5c0))
- One source per fact across today's changes ([68fa702](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/68fa702c080737e67dd534abd4c9acd5d9469f6a))
- The e2e suites pass again: a right-click aimed on screen, a tooltip read as drawn ([beae79b](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/beae79be9340147d40a2e55680a130d119d3ba84))

## [4.0.26](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v4.0.25...v4.0.26) (2026-09-30)

### Other Changes

- A GSTM1 figure of three routes: through GRCh38's copy, past it, round an unmerged one ([e111a1f](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/e111a1fe52a087ccfff37023f64bab27c9ebbeda))
- The MICB and GSTM1 figures read the graph against HPRC's alignment rows ([39107bf](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/39107bf5c436c1486d2fa973fc85aa1b29bd1897))
- A tube map's boxes can take the node colour scheme, its tubes going grey beside them ([72de52e](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/72de52e223422aacdc1e0f9795223bb5b8fe00a1))
- The ramp key's ends read in whole bp ([c6c5eb8](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/c6c5eb843206eae214c57978d622793de66b42c2))
- The settings dialog says when its colour scheme has no effect ([a519f8b](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/a519f8b7acbd58e3c873cb92485205247eb55fb5))
- Hovering a node with walks lifted no longer refits the view and drops the hover ([395eeb0](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/395eeb0562ff4503fc845ba4070d964b6133ae3d))
- Export SVG draws what the pane shows, and a copied spec names the lanes it cut ([37a777a](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/37a777aa60d2bbe8386a48c0ccc9f44eddd80d77))
- Bandage-figure says what went wrong, and reads specs as the plugin does ([8b85e30](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/8b85e30e4874fa08426b2088470ef85777aba986))
- A popped bubble's walks start where their first kept step does ([8a535d2](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/8a535d2d6a5c1cc3196f9ab995498ab81629f715))
- Side by side stays off walk rows, refits on new columns, and keys say what is drawn ([7dbd10f](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/7dbd10fd82a3bc83b6b2ce435a0ae710c0400871))

## [4.0.25](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v4.0.24...v4.0.25) (2026-09-28)

### Other Changes

- The strip staggers only segments wide enough to read one by one ([02d63ee](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/02d63ee8cbbc7f7681a3804f993976a3098b57b2))
- SVG figures write a sub-pixel subpath as a dot, one per quarter pixel ([7748462](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/77484620cecf8d9ddcd8b705f7d6860b5a3c9b3c))
- The figure CLI's example is KIV-2, where each walk takes its own loops ([7c6c37b](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/7c6c37ba517a0f6d86269ce34f17e4d01fc9e8f2))
- Figures draw genes and name their version; Copy figure spec; hover says where a node sits on each walk ([d22b392](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/d22b3927a5e43c7eacfa92652374a91ef4915b0d))
- Handoff names the KIV-2 figure spec ([d1cbcc0](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/d1cbcc0dae010042f4a3d262528d48064ffbf51d))
- Gbz-base 4.1.0: a walk's alignment joins across a detour out of the cut ([86c81cd](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/86c81cd716279d79aae02f43ab710c7857e51b1f))

## [4.0.24](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v4.0.23...v4.0.24) (2026-09-28)

### Other Changes

- Exons outline in the gene track's goldenrod, and the legend gets room of its own ([18180a3](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/18180a38e7b57ccd2f189f5b99c006d4fc3a2943))
- Figures reshot: goldenrod exons, the legend clear of the drawing, titled tube maps ([c2efcb4](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/c2efcb4648c2091a063c446ac919ad43d15009ff))
- The strip's key names its pale shade, and blocks snap to whole pixels ([0f0f4cd](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/0f0f4cdc8f9387b7c9da91676f760b0d0d614258))
- Figures as SVG from a spec, and facets by sample ([0d8f6ba](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/0d8f6ba8058d399df5e3f6aa0fb6e5d70f729ddb))
- Side by side by sample, Export SVG, and figures made again from a spec ([ea8163e](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/ea8163e34698ab18ba6357443572f9e301d3cee6))
- The 1q21.1 figure reshot by sample on the current drawing ([593af3f](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/593af3fd87e1cb87c23c96745e96480aa7924067))
- Core 0.1.20: the figure CLI and facets by sample reach npm ([53c62e0](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/53c62e04b1d07524db00c489e11f059d995bc777))
- The strip takes each lifted walk's lane, a row per walk, and its edge marks read ([60b3bdd](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/60b3bdd08f535820b73f5d19f3b5707295744e3f))
- One release, one version: the core takes the plugin's version ([cf50bb3](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/cf50bb36546f028dc7b7155b02729732bddf5f67))
- A gene label too wide for its spot falls back to its short form ([b6911d3](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/b6911d3690dee95fa0f87bb3a95bf6f7e4f2a441))
- The strip reads as a feature track over the gridlines; walk rows draw the reference as a bar ([624d1d5](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/624d1d5a087db575d1c0008546dd68c793d8c9ca))
- Every figure is a linear view, and each says what it shows ([4b02fb3](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/4b02fb33df5f62fc2dd016049cc341057f6a1bac))
- A gene label placed in its short form draws that form ([237773e](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/237773e67cdc78faacefd3c820dce27b05a93d6a))
- The GSTM1 figure shows HG00133 against GRCh38 in a synteny view under the graph ([affbea7](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/affbea77e9e06153b5fd40f5cf6cbb7b1f9f6e31))

## [4.0.23](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v4.0.22...v4.0.23) (2026-09-28)

### Other Changes

- Legends share one box and row style ([c323db9](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/c323db9df99138a0b2afb170f59a8ed87acf923c))
- Facet panels pan, zoom and hover together, and tile as facet_wrap does ([bdb60bd](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/bdb60bde1f39b4f8b238d536c5bae038bec15c68))
- Zoom buttons centre on a facet panel, not the whole faceted pane ([f235ebd](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/f235ebdb39a256b7b10e117a3f3db67b04ac1c12))
- A walk's key is a short gradient with its stretch written under it ([f0787c0](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/f0787c0c02e5716f22e142672ffdf6c285cddae9))
- Core 0.1.18: the facet grid and a walk's key in words move into the core ([87943b1](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/87943b1782983ac93a4b8ec54f3c74d442de298f))

## [4.0.22](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v4.0.21...v4.0.22) (2026-09-28)

### Other Changes

- A lane's hue names its walk; a walk running against the reference dashes ([bbfe671](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/bbfe671cf463ba416df0ca5ecdabcf0d8c7b07bd))
- Lanes shade along their walks again: the reference in grey, each haplotype in its own hue ([b255970](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/b25597070f372f0269147b84069d2a1be3643f8c))
- Lanes shade across two hues, and each walk's legend row is its own scale ([3be5874](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/3be587489483cfea12a0982153aea0e6605c8952))
- Walks side by side: a facet per walk; lanes flat when lifted together ([e356204](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/e35620464e30bb73a393af9e57b6a269e5f15afc))

## [4.0.21](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v4.0.20...v4.0.21) (2026-09-28)

### Other Changes

- Walk rows cut every snarl a walk takes past the window, so each walk comes back whole ([ed72bc3](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/ed72bc33e09de3218f6d3648c8d4c15f378d2ffa))
- The HPRC demo has its curated VNTR track, so KIV-2 reads as a repeat array ([c3ad203](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/c3ad2034df040f2d89a0bc7c585799605f1b82ab))

## [4.0.20](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v4.0.19...v4.0.20) (2026-09-28)

### Other Changes

- GBZ figures reshot on plugin 4.0.19 and gbz-base 4.0.0 ([e389d9b](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/e389d9b0e20ed0414b42d3f9788bfdc62893bdc7))
- Lift several walks at once, each lane coloured by an encoding ([f9e7b57](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/f9e7b576418ad92758d226a15673d6c33d153291))

## [4.0.19](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v4.0.18...v4.0.19) (2026-09-28)

### Other Changes

- A tube map draws its window: the cut's context is for walk rows ([6efb851](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/6efb8514476e5eee01063d0e025a39fd4f6a8c73))
- Walk rows stop colouring copies by unit; jbrowse-plugin-tandem-repeat does that ([0cd2b86](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/0cd2b864e3b85d0d884ca9a825c0f831fc5e0541))

## [4.0.18](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v4.0.17...v4.0.18) (2026-09-28)

### Other Changes

- Haplotype matrix: a row per walk, a column per site, cells by route ([7dad225](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/7dad2259cc42d8779af679782572e0b14ae70468))
- Revert the haplotype matrix ([4511eff](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/4511effad340ee644665619a1ea7c9c20095d4e0))
- Gbz-base 4.0.0: a kept cut spans window plus context, so walk rows sees a truncated walk ([61b7aa9](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/61b7aa9aa0081141066cbe9f44f41a6004ad1e89))

## [4.0.17](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v4.0.16...v4.0.17) (2026-09-28)

### Other Changes

- Remove the variant map; a saved option this build lacks opens on the default ([0126586](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/012658604b63e725cd7e48d9bbfcb3ae9b093632))

## [4.0.16](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v4.0.15...v4.0.16) (2026-09-28)

### Other Changes

- Walk rows drop a piece of a walk that meets no reference node when another piece does ([9d1bab0](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/9d1bab0f6bed8c00264dd9c40f8e28aceaae9e27))

## [4.0.15](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v4.0.14...v4.0.15) (2026-09-27)

### Other Changes

- A bubble label or glyph unmounting under the pointer no longer runs a hover action on the closed view ([a7c6590](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/a7c6590ef9ec23e62784d94836b6a3fad11441b0))

## [4.0.14](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v4.0.13...v4.0.14) (2026-09-27)

### Other Changes

- Typos skips the generated CHANGELOG, whose commit hashes read as typos ([d192bf4](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/d192bf42aadea21f4d1e5123ba0518d86eb60245))
- The own-axis ruler brackets every box alike, and the legend states the log widths ([f546da3](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/f546da3d1efe800a95cd247e609b74cb2d7d0082))
- The reference-axis ruler keeps its round positions; figures reshot on the bracket ruler ([9cdf390](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/9cdf390c957d89a75792f28f94e86e2049ffcecf))
- A force or ordered graph track draws its reference segments at their bp, in their nodes' colours ([4852d56](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/4852d567283b735224ee6dd2d562da375fe14f99))
- The reference strip fades off a lifted walk, has a menu toggle, and a hover figure ([50332e0](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/50332e01d0ef1bfdf4412d3be762fa8b7212ae6b))
- A bubble's name lights its span on the strip and the linear view; GSTM1 walk figure ([691ff3c](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/691ff3c6248a15e53038da48de528af8fcde3961))
- Bubble halos are off by default and named in the legend; the strip marks overhang and the fade ([a665f58](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/a665f58cc390995ce71b16353b788cf25f98901c))
- The tube map legend names reads, their edits and generic paths; tubes go grey beside reads ([84aeec0](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/84aeec089050b6cab3abc7b6739cc039689e505f))

## [4.0.13](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v4.0.12...v4.0.13) (2026-09-27)

### Other Changes

- The core exports genePins and its GeneModel and GenePin types ([5046d68](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/5046d6845acb9c6198e252be8b014fe9c965faa3))
- @jbrowse/bandage-core 0.1.5 ([b9c3cf4](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/b9c3cf43de40c4ba0bfe677ec293d9d6d9dbf8c0))
- Walk rows follow the reference-position ramp ([fd92018](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/fd920183e4e522a2c26f4d755389ba005b839d27))
- Tube maps draw the session's genes above the tubes and a reference ruler under them ([c2028eb](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/c2028eb1296caa5b65712f1fa2d993a5e77f9c2f))
- README splits figures into track and view; MICB tube map figures; every figure reshot ([873e493](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/873e4934cc4c77c7693a82f51669853d3e99acc4))
- Walk_rows_kiv2 reshot on the reference-position ramp ([e981e20](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/e981e2007b40d8a9589940511c3f8f722dbb7311))
- Walk rows merge runs that cross the reference backwards ([562baed](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/562baed8fca416447b2907732c2cb9136a7200cb))
- Handoff for decoding the charcoal in walk rows ([448f5b5](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/448f5b55360b8a31388759e3e1c78e888e673737))
- A long tube map cut opens at 5 px tubes rather than fitted whole ([885c6f1](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/885c6f1b2fa06a8b6cf90be8b4435e92b50d6414))
- The fit starts row layouts past their row labels ([f166f84](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/f166f840caf4dcafcf0730546d1fbd2d83a29dff))
- The own-axis ruler zigzags over a box its log width squeezes ([e3a30ec](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/e3a30eca63a6719cf5f085008446c9c741d593a0))
- Tube_map and tube_map_micb reshot with the squeezed-box ruler ([cc7405f](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/cc7405fc5e3e2867c675cda0ddebc3b2a810d13c))
- TubeMapNodeAt declares that it returns a node name ([ae16788](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/ae16788dfd1ec719be6f5996480db97dbcfad192))
- A tube map track on its own axis ties each reference node to its bp ([0c27a49](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/0c27a497feba8a6f5653aa487da45a1b9d66d276))
- A graph track's Launch menu opens the window on screen in a graph genome view ([439a59e](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/439a59e5f5e92c9319db8aa2e9a4fc12e0dc9a61))
- The core binds a backbone to an assembly, and genes match it exactly ([0b32dd1](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/0b32dd15e376f5ce6a98033b4689b689282b97cd))
- Genes draw only on a backbone of the assembly they were read for ([f2f18bf](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/f2f18bfdd87950af5687fd39320f5d3a46808d62))
- Document which backbone takes a gene track's genes ([cdee733](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/cdee7338ad7f6e39cd8f5296368d45d33c2499b3))
- @jbrowse/bandage-core 0.1.6 ([d45302c](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/d45302c035c39d575032f17f1ecc67d57cff0524))
- A bare-named backbone takes its track's assembly's genes ([4dfc5d7](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/4dfc5d7b41b2ba34d04a5ee93a352e7306272822))
- Walk rows paint each copy by the unit a VCF 4.5 <CNV:TR> record states ([9b124a4](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/9b124a4567f4788415f0543b52227fe9c90e9911))
- Walk_rows_kiv2 reshot on the KIV-2 copies track; the charcoal handoff closes ([8d74888](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/8d7488848ea871b3d1973d6dd2aa031a28ba5c0a))
- Charcoal handoff: no scratchpad pointer, the ramp claim restated ([3be3967](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/3be3967edcd31fe576ac3c4e526bd9c6794b5855))
- A tube map's fit leaves a row for each overlapping gene, and refits when they land ([07d6e6c](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/07d6e6ca00f397f858184f43a2188a67e7bcd27d))
- The e2e suites run on the latest JBrowse beta by default ([4e4e500](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/4e4e5003d6481d3469addb427d4f5b6a53cfda9c))
- Document GAF reads end to end, and the GAF genes plan ([fb1900e](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/fb1900e2d995806068fee6508869cb3fb4b4fdca))
- The core coarsens a tube map's graph, folding variants under sigma into the reference ([ed9386a](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/ed9386aea52da2360956ca9412e3c4d466c362cc))
- Fold variants: a tube map folds variants under a size into the reference, as ticks on the tubes ([b8b4590](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/b8b45909f36f9dce55c43e073420865e7fbe1ad5))
- Vamos states KIV-2 once patched and fed one alignment per contig ([4b20630](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/4b206308711e87743fc1dafd09691700209914a0))
- Walk rows fit their own bars in a graph track ([45f66d6](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/45f66d6ad780987d53e44280f17c566831ec84d4))
- The tube map legend names the ruler's zigzag and the fold's ticks ([27edc92](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/27edc92f0a57a700b32fb42bf5539ee98587b465))
- Indexed GAF reads work: @gmod/tabix 3.9.0 reads tabix -p gaf indexes ([22d660a](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/22d660a1f172d9efa20f6a665b3b6711d7c16d22))
- The core names a backbone's sample only where it can, and genes match exactly ([9821c91](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/9821c9184a248270dfe123511eaf174c75d065a3))
- The walk a graph track loads with takes its genes, whatever its name ([59ebb35](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/59ebb354e310f98334c021acd047312457f7f62d))
- Document which walk takes a gene track's genes, and genePins' exact match ([9ae22cd](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/9ae22cd4f88315cf731768b60871a03dd535b952))
- @jbrowse/bandage-core 0.1.7 ([24a5953](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/24a59536721eb86a3ea67be9ad0d9bdb2a547d4f))
- Typos accepts thr, for E. coli's thr operon genes in the reference tests ([7e5ab8e](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/7e5ab8e620e8751e0adf01309a6de1ec7f2900ea))
- Charcoal handoff: vamos reads a clipped alignment as the whole allele ([b254bee](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/b254bee7b5971285e513a7ea0e5765548af207c3))

## [4.0.12](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v4.0.11...v4.0.12) (2026-09-27)

### Other Changes

- Publish skips a version npm already has, so a failed release run can re-run ([728f799](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/728f7997500302607c26eb556fee0448f69aa1e4))
- Git-cliff reads only v* tags as releases ([4df7ba1](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/4df7ba16b78f3c31ffca4081ece4e59ea7a7c4aa))
- Gbz-base ^3.0.0, which reads the haplotype index only from a companion ([4a98ecc](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/4a98eccf6598ba090973f8aec1c703d5e59d4fa7))
- Bandage-core publishes from publish-core.yml, on the plugin's v* tag ([a4087a1](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/a4087a1d78f91d9dc76764fdc53563160e9c02c4))
- A gene's name drops a row rather than vanish under a bubble's ([4c54b7f](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/4c54b7fa1e880a2494896f3c21238b5f20eede6f))
- Figures reshot on the graph track, with walk rows and GAF reads added ([7b5975c](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/7b5975c4180b08fa9f622e39c3839f3c3b477391))

## [4.0.11](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/compare/v4.0.10...v4.0.11) (2026-09-27)

### Other Changes

- GAM is vg's alignment format ([d6d9c60](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/d6d9c60b9042dd956011cdd1cf2d4eebd7e1195e))
- GeneModel lives with the gene pins that draw it ([2d215cb](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/2d215cbd00b6ee1ad6a67f3c94d09a3d9ef9392f))
- The core moves into packages/core as @jbrowse/bandage-core ([a2901cf](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/a2901cf3f77089a375a410a4b73294f591f0c034))
- @jbrowse/bandage-core 0.1.1 ([2116962](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/21169625bbf722b0e4303a7a0271b3886e53fe44))
- Bandage-core publishes: working-directory for pnpm 10, .js specifiers in its declarations ([f828533](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/f828533a716ce3a0695ddc4f78173a5e17e70058))
- @jbrowse/bandage-core 0.1.2 ([8d5c5f0](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/8d5c5f0600cadb8b81e1847476e021e0c95276a5))
- Gbz-base adapter: the haplotype index comes from a companion file ([d4f15fc](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/d4f15fc9d929517b90207c93470e2db00c8f8f20))
- Gbz-base adapter opens graph.haplotype-index.db beside graph.gbz.db ([60ce76f](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/60ce76fcf123d754994052a42a91a5f13e3be3aa))
- Bandage-core publishes with the plugin, from publish.yml ([9d65fcc](https://github.com/cmdcolin/jbrowse-plugin-graphgenomeviewer/commit/9d65fcc946a1188b25cadad764bf9ad1ba66ac67))

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
