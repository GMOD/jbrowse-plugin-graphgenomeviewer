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
  waitForAppReady,
  waitForReactMount,
  writeServedFile,
} from './setup'

import type { Browser, Page } from 'puppeteer'

// RUN_E2E=1 pnpm test:e2e test/facetPanels.test.ts
//
// 10.0.0 drew a force track split by walk as empty panels: the key read the
// panels before the pane was fitted, and the fit never rebuilt them. Only a
// browser sizes the key and fits the pane in that order.
const runE2E = process.env.RUN_E2E === '1'
const WALKS = 'src/RgfaTabixAdapter/test_data/walks8/chain.GRCh38.walks.gz'
const TRACK = 'chain_walks'

function config() {
  return {
    plugins: [{ name: 'GraphGenomeView', esmUrl: PLUGIN_ESM_URL }],
    assemblies: [
      {
        name: 'hg38',
        sequence: {
          type: 'ReferenceSequenceTrack',
          trackId: 'hg38-refseq',
          adapter: {
            type: 'ChromSizesAdapter',
            chromSizesLocation: {
              uri: `${BASE_URL}/walks_chr1.chrom.sizes`,
              locationType: 'UriLocation',
            },
          },
        },
      },
    ],
    tracks: [
      {
        type: 'GraphTrack',
        trackId: TRACK,
        name: 'Walks',
        assemblyNames: ['hg38'],
        adapter: {
          type: 'WalkTabixSyntenyAdapter',
          walksLocation: {
            uri: `${BASE_URL}/walks/chr1.GRCh38.walks.gz`,
            locationType: 'UriLocation',
          },
        },
      },
    ],
  }
}

const session = {
  views: [
    {
      type: 'LinearGenomeView',
      assembly: 'hg38',
      loc: 'chr1:1-310000',
      tracks: [
        {
          type: 'LinearGraphDisplay',
          trackId: TRACK,
          layoutMode: 'force',
          walkLayers: [{ walk: 'HG002#1#chr1' }, { walk: 'HG002#2#chr1' }],
          facet: 'walk',
          height: 400,
          maxRegionBp: 400_000,
        },
      ],
    },
  ],
}

describe.skipIf(!runE2E)('a force track split by walk', () => {
  let browser: Browser
  let page: Page

  beforeAll(async () => {
    setupJBrowse({
      config: config(),
      dataFiles: [
        [WALKS, 'walks/chr1.GRCh38.walks.gz'],
        [`${WALKS}.idx`, 'walks/chr1.GRCh38.walks.gz.idx'],
      ],
    })
    writeServedFile('walks_chr1.chrom.sizes', 'chr1\t310000\n')
    await startJBrowseServer()
    browser = await launchBrowser()
    page = await createJBrowsePage(browser)
    await page.setViewport({ width: 1200, height: 900 })
    await page.goto(
      `${BASE_URL}/?session=spec-${encodeURIComponent(JSON.stringify(session))}`,
      { waitUntil: 'networkidle2', timeout: 60_000 },
    )
    await waitForReactMount(page)
    await waitForAppReady(
      page,
      () =>
        document.querySelectorAll('[data-testid="graph-facet-canvas"]')
          .length === 2,
    )
  }, 300_000)

  afterAll(async () => {
    await browser.close()
    await cleanupJBrowse()
  })

  // The chain runs straight across its fitted panel, so a panel culled to the
  // wrong window inks a stub at one end or nothing
  it('draws each walk across its whole panel', async () => {
    await page
      .waitForNetworkIdle({ idleTime: 1500, timeout: 30_000 })
      .catch(() => {})
    await new Promise(resolve => setTimeout(resolve, 2000))
    const spans = await page.evaluate(() =>
      [
        ...document.querySelectorAll<HTMLCanvasElement>(
          '[data-testid="graph-facet-canvas"]',
        ),
      ].map(canvas => {
        const { width, height } = canvas
        const data = canvas
          .getContext('2d')
          ?.getImageData(0, 0, width, height).data
        const inked = [...Array(width).keys()].map(x =>
          [...Array(height).keys()].some(y => {
            const k = (y * width + x) * 4
            return [0, 1, 2, 3].some(c => data?.[k + c] !== data?.[c])
          }),
        )
        const first = inked.indexOf(true)
        return first === -1 ? 0 : (inked.lastIndexOf(true) - first) / width
      }),
    )
    await screenshot(page, 'facet-panels')
    expect(spans).toHaveLength(2)
    for (const span of spans) {
      expect(span).toBeGreaterThan(0.8)
    }
  }, 60_000)
})
