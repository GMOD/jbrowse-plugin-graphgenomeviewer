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

// RUN_E2E=1 pnpm test:e2e test/walkRowsGap.test.ts
// A haplotype the cut returns in two pieces draws as one row with the gap.
const runE2E = process.env.RUN_E2E === '1'
const VIEW = 'graph_walk_rows_gap'

const seq = 'ACGT'.repeat(250)
const GFA = [
  'H\tVN:Z:1.1\tRS:Z:GRCh38',
  ...[1, 2, 3, 4, 5].map(id => `S\t${id}\t${seq}`),
  'L\t1\t+\t2\t+\t0M',
  'L\t2\t+\t3\t+\t0M',
  'L\t3\t+\t4\t+\t0M',
  'L\t4\t+\t5\t+\t0M',
  'W\tGRCh38\t0\tchr1\t0\t5000\t>1>2>3>4>5',
  'W\tHG002\t1\tchr1\t0\t2000\t>1>2',
  'W\tHG002\t1\tchr1\t3000\t5000\t>4>5',
  'W\tHG003\t1\tchr1\t0\t5000\t>1>2>3>4>5',
  '',
].join('\n')

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
              uri: `${BASE_URL}/gap_chr1.chrom.sizes`,
              locationType: 'UriLocation',
            },
          },
        },
      },
    ],
    defaultSession: {
      name: 'walk rows gap e2e',
      views: [
        {
          id: VIEW,
          type: 'GraphGenomeView',
          layoutMode: 'walkrows',
          referencePath: 'GRCh38',
          color: 'grey',
          gfaLocation: {
            uri: `${BASE_URL}/gap.gfa`,
            locationType: 'UriLocation',
          },
          loadedRegion: {
            assemblyName: 'hg38',
            refName: 'chr1',
            start: 0,
            end: 5000,
          },
        },
      ],
    },
  }
}

describe.skipIf(!runE2E)('walk rows with a piece gap', () => {
  let browser: Browser
  let page: Page
  beforeAll(async () => {
    setupJBrowse({ config: config() })
    writeServedFile('gap_chr1.chrom.sizes', 'chr1\t10000\n')
    writeServedFile('gap.gfa', GFA)
    await startJBrowseServer()
    browser = await launchBrowser()
    page = await createJBrowsePage(browser)
    await waitForReactMount(page)
    await page.waitForFunction(
      () =>
        document.querySelectorAll('[data-testid="graph-walk-row"]').length >= 2,
      { timeout: 120_000 },
    )
  }, 180_000)
  afterAll(async () => {
    await browser.close()
    await cleanupJBrowse()
  })

  it('draws HG002 as one row whose readout names the gap', async () => {
    const labels = await page.evaluate(() =>
      [...document.querySelectorAll('[data-testid="graph-row-label"]')].map(
        el => el.textContent.trim(),
      ),
    )
    expect(labels).toEqual(['GRCh38#0', 'HG002#1', 'HG003#1'])
    const readouts = await page.evaluate(() =>
      [...document.querySelectorAll('[data-testid="graph-walk-row"] text')].map(
        el => el.textContent,
      ),
    )
    expect(readouts).toContain('5.0 kb · 1.0 kb outside the cut')
    await screenshot(page, 'walk-rows-gap')
  }, 60_000)
})
