import { existsSync } from 'node:fs'
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
} from './setup'

import type { Browser, Page } from 'puppeteer'

// RUN_E2E=1 TEST_JBROWSE_VERSION=variants pnpm test:e2e test/walkRows.test.ts
//
// The eight-haplotype KIV-2 GBZ cut lives in the served test dir rather than
// the repo (1.5 MB); the suite skips without it.
const runE2E = process.env.RUN_E2E === '1'
const KIV2 = 'test_data/graphgenomeview/kiv2_eight.gfa'
const testDir = `.test-jbrowse-${process.env.TEST_JBROWSE_VERSION || 'nightly'}`
const hasFixture = existsSync(path.join(process.cwd(), testDir, KIV2))
const VIEW = 'graph_walk_rows'

function config() {
  return {
    plugins: [{ name: 'GraphGenomeView', esmUrl: PLUGIN_ESM_URL }],
    assemblies: [],
    defaultSession: {
      name: 'walk rows e2e',
      views: [
        {
          id: VIEW,
          type: 'GraphGenomeView',
          layoutMode: 'walkrows',
          referencePath: 'GRCh38',
          colorScheme: 'grey',
          gfaLocation: {
            uri: `${BASE_URL}/${KIV2}`,
            locationType: 'UriLocation',
          },
        },
      ],
    },
  }
}

describe.skipIf(!runE2E || !hasFixture)('walk rows at KIV-2', () => {
  let browser: Browser
  let page: Page

  beforeAll(async () => {
    setupJBrowse({ config: config() })
    await startJBrowseServer()
    browser = await launchBrowser()
    page = await createJBrowsePage(browser)
    await waitForReactMount(page)
    await page.waitForFunction(
      () =>
        document.querySelectorAll('[data-testid="graph-walk-row"]').length >= 8,
      { timeout: 120_000 },
    )
  }, 180_000)

  afterAll(async () => {
    await browser.close()
    await cleanupJBrowse()
  })

  it('draws one bar per haplotype, longest first, with its excess over GRCh38', async () => {
    const labels = await page.evaluate(() =>
      [...document.querySelectorAll('[data-testid="graph-row-label"]')].map(
        el => el.textContent.trim(),
      ),
    )
    expect(labels[0]).toBe('GRCh38#0')
    expect(labels[1]).toBe('HG00133#1')
    expect(labels).toHaveLength(9)
    const readouts = await page.evaluate(() =>
      [...document.querySelectorAll('[data-testid="graph-walk-row"] text')].map(
        el => el.textContent,
      ),
    )
    expect(readouts[0]).toMatch(/^149 kb \(\+116 kb\)$/)
    await screenshot(page, 'walk-rows-kiv2')
  }, 60_000)
})
