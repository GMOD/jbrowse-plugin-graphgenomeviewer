# Configuration

## The graph as a track

A graph track's display is `LinearGraphDisplay`. It cuts the view's window plus
a window-width each side and re-cuts once the view leaves the cut, keeping its
sample rows in the order they were drawn. On a layout whose x is reference bp,
such as Anchored, Sample rows, Walk rows or the Variant map, the graph draws
under the view's own coordinates and pans and zooms with it. The force-directed
and ordered layouts draw in their own coordinates inside the track, fitted to
it, with their own zoom in the track menu, the way a variant matrix does. The
track menu also picks the layout, the colour, a walk to lift out, and opens the
settings.

```json
{
  "type": "FeatureTrack",
  "trackId": "hprc_graph",
  "name": "HPRC release 2 graph",
  "assemblyNames": ["hg38"],
  "adapter": { "type": "RgfaTabixAdapter", "uri": "https://example.com/hprc" },
  "displays": [
    {
      "type": "LinearGraphDisplay",
      "displayId": "hprc_graph-LinearGraphDisplay"
    },
    {
      "type": "LinearBasicDisplay",
      "displayId": "hprc_graph-LinearBasicDisplay"
    }
  ]
}
```

The first display is the one the track opens with; the second is the segments
lane, one block per segment, reachable from the track menu.

A fine cut spans at most 5 Mb. An rGFA track can carry a coarse tier, one node
per bubble, built by `build_bubble_tier.sh` in jbrowse-components; past
`aboveBpPerPx` in the linear view the track cuts that pair instead, with no bp
cap:

```json
{
  "type": "RgfaTabixAdapter",
  "uri": "https://example.com/hprc-v2.0-mc-grch38",
  "coarse": {
    "uri": "https://example.com/hprc-v2.0-mc-grch38.tier10000",
    "aboveBpPerPx": 1000
  }
}
```

**Add → Graph genome view** opens a whole GFA file in a view of its own, with
the same layouts and its own pan and zoom.
