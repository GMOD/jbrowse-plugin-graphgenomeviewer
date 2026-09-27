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
// as a tube map track of a linear view.
const runE2E = process.env.RUN_E2E === '1'

const LGV = 'tube_map_reads_lgv'
const TRACK = 'cactus_gbz'
const FIXTURES = ['cactus.gbz.db', 'cactus_240_280.gaf']

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

  it('lays the reads out under the haplotypes and paints them', async () => {
    const display = '[data-testid="linear-graph-display"]'
    await page.waitForFunction(
      sel =>
        !!document.querySelector(
          `${sel}[data-display-phase="ready"][data-node-count]:not([data-loading])`,
        ),
      { timeout: 120_000 },
      display,
    )
    const state = await page.evaluate(
      ([viewId, trackId]) => {
        const view = window.JBrowseSession.views.find(v => v.id === viewId)
        const track = view.tracks.find(
          (t: { configuration: { trackId: string } }) =>
            t.configuration.trackId === trackId,
        )
        const pane = track.displays[0]
        const layout = pane.layoutResult?.tubeMap?.layout
        return {
          error: pane.error ? String(pane.error) : undefined,
          reads: layout?.reads.length ?? 0,
          readsShown: pane.readsShown,
          marks: pane.tubeMapPicture?.mismatches.length ?? 0,
        }
      },
      [LGV, TRACK],
    )
    expect(state.error).toBeUndefined()
    expect(state.reads).toBeGreaterThan(50)
    expect(state.readsShown.shown).toBe(state.reads)
    expect(state.marks).toBeGreaterThan(0)
    await screenshot(page, 'tubemap-02-gaf-reads-track')
  }, 180_000)
})
