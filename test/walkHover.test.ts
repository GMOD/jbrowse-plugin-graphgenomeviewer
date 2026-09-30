import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  BASE_URL,
  PLUGIN_ESM_URL,
  cleanupJBrowse,
  createJBrowsePage,
  launchBrowser,
  setupJBrowse,
  startJBrowseServer,
  waitForAppReady,
  waitForReactMount,
} from './setup'

import type { Browser, Page } from 'puppeteer'

// RUN_E2E=1 pnpm test:e2e test/walkHover.test.ts
//
// Hovering a node while walks are lifted writes where it sits on each walk
// into that walk's key. The legend is measured in the DOM and the fit makes
// room for it, so a readout that grew the legend refitted the view, and the
// refit cleared the hover that grew it. Only a real browser measures the
// legend, so only here can the loop show.
const runE2E = process.env.RUN_E2E === '1'
const VIEW = 'walks_view'

function config() {
  return {
    plugins: [{ name: 'GraphGenomeView', esmUrl: PLUGIN_ESM_URL }],
    assemblies: [],
    tracks: [],
    defaultSession: {
      name: 'walk hover e2e',
      views: [
        {
          id: VIEW,
          type: 'GraphGenomeView',
          displayName: 'E. coli, 5 strains',
          layoutMode: 'auto',
          referencePath: 'K12',
          gfaLocation: {
            uri: `${BASE_URL}/test.gfa`,
            locationType: 'UriLocation',
          },
        },
      ],
    },
  }
}

describe.skipIf(!runE2E)('hovering a node with walks lifted', () => {
  let browser: Browser
  let page: Page

  beforeAll(async () => {
    setupJBrowse({ config: config() })
    await startJBrowseServer()
    browser = await launchBrowser()
    page = await createJBrowsePage(browser)
    await page.setViewport({ width: 1200, height: 800 })
    await waitForReactMount(page)
    await waitForAppReady(page, () =>
      Boolean(
        window.JBrowseSession.views.find(v => v.id === 'walks_view')
          ?.layoutResult,
      ),
    )
  }, 300_000)

  afterAll(async () => {
    await browser.close()
    await cleanupJBrowse()
  })

  function view() {
    return page.evaluate(id => {
      const v = window.JBrowseSession.views.find(v => v.id === id)
      return {
        hoveredNode: v.hoveredNode as string | null,
        transform: [v.scale, v.translateX, v.translateY] as number[],
        readouts: document.querySelectorAll('[data-testid="graph-walk-at"]')
          .length,
      }
    }, VIEW)
  }

  it('leaves the view where it is and keeps the readout up', async () => {
    await page.evaluate(id => {
      const v = window.JBrowseSession.views.find(v => v.id === id)
      v.liftWalks(v.walkChoices.slice(0, 2).map(c => c.name))
    }, VIEW)
    await waitForAppReady(page, () =>
      Boolean(
        window.JBrowseSession.views.find(v => v.id === 'walks_view')?.walkLift,
      ),
    )
    // settle any refit the lift itself asked for
    await new Promise(resolve => setTimeout(resolve, 500))

    const target = await page.evaluate(id => {
      const v = window.JBrowseSession.views.find(v => v.id === id)
      const rect = document
        .querySelector(
          `[data-testid="view-container-${id}"] [data-testid="graph-genome-canvas"]`,
        )!
        .getBoundingClientRect()
      const lifted = v.walkLift.nodeIds as Set<string>
      const inside = (x: number, y: number) =>
        x > 40 && x < rect.width - 300 && y > 20 && y < rect.height - 20
      for (const nodeId of lifted) {
        const seg = v.nodePositions[nodeId]
        if (seg?.length) {
          const a = seg[0]
          const b = seg.at(-1)
          const x = ((a.x + b.x) / 2) * v.scaleX + v.translateX
          const y = ((a.y + b.y) / 2) * v.scaleY + v.translateY
          if (inside(x, y)) {
            return { nodeId, x: rect.left + x, y: rect.top + y }
          }
        }
      }
      return undefined
    }, VIEW)
    expect(target).toBeDefined()

    const before = await view()
    await page.mouse.move(target!.x, target!.y)
    await new Promise(resolve => setTimeout(resolve, 500))
    const after = await view()

    expect(after.hoveredNode).toBe(target!.nodeId)
    expect(after.readouts).toBe(2)
    expect(after.transform).toEqual(before.transform)

    // and off it, the readouts go and the view still stays put
    await page.mouse.move(target!.x, target!.y + 150)
    await new Promise(resolve => setTimeout(resolve, 500))
    const away = await view()
    expect(away.hoveredNode).toBeNull()
    expect(away.readouts).toBe(0)
    expect(away.transform).toEqual(before.transform)
  }, 120_000)
})
