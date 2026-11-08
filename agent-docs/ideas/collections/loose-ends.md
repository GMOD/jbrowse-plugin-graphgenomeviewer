---
name: loose-ends
description:
  Small cleanups: render errors through core DisplayChrome, model caches as
  computeds, keyboard on the pane, Auto colour's dropped domain.
---

# Loose ends

- LinearGraphDisplay shows render errors through GraphCanvas's own banner;
  moving to core's `DisplayChrome` would give it core's renderError phase
- Model caches (hitDetection, edgeCurves, graphLabels, GeometryBuilder,
  forceLayouts) are WeakMaps that could be observed computeds; force and ordered
  could cut with margins and re-cut only when the window leaves the cut
- The pane takes no keyboard: its canvas has no tab stop and no key zoom or pan,
  only the label chips do
- `colorOfScheme('auto', domain)` in `nodeColor.ts` returns `{}`, so Auto drops
  a stated domain
- `pnpm-workspace.yaml` has `minimumReleaseAgeExclude` but no
  `minimumReleaseAge` of its own, so the age is pnpm's default; stating one is a
  policy call
