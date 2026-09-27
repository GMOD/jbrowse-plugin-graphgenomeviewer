import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  BASE_URL,
  PLUGIN_ESM_URL,
  addTrackThroughMenu,
  cleanupJBrowse,
  confirmAddTrack,
  createJBrowsePage,
  launchBrowser,
  openTrackState,
  screenshot,
  setupJBrowse,
  startJBrowseServer,
  waitForAppReady,
  waitForReactMount,
  writeServedFile,
} from './setup'

import type { Browser, Page } from 'puppeteer'

const runE2E = process.env.RUN_E2E === '1'

// gbwt-rs's HPRC slice over MICB; its GRCh38 chr6 fragment starts at 31498140.
// The database names two reference samples, CHM13 and GRCh38, so the track's
// hg38 has to find GRCh38 with no PanSN map in the config.
const FIXTURE = 'src/GbzBaseSyntenyAdapter/test_data/micb-kir3dl1.gbz.db'
const VIEW_ID = 'gbz_lgv'

describe.skipIf(!runE2E)('a gbz-base database added through Add track', () => {
  let browser: Browser
  let page: Page

  beforeAll(async () => {
    writeServedFile('gbz/hg38.chrom.sizes', 'chr6\t170805979\n')
    setupJBrowse({
      config: {
        plugins: [{ name: 'GraphGenomeView', esmUrl: PLUGIN_ESM_URL }],
        assemblies: [
          {
            name: 'hg38',
            sequence: {
              type: 'ReferenceSequenceTrack',
              trackId: 'hg38-ReferenceSequenceTrack',
              adapter: {
                type: 'ChromSizesAdapter',
                uri: `${BASE_URL}/gbz/hg38.chrom.sizes`,
              },
            },
          },
        ],
        tracks: [],
        defaultSession: {
          name: 'gbz add track',
          views: [
            {
              id: VIEW_ID,
              type: 'LinearGenomeView',
              init: { assembly: 'hg38', loc: 'chr6:31,500,000-31,501,000' },
            },
          ],
        },
      },
      dataFiles: [[FIXTURE, 'gbz/micb.gbz.db']],
    })
    await startJBrowseServer()
    browser = await launchBrowser()
    page = await createJBrowsePage(browser)
    await waitForReactMount(page)
  }, 300_000)

  afterAll(async () => {
    await browser.close()
    await cleanupJBrowse()
  })

  it('opens as a GraphTrack drawing the graph, lanes in its menu', async () => {
    await addTrackThroughMenu(page, `${BASE_URL}/gbz/micb.gbz.db`)
    await screenshot(page, 'addgbz-00-confirm')
    await confirmAddTrack(page)
    await waitForAppReady(
      page,
      () => window.JBrowseSession.views[0].tracks.length === 1,
    )
    const state = await openTrackState(page, VIEW_ID)
    expect(state).toMatchObject({
      type: 'GraphTrack',
      adapter: 'GbzBaseSyntenyAdapter',
      assemblies: ['hg38'],
      display: 'LinearGraphDisplay',
    })
    expect(state!.displays).toContain('MultiWaySyntenyDisplay')
    expect(state!.nodeCount).toBeGreaterThan(0)
    await screenshot(page, 'addgbz-01-graph-display')
  }, 180_000)
})
