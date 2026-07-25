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

// Pointer interaction in a real browser: hit detection reaching the model, and a
// node drag actually repainting. Both are otherwise only covered at unit level --
// the hover threshold and nearest-candidate search are tested against arrays, and
// the renderer's colour override against a fake 2D context. Neither says the mouse
// is wired to any of it.
//
// Same opt-in as forceLayout.test.ts; see test/README.md.
const runE2E = process.env.RUN_E2E === '1'

// Deliberately not asserting on specific coordinates or node ids: the layout is
// force-directed, so positions are not fixed. Everything here is derived from
// whatever the canvas actually painted.
describe.skipIf(!runE2E)('pointer interaction', () => {
  let browser: Browser
  let page: Page

  beforeAll(async () => {
    setupJBrowse()
    await startJBrowseServer()
    browser = await launchBrowser()
    page = await createJBrowsePage(browser)
    await waitForReactMount(page)
    // the stats line only renders once a graph is loaded
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll('*')].some(el =>
          /\d+ nodes, \d+ edges/.test(el.textContent),
        ),
      { timeout: 120_000 },
    )
  }, 180_000)

  afterAll(async () => {
    await browser.close()
    await cleanupJBrowse()
  })

  // Canvas coordinates of pixels the graph actually drew, in CSS space so they can
  // be handed to the mouse. The clear colour is opaque white, so "painted" means
  // "not white"; the backing store is dpr-scaled while the mouse is not.
  async function paintedPoints() {
    return await page.evaluate(() => {
      const canvas = document.querySelector<HTMLCanvasElement>(
        '[data-testid="graph-genome-canvas"]',
      )
      if (!canvas) {
        return []
      }
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        return []
      }
      const { width, height } = canvas
      const { data } = ctx.getImageData(0, 0, width, height)
      const rect = canvas.getBoundingClientRect()
      const dprX = width / rect.width
      const dprY = height / rect.height
      const found: { x: number; y: number }[] = []
      // coarse stride: enough candidates to find a node without scanning 480k px
      for (let py = 0; py < height && found.length < 400; py += 3) {
        for (let px = 0; px < width && found.length < 400; px += 3) {
          const i = (py * width + px) * 4
          const r = data[i]!
          const g = data[i + 1]!
          const b = data[i + 2]!
          if (r < 230 || g < 230 || b < 230) {
            found.push({
              x: rect.left + px / dprX,
              y: rect.top + py / dprY,
            })
          }
        }
      }
      return found
    })
  }

  async function tooltipText() {
    return await page.evaluate(() => {
      const el = [...document.querySelectorAll('div')].find(d =>
        /length:|^Edge: /.test(d.textContent),
      )
      return el ? el.textContent : null
    })
  }

  // Returns the point that produced a node tooltip, so the drag test can press on
  // a spot already proven to be a node rather than guessing again.
  async function hoverUntilTooltip(match: RegExp) {
    const points = await paintedPoints()
    for (const p of points) {
      await page.mouse.move(p.x, p.y)
      const text = await tooltipText()
      if (text && match.test(text)) {
        return { point: p, text }
      }
    }
    return undefined
  }

  it('paints something to interact with', async () => {
    expect((await paintedPoints()).length).toBeGreaterThan(0)
  })

  // Proves the whole hover chain: mousemove -> screen-to-graph -> spatial index ->
  // distance test -> model -> React. A tooltip naming a length is a node hit; the
  // GFA is small, so a node is reachable among the painted pixels.
  it('hovering a drawn node shows its tooltip', async () => {
    const hit = await hoverUntilTooltip(/length:/)
    expect(hit?.text).toMatch(/length:/)
  }, 120_000)

  // The node only moves on screen when geometry is rebuilt, and that rebuild is
  // coalesced to an animation frame. If the coalescing never scheduled, the canvas
  // would be unchanged after the drag.
  //
  // What this does and does not prove: the drag path runs and ends in a repaint.
  // It does not isolate the node's own movement from any other redraw. Hover is
  // not a confound -- hoverUntilTooltip leaves the pointer on the node, so the
  // baseline is captured with the hover highlight already applied, and mousemove
  // takes the draggingNode branch rather than recomputing hover.
  it('dragging a node repaints the canvas', async () => {
    const hit = await hoverUntilTooltip(/length:/)
    expect(hit).toBeDefined()
    const { point } = hit!

    const snapshot = () =>
      page.evaluate(() => {
        const canvas = document.querySelector<HTMLCanvasElement>(
          '[data-testid="graph-genome-canvas"]',
        )
        return canvas?.toDataURL() ?? ''
      })

    const before = await snapshot()
    await page.mouse.move(point.x, point.y)
    await page.mouse.down()
    // several steps so the drag looks like a drag, not a teleport
    for (let i = 1; i <= 6; i++) {
      await page.mouse.move(point.x + i * 8, point.y + i * 5)
    }
    await page.mouse.up()
    // let the coalesced rebuild land
    await new Promise(resolve => setTimeout(resolve, 1000))
    const after = await snapshot()

    expect(before).not.toBe('')
    expect(after).not.toBe(before)
  }, 120_000)
})
