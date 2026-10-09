import { existsSync } from 'node:fs'
import path from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  BASE_URL,
  PLUGIN_ESM_URL,
  TEST_JBROWSE_DIR,
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

// RUN_E2E=1 pnpm test:e2e test/walkStrip.test.ts
//
// The eight-haplotype KIV-2 cut drawn force-directed with its walk rows in a
// strip beneath, linked both ways. The fixture lives in the served test dir,
// as for walkRows.test.ts; the suite skips without it.
const runE2E = process.env.RUN_E2E === '1'
const KIV2 = 'test_data/graphgenomeview/kiv2_eight.gfa'
const hasFixture = existsSync(path.join(TEST_JBROWSE_DIR, KIV2))

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
    defaultSession: {
      name: 'walk strip e2e',
      views: [
        {
          id: 'graph_walk_strip',
          type: 'GraphGenomeView',
          layoutMode: 'force',
          layers: { walkStrip: true },
          referencePath: 'GRCh38',
          color: { field: 'position' },
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

interface StripView {
  walkLayers: { walk: string }[]
  hoveredNode: string | null
}

describe.skipIf(!runE2E || !hasFixture)(
  'walk rows under a force layout',
  () => {
    let browser: Browser
    let page: Page

    const rowBox = async (n: number) =>
      page.evaluate(i => {
        const rows = document.querySelectorAll(
          '[data-testid="graph-walk-strip"] [data-testid="graph-walk-row"]',
        )
        const r = rows[i]!.getBoundingClientRect()
        return { x: r.x, y: r.y, width: r.width, height: r.height }
      }, n)
    const view = () =>
      page.evaluate(
        () =>
          (
            window as unknown as { JBrowseSession: { views: StripView[] } }
          ).JBrowseSession.views.map(v => ({
            walkLayers: v.walkLayers.map(l => l.walk),
            hoveredNode: v.hoveredNode,
          }))[0]!,
      )

    beforeAll(async () => {
      setupJBrowse({ config: config() })
      writeServedFile('hg38_chr6.chrom.sizes', 'chr6\t170805979\n')
      await startJBrowseServer()
      browser = await launchBrowser()
      page = await createJBrowsePage(browser)
      await page.setViewport({ width: 1280, height: 1100 })
      await waitForReactMount(page)
      // the strip draws from the cut, long before the force layout lands
      await waitForAppReady(
        page,
        () =>
          Boolean(window.JBrowseSession.views[0]?.layoutResult) &&
          document.querySelectorAll(
            '[data-testid="graph-walk-strip"] [data-testid="graph-walk-row"]',
          ).length >= 8,
      )
    }, 180_000)

    afterAll(async () => {
      await browser.close()
      await cleanupJBrowse()
    })

    it('draws every haplotype under the graph, with the key', async () => {
      const key = await page.evaluate(
        () =>
          document.querySelector('[data-testid="graph-walk-strip-key"]')
            ?.textContent,
      )
      expect(key).toContain("on GRCh38#0's path")
      expect(key).toContain("off GRCh38#0's path")
      await screenshot(page, 'walk-strip-kiv2')
    }, 60_000)

    it('a point on a bar lights its node, ringed, and ticks every walk through it', async () => {
      const box = await rowBox(0)
      await page.mouse.move(box.x + box.width * 0.3, box.y + box.height / 2)
      await page.waitForSelector('[data-testid="graph-walk-strip-locator"]', {
        timeout: 10_000,
      })
      expect((await view()).hoveredNode).not.toBeNull()
      const ticks = await page.evaluate(
        () =>
          document.querySelectorAll('[data-testid="graph-walk-marks"] rect')
            .length,
      )
      expect(ticks).toBeGreaterThanOrEqual(2)
      await screenshot(page, 'walk-strip-kiv2-hover')
    }, 60_000)

    it('a click on a bar lifts its walk, and a second drops it', async () => {
      const box = await rowBox(0)
      const at = { x: box.x + box.width * 0.3, y: box.y + box.height / 2 }
      await page.mouse.click(at.x, at.y)
      await page.waitForFunction(
        () =>
          (window as unknown as { JBrowseSession: { views: StripView[] } })
            .JBrowseSession.views[0]!.walkLayers.length === 1,
        { timeout: 10_000 },
      )
      await screenshot(page, 'walk-strip-kiv2-lifted')
      await page.mouse.click(at.x, at.y)
      await page.waitForFunction(
        () =>
          (window as unknown as { JBrowseSession: { views: StripView[] } })
            .JBrowseSession.views[0]!.walkLayers.length === 0,
        { timeout: 10_000 },
      )
    }, 60_000)
  },
)
