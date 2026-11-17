import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  ASSEMBLY,
  RGFA_TRACK_ID,
  createDemoConfig,
  demoDataFiles,
} from './demoConfig'
import {
  cleanupJBrowse,
  createJBrowsePage,
  launchBrowser,
  screenshot,
  setupJBrowse,
  startJBrowseServer,
  waitForReactMount,
} from './setup'

import type { Browser, Page } from 'puppeteer'

// Add → Graph genome view in a session with a graph track: the empty view's
// form shows the track in a linear view, which draws it, and the empty view
// goes. Same opt-in as the other e2e suites; see docs/developing.md.
const runE2E = process.env.RUN_E2E === '1'

const DISPLAY = '[data-testid="linear-graph-display"]'

function emptyGraphViewConfig() {
  const config = createDemoConfig()
  return {
    ...config,
    defaultSession: {
      name: 'an empty graph genome view',
      views: [{ type: 'GraphGenomeView' }],
    },
  }
}

describe.skipIf(!runE2E)('the graph genome view form', () => {
  let browser: Browser
  let page: Page

  beforeAll(async () => {
    setupJBrowse({ config: emptyGraphViewConfig(), dataFiles: demoDataFiles() })
    await startJBrowseServer()
    browser = await launchBrowser()
    page = await createJBrowsePage(browser)
    await waitForReactMount(page)
  }, 300_000)

  afterAll(async () => {
    await browser.close()
    await cleanupJBrowse()
  })

  it('shows a graph track in a linear view that draws it, closing the empty view', async () => {
    await page.waitForSelector('[data-testid="graph-track-picker"]', {
      timeout: 60_000,
    })
    await page.waitForFunction(
      () =>
        document.querySelector<HTMLInputElement>('input[name="region"]')
          ?.value === 'chr:1-20,000',
      { timeout: 60_000 },
    )
    await screenshot(page, 'front-door-00-form')
    await page.click('[data-testid="graph-track-show"]')
    await page.waitForFunction(
      (trackId: string) =>
        window.JBrowseSession.views.length === 1 &&
        window.JBrowseSession.views[0].type === 'LinearGenomeView' &&
        window.JBrowseSession.views[0].tracks.some(
          (t: { configuration: { trackId: string } }) =>
            t.configuration.trackId === trackId,
        ),
      { timeout: 60_000 },
      RGFA_TRACK_ID,
    )
    await page.waitForSelector(
      `${DISPLAY}[data-display-phase="ready"][data-node-count]:not([data-loading])`,
      { timeout: 120_000 },
    )
    await screenshot(page, 'front-door-01-linear-view')
    const view = await page.evaluate(() => {
      const [lgv] = window.JBrowseSession.views
      return {
        assemblyNames: lgv.assemblyNames as string[],
        loc: lgv.visibleLocStrings as string,
      }
    })
    expect(view.assemblyNames).toEqual([ASSEMBLY])
    expect(view.loc).toMatch(/^chr:/)
  }, 300_000)
})
