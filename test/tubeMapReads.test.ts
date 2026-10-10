import { readFileSync } from 'node:fs'
import path from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  BASE_URL,
  PLUGIN_ESM_URL,
  cleanupJBrowse,
  createJBrowsePage,
  launchBrowser,
  screenshot,
  setupJBrowse,
  startJBrowseServer,
  waitForReactMount,
  writeServedFile,
} from './setup'

import type { Browser, Page } from 'puppeteer'

// RUN_E2E=1 pnpm test:e2e test/tubeMapReads.test.ts
//
// GAF reads through a real worker: sequenceTubeMap's cactus graph as a gbz-base
// track with the NA12879 reads over nodes 240..280 (test_data/cactus), drawn
// as a tube map track of a linear view. The haplotype index beside the
// database names the walks.
const runE2E = process.env.RUN_E2E === '1'

const LGV = 'tube_map_reads_lgv'
const TRACK = 'cactus_gbz'
// the same reads bgzipped with a `tabix -p gaf` index, named the short way
const INDEXED = 'cactus_gbz_indexed'
const FIXTURES = [
  'cactus.gbz.db',
  'cactus.haplotype-index.db',
  'cactus_240_280.gaf',
  'cactus_240_280.gaf.gz',
  'cactus_240_280.gaf.gz.tbi',
]

function config() {
  const served = (file: string) => ({
    uri: `${BASE_URL}/cactus/${file}`,
    locationType: 'UriLocation',
  })
  return {
    plugins: [{ name: 'GraphGenomeView', esmUrl: PLUGIN_ESM_URL }],
    assemblies: [
      {
        name: 'cactus',
        sequence: {
          type: 'ReferenceSequenceTrack',
          trackId: 'cactus-refseq',
          adapter: {
            type: 'ChromSizesAdapter',
            chromSizesLocation: served('cactus.chrom.sizes'),
          },
        },
      },
    ],
    tracks: [
      {
        type: 'GraphTrack',
        trackId: TRACK,
        name: 'cactus (GBZ + GAF)',
        assemblyNames: ['cactus'],
        adapter: {
          type: 'GbzBaseSyntenyAdapter',
          gbzDbLocation: served('cactus.gbz.db'),
          readsLocation: served('cactus_240_280.gaf'),
          assemblyNames: ['cactus'],
          referenceSample: '_gbwt_ref',
        },
        displays: [
          {
            type: 'LinearGraphDisplay',
            displayId: `${TRACK}-LinearGraphDisplay`,
            layoutMode: 'tubemapref',
          },
        ],
      },
      {
        type: 'GraphTrack',
        trackId: INDEXED,
        name: 'cactus (GBZ + indexed GAF)',
        assemblyNames: ['cactus'],
        adapter: {
          type: 'GbzBaseSyntenyAdapter',
          gbzDbLocation: served('cactus.gbz.db'),
          reads: `${BASE_URL}/cactus/cactus_240_280.gaf.gz`,
          assemblyNames: ['cactus'],
          referenceSample: '_gbwt_ref',
        },
        displays: [
          {
            type: 'LinearGraphDisplay',
            displayId: `${INDEXED}-LinearGraphDisplay`,
            layoutMode: 'tubemapref',
          },
        ],
      },
    ],
    defaultSession: {
      name: 'tube map reads e2e',
      views: [
        {
          id: LGV,
          type: 'LinearGenomeView',
          init: {
            assembly: 'cactus',
            loc: 'ref:23,450-23,650',
            tracks: [TRACK],
          },
        },
      ],
    },
  }
}

describe.skipIf(!runE2E)('GAF reads in a tube map track', () => {
  let browser: Browser
  let page: Page

  beforeAll(async () => {
    const dir = path.join(__dirname, '../test_data/cactus')
    for (const file of FIXTURES) {
      writeServedFile(`cactus/${file}`, readFileSync(path.join(dir, file)))
    }
    writeServedFile('cactus/cactus.chrom.sizes', 'ref\t81189\n')
    setupJBrowse({ config: config() })
    await startJBrowseServer()
    browser = await launchBrowser()
    page = await createJBrowsePage(browser)
    await page.setViewport({ width: 1400, height: 900 })
    await waitForReactMount(page)
  }, 300_000)

  afterAll(async () => {
    await browser.close()
    await cleanupJBrowse()
  })

  function readsState(trackId: string) {
    return page.evaluate(
      ([viewId, id]) => {
        const view = window.JBrowseSession.views.find(v => v.id === viewId)
        const track = view.tracks.find(
          (t: { configuration: { trackId: string } }) =>
            t.configuration.trackId === id,
        )
        const pane = track.displays[0]
        const layout = pane.layoutResult?.tubeMap?.layout
        return {
          error: pane.error ? String(pane.error) : undefined,
          reads: layout?.reads.length ?? 0,
          loaded: pane.graph?.reads?.length ?? 0,
          readsShown: pane.readsShown,
          marks: pane.tubeMapPicture?.mismatches.length ?? 0,
        }
      },
      [LGV, trackId],
    )
  }

  function displaysReady(count: number) {
    return page.waitForFunction(
      n =>
        document.querySelectorAll(
          '[data-testid="linear-graph-display"][data-display-phase="ready"][data-node-count]:not([data-loading])',
        ).length === n,
      { timeout: 120_000 },
      count,
    )
  }

  it('lays the reads out under the haplotypes and paints them', async () => {
    await displaysReady(1)
    const state = await readsState(TRACK)
    expect(state.error).toBeUndefined()
    expect(state.reads).toBeGreaterThan(50)
    expect(state.readsShown.shown).toBe(state.reads)
    expect(state.marks).toBeGreaterThan(0)
    await screenshot(page, 'tubemap-02-gaf-reads-track')
  }, 180_000)

  it('names the walks, the reads and their marks in the legends', async () => {
    await page.evaluate(
      ([viewId, id]) => {
        const view = window.JBrowseSession.views.find(v => v.id === viewId)
        const track = view.tracks.find(
          (t: { configuration: { trackId: string } }) =>
            t.configuration.trackId === id,
        )
        track.displays[0].setHeight(520)
        view.navToLocString('ref:23,555-23,615')
      },
      [LGV, TRACK],
    )
    await displaysReady(1)
    const legendRows = (testid: string) =>
      page.$$eval(`[data-testid="${testid}"] > div`, rows =>
        rows.map(r => r.textContent),
      )
    await page.waitForSelector('[data-testid="graph-tube-map-legend"]')
    expect(await legendRows('graph-path-legend')).toEqual([
      'ref',
      'GI262359905',
      'GI528476558',
    ])
    expect(await legendRows('graph-tube-map-legend')).toEqual(
      expect.arrayContaining([
        'read on the forward strand',
        'read on the reverse strand',
        "Aa read's base unlike the node's",
      ]),
    )
  }, 180_000)

  it('reads the same reads through a tabix index', async () => {
    await page.evaluate(
      ([viewId, id]) => {
        window.JBrowseSession.views.find(v => v.id === viewId).showTrack(id)
      },
      [LGV, INDEXED],
    )
    await displaysReady(2)
    const plain = await readsState(TRACK)
    const indexed = await readsState(INDEXED)
    expect(indexed.error).toBeUndefined()
    // the tracks' cuts need not match (the first was cut before the view
    // narrowed and still holds it), and a tube map draws only its own window,
    // so the index is judged on the reads it loads
    expect(indexed.loaded).toBeGreaterThan(0)
    expect(indexed.loaded).toBe(plain.loaded)
    expect(indexed.readsShown).toEqual(plain.readsShown)
  }, 180_000)
})
