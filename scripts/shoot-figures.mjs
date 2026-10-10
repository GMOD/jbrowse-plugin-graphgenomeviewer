#!/usr/bin/env node
//
// Reshoots the figures in img/ on jbrowse.org's hosted JBrowse, with this
// checkout's dist/ standing in for the published bundle. FIGURES holds every
// one, each `{ session, act?, config? }`: the session spec, what to do before
// the shot, and the config, the HPRC demo's unless it names another.
//
// Usage:
//   node scripts/shoot-figures.mjs                 # every figure, into img/
//   node scripts/shoot-figures.mjs force_mhc --out /tmp/figs
//   node scripts/shoot-figures.mjs --compare /tmp/diffs   # old | new | diff
//
// Every figure is a linear view, the graph as one of its tracks or as a view
// opened under it, so each reads against the genes and annotations at their
// bp. A figure on local data names a config under FIXTURES, which serves
// test_data/ from the same host.
import fs from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'

import puppeteer from 'puppeteer'

import { candidateServer } from './serveCandidate.mjs'

const CONFIG = 'https://jbrowse.org/demos/hprc/config.json'
const FIXTURES = '/__figure_fixtures__/'
const FIXTURES_URL = `https://jbrowse.org${FIXTURES}`
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
const C4_LOC = 'chr6:31,978,000-32,045,000'
const CFHR_LOC = 'chr1:196,745,000-196,860,000'
const SAMPLES = HAPLOTYPES.map(h => h.split('.')[0])

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

function linearView(loc, tracks, below = [], assembly = 'hg38') {
  return {
    sessionTracks: tracks.flatMap(t => t.sessionTrack ?? []),
    views: [
      {
        type: 'LinearGenomeView',
        assembly,
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

const cfhrSamples = trackView(CFHR_LOC, {
  trackId: GBZ,
  layoutMode: 'tubemapref',
  subgraphHaplotypes: SAMPLES,
  tubeMapFold: 1000,
  facet: 'sample',
  height: 900,
})

// the first six samples of each superpopulation in the demo's sample table
const POPULATION_SAMPLES = [
  ...['HG02257', 'HG02486', 'HG02615', 'HG03139', 'HG03209', 'NA18879'],
  ...['HG01074', 'HG01081', 'HG01175', 'HG01243', 'HG01361', 'HG01433'],
  ...['HG00408', 'HG00423', 'HG02165', 'NA18943', 'NA18945', 'NA19087'],
  ...['HG00097', 'HG00320', 'HG00323', 'HG01530', 'NA20503', 'NA20752'],
  ...['HG02602', 'HG02698', 'HG03704', 'HG03834', 'HG03942', 'HG04160'],
]

const cfhrPopulations = trackView(CFHR_LOC, {
  trackId: GBZ,
  layoutMode: 'tubemapref',
  subgraphHaplotypes: POPULATION_SAMPLES,
  tubeMapFold: 1000,
  facet: 'superpopulation',
  height: 1250,
})

const c4Bundled = trackView(C4_LOC, {
  trackId: GBZ,
  layoutMode: 'tubemapref',
  subgraphHaplotypes: POPULATION_SAMPLES,
  tubeMapFold: 1000,
  tubeMapRoutes: 'bundled',
  height: 700,
})

// Points at the box `sample`'s panel draws over `bp` of the linear view, as a
// reader would at a gene above it
function hoverPanelBox(sample, bp) {
  return async page => {
    const target = await page.evaluate(
      (name, at) => {
        const view = window.JBrowseSession.views[0]
        const display = view.tracks
          .map(t => t.displays[0])
          .find(d => d.type === 'LinearGraphDisplay')
        const panel = display.tubeMapPanelViews.find(p =>
          p.label.startsWith(name),
        )
        const r = document
          .querySelector(
            '[data-testid="linear-graph-display"] [data-testid="graph-genome-canvas"]',
          )
          .getBoundingClientRect()
        const sx =
          view.bpToPx({ refName: display.graphRegion.refName, coord: at })
            .offsetPx - view.offsetPx
        for (let sy = panel.top; sy < panel.bottom; sy += 2) {
          if (display.tubeMapNodeAt(sx, sy)) {
            return { x: r.x + sx, y: r.y + sy }
          }
        }
        return undefined
      },
      sample,
      bp,
    )
    if (!target) {
      throw new Error(`no box in ${sample}'s panel at ${bp}`)
    }
    await page.mouse.move(target.x, target.y)
  }
}

// Points at the tube of the route `member` takes, in the column over `bp`, so
// its hover lists every haplotype on that route
function hoverRoute(member, bp) {
  return async page => {
    const target = await page.evaluate(
      (name, at) => {
        const view = window.JBrowseSession.views[0]
        const display = view.tracks
          .map(t => t.displays[0])
          .find(d => d.type === 'LinearGraphDisplay')
        const r = document
          .querySelector(
            '[data-testid="linear-graph-display"] [data-testid="graph-genome-canvas"]',
          )
          .getBoundingClientRect()
        const sx =
          view.bpToPx({ refName: display.graphRegion.refName, coord: at })
            .offsetPx - view.offsetPx
        for (let sy = 0; sy < r.height; sy += 1) {
          const tube = display.tubeAt(sx, sy)
          const path = tube && display.hoverGraph?.paths?.[tube.track]
          if (path?.members?.some(m => m.startsWith(name))) {
            return { x: r.x + sx, y: r.y + sy }
          }
        }
        return undefined
      },
      member,
      bp,
    )
    if (!target) {
      throw new Error(`no tube of ${member}'s route at ${bp}`)
    }
    await page.mouse.move(target.x, target.y)
  }
}

const FIGURES = {
  force_kiv2: { session: forceKiv2Track },
  force_kiv2_hover: { session: forceKiv2Track, act: hoverLongestAllele },
  force_kiv2_bubbles: {
    session: trackView(
      KIV2_LOC,
      {
        ...kiv2Force,
        layers: { bubbles: true },
      },
      [VNTR_TRACK, BUBBLE_TRACK],
    ),
  },
  // six of the eight lack GSTM1; the strip pales HG00133's missing stretch, and
  // the synteny view under it reads HG00133 against GRCh38 from the same graph,
  // its deletion a wedge pinched to a point on HG00133's contig
  force_gstm1_walk: {
    session: trackView(
      GSTM1_LOC,
      {
        trackId: GBZ,
        layoutMode: 'force',
        color: { field: 'position' },
        subgraphHaplotypes: HAPLOTYPES,
        walkLayers: [{ walk: 'HG00133#1#CM090045.1' }],
        height: 260,
      },
      [mafLane(HAPLOTYPES)],
      [
        {
          type: 'LinearSyntenyView',
          tracks: [GBZ],
          collapseEmptyRows: true,
          views: [
            { assembly: 'hg38', loc: GSTM1_LOC, tracks: [GENE_TRACK] },
            {
              assembly: 'HG00133.1',
              loc: 'CM090045.1:109,741,100-109,757,750',
            },
          ],
        },
      ],
    ),
  },
  // three routes through GSTM1: HG01960 through GRCh38's copy, HG00133 past
  // it, and HG03041 round a copy of its own the graph never merged with it
  force_gstm1_three_ways: {
    session: trackView(
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
  },
  force_kiv2_open: {
    session: trackView(
      KIV2_LOC,
      {
        ...kiv2Force,
        layers: { bubbles: true },
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
        display.toggleBubble(array)
      }),
  },
  // each walk takes its own loops through the array: HG01960 skips GRCh38's
  force_kiv2_facet: {
    session: trackView(
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
  },
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
  // a panel per sample, both haplotypes beside the reference: HG01109,
  // HG01123, HG01960 and HG02055 lack CFHR3 and CFHR1 on both, the other four
  // carry them
  tube_map_cfhr_samples: { session: cfhrSamples },
  // the reference's CFHR3-CFHR1 box hovered in HG01960's panel: each title
  // counts its haplotypes through it, 2 of 2 for the carriers and 0 of 2 for
  // the four without
  tube_map_cfhr_samples_hover: {
    session: cfhrSamples,
    act: hoverPanelBox('HG01960', 196_826_000),
  },
  // a panel per superpopulation, six samples each, CFHR1's box hovered in
  // AFR's: each title counts its haplotypes through it
  tube_map_cfhr_populations_hover: {
    session: cfhrPopulations,
    act: hoverPanelBox('AFR', 196_826_000),
  },
  // the RCCX module's 60 haplotypes as a tube per route: 35 take one, skipping
  // C4B's HERV-K, and the thin tubes skip or add a whole module
  tube_map_c4_bundled: { session: c4Bundled },
  // HG00320's and HG03139's route hovered where it skips GRCh38's second
  // module: one C4 gene
  tube_map_c4_bundled_hover: {
    session: c4Bundled,
    act: hoverRoute('HG00320#1', 32_005_000),
  },
  // one map, each route a stack of its superpopulations' strands
  tube_map_c4_routes_by_population: {
    session: trackView(C4_LOC, {
      trackId: GBZ,
      layoutMode: 'tubemapref',
      subgraphHaplotypes: POPULATION_SAMPLES,
      tubeMapFold: 1000,
      tubeMapRoutes: 'bundled',
      tubeMapColorBy: 'superpopulation',
      height: 700,
    }),
  },
  // every haplotype its own tube, ordered route by route and by population
  tube_map_c4_grouped_by_population: {
    session: trackView(C4_LOC, {
      trackId: GBZ,
      layoutMode: 'tubemapref',
      subgraphHaplotypes: POPULATION_SAMPLES,
      tubeMapFold: 1000,
      tubeMapRoutes: 'grouped',
      tubeMapColorBy: 'superpopulation',
      height: 900,
    }),
  },
  tube_map_micb_track: {
    session: trackView(
      MICB_LOC,
      {
        trackId: GBZ,
        layoutMode: 'tubemap',
        subgraphHaplotypes: HAPLOTYPES,
        height: 360,
      },
      [mafLane(HAPLOTYPES)],
    ),
  },
  tube_map_micb_ref: {
    session: trackView(
      MICB_LOC,
      {
        trackId: GBZ,
        layoutMode: 'tubemapref',
        subgraphHaplotypes: HAPLOTYPES,
        height: 420,
      },
      [mafLane(HAPLOTYPES)],
    ),
  },
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
  // sequenceTubeMap's cactus graph with the NA12879 reads over nodes 240..280,
  // each read's mismatches marked
  tube_map_reads: {
    config: `${FIXTURES_URL}cactus/config.json`,
    session: linearView(
      'ref:23,555-23,615',
      [
        {
          type: 'LinearGraphDisplay',
          trackId: 'cactus_gbz',
          layoutMode: 'tubemapref',
          height: 520,
        },
      ],
      [],
      'cactus',
    ),
  },
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
          track.displays[0].setColorValue('rgb(110,110,110)')
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

// The pixels two shots of a figure differ by, and a strip of old, new and the
// differing pixels in red, drawn on a blank page of the browser at hand
async function compareShots(browser, before, after) {
  const page = await browser.newPage()
  try {
    return await page.evaluate(
      async (a, b) => {
        const load = src =>
          new Promise((resolve, reject) => {
            const img = new Image()
            img.onload = () => resolve(img)
            img.onerror = reject
            img.src = `data:image/png;base64,${src}`
          })
        const [old, next] = await Promise.all([load(a), load(b)])
        const pixels = img => {
          const c = new OffscreenCanvas(img.width, img.height)
          const ctx = c.getContext('2d')
          ctx.drawImage(img, 0, 0)
          return ctx.getImageData(0, 0, img.width, img.height)
        }
        const w = Math.max(old.width, next.width)
        const h = Math.max(old.height, next.height)
        const pa = pixels(old)
        const pb = pixels(next)
        const diff = new ImageData(w, h)
        let changed = 0
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const inA = x < old.width && y < old.height
            const inB = x < next.width && y < next.height
            const ia = (y * old.width + x) * 4
            const ib = (y * next.width + x) * 4
            const delta =
              inA && inB
                ? Math.max(
                    Math.abs(pa.data[ia] - pb.data[ib]),
                    Math.abs(pa.data[ia + 1] - pb.data[ib + 1]),
                    Math.abs(pa.data[ia + 2] - pb.data[ib + 2]),
                  )
                : 255
            const o = (y * w + x) * 4
            if (delta > 30) {
              changed++
              diff.data.set([220, 30, 30, 255], o)
            } else {
              const v = inB ? 255 - (255 - pb.data[ib]) / 4 : 255
              diff.data.set([v, v, v, 255], o)
            }
          }
        }
        if (changed === 0) {
          return { changed }
        }
        const strip = new OffscreenCanvas(w * 3 + 20, h)
        const ctx = strip.getContext('2d')
        ctx.fillStyle = '#000'
        ctx.fillRect(0, 0, strip.width, h)
        ctx.drawImage(old, 0, 0)
        ctx.drawImage(next, w + 10, 0)
        ctx.putImageData(diff, 2 * w + 20, 0)
        const blob = await strip.convertToBlob({ type: 'image/png' })
        const bytes = new Uint8Array(await blob.arrayBuffer())
        let binary = ''
        for (const byte of bytes) {
          binary += String.fromCharCode(byte)
        }
        return {
          changed,
          size:
            old.width === next.width && old.height === next.height
              ? undefined
              : `${old.width}x${old.height} -> ${next.width}x${next.height}`,
          strip: btoa(binary),
        }
      },
      before.toString('base64'),
      after.toString('base64'),
    )
  } finally {
    await page.close()
  }
}

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    out: { type: 'string', default: 'img' },
    dist: { type: 'string', default: 'dist' },
    version: { type: 'string', default: 'main' },
    compare: { type: 'string' },
  },
})
const unspecified = fs
  .readdirSync('img')
  .map(file => path.parse(file).name)
  .filter(name => !FIGURES[name])
if (unspecified.length > 0) {
  throw new Error(`img/ holds figures with no spec: ${unspecified.join(', ')}`)
}
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
    const { session, act, config = CONFIG } = figure
    const context = await browser.createBrowserContext()
    const page = await context.newPage()
    await page.setViewport({ width: 1400, height: 1600 })
    await candidateServer(values.dist, { [FIXTURES]: 'test_data' })(page)
    await page.goto(
      `https://jbrowse.org/code/jb2/${values.version}/?config=${encodeURIComponent(config)}&session=spec-${encodeURIComponent(JSON.stringify(session))}`,
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
    const before = fs.existsSync(file) ? fs.readFileSync(file) : undefined
    const after = Buffer.from(
      await page.screenshot({ clip, captureBeyondViewport: false }),
    )
    await context.close()
    if (values.compare === undefined || before === undefined) {
      fs.writeFileSync(file, after)
      console.log(`wrote ${file}${before ? '' : ', new'}`)
    } else {
      const { changed, size, strip } = await compareShots(
        browser,
        before,
        after,
      )
      // an unchanged figure keeps its file, so anti-aliasing noise leaves
      // no diff to commit
      if (changed === 0) {
        console.log(`kept ${file}, unchanged`)
      } else {
        fs.writeFileSync(file, after)
        fs.mkdirSync(values.compare, { recursive: true })
        fs.writeFileSync(
          path.join(values.compare, `${name}.png`),
          Buffer.from(strip, 'base64'),
        )
        console.log(
          `wrote ${file}, ${changed} px changed${size ? `, ${size}` : ''}`,
        )
      }
    }
  }
} finally {
  await browser.close()
}
