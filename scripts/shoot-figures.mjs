#!/usr/bin/env node
//
// Reshoots the figures in img/ from jbrowse.org's hosted HPRC demo, with this
// checkout's dist/ standing in for the published bundle.
//
// Usage:
//   node scripts/shoot-figures.mjs                 # every figure, into img/
//   node scripts/shoot-figures.mjs force_mhc --out /tmp/figs
//
// tube_map.png and tube_map_reads.png draw local fixtures, not the demo: they
// are frames of test/tubeMap.test.ts (its two standalone views, cropped) and
// test/tubeMapReads.test.ts, which writes test-screenshots/tube_map_reads.png.
import path from 'node:path'
import { parseArgs } from 'node:util'

import puppeteer from 'puppeteer'

import { candidateServer } from './serveCandidate.mjs'

const CONFIG = 'https://jbrowse.org/demos/hprc/config.json'
const GENES = 'hg38_ncbiRefSeq_ucsc'
const RGFA = 'hprc_minigraph_segments'
const GBZ = 'hprc_v2_1_gbz_lanes'
const KIV2 = {
  refName: 'chr6',
  assemblyName: 'hg38',
  start: 160525000,
  end: 160655000,
}
const KIV2_ARRAY = { ...KIV2, start: 160614798, end: 160647758 }
const MHC = { ...KIV2, start: 32510000, end: 32600000 }
const MICB_EXONS = { ...KIV2, start: 31505400, end: 31507400 }
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

function graphView(props) {
  return {
    views: [
      {
        type: 'GraphGenomeView',
        displayName: 'hg38',
        subgraphContext: 0,
        colorScheme: 'reference-position',
        geneTrackId: GENES,
        ...props,
      },
    ],
  }
}

const gbzCut = { loadedTrackId: GBZ, loadedRegion: KIV2_ARRAY }

function trackView(loc, graphDisplay) {
  return {
    views: [
      {
        type: 'LinearGenomeView',
        assembly: 'hg38',
        loc,
        tracks: [
          {
            trackId: GENES,
            type: 'LinearBasicDisplay',
            geneGlyphMode: 'longestCoding',
            displayMode: 'compact',
            height: 60,
          },
          { type: 'LinearGraphDisplay', ...graphDisplay },
        ],
      },
    ],
  }
}

const kiv2Force = {
  trackId: RGFA,
  layoutMode: 'force',
  colorScheme: 'reference-position',
  maxRegionBp: 143000,
  height: 400,
}
const forceKiv2Track = trackView('chr6:160,525,000-160,655,000', kiv2Force)

// Points at the graph track's longest allele through its drawn midpoint, as a
// reader would, so the strip boxes its span between its flanks
async function hoverLongestAllele(page) {
  const target = await page.evaluate(() => {
    const display = window.JBrowseSession.views[0].tracks[1].displays[0]
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

const FIGURES = {
  force_kiv2: forceKiv2Track,
  force_kiv2_hover: { session: forceKiv2Track, act: hoverLongestAllele },
  force_kiv2_bubbles: trackView('chr6:160,525,000-160,655,000', {
    ...kiv2Force,
    showBubbles: true,
  }),
  // six of the eight lack GSTM1; the strip fades HG00133's missing stretch
  force_gstm1_walk: trackView('chr1:109,670,000-109,705,000', {
    trackId: GBZ,
    layoutMode: 'force',
    colorScheme: 'reference-position',
    subgraphHaplotypes: HAPLOTYPES,
    walkLayers: [{ walk: 'HG00133#1#CM090045.1' }],
    height: 460,
  }),
  force_kiv2_popped: {
    session: graphView({
      loadedTrackId: RGFA,
      loadedRegion: KIV2,
      layoutMode: 'force',
      showBubbles: true,
      paneHeight: 480,
    }),
    // opens the largest bubble in the window, the KIV-2 array
    act: page =>
      page.evaluate(() => {
        const view = window.JBrowseSession.views[0]
        const [array] = [...view.bubbles].sort(
          (a, b) => b.segmentCount - a.segmentCount,
        )
        view.popBubble(array)
      }),
  },
  force_kiv2_gbz: graphView({
    ...gbzCut,
    subgraphHaplotypes: HAPLOTYPES,
    layoutMode: 'force',
    showBubbles: true,
    paneHeight: 620,
  }),
  force_kiv2_walk: graphView({
    ...gbzCut,
    subgraphHaplotypes: HAPLOTYPES,
    layoutMode: 'force',
    walkLayers: [
      { walk: 'GRCh38#0#chr6' },
      { walk: 'HG00097#1#JBIRDD010000043.1' },
      { walk: 'HG00133#1#CM090050.1' },
    ],
    paneHeight: 620,
  }),
  // HG002#1 carries the H2 inversion, HG00097#1 does not
  force_mapt_strand: graphView({
    loadedTrackId: GBZ,
    loadedRegion: { ...KIV2, refName: 'chr17', start: 45960000, end: 45962000 },
    subgraphHaplotypes: ['HG00097#1', 'HG002#1'],
    layoutMode: 'force',
    walkLayers: [
      { walk: 'GRCh38#0#chr17' },
      { walk: 'HG00097#1#JBIRDD010000008.1', color: { field: 'strand' } },
      { walk: 'HG002#1#chr17', color: { field: 'strand' } },
    ],
    paneHeight: 300,
  }),
  walk_rows_kiv2: {
    session: graphView({
      ...gbzCut,
      subgraphHaplotypes: HAPLOTYPES,
      layoutMode: 'walkrows',
      colorScheme: 'uniform',
      repeatTrackId: 'hprc_curated_vntrs',
      paneHeight: 420,
    }),
    // the Repeat picker lists the arrays the repeat track has over the cut
    act: async page => {
      await page.waitForFunction(
        () => window.JBrowseSession.views[0].repeatChoices.length > 0,
        { timeout: 60_000 },
      )
      await page.evaluate(() => {
        const view = window.JBrowseSession.views[0]
        view.setRepeatKey(view.repeatChoices[0].key)
      })
    },
  },
  tube_map_micb_track: {
    views: [
      {
        type: 'LinearGenomeView',
        assembly: 'hg38',
        loc: 'chr6:31,505,400-31,507,400',
        tracks: [
          {
            trackId: GENES,
            type: 'LinearBasicDisplay',
            geneGlyphMode: 'longestCoding',
            displayMode: 'compact',
            height: 60,
          },
          {
            trackId: GBZ,
            type: 'LinearGraphDisplay',
            layoutMode: 'tubemap',
            subgraphHaplotypes: HAPLOTYPES,
            height: 360,
          },
        ],
      },
    ],
  },
  tube_map_micb: graphView({
    loadedTrackId: GBZ,
    loadedRegion: MICB_EXONS,
    subgraphHaplotypes: HAPLOTYPES,
    layoutMode: 'tubemap',
    paneHeight: 360,
  }),
  force_mhc: graphView({
    loadedTrackId: RGFA,
    loadedRegion: MHC,
    layoutMode: 'force',
    paneHeight: 480,
  }),
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
    await page.setViewport({ width: 1400, height: 900 })
    await candidateServer(values.dist)(page)
    await page.goto(
      `https://jbrowse.org/code/jb2/${values.version}/?config=${encodeURIComponent(CONFIG)}&session=spec-${encodeURIComponent(JSON.stringify(session))}`,
      { waitUntil: 'domcontentloaded', timeout: 60_000 },
    )
    await waitPainted(page)
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
      const r = document
        .querySelector('[data-testid^="view-container"]')
        .getBoundingClientRect()
      return { x: r.x, y: r.y, width: r.width, height: r.height }
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
