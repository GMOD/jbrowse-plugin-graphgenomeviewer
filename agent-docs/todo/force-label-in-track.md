---
name: force-label-in-track
description:
  A track's "Force-directed" layout runs the stress engine, which draws an
  anchored graph by placement alone, so the label names an engine the track does
  not use.
metadata:
  category: visual
  area: menus
  first_move: 'Pick the track label for force mode under the stress engine.'
  order: 3
---

# "Force-directed" in a track names the wrong engine

- In a graph track, `layoutMode: 'force'` hands the cut to the track's engine,
  stress by default since 6.20.0 (`LinearGraphDisplay/model.ts`). Under ADR-045
  stress draws a graph with a backbone by `stressPlacement` alone: a straight
  reference, lenses, teardrops and arches, the same under every seed.
- The menu and the settings dialog still say "Force-directed"
  (`FORCE_LAYOUT_LABEL` in bandage-core `layoutModes.ts`, the "Force-directed
  layout" group in `GraphSettingsDialog.tsx`), and the mode's description says
  "OGDF FMMM". Only the graph view, whose engine defaults to FMMM, draws what
  the label says.
- The JBrowse 2 v5 paper stopped calling Figure 5's track drawing force-directed
  on 2026-10-11 (paper b70e5c0), so the paper and the menu now disagree.
- Options: label the mode by the engine that will run it in that host ("Placed"
  or "Stress" in a track, "Force-directed" in the view), or rename the mode
  "Free layout" with the engine as a second line.
