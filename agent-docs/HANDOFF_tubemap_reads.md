# Handoff: tube map reads (2026-09-26)

GAF reads draw under the tube map's haplotypes, with their mismatches, from a
gbz-base graph track. They are on main as of a19da14 (a4c8946..a19da14);
`src/gaf/`, `tubeMap/reads.ts` and `src/GetGraphReads.ts` hold the code.

Config:

```json
{
  "type": "GbzBaseSyntenyAdapter",
  "uri": "graph.gbz.db",
  "reads": "reads.gaf.gz",
  "assemblyNames": ["hg38"]
}
```

## Fixtures

- `test_data/cactus/`: sequenceTubeMap's cactus graph (`cactus.gbz.db`,
  reference sample `_gbwt_ref`, contig `ref`, 81189 bp), nodes 240..280 as GFA,
  and the NA12879 reads touching nodes 248..272 as plain `.gaf` and as sorted
  `.gaf.gz` + `tabix -p gaf` `.tbi`
- The whole read set is at
  `~/src/vendor/sequenceTubeMapModern/exampleData/cactus-NA12879.gaf.gz` (51k
  reads)

## Verifying

```console
pnpm test
cp -r .test-jbrowse-beta9 /tmp/host   # the harness writes into it
JBROWSE_PORT=9891 JBROWSE_TEST_DIR=/tmp/host RUN_E2E=1 \
  pnpm test:e2e test/tubeMapReads.test.ts test/tubeMap.test.ts
```

`tubeMap.test.ts`'s GBZ case needs
`src/GbzBaseSyntenyAdapter/test_data/micb-kir3dl1.gbz.db` copied to
`<host>/test_data/graphgenomeview/`. All four e2e tests passed on 5.0.0-beta.9.

## Open

1. **Indexed GAF needs a `@gmod/tabix` release.** 3.8.3 throws
   `invalid Tabix preset format flags 3`. Branch `gaf-preset` (c0556b9) in
   `~/src/gmod/tabix-js/.claude/worktrees/gaf-preset` adds the preset; it was
   checked against htslib with 1000 randomized queries per index. **Not
   verified:** the `pnpm bench` comparison against origin/main, which was still
   running when the agent was stopped. Not pushed or published. Next steps:
   - review it and run the bench
   - land and release it, which is the user's call
   - bump the plugin's `@gmod/tabix`
   - add a `gafFile` test on `cactus_240_280.gaf.gz(.tbi)`

   Semantics: any refName is ref 0, and `getLines(_, s, e)` returns reads with
   `min < e && max >= s`. `gafFile` already calls
   `getLines('{node}', lo, hi + 1)`.

2. **No UI for the sample.** `readsShown` is set but nothing displays "5000 of N
   reads".
3. **Reads load in every layout mode** of a track that names them, though only
   the tube map draws them. Gating on the mode means fetching when a switch into
   a tube map finds the graph without reads.
4. **Only GBZ tracks take reads.** Minigraph rGFA segments are `s`-named, so a
   tabix GAF index can't key them. An unindexed GAF would work on
   `RgfaTabixAdapter`, and on the standalone GFA view, which has no reads input.
5. **Main-thread layout:** ~50 ms for 857 nodes, plus ~40 ms per 1000 reads. A
   large GBZ window can stutter; the worker is the fix. tubemap-core keeps
   module-level state, so it isn't re-entrant.
6. **Look:**
   - read colours (blues/reds) clash with the red/blue path colours
   - mismatch text hides in a squeezed track unless it's dragged taller
   - no hover leader on marks yet
7. **Named coordinates.** GAF step names must be the cut's segment names
   (`toGFA({ names: 'resolved' })`). HPRC-style GBZs with chopped nodes need
   `vg giraffe --named-coordinates`, and then can't use a tabix index.
