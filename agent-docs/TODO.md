---
name: todo
description:
  Index of the open action items in todo/, grouped by what to do first. Read
  when picking up work, and before filing anything new here.
---

# Todo

One file per item under [todo/](todo/). Each carries its table row in its own
frontmatter: `metadata.category` picks the table, `area` and `first_move` are
the columns, `order` is where it sits. This index has no generator, so add or
remove a row here when you add or remove an entry.

Commitment, not size, separates an item here from a proposal in
[ideas/](ideas/).

## Ready to take

| Item                                                                       | Area       | First move                                                                                                                                               |
| -------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Strip under LinearGraphDisplay](todo/strip-under-linear-graph-display.md) | walk strip | Pass `host: false` to walkStripApplies from a track and see what the track needs.                                                                        |
| [Circular contigs](todo/circular-contigs.md)                               | circular   | Add an optional `Graph.circular`, set at load when a link joins the reference path's last step to its first, with the five ring fixtures as tests.       |
| [WebGL2 backend](todo/webgl2-backend.md)                                   | drawing    | Copy bandage-core's scripts/render-lab/glPrototype.ts to src/renderer/WebGL2Renderer.ts implementing `Renderer`, and point the lab's 'gl' painter at it. |

## Needs a visual call

| Item                                                                         | Area       | First move                                                         |
| ---------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------ |
| [Halo behind arrowheads](todo/halo-behind-arrowheads.md)                     | drawing    | Prototype the barb-only stroke and look at an abutting joint.      |
| [The lifted walk's colour on its bar](todo/lifted-walk-colour-on-its-bar.md) | walk strip | Pick between a chip beside the label and an outline round the bar. |
