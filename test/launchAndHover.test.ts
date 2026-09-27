import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  ASSEMBLY,
  LGV_ID,
  PLAIN_TRACK_ID,
  REF_NAME,
  RGFA_TRACK_ID,
  createDemoConfig,
  demoDataFiles,
  writePlainBedTrack,
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

// The graph as a track of the linear view, in a real browser against the real
// rGFA tabix fixture: the track cuts the window and draws, re-cuts when the
// view leaves the cut, and the hover sync paints in both directions. Unit tests
// cannot say that a mouse over one paints in the other.
//
// Same opt-in as the other e2e suites; see test/README.md.
const runE2E = process.env.RUN_E2E === '1'

const DISPLAY = '[data-testid="linear-graph-display"]'
const GRAPH_CANVAS = `${DISPLAY} [data-testid="graph-genome-canvas"]`

// the demo config with the graph display first on the rGFA track, so the
// linear view opens it as the graph
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
              },
            ],
          }
        : track,
    ),
  }
}

describe.skipIf(!runE2E)('the graph track and the hover sync', () => {
  let browser: Browser
  let page: Page

  // waitForFunction, but a failure names the step instead of dumping the
  // predicate source
  async function waitForStage(
    what: string,
    predicate: (arg: string) => boolean,
    arg: string,
  ) {
    try {
      await page.waitForFunction(predicate, { timeout: 120_000 }, arg)
    } catch (e) {
      throw new Error(`timed out waiting until ${what}`, { cause: e })
    }
  }

  function waitForGraphReady() {
    return waitForStage(
      'the graph track has a graph and is ready',
      (selector: string) =>
        !!document.querySelector(
          `${selector}[data-display-phase="ready"][data-node-count]:not([data-loading])`,
        ),
      DISPLAY,
    )
  }

  beforeAll(async () => {
    const rows = writePlainBedTrack()
    expect(rows).toBeGreaterThan(0)
    setupJBrowse({ config: trackConfig(), dataFiles: demoDataFiles() })
    await startJBrowseServer()
    browser = await launchBrowser()
    page = await createJBrowsePage(browser)
    await waitForReactMount(page)
    await waitForStage(
      'both tracks are open in the linear view',
      (viewId: string) =>
        window.JBrowseSession.views.find(v => v.id === viewId)?.tracks
          .length === 2,
      LGV_ID,
    )
    await waitForGraphReady()
    await screenshot(page, 'demo-00-graph-track-in-linear-view')
  }, 300_000)

  afterAll(async () => {
    await browser.close()
    await cleanupJBrowse()
  })

  // The display's live state, which is what the browser built rather than what
  // the source says it should have built.
  function display() {
    return page.evaluate(
      ([viewId, trackId]: string[]) => {
        const view = window.JBrowseSession.views.find(v => v.id === viewId)
        const d = view.tracks.find(
          (t: { configuration: { trackId: string } }) =>
            t.configuration.trackId === trackId,
        ).displays[0]
        return {
          type: d.type as string,
          nodeCount: d.nodeCount as number,
          cutRegion: d.cutRegion as
            { refName: string; start: number; end: number } | undefined,
          recuts: d.recuts as number,
          effectiveColorScheme: d.effectiveColorScheme as string,
          hostPlacesX: d.hostPlacesX as boolean,
          hoveredNode: d.hoveredNode as string | null,
          hoverHighlight: d.hoverHighlight as unknown,
        }
      },
      [LGV_ID, RGFA_TRACK_ID],
    )
  }

  async function trackBox(trackId: string) {
    const box = await page.evaluate(
      ([viewId, id]: string[]) => {
        const el = document.querySelector(
          `[data-testid^="trackRenderingContainer-${viewId}-${id}"]`,
        )
        const r = el?.getBoundingClientRect()
        return r
          ? { x: r.x, y: r.y, width: r.width, height: r.height }
          : undefined
      },
      [LGV_ID, trackId],
    )
    if (!box) {
      throw new Error(`track ${trackId} has no box`)
    }
    return box
  }

  it('the track cuts the window and draws it under the view', async () => {
    const state = await display()
    expect(state.type).toBe('LinearGraphDisplay')
    expect(state.nodeCount).toBeGreaterThan(0)
    expect(state.cutRegion).toMatchObject({ refName: REF_NAME })
    // an rGFA opens anchored, on the ramp the linear lanes can be painted with
    expect(state.hostPlacesX).toBe(true)
    expect(state.effectiveColorScheme).toBe('reference-position')
  })

  // Graph -> linear: hit detection -> hoveredNode -> hoverHighlight -> the
  // band mounted through LinearGenomeView-TracksContainerComponent.
  //
  // Aimed at a backbone node's own mid-point projected through the display's
  // transform: sweeping painted pixels flakes, because the tube's top edge sits
  // right on the hover threshold.
  it('hovering a graph node highlights its span in the linear view', async () => {
    const target = await page.evaluate(
      ([viewId, trackId, selector]: string[]) => {
        const view = window.JBrowseSession.views.find(v => v.id === viewId)
        const d = view.tracks.find(
          (t: { configuration: { trackId: string } }) =>
            t.configuration.trackId === trackId,
        ).displays[0]
        const rect = document
          .querySelector<HTMLCanvasElement>(selector!)!
          .getBoundingClientRect()
        const visible = (x: number) => x > 20 && x < rect.width - 20
        const node = d.graph.nodes.find(
          (n: { id: string; stable?: { rank: number } }) => {
            const seg = d.nodePositions[`${n.id}+`] ?? d.nodePositions[n.id]
            return (
              n.stable?.rank === 0 &&
              seg &&
              visible(((seg[0].x + seg.at(-1).x) / 2) * d.scaleX + d.translateX)
            )
          },
        )
        const segments =
          d.nodePositions[`${node.id}+`] ?? d.nodePositions[node.id]
        const i = Math.max(0, Math.floor((segments.length - 1) / 2))
        const a = segments[i]
        const b = segments[Math.min(i + 1, segments.length - 1)]
        return {
          nodeId: node.id as string,
          expected: {
            refName: node.stable.refName as string,
            start: node.stable.start as number,
            end: (node.stable.start + node.length) as number,
          },
          x: rect.left + ((a.x + b.x) / 2) * d.scaleX + d.translateX,
          y: rect.top + ((a.y + b.y) / 2) * d.scaleY + d.translateY,
        }
      },
      [LGV_ID, RGFA_TRACK_ID, GRAPH_CANVAS],
    )

    await page.mouse.move(target.x, target.y)
    const state = await display()
    expect(state.hoveredNode).toBe(target.nodeId)
    expect(state.hoverHighlight).toEqual({
      refName: REF_NAME,
      assemblyName: ASSEMBLY,
      start: target.expected.start,
      end: target.expected.end,
    })
    const band = await page.evaluate(() => {
      const el = document.querySelector<HTMLElement>(
        '[data-testid="tracksContainer"] [data-testid="graph-node-highlight"]',
      )
      return el ? { width: el.getBoundingClientRect().width } : undefined
    })
    expect(band?.width).toBeGreaterThan(0)
    await screenshot(page, 'demo-01-graph-hover-highlights-linear-view')
  }, 240_000)

  // Linear -> graph: the linear view publishes its hover to session.hovered
  // and the graph picks the node out of it. The plain track proves the
  // coordinate fallback, not just a segment-name match.
  it('hovering the linear view selects the matching graph node', async () => {
    const box = await trackBox(PLAIN_TRACK_ID)
    let hoveredNode: string | null = null
    for (let i = 0; i < 20 && hoveredNode === null; i++) {
      await page.mouse.move(
        box.x + box.width * (0.2 + i * 0.03),
        box.y + Math.min(box.height / 2, 12),
      )
      hoveredNode = (await display()).hoveredNode
    }
    expect(hoveredNode).not.toBeNull()
    await screenshot(page, 'demo-02-linear-hover-selects-graph-node')
  }, 240_000)

  it('navigating past the cut re-cuts the window', async () => {
    const before = await display()
    await page.evaluate(
      ([viewId, loc]: string[]) => {
        window.JBrowseSession.views
          .find(v => v.id === viewId)
          .navToLocString(loc)
      },
      [LGV_ID, `${REF_NAME}:2,000,001-2,020,000`],
    )
    await page.waitForFunction(
      ([selector, recuts]: [string, number]) => {
        const el = document.querySelector<HTMLElement>(selector)
        return (
          !!el &&
          Number(el.dataset.recuts) > recuts &&
          el.dataset.displayPhase === 'ready' &&
          el.dataset.nodeCount !== undefined &&
          el.dataset.loading === undefined
        )
      },
      { timeout: 120_000 },
      [DISPLAY, before.recuts] as [string, number],
    )
    const after = await display()
    expect(after.recuts).toBeGreaterThan(before.recuts)
    expect(after.cutRegion!.start).toBeLessThanOrEqual(2_000_000)
    expect(after.cutRegion!.end).toBeGreaterThanOrEqual(2_020_000)
    expect(after.nodeCount).toBeGreaterThan(0)
    await screenshot(page, 'demo-03-graph-track-recut')
  }, 240_000)

  // A layout in its own coordinates gets the strip of reference segments at
  // their bp, and a block there is its node
  it('hovering the reference strip lights the node it draws', async () => {
    await page.evaluate(
      ([viewId, trackId]: string[]) => {
        window.JBrowseSession.views
          .find(v => v.id === viewId)
          .tracks.find(
            (t: { configuration: { trackId: string } }) =>
              t.configuration.trackId === trackId,
          )
          .displays[0].setLayoutMode('ordered')
      },
      [LGV_ID, RGFA_TRACK_ID],
    )
    await waitForStage(
      'the ordered layout draws its reference strip',
      (selector: string) =>
        !!document.querySelector(
          `${selector}[data-layout="ordered"] [data-testid="graph-reference-strip"]`,
        ),
      DISPLAY,
    )
    await waitForGraphReady()
    const target = await page.evaluate(
      ([viewId, trackId]: string[]) => {
        const d = window.JBrowseSession.views
          .find(v => v.id === viewId)
          .tracks.find(
            (t: { configuration: { trackId: string } }) =>
              t.configuration.trackId === trackId,
          ).displays[0]
        const { scale, translateX } = d.referenceStripFrame
        const onScreen = d.referenceStripBlocks.filter(
          (b: { bp0: number; bp1: number }) =>
            (b.bp1 - b.bp0) * scale > 6 &&
            b.bp0 * scale + translateX > 0 &&
            b.bp1 * scale + translateX < d.paneWidth,
        )
        const block = onScreen[Math.floor(onScreen.length / 2)]
        return {
          node: block.node as string,
          bp0: block.bp0 as number,
          bp1: block.bp1 as number,
          sx: ((block.bp0 + block.bp1) / 2) * scale + translateX,
        }
      },
      [LGV_ID, RGFA_TRACK_ID],
    )
    const canvas = await page.$(GRAPH_CANVAS)
    const box = (await canvas!.boundingBox())!
    await page.mouse.move(box.x + target.sx, box.y + 4)
    await page.waitForFunction(
      ([viewId, trackId, node]: string[]) =>
        window.JBrowseSession.views
          .find(v => v.id === viewId)
          .tracks.find(
            (t: { configuration: { trackId: string } }) =>
              t.configuration.trackId === trackId,
          ).displays[0].hoveredNode === node,
      { timeout: 10_000 },
      [LGV_ID, RGFA_TRACK_ID, target.node],
    )
    const state = await display()
    expect(state.hoverHighlight).toMatchObject({
      start: target.bp0,
      end: target.bp1,
    })
    await screenshot(page, 'demo-04-reference-strip-hover')
  }, 240_000)

  // Last, since it closes the view. No action may run on the graph display
  // once it is dead; a callback that lands late checks at the time of use. Bare
  // reads during the teardown are core's order of destroy before unmount, and
  // its own displays show them too.
  it('closing the view runs nothing on the dead graph display', async () => {
    const dead: string[] = []
    page.on('console', msg => {
      const text = msg.text()
      if (
        text.includes("Object type: 'LinearGraphDisplay'") &&
        !text.includes("Action: ''")
      ) {
        dead.push(text.slice(0, 300))
      }
    })
    await page.evaluate((viewId: string) => {
      const session = window.JBrowseSession
      session.removeView(session.views.find(v => v.id === viewId))
    }, LGV_ID)
    await new Promise(resolve => setTimeout(resolve, 2000))
    expect(dead).toEqual([])
  }, 60_000)
})
