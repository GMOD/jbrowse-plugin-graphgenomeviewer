---
name: synteny-getfeatures-dispatch
description:
  Share the synteny adapters' anchor-or-pair getFeatures dispatch through
  ComparativeAdapterBase, or drop the deprecated GBZ synteny adapter and leave
  nothing to share.
---

# The synteny adapters' getFeatures dispatch

- `GbzBaseSyntenyAdapter` and `WalkTabixSyntenyAdapter` each choose between
  anchor features and pair features in `getFeatures`. They already share
  `matchFeature` and the "Reading X against Y" status.
- A review left the dispatch out of `ComparativeAdapterBase` because the
  adapters check different things first: the GBZ adapter its anchor and
  haplotype index, the walk adapter its name lookup.
- Against: an abstract preflight step could hold that difference. The GBZ route
  is deprecated, and removing its synteny adapter would leave one adapter and
  nothing to share.
- First move: decide whether `GbzBaseSyntenyAdapter` stays. Configs in the wild
  name it, so removing it needs a plan for them.
