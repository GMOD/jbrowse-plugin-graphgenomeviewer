---
name: draw-a-node-once-per-carrier
description:
  Multi-row carriage needs synthetic per-carrier ids plus hit detection that
  resolves them back, since the row layout emits one position per node id.
---

# Draw a node once per carrier

`sampleRowLayout` emits one position per node id and the renderer keys geometry
by that id, so real multi-row carriage needs synthetic per-carrier ids plus hit
detection resolving them back.
