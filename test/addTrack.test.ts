import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { ASSEMBLY, LGV_ID, createDemoConfig, demoDataFiles } from './demoConfig'
import {
  BASE_URL,
  cleanupJBrowse,
  createJBrowsePage,
  launchBrowser,
  screenshot,
  setupJBrowse,
  startJBrowseServer,
  waitForAppReady,
  waitForReactMount,
} from './setup'

import type { Browser, Page } from 'puppeteer'

const runE2E = process.env.RUN_E2E === '1'

describe.skipIf(!runE2E)('a graph file added through Add track', () => {
  let browser: Browser
  let page: Page

  async function clickText(selector: string, text: string) {
    await page.waitForFunction(
      (sel: string, t: string) =>
        [...document.querySelectorAll(sel)].some(e =>
          e.textContent.trim().startsWith(t),
        ),
      { timeout: 30_000 },
      selector,
      text,
    )
    await page.evaluate(
      (sel: string, t: string) => {
        const el = [...document.querySelectorAll<HTMLElement>(sel)].find(e =>
          e.textContent.trim().startsWith(t),
        )
        el!.click()
      },
      selector,
      text,
    )
  }

  beforeAll(async () => {
    const config = createDemoConfig()
    setupJBrowse({
      config: {
        ...config,
        tracks: [],
        defaultSession: {
          ...config.defaultSession,
          views: [
            {
              ...config.defaultSession.views[0]!,
              init: { ...config.defaultSession.views[0]!.init, tracks: [] },
            },
          ],
        },
      },
      dataFiles: demoDataFiles(),
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

  it('opens as the graph display with no config', async () => {
    await clickText('button', 'File')
    await clickText('[role="menuitem"]', 'Open track')
    await page.waitForSelector('[data-testid="urlInput"]', { timeout: 30_000 })
    await page.type(
      '[data-testid="urlInput"]',
      `${BASE_URL}/rgfa/rgfa_ecoli.segs.bed.gz`,
    )
    await page.click('[data-testid="addTrackNextButton"]')
    await page.waitForSelector('[data-testid="trackNameInput"]')
    await screenshot(page, 'addtrack-00-confirm')
    await page.click('[data-testid="addTrackNextButton"]')

    await page.waitForFunction(
      (viewId: string) =>
        window.JBrowseSession.views.find(v => v.id === viewId)?.tracks
          .length === 1,
      { timeout: 60_000 },
      LGV_ID,
    )
    const track = await page.evaluate((viewId: string) => {
      const t = window.JBrowseSession.views.find(v => v.id === viewId).tracks[0]
      return {
        adapter: t.configuration.adapter.type,
        assemblies: [...t.configuration.assemblyNames],
        display: t.displays[0].type,
      }
    }, LGV_ID)
    expect(track).toEqual({
      adapter: 'RgfaTabixAdapter',
      assemblies: [ASSEMBLY],
      display: 'LinearGraphDisplay',
    })
    await waitForAppReady(page)
    const nodes = await page.evaluate(
      (viewId: string) =>
        window.JBrowseSession.views.find(v => v.id === viewId).tracks[0]
          .displays[0].nodeCount,
      LGV_ID,
    )
    expect(nodes).toBeGreaterThan(0)
    await screenshot(page, 'addtrack-01-graph-display')
  }, 180_000)
})
