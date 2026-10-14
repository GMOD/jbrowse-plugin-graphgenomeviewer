---
name: force-label-in-track
description:
  The force mode's tooltip says "OGDF FMMM" under either engine until the plugin
  takes bandage-core's fix.
metadata:
  category: ready
  area: menus
  first_move: 'Take the first bandage-core release after 10.2.4.'
  order: 3
---

# The force mode's description names one engine

- The Layout menu names the engine since 79a43bb and 5592502: "Force-directed
  (FMMM)" and "Force-directed (stress)", with the engine in the header.
- `LayoutSelect.tsx` shows the mode's description as the option's tooltip.
  bandage-core 10.2.4 still says "OGDF FMMM, via the external Bandage engine";
  bandage-core 6f01301 names both engines but is unreleased.
