import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

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
// A force layout in a track draws in its own coordinates, placed by the linear
// view's window: the window's stretch of the reference lies where the view's
// ruler, narrowed to the drawing's width beside the key, puts its bp. So the
// view drives it: a drag or ctrl+wheel over it moves the view as over any
// track, and the drawing slides with the window, at its own scale; a press on
// a node drags the node and leaves the view where it is. Core pans on
// pointerdown and range-selects on mousedown, and only a real browser
// dispatches both.
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
          translateX: d.translateX as number,
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

  // Where the drawing puts the reference the view shows, and where the view's
  // ruler narrowed to the drawing's width puts the same bp, each averaged over
  // those bp, in pane px; and whether the drawing sits where its window places
  // it rather than where a drag left it
  function placedByWindow() {
    return page.evaluate(
      ([viewId, trackId]: string[]) => {
        const view = window.JBrowseSession.views.find(v => v.id === viewId)
        const d = view.tracks.find(
          (t: { configuration: { trackId: string } }) =>
            t.configuration.trackId === trackId,
        ).displays[0]
        const pieces: { bp0: number; bp1: number; x0: number; x1: number }[] =
          d.heldReference.pieces
        const { padLeft, padRight } = d.followPads
        const usable = d.drawingWidth - padLeft - padRight
        const span = view.bpPerPx * view.width
        const leftBp =
          view.displayedRegions[0].start + view.offsetPx * view.bpPerPx
        let covered = 0
        let drawn = 0
        let ruled = 0
        for (const p of pieces) {
          const lo = Math.max(leftBp, p.bp0)
          const hi = Math.min(leftBp + span, p.bp1)
          if (hi > lo) {
            const mid = (lo + hi) / 2
            const x = p.x0 + ((p.x1 - p.x0) * (mid - p.bp0)) / (p.bp1 - p.bp0)
            covered += hi - lo
            drawn += (hi - lo) * (x * d.scale + d.translateX)
            ruled += (hi - lo) * (padLeft + (usable * (mid - leftBp)) / span)
          }
        }
        const placed = d.windowTransform
        return {
          drawn: drawn / covered,
          ruled: ruled / covered,
          transform: [d.scale, d.translateX, d.translateY],
          placed: [placed?.scale, placed?.translateX, placed?.translateY],
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

  // A move re-cuts the window once it settles, and the new layout morphs in
  // over the stretched one; a test that measures the stretch starts after
  // the last test's re-cut has landed and the drawing has held still.
  beforeEach(async () => {
    let last = ''
    for (let still = 0; still < 3;) {
      await new Promise(r => setTimeout(r, 300))
      const ready = await page.$(
        `${DISPLAY}[data-display-phase="ready"]:not([data-loading])`,
      )
      const now = (await state()).pane
      still = ready && now === last ? still + 1 : 0
      last = now
    }
  }, 60_000)

  function display() {
    return page.evaluate(
      ([viewId, trackId]: string[]) => {
        const d = window.JBrowseSession.views
          .find(v => v.id === viewId)
          .tracks.find(
            (t: { configuration: { trackId: string } }) =>
              t.configuration.trackId === trackId,
          ).displays[0]
        return {
          followsHostView: d.followsHostView as boolean,
          scale: d.scale as number,
          translateY: d.translateY as number,
          positionsVersion: d.positionsVersion as number,
        }
      },
      [LGV_ID, RGFA_TRACK_ID],
    )
  }

  function viewMoved(field: 'offsetPx' | 'bpPerPx', was: number) {
    return page.waitForFunction(
      ([viewId, f, w]: [string, string, number]) =>
        (
          window.JBrowseSession.views.find(v => v.id === viewId) as Record<
            string,
            number
          >
        )[f] !== w,
      { timeout: 10_000 },
      [LGV_ID, field, was] as [string, string, number],
    )
  }

  it('draws in its own coordinates, and follows the view', async () => {
    expect((await state()).hostPlacesX).toBe(false)
    expect((await display()).followsHostView).toBe(true)
  })

  it('a drag scrolls the linear view, and the graph slides where its window places it, up and down too', async () => {
    const before = await state()
    const box = await boxOf(GRAPH_CANVAS)
    // on empty canvas near the bottom left, past the key when it sits there
    const key = await boxOf(`${DISPLAY} [data-legend-corner="bottom-left"]`)
      .then(k => k.x + k.width)
      .catch(() => box.x)
    await drag(key + 20, box.y + box.height - 50)
    await viewMoved('offsetPx', before.offsetPx)
    const after = await state()
    expect(after.offsetPx).toBeLessThan(before.offsetPx)
    expect(after.translateX).toBeGreaterThan(before.translateX)
    const { drawn, ruled, transform, placed } = await placedByWindow()
    expect(drawn).toBeCloseTo(ruled, 6)
    expect(transform).toEqual(placed)
  }, 60_000)

  it('a drag on a node moves the node and leaves the view', async () => {
    const before = await state()
    const was = await display()
    const box = await boxOf(GRAPH_CANVAS)
    const point = await page.evaluate(
      ([viewId, trackId]: string[]) => {
        const d = window.JBrowseSession.views
          .find(v => v.id === viewId)
          .tracks.find(
            (t: { configuration: { trackId: string } }) =>
              t.configuration.trackId === trackId,
          ).displays[0]
        const segs = Object.values(
          d.nodePositions as Record<string, { x: number; y: number }[]>,
        )
          .map(s => s[Math.floor(s.length / 2)]!)
          .map(p => ({
            x: p.x * d.scaleX + d.translateX,
            y: p.y * d.scaleY + d.translateY,
          }))
          .filter(p => p.y > 60 && p.x > 20 && p.x < d.paneWidth - 20)
        return segs[0]
      },
      [LGV_ID, RGFA_TRACK_ID],
    )
    expect(point).toBeDefined()
    await drag(box.x + point!.x, box.y + point!.y)
    const after = await state()
    expect(after.offsetPx).toBe(before.offsetPx)
    expect((await display()).positionsVersion).toBeGreaterThan(
      was.positionsVersion,
    )
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

  it('a ctrl+wheel zooms the linear view, and the graph stretches with it', async () => {
    const before = await state()
    const was = await display()
    const box = await boxOf(GRAPH_CANVAS)
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.keyboard.down('Control')
    await page.mouse.wheel({ deltaY: -20 })
    await page.keyboard.up('Control')
    await viewMoved('bpPerPx', before.bpPerPx)
    expect((await display()).scale).not.toBe(was.scale)
  }, 60_000)

  // the drawing follows the view's scroll until the re-cut lands, as a linear
  // track's blocks do
  it('a drag on the reference strip scrolls the linear view, and the graph with it', async () => {
    const before = await state()
    const strip = await boxOf(
      `${DISPLAY} [data-testid="graph-reference-strip"]`,
    )
    const box = await boxOf(GRAPH_CANVAS)
    await drag(box.x + box.width / 2, strip.y + 4)
    await page.waitForFunction(
      ([viewId, was]: [string, number]) =>
        window.JBrowseSession.views.find(v => v.id === viewId)?.offsetPx !==
        was,
      { timeout: 10_000 },
      [LGV_ID, before.offsetPx] as [string, number],
    )
    const after = await state()
    expect(after.offsetPx).toBeLessThan(before.offsetPx)
    expect(after.translateX).toBeGreaterThan(before.translateX)
    const { drawn, ruled } = await placedByWindow()
    expect(drawn).toBeCloseTo(ruled, 6)
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
