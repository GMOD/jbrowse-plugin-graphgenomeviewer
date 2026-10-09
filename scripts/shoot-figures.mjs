#!/usr/bin/env node
//
// Reshoots the figures in img/ from jbrowse.org's hosted HPRC demo, with this
// checkout's dist/ standing in for the published bundle.
//
// Usage:
//   node scripts/shoot-figures.mjs                 # every figure, into img/
//   node scripts/shoot-figures.mjs force_mhc --out /tmp/figs
//
// Every figure is a linear view on the demo's hg38, the graph as one of its
// tracks or as a view opened under it, so each reads against the genes and
// annotations at their bp. tube_map_reads.png draws a local fixture instead: it
// is a frame of test/tubeMapReads.test.ts, which writes
// test-screenshots/tube_map_reads.png.
import path from 'node:path'
import { parseArgs } from 'node:util'

import puppeteer from 'puppeteer'

import { candidateServer } from './serveCandidate.mjs'

const CONFIG = 'https://jbrowse.org/demos/hprc/config.json'
const GENES = 'hg38_ncbiRefSeq_ucsc'
const RGFA = 'hprc_minigraph_segments'
const GBZ = 'hprc_v2_1_gbz_lanes'
const MICB_EXONS = {
  refName: 'chr6',
  assemblyName: 'hg38',
  start: 31505400,
  end: 31507400,
}
const HAPLOTYPES = [
  'HG00097.1',
  'HG00099.1',
  'HG00128.1',
  'HG00133.1',
  'HG01109.1',
  'HG01123.1',
  'HG01960.1',
  'HG02055.1',
]

const sleep = ms => new Promise(r => setTimeout(r, ms))

const KIV2_LOC = 'chr6:160,525,000-160,655,000'
const KIV2_ARRAY_LOC = 'chr6:160,614,798-160,647,758'
const MHC_LOC = 'chr6:32,510,000-32,600,000'
const MICB_LOC = 'chr6:31,505,400-31,507,400'
const GSTM1_LOC = 'chr1:109,670,000-109,705,000'

const GENE_TRACK = {
  trackId: GENES,
  type: 'LinearBasicDisplay',
  geneGlyphMode: 'longestCoding',
  displayMode: 'compact',
  height: 60,
}
const VNTR_TRACK = {
  trackId: 'hprc_curated_vntrs',
  type: 'LinearBasicDisplay',
  height: 45,
}
const BUBBLE_TRACK = {
  trackId: 'hprc_minigraph_bubbles',
  type: 'LinearBasicDisplay',
  displayMode: 'compact',
  height: 70,
}
// The multiple alignment from the gbz graph's Minigraph-Cactus build, whose
// rows carry the walks' own names, so a lane of the walks a figure draws reads
// row for row against the graph. The adapter's samples pick the rows because a
// display's row focus covers the first label with its chip.
const MAF = 'hprc_v2_1_mc_grch38_maf'
function mafLane(samples) {
  return {
    trackId: MAF,
    type: 'LinearMafDisplay',
    showCoverage: false,
    sessionTrack: {
      type: 'MafTrack',
      trackId: MAF,
      name: 'HPRC release 2 alignment',
      assemblyNames: ['hg38'],
      adapter: {
        type: 'BgzipMafAdapter',
        uri: 'https://s3-us-west-2.amazonaws.com/human-pangenomics/pangenomes/freeze/release2/minigraph-cactus/v2.1/hprc-v2.1-mc-grch38/hprc-v2.1-mc-grch38.full.maf.gz',
        samples,
      },
    },
  }
}
// The callset's phased rows of the cut's haplotypes, first and labelled as the
// graph names its walks, the lane tall enough for them alone and the rest of
// the 464 scrolled below. A row focus would narrow the rows the same way but
// cover the first label with its chip.
function phasedRow(haplotype) {
  const [sample, n] = haplotype.split('.')
  return `${sample} HP${Number(n) - 1}`
}
const CALLSET_ROW_PX = 18
const CALLSET_TRACK = {
  trackId: 'hprc2_wave_grch38',
  type: 'LinearMultiSampleVariantDisplay',
  rows: {
    domain: HAPLOTYPES.map(phasedRow),
    labels: Object.fromEntries(HAPLOTYPES.map(h => [phasedRow(h), h])),
  },
  rowHeight: CALLSET_ROW_PX,
  height: HAPLOTYPES.length * CALLSET_ROW_PX,
  showTree: false,
}

function graphView(props) {
  return {
    type: 'GraphGenomeView',
    displayName: 'hg38',
    subgraphContext: 0,
    color: { field: 'position' },
    geneTrackId: GENES,
    ...props,
  }
}

function linearView(loc, tracks, below = []) {
  return {
    sessionTracks: tracks.flatMap(t => t.sessionTrack ?? []),
    views: [
      {
        type: 'LinearGenomeView',
        assembly: 'hg38',
        loc,
        tracks: tracks.map(({ sessionTrack, ...track }) => track),
      },
      ...below,
    ],
  }
}

// the gene track, any others, then the graph track under them
function trackView(loc, graphDisplay, above = [], below = []) {
  return linearView(
    loc,
    [GENE_TRACK, ...above, { type: 'LinearGraphDisplay', ...graphDisplay }],
    below,
  )
}

const kiv2Force = {
  trackId: RGFA,
  layoutMode: 'force',
  color: { field: 'position' },
  maxRegionBp: 143000,
  height: 400,
}
const kiv2Gbz = {
  trackId: GBZ,
  layoutMode: 'force',
  color: { field: 'position' },
  subgraphHaplotypes: HAPLOTYPES,
}
const forceKiv2Track = trackView(KIV2_LOC, kiv2Force, [VNTR_TRACK])

// Points at the graph track's longest allele through its drawn midpoint, as a
// reader would, so the strip boxes its span between its flanks
async function hoverLongestAllele(page) {
  const target = await page.evaluate(() => {
    const display = window.JBrowseSession.views[0].tracks
      .map(t => t.displays[0])
      .find(d => d.type === 'LinearGraphDisplay')
    const node = display.graph.nodes
      .filter(n => n.stable?.rank > 0)
      .reduce((a, b) => (b.length > a.length ? b : a))
    const points = display.nodePositions[node.id]
    const p = points[Math.floor(points.length / 2)]
    const r = document
      .querySelector(
        '[data-testid="linear-graph-display"] [data-testid="graph-genome-canvas"]',
      )
      .getBoundingClientRect()
    return {
      x: r.x + p.x * display.scaleX + display.translateX,
      y: r.y + p.y * display.scaleY + display.translateY,
    }
  })
  await page.mouse.move(target.x, target.y)
}

// Points at the first allele the graph view draws inside an exon: the box
// whose reference span, between its flanks, lies in one of the gene's exons
// and is shortest
async function hoverExonVariant(page) {
  const target = await page.evaluate(() => {
    const view = window.JBrowseSession.views[1]
    const r = document
      .querySelector(
        `[data-testid="view-container-${view.id}"] [data-testid="graph-genome-canvas"]`,
      )
      .getBoundingClientRect()
    const exons = view.backboneGenes.flatMap(g => g.exons)
    const hits = new Map()
    for (let sx = 0; sx < r.width; sx += 2) {
      for (let sy = 0; sy < r.height; sy += 3) {
        const id = view.tubeMapNodeAt(sx, sy)
        if (id && !hits.has(id)) {
          hits.set(id, { sx, sy, span: view.nodeSpan(id) })
        }
      }
    }
    const inExon = [...hits.values()]
      .filter(
        h =>
          h.span &&
          exons.some(e => h.span.start >= e.start && h.span.end <= e.end),
      )
      .sort(
        (a, b) =>
          a.span.end - a.span.start - (b.span.end - b.span.start) ||
          a.sx - b.sx,
      )
    const hit = inExon[0]
    return hit ? { x: r.x + hit.sx, y: r.y + hit.sy } : undefined
  })
  if (!target) {
    throw new Error('no allele inside an exon to hover')
  }
  await page.mouse.move(target.x, target.y)
}

const FIGURES = {
  force_kiv2: forceKiv2Track,
  force_kiv2_hover: { session: forceKiv2Track, act: hoverLongestAllele },
  force_kiv2_bubbles: trackView(
    KIV2_LOC,
    {
      ...kiv2Force,
      layers: ['deletions', 'genes', 'referenceStrip', 'bubbles'],
    },
    [VNTR_TRACK, BUBBLE_TRACK],
  ),
  // six of the eight lack GSTM1; the strip pales HG00133's missing stretch, and
  // the synteny view under it reads HG00133 against GRCh38 from the same graph,
  // its deletion a wedge pinched to a point on HG00133's contig
  force_gstm1_walk: trackView(
    GSTM1_LOC,
    {
      trackId: GBZ,
      layoutMode: 'force',
      color: { field: 'position' },
      subgraphHaplotypes: HAPLOTYPES,
      walkLayers: [{ walk: 'HG00133#1#CM090045.1' }],
      height: 460,
    },
    [mafLane(HAPLOTYPES)],
    [
      {
        type: 'LinearSyntenyView',
        tracks: [GBZ],
        collapseEmptyRows: true,
        views: [
          { assembly: 'hg38', loc: GSTM1_LOC, tracks: [GENE_TRACK] },
          { assembly: 'HG00133.1', loc: 'CM090045.1:109,741,100-109,757,750' },
        ],
      },
    ],
  ),
  // three routes through GSTM1: HG01960 through GRCh38's copy, HG00133 past
  // it, and HG03041 round a copy of its own the graph never merged with it
  force_gstm1_three_ways: trackView(
    GSTM1_LOC,
    {
      trackId: GBZ,
      layoutMode: 'force',
      subgraphHaplotypes: ['HG01960.1', 'HG00133.1', 'HG03041#2'],
      walkLayers: [
        { walk: 'HG01960#1#CM088644.1' },
        { walk: 'HG00133#1#CM090045.1' },
        { walk: 'HG03041#2#CM088727.1' },
      ],
      height: 460,
    },
    [mafLane(['HG01960.1', 'HG00133.1', 'HG03041.2'])],
  ),
  force_kiv2_popped: {
    session: trackView(
      KIV2_LOC,
      {
        ...kiv2Force,
        layers: ['deletions', 'genes', 'referenceStrip', 'bubbles'],
      },
      [VNTR_TRACK],
    ),
    // opens the largest bubble in the window, the KIV-2 array
    act: page =>
      page.evaluate(() => {
        const display = window.JBrowseSession.views[0].tracks
          .map(t => t.displays[0])
          .find(d => d.type === 'LinearGraphDisplay')
        const [array] = [...display.bubbles].sort(
          (a, b) => b.segmentCount - a.segmentCount,
        )
        display.popBubble(array)
      }),
  },
  // each walk takes its own loops through the array: HG01960 skips GRCh38's
  force_kiv2_facet: trackView(
    KIV2_ARRAY_LOC,
    {
      ...kiv2Gbz,
      walkLayers: [
        { walk: 'GRCh38#0#chr6' },
        { walk: 'HG00097#1#JBIRDD010000043.1' },
        { walk: 'HG01960#1#JBHIHM010000036.1' },
        { walk: 'HG00133#1#CM090050.1' },
      ],
      facet: 'walk',
      height: 560,
    },
    [VNTR_TRACK],
  ),
  walk_rows_kiv2: {
    session: trackView(
      KIV2_ARRAY_LOC,
      {
        ...kiv2Gbz,
        layoutMode: 'walkrows',
        color: 'uniform',
        repeatTrackId: 'hprc_curated_vntrs',
        height: 300,
      },
      [VNTR_TRACK],
    ),
    // the Repeat picker lists the arrays the repeat track has over the cut
    act: async page => {
      await page.waitForFunction(
        () =>
          window.JBrowseSession.views[0].tracks
            .map(t => t.displays[0])
            .find(d => d.type === 'LinearGraphDisplay')?.repeatChoices.length >
          0,
        { timeout: 60_000 },
      )
      await page.evaluate(() => {
        const display = window.JBrowseSession.views[0].tracks
          .map(t => t.displays[0])
          .find(d => d.type === 'LinearGraphDisplay')
        display.setRepeatKey(display.repeatChoices[0].key)
      })
    },
  },
  tube_map_micb_track: trackView(
    MICB_LOC,
    {
      trackId: GBZ,
      layoutMode: 'tubemap',
      subgraphHaplotypes: HAPLOTYPES,
      height: 360,
    },
    [mafLane(HAPLOTYPES)],
  ),
  tube_map_micb_ref: trackView(
    MICB_LOC,
    {
      trackId: GBZ,
      layoutMode: 'tubemapref',
      subgraphHaplotypes: HAPLOTYPES,
      height: 420,
    },
    [mafLane(HAPLOTYPES)],
  ),
  // hovering one of HG00133's genotype cells keeps its tube and greys the rest
  tube_map_micb_row_hover: {
    session: trackView(
      MICB_LOC,
      {
        trackId: GBZ,
        layoutMode: 'tubemapref',
        subgraphHaplotypes: HAPLOTYPES,
        height: 420,
      },
      [CALLSET_TRACK],
    ),
    act: hoverCallsetCell('HG00133 HP0'),
  },
  // the cut opened as a view under the linear view it came from; hovering a
  // variant's box in the view bands its bp in the linear view
  tube_map_micb: {
    session: linearView(
      MICB_LOC,
      [GENE_TRACK],
      [
        graphView({
          loadedTrackId: GBZ,
          loadedRegion: MICB_EXONS,
          subgraphHaplotypes: HAPLOTYPES,
          layoutMode: 'tubemap',
          paneHeight: 360,
        }),
      ],
    ),
    act: hoverExonVariant,
  },
  // HG01071's 47 kb allele comes in between HLA-DRB5 and HLA-DRB6
  force_mhc: {
    session: trackView(MHC_LOC, {
      trackId: RGFA,
      layoutMode: 'force',
      color: { field: 'position' },
      height: 420,
    }),
    act: hoverLongestAllele,
  },
}

// The curated VNTR track paints its array goldenrod, the colour exons take
// on the graph
async function recolorAnnotations(page) {
  await page.evaluate(() => {
    for (const view of window.JBrowseSession.views) {
      for (const track of view.tracks ?? []) {
        if (track.configuration.trackId === 'hprc_curated_vntrs') {
          track.displays[0].setFeatureColor('rgb(110,110,110)')
        }
      }
    }
  })
}

// A lane's rows in the order the graph's key lists the walks, so the two read
// top to bottom alike: the MAF names a walk's row `HG00097.1`, the phased
// callset `HG00097 HP0`. A drawing with no key keeps the lane's own order.
async function orderLaneRowsByKey(page) {
  await page.evaluate(() => {
    const displays = window.JBrowseSession.views[0].tracks.map(
      t => t.displays[0],
    )
    const graph = displays.find(d => d.type === 'LinearGraphDisplay')
    const spellings = {
      LinearMafDisplay: (sample, n) => `${sample}.${n}`,
      LinearMultiSampleVariantDisplay: (sample, n) => `${sample} HP${n - 1}`,
    }
    for (const lane of displays) {
      const spell = spellings[lane.type]
      if (graph && spell) {
        const rows = new Set(lane.sources.map(s => s.name))
        lane.setRowOrder(
          graph.pathLegend
            .map(({ name }) => {
              const [sample, n] = name.split('#')
              return { name: spell(sample, Number(n)) }
            })
            .filter(r => rows.has(r.name)),
        )
      }
    }
  })
}

// Points at a cell of one haplotype's callset row, so the lane publishes that
// row and the graph lifts its walk
function hoverCallsetCell(row) {
  return async page => {
    const lane = await page.evaluate(
      (name, rowPx) => {
        const display = window.JBrowseSession.views[0].tracks
          .map(t => t.displays[0])
          .find(d => d.type === 'LinearMultiSampleVariantDisplay')
        const r = document
          .querySelector('[data-testid="variant-display"]')
          .getBoundingClientRect()
        const index = display.sources.findIndex(s => s.name === name)
        return { x: r.x, width: r.width, y: r.y + (index + 0.5) * rowPx }
      },
      row,
      CALLSET_ROW_PX,
    )
    for (let x = 0; x < lane.width; x += 1) {
      await page.mouse.move(lane.x + x, lane.y)
      const name = await page.evaluate(
        () => window.JBrowseSession.hovered?.hoverFeature?.name,
      )
      if (name === row) {
        return
      }
    }
    throw new Error(`no cell of ${row} to hover`)
  }
}

// Painted, not merely loaded: a 15,808-node cut reports its node count seconds
// before FMMM finishes, and a screenshot then catches an empty pane.
async function waitPainted(page) {
  await page.waitForFunction(
    () => {
      const text = document.body.innerText
      const tracks = [
        ...document.querySelectorAll('[data-testid="linear-graph-display"]'),
      ]
      const drawn =
        tracks.length > 0
          ? tracks.every(t => Number(t.getAttribute('data-node-count')) > 0)
          : /\d nodes/.test(text)
      return drawn && !/Computing layout|Laying out|Loading/.test(text)
    },
    { timeout: 180_000, polling: 500 },
  )
  await page.waitForFunction(
    () =>
      document
        .querySelector('[data-testid="app-ready-marker"]')
        ?.getAttribute('data-app-phase') === 'ready',
    { timeout: 180_000, polling: 250 },
  )
  await page.evaluate(
    () =>
      new Promise(r => {
        requestAnimationFrame(() => requestAnimationFrame(r))
      }),
  )
}

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    out: { type: 'string', default: 'img' },
    dist: { type: 'string', default: 'dist' },
    version: { type: 'string', default: 'main' },
  },
})
const names = positionals.length > 0 ? positionals : Object.keys(FIGURES)

const browser = await puppeteer.launch({
  args: ['--no-sandbox', '--enable-unsafe-swiftshader'],
})
try {
  for (const name of names) {
    const figure = FIGURES[name]
    if (!figure) {
      throw new Error(`no figure ${name}: ${Object.keys(FIGURES).join(', ')}`)
    }
    const { session, act } = figure.views ? { session: figure } : figure
    const context = await browser.createBrowserContext()
    const page = await context.newPage()
    await page.setViewport({ width: 1400, height: 1600 })
    await candidateServer(values.dist)(page)
    await page.goto(
      `https://jbrowse.org/code/jb2/${values.version}/?config=${encodeURIComponent(CONFIG)}&session=spec-${encodeURIComponent(JSON.stringify(session))}`,
      { waitUntil: 'domcontentloaded', timeout: 60_000 },
    )
    await waitPainted(page)
    await recolorAnnotations(page)
    await orderLaneRowsByKey(page)
    if (act) {
      await act(page)
      await sleep(1000)
      await waitPainted(page)
    }
    await page
      .waitForNetworkIdle({ idleTime: 1500, timeout: 90_000 })
      .catch(() => {})
    await sleep(2500)
    const clip = await page.evaluate(() => {
      const rects = [
        ...document.querySelectorAll('[data-testid^="view-container"]'),
      ].map(el => el.getBoundingClientRect())
      const x = Math.min(...rects.map(r => r.x))
      const y = Math.min(...rects.map(r => r.y))
      return {
        x,
        y,
        width: Math.max(...rects.map(r => r.right)) - x,
        height: Math.max(...rects.map(r => r.bottom)) - y,
      }
    })
    // captureBeyondViewport resizes the page for the capture, and the pane
    // re-lays out into a blank frame
    const file = path.join(values.out, `${name}.png`)
    await page.screenshot({ path: file, clip, captureBeyondViewport: false })
    console.log(`wrote ${file}`)
    await context.close()
  }
} finally {
  await browser.close()
}
