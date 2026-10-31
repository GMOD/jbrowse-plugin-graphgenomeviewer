---
name: write-linear-variant-display
description:
  The configs, docs and probes write LinearMultiSampleVariantDisplay, which
  jbrowse-components main retired into LinearVariantDisplay; flip them when the
  host floor reaches the release carrying the rename, before core drops the
  alias.
metadata:
  category: waiting
  area: host compat
  first_move:
    'Once the floor is 5.0.0-beta.20 or later, replace the name at the sites
    below and drop the old name from shoot-figures.mjs.'
  order: 1
---

# Write LinearVariantDisplay once the floor carries the rename

jbrowse-components ADR-255 made the multi-sample display `LinearVariantDisplay`
and kept `LinearMultiSampleVariantDisplay` as a deprecated alias that loads as
it. The rename is on main after v5.0.0-beta.19. On beta.18 and beta.19
`LinearVariantDisplay` is the old feature display, so writing the new name now
draws the wrong display on the floor.

- Flip when `package.json`'s `@jbrowse/*` pins and README's floor reach the
  release with the rename. It must land before core drops the alias (its handoff
  `variant-display-merge`, sub-slice D).
- Sites: `docs/data.md`, `docs/maize.md` (three spec links),
  `docs/maize/config.json`, `test_data/hprc2/config.json`,
  `test/walkFormsMenu.test.ts`, `scripts/host-compat-probe.mjs`,
  `scripts/shoot-figures.mjs` (two session writes, and the two lookups that
  accept both names), `src/WalkFormsAdapter/configSchema.ts`'s docstring.
- `grep -rn LinearMultiSampleVariantDisplay --exclude-dir=node_modules --exclude-dir=dist .`
  should then come back empty.
- The forms menu already attaches by track type (`takesFormsMenu`), so it needs
  nothing here.
