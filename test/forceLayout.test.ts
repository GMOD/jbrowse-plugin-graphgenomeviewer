import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  cleanupJBrowse,
  createJBrowsePage,
  launchBrowser,
  setupJBrowse,
  startJBrowseServer,
  waitForReactMount,
} from './setup'

import type { Browser, Page } from 'puppeteer'

// Opt-in: set RUN_E2E=1. The plugin is built against the unreleased graph_viz
// branch of jbrowse-components (MUI 9, render-core), so it cannot load in a
// stock `jbrowse create --nightly`, which is built from main — the bundle
// throws on `createSvgIcon` from a mismatched MUI. Point JBROWSE_TEST_DIR at a
// jbrowse-web built from a graph_viz-compatible checkout, then RUN_E2E=1. Same
// blocker as the build-and-test CI job; lift both when graph_viz is released.
const runE2E = process.env.RUN_E2E === '1'

// End-to-end coverage of the one path unit tests can't reach: the force layout
// running the Bandage WASM engine, fetched at runtime as the hashed sibling
// chunk. The session opens straight into a force-layout GraphGenomeView, so a
// successful load proves the plugin bundle loaded the engine and drew a graph.
describe.skipIf(!runE2E)('force-directed layout in a real JBrowse', () => {
  let browser: Browser
  let page: Page

  beforeAll(async () => {
    setupJBrowse()
    await startJBrowseServer()
    browser = await launchBrowser()
    page = await createJBrowsePage(browser)
    await waitForReactMount(page)
  }, 180_000)

  afterAll(async () => {
    await browser.close()
    await cleanupJBrowse()
  })

  it('fetches the hashed engine chunk, not a fixed name', async () => {
    const chunkRequests: string[] = []
    page.on('request', req => {
      const url = req.url()
      if (/bandage-layout\..*\.js/.test(url)) {
        chunkRequests.push(url)
      }
    })
    // reload so the request listener sees the chunk fetch from a clean state
    await page.reload({ waitUntil: 'networkidle2', timeout: 60_000 })
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll('*')].some(el =>
          /\d+ nodes, \d+ edges/.test(el.textContent),
        ),
      { timeout: 120_000 },
    )
    expect(chunkRequests.length).toBeGreaterThan(0)
    // content-hashed: bandage-layout.<hash>.js, never the bare fallback
    expect(chunkRequests.every(u => /bandage-layout\.[a-f0-9]{8}\.js/.test(u)))
      .toBe(true)
  }, 180_000)

  it('lays out the graph and paints a non-empty canvas', async () => {
    const stats = await page.evaluate(() => {
      const el = [...document.querySelectorAll('*')].find(e =>
        /^\s*\d+ nodes, \d+ edges\s*$/.test(e.textContent),
      )
      return el?.textContent.trim()
    })
    // 31 segments in the GFA, each split into + / - orientation nodes
    expect(stats).toMatch(/\d+ nodes, \d+ edges/)
    const counts = stats?.match(/(\d+) nodes, (\d+) edges/)
    expect(Number(counts?.[1])).toBeGreaterThan(0)
    expect(Number(counts?.[2])).toBeGreaterThan(0)

    // the layout actually drew: some canvas has non-transparent pixels
    const drew = await page.evaluate(() => {
      const canvases = [
        ...document.querySelectorAll('canvas'),
      ] as HTMLCanvasElement[]
      return canvases.some(canvas => {
        if (canvas.width < 50 || canvas.height < 50) {
          return false
        }
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          return false
        }
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
        for (let i = 3; i < data.length; i += 4) {
          if (data[i]! > 0) {
            return true
          }
        }
        return false
      })
    })
    expect(drew).toBe(true)
  }, 60_000)
})
