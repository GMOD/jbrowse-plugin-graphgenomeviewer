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

// RUN_E2E=1 pnpm test:e2e test/addWalksTrack.test.ts
// A gfa-to-tabix walk file opened by url, on an assembly named apart from the
// PanSN sample its file name gives
const runE2E = process.env.RUN_E2E === '1'
const VIEW = 'walks_lgv'
const WALKS = 'src/RgfaTabixAdapter/test_data/walks4_follow.GRCh38.walks.bed.gz'

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
    tracks: [],
    defaultSession: {
      name: 'walk file add track e2e',
      views: [
        {
          id: VIEW,
          type: 'LinearGenomeView',
          init: { assembly: 'hg38', loc: 'chr1:1-5000', tracks: [] },
        },
      ],
    },
  }
}

describe.skipIf(!runE2E)('a walk file added through Open track', () => {
  let browser: Browser
  let page: Page

  beforeAll(async () => {
    setupJBrowse({
      config: config(),
      dataFiles: [
        [WALKS, 'walks/chr1.GRCh38.walks.bed.gz'],
        [`${WALKS}.tbi`, 'walks/chr1.GRCh38.walks.bed.gz.tbi'],
      ],
    })
    writeServedFile('walks_chr1.chrom.sizes', 'chr1\t6000\n')
    await startJBrowseServer()
    browser = await launchBrowser()
    page = await createJBrowsePage(browser)
    await waitForReactMount(page)
  }, 300_000)

  afterAll(async () => {
    await browser.close()
    await cleanupJBrowse()
  })

  it('opens as a GraphTrack that cuts the window by its walks', async () => {
    await addTrackThroughMenu(
      page,
      `${BASE_URL}/walks/chr1.GRCh38.walks.bed.gz`,
    )
    await confirmAddTrack(page)
    await waitForAppReady(
      page,
      () => window.JBrowseSession.views[0].tracks.length === 1,
    )
    expect(await openTrackState(page, VIEW)).toMatchObject({
      type: 'GraphTrack',
      adapter: 'RgfaTabixAdapter',
      assemblies: ['hg38'],
      display: 'LinearGraphDisplay',
    })
    // hg38 reads as GRCh38 only through the map the file name supplied
    expect((await openTrackState(page, VIEW))!.nodeCount).toBeGreaterThan(0)
    const haplotypes = await page.evaluate(
      () =>
        window.JBrowseSession.views[0].tracks[0].displays[0].haplotypeNames as
          string[] | undefined,
    )
    expect(haplotypes).toEqual(['HG002#1', 'HG002#2', 'HG003#1'])
    await screenshot(page, 'addtrack-walks-00-graph-display')
  }, 180_000)
})
