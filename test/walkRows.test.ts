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
  writeServedFile,
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

// The array as a UCSC simpleRepeat-style row: copycount.mjs's KIV-2 flanks
// and its 5,548 bp unit, so the rows measure between the array's ends and
// tile by the kringle unit.
const REPEAT_BED = 'chr6\t160616002\t160646753\tKIV-2\t5548\n'
const REPEAT_KEY = 'chr6:160616002-160646753'

function config() {
  const served = (file: string) => ({
    uri: `${BASE_URL}/${file}`,
    locationType: 'UriLocation',
  })
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
            chromSizesLocation: served('hg38_chr6.chrom.sizes'),
          },
        },
      },
    ],
    tracks: [
      {
        type: 'FeatureTrack',
        trackId: 'simple_repeats',
        name: 'Simple repeats',
        assemblyNames: ['hg38'],
        adapter: {
          type: 'BedAdapter',
          bedLocation: served('kiv2_repeats.bed'),
          columnNames: ['chrom', 'chromStart', 'chromEnd', 'name', 'period'],
        },
      },
    ],
    defaultSession: {
      name: 'walk rows e2e',
      views: [
        {
          id: VIEW,
          type: 'GraphGenomeView',
          layoutMode: 'walkrows',
          referencePath: 'GRCh38',
          colorScheme: 'grey',
          gfaLocation: served(KIV2),
          loadedRegion: {
            assemblyName: 'hg38',
            refName: 'chr6',
            start: 160614798,
            end: 160647758,
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
    writeServedFile('hg38_chr6.chrom.sizes', 'chr6\t170805979\n')
    writeServedFile('kiv2_repeats.bed', REPEAT_BED)
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

  // With the array from the repeat track the bars run between its flanking
  // reference nodes and tile by its unit: the copycount.mjs figure, live.
  it("measures between the repeat annotation's flanks and tiles by its unit", async () => {
    await page.waitForSelector('[data-testid="graph-repeat-select"]', {
      timeout: 60_000,
    })
    await page.click('[data-testid="graph-repeat-select"]')
    const option = await page.waitForSelector(
      `li[role="option"][data-value="${REPEAT_KEY}"]`,
    )
    await option!.click()
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll('[data-testid="graph-walk-row"] text')]
          .map(el => el.textContent)
          .some(t => t.includes('units')),
      { timeout: 60_000 },
    )
    const choice = await page.evaluate(
      () =>
        document.querySelector('[data-testid="graph-repeat-select"]')
          ?.textContent,
    )
    expect(choice).toContain('KIV-2')
    const readouts = await page.evaluate(() =>
      [...document.querySelectorAll('[data-testid="graph-walk-row"] text')].map(
        el => el.textContent,
      ),
    )
    expect(readouts[0]).toMatch(/^147 kb ≈ 27 units \(\+116 kb\)$/)
    await screenshot(page, 'walk-rows-kiv2-tiled')
  }, 60_000)
})
