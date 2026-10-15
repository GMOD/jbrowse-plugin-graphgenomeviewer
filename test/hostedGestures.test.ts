import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  LGV_ID,
  PLAIN_TRACK_ID,
  RGFA_TRACK_ID,
  createDemoConfig,
  demoDataFiles,
  writePlainBedTrack,
} from './demoConfig'
import {
  cleanupJBrowse,
  createJBrowsePage,
  launchBrowser,
  setupJBrowse,
  startJBrowseServer,
  waitForAppReady,
  waitForReactMount,
} from './setup'

import type { Browser, Page } from 'puppeteer'

// RUN_E2E=1 pnpm test:e2e test/hostedGestures.test.ts
//
// A force layout in a track draws in its own coordinates, so its drag and
// wheel move the graph and must leave the linear view where it is. Core pans
// on pointerdown and range-selects on mousedown, and only a real browser
// dispatches both from one press.
const runE2E = process.env.RUN_E2E === '1'

const DISPLAY = '[data-testid="linear-graph-display"]'
const GRAPH_CANVAS = `${DISPLAY} [data-testid="graph-genome-canvas"]`

function trackConfig() {
  const config = createDemoConfig()
  return {
    ...config,
    tracks: config.tracks.map(track =>
      track.trackId === RGFA_TRACK_ID
        ? {
            ...track,
            displays: [
              {
                type: 'LinearGraphDisplay',
                displayId: `${RGFA_TRACK_ID}-LinearGraphDisplay`,
                layoutMode: 'force',
              },
            ],
          }
        : track,
    ),
  }
}

describe.skipIf(!runE2E)('gestures on a graph track that pans itself', () => {
  let browser: Browser
  let page: Page

  function state() {
    return page.evaluate(
      ([viewId, trackId]: string[]) => {
        const view = window.JBrowseSession.views.find(v => v.id === viewId)
        const d = view.tracks.find(
          (t: { configuration: { trackId: string } }) =>
            t.configuration.trackId === trackId,
        ).displays[0]
        return {
          offsetPx: view.offsetPx as number,
          bpPerPx: view.bpPerPx as number,
          hostPlacesX: d.hostPlacesX as boolean,
          pane: [
            d.scale,
            d.translateX,
            d.translateY,
            d.positionsVersion,
          ].join(),
        }
      },
      [LGV_ID, RGFA_TRACK_ID],
    )
  }

  async function boxOf(selector: string) {
    const box = await (await page.$(selector))!.boundingBox()
    return box!
  }

  async function drag(x: number, y: number) {
    await page.mouse.move(x, y)
    await page.mouse.down()
    for (let i = 1; i <= 10; i++) {
      await page.mouse.move(x + i * 12, y + i * 3)
    }
    await page.mouse.up()
  }

  beforeAll(async () => {
    writePlainBedTrack()
    setupJBrowse({ config: trackConfig(), dataFiles: demoDataFiles() })
    await startJBrowseServer()
    browser = await launchBrowser()
    page = await createJBrowsePage(browser)
    await waitForReactMount(page)
    await waitForAppReady(
      page,
      () =>
        !!document.querySelector(
          '[data-testid="linear-graph-display"][data-display-phase="ready"][data-node-count]:not([data-loading])',
        ),
    )
  }, 300_000)

  afterAll(async () => {
    await browser.close()
    await cleanupJBrowse()
  })

  it('draws in its own coordinates', async () => {
    expect((await state()).hostPlacesX).toBe(false)
  })

  it('a drag moves the graph and leaves the linear view', async () => {
    const before = await state()
    const box = await boxOf(GRAPH_CANVAS)
    await drag(box.x + 20, box.y + box.height - 20)
    const after = await state()
    expect(after.offsetPx).toBe(before.offsetPx)
    expect(after.pane).not.toBe(before.pane)
  }, 60_000)

  it('a plain wheel scrolls the page, as over any other track', async () => {
    await page.evaluate(() => {
      window.addEventListener('wheel', e => {
        ;(window as unknown as { pageWheel: boolean }).pageWheel =
          !e.defaultPrevented
      })
    })
    const before = await state()
    const box = await boxOf(GRAPH_CANVAS)
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.wheel({ deltaY: -200 })
    await page.waitForFunction(
      () => (window as unknown as { pageWheel?: boolean }).pageWheel,
      { timeout: 10_000 },
    )
    expect(await state()).toEqual(before)
  }, 60_000)

  it('a ctrl+wheel zooms the graph and leaves the linear view', async () => {
    const before = await state()
    const box = await boxOf(GRAPH_CANVAS)
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.keyboard.down('Control')
    await page.mouse.wheel({ deltaY: -20 })
    await page.keyboard.up('Control')
    await page.waitForFunction(
      ([viewId, trackId, was]: string[]) => {
        const view = window.JBrowseSession.views.find(v => v.id === viewId)
        const d = view.tracks.find(
          (t: { configuration: { trackId: string } }) =>
            t.configuration.trackId === trackId,
        ).displays[0]
        return (
          [d.scale, d.translateX, d.translateY, d.positionsVersion].join() !==
          was
        )
      },
      { timeout: 10_000 },
      [LGV_ID, RGFA_TRACK_ID, before.pane],
    )
    const after = await state()
    expect(after.bpPerPx).toBe(before.bpPerPx)
    expect(after.offsetPx).toBe(before.offsetPx)
  }, 60_000)

  it('two fingers spreading zoom the graph in and leave the linear view', async () => {
    const before = await page.evaluate(
      ([viewId, trackId]: string[]) =>
        window.JBrowseSession.views
          .find(v => v.id === viewId)
          .tracks.find(
            (t: { configuration: { trackId: string } }) =>
              t.configuration.trackId === trackId,
          ).displays[0].scale as number,
      [LGV_ID, RGFA_TRACK_ID],
    )
    const lgv = await state()
    const box = await boxOf(GRAPH_CANVAS)
    const cx = box.x + box.width / 2
    const cy = box.y + box.height / 2
    const cdp = await page.createCDPSession()
    await cdp.send('Emulation.setTouchEmulationEnabled', {
      enabled: true,
      maxTouchPoints: 2,
    })
    const touch = (type: string, spread: number) =>
      cdp.send('Input.dispatchTouchEvent', {
        type,
        touchPoints:
          type === 'touchEnd'
            ? []
            : [
                { x: cx - spread, y: cy, id: 1 },
                { x: cx + spread, y: cy, id: 2 },
              ],
      })
    await touch('touchStart', 20)
    for (let s = 25; s <= 80; s += 5) {
      await touch('touchMove', s)
    }
    await touch('touchEnd', 0)
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false })
    await cdp.detach()
    const after = await page.evaluate(
      ([viewId, trackId]: string[]) =>
        window.JBrowseSession.views
          .find(v => v.id === viewId)
          .tracks.find(
            (t: { configuration: { trackId: string } }) =>
              t.configuration.trackId === trackId,
          ).displays[0].scale as number,
      [LGV_ID, RGFA_TRACK_ID],
    )
    expect(after).toBeGreaterThan(before * 1.5)
    const now = await state()
    expect(now.offsetPx).toBe(lgv.offsetPx)
    expect(now.bpPerPx).toBe(lgv.bpPerPx)
  }, 60_000)

  it('a drag on a plain track still pans the linear view', async () => {
    const before = await state()
    const box = await boxOf(
      `[data-testid^="trackRenderingContainer-${LGV_ID}-${PLAIN_TRACK_ID}"]`,
    )
    await drag(box.x + box.width / 2, box.y + box.height / 2)
    await page.waitForFunction(
      ([viewId, was]: [string, number]) =>
        window.JBrowseSession.views.find(v => v.id === viewId)?.offsetPx !==
        was,
      { timeout: 10_000 },
      [LGV_ID, before.offsetPx] as [string, number],
    )
  }, 60_000)
})
