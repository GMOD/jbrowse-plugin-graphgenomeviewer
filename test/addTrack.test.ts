import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { ASSEMBLY, LGV_ID, createDemoConfig, demoDataFiles } from './demoConfig'
import {
  BASE_URL,
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
} from './setup'

import type { Browser, Page } from 'puppeteer'

const runE2E = process.env.RUN_E2E === '1'

describe.skipIf(!runE2E)('an rGFA added through Add track', () => {
  let browser: Browser
  let page: Page

  beforeAll(async () => {
    const config = createDemoConfig()
    const [view] = config.defaultSession.views
    setupJBrowse({
      config: {
        ...config,
        tracks: [],
        defaultSession: {
          ...config.defaultSession,
          views: [{ ...view!, init: { ...view!.init, tracks: [] } }],
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

  it('opens as a GraphTrack drawing the graph', async () => {
    await addTrackThroughMenu(page, `${BASE_URL}/rgfa/rgfa_ecoli.segs.bed.gz`)
    await screenshot(page, 'addtrack-00-confirm')
    await confirmAddTrack(page)
    await waitForAppReady(
      page,
      () => window.JBrowseSession.views[0].tracks.length === 1,
    )
    expect(await openTrackState(page, LGV_ID)).toMatchObject({
      type: 'GraphTrack',
      adapter: 'RgfaTabixAdapter',
      assemblies: [ASSEMBLY],
      display: 'LinearGraphDisplay',
      nodeCount: expect.any(Number),
    })
    expect((await openTrackState(page, LGV_ID))!.nodeCount).toBeGreaterThan(0)
    await screenshot(page, 'addtrack-01-graph-display')
  }, 180_000)
})
