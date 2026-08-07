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

// The launch entry points and the graph/linear hover sync, in a real browser
// against the real rGFA tabix fixture. Everything here is only unit-tested
// otherwise, and unit tests cannot say the menu item is reachable, that clicking
// it opens a view that fetches and draws, or that a mouse over one view paints in
// the other.
//
// Same opt-in as the other e2e suites; see test/README.md.
const runE2E = process.env.RUN_E2E === '1'

const GRAPH_CANVAS = '[data-testid="graph-genome-canvas"]'

// pushLaunchViewMenuItem groups every "open another view" entry under this one
// submenu, so a track/view menu item is one level down.
const LAUNCH_SUBMENU = 'Launch view'

describe.skipIf(!runE2E)('subgraph launch and hover sync', () => {
  let browser: Browser
  let page: Page

  // waitForFunction, but a failure names the step instead of dumping the
  // predicate source.
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

  beforeAll(async () => {
    const rows = writePlainBedTrack()
    expect(rows).toBeGreaterThan(0)
    setupJBrowse({ config: createDemoConfig(), dataFiles: demoDataFiles() })
    await startJBrowseServer()
    browser = await launchBrowser()
    page = await createJBrowsePage(browser)
    await waitForReactMount(page)
    // The rGFA track has to have drawn before any of this means anything: its
    // features arriving proves the adapter resolved the PanSN stable names
    // (`K12#1#chr` for refName `chr`) and served them over http.
    //
    // Waited in stages so a timeout says which step didn't happen — the assembly
    // loading, the `init` blob resolving tracks, or the adapter returning
    // features. A single blind wait on the rendered DOM reported all three the
    // same way, which is worth avoiding: this did flake once under load.
    await waitForStage(
      'the linear view has displayed regions',
      (viewId: string) => {
        const view = window.JBrowseSession.views.find(v => v.id === viewId)
        return !!view && view.displayedRegions.length > 0
      },
      LGV_ID,
    )
    await waitForStage(
      'both tracks are open in the linear view',
      (viewId: string) =>
        window.JBrowseSession.views.find(v => v.id === viewId).tracks.length ===
        2,
      LGV_ID,
    )
    await waitForStage(
      'the rGFA adapter returned features',
      (trackId: string) =>
        !!document.querySelector(
          `[data-testid^="trackRenderingContainer-demo_lgv-${trackId}"] svg,
           [data-testid^="trackRenderingContainer-demo_lgv-${trackId}"] canvas`,
        ),
      RGFA_TRACK_ID,
    )
    await screenshot(page, 'demo-00-linear-view-with-graph-track')
  }, 300_000)

  afterAll(async () => {
    await browser.close()
    await cleanupJBrowse()
  })

  // Live model state. Reading it is how a demo asserts on what the *browser*
  // built, rather than on what the source says it should have built.
  function session() {
    return page.evaluate(() => {
      const s = window.JBrowseSession
      return {
        viewTypes: s.views.map((v: { type: string }) => v.type),
        graph: s.views
          .filter((v: { type: string }) => v.type === 'GraphGenomeView')
          .map(
            (v: {
              id: string
              connectedViewId?: string
              loadedTrackId?: string
              loadedRegion?: unknown
              nodeCount?: number
              colorScheme?: string
              effectiveColorScheme?: string
              hoveredNode?: string | null
              hoverHighlight?: unknown
            }) => ({
              id: v.id,
              connectedViewId: v.connectedViewId,
              loadedTrackId: v.loadedTrackId,
              loadedRegion: v.loadedRegion,
              nodeCount: v.nodeCount,
              colorScheme: v.colorScheme,
              effectiveColorScheme: v.effectiveColorScheme,
              hoveredNode: v.hoveredNode,
              hoverHighlight: v.hoverHighlight,
            }),
          ),
      }
    })
  }

  // Menu item labels the live, extended state model produces. If
  // Core-extendPluggableElement didn't run over the registered LinearGenomeView
  // in a real app, these come back without the graph entries.
  function menuLabels(kind: 'menuItems' | 'rubberBandMenuItems') {
    return page.evaluate(
      ([which, viewId]: string[]) => {
        const view = window.JBrowseSession.views.find(v => v.id === viewId)
        const flatten = (items: unknown[]): string[] =>
          items.flatMap(item => {
            const i = item as { label?: unknown; subMenu?: unknown[] }
            const label = typeof i.label === 'string' ? [i.label] : []
            return [...label, ...(i.subMenu ? flatten(i.subMenu) : [])]
          })
        return flatten(view[which!]())
      },
      [kind, LGV_ID],
    )
  }

  async function tracksContainerBox() {
    const el = await page.waitForSelector('[data-testid="tracksContainer"]')
    const box = await el!.boundingBox()
    if (!box) {
      throw new Error('tracksContainer has no box')
    }
    return box
  }

  function menuRowLabels() {
    return page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('li,[role="menuitem"]')].map(
        el => el.textContent,
      ),
    )
  }

  // Clicks a MUI menu row by its visible text. Real DOM, so this proves the item
  // renders and is clickable, not merely that the model listed it.
  async function clickMenuText(text: string) {
    await page.waitForFunction(
      (t: string) =>
        [...document.querySelectorAll('li,[role="menuitem"]')].some(el =>
          el.textContent.includes(t),
        ),
      { timeout: 15_000 },
      text,
    )
    const clicked = await page.evaluate((t: string) => {
      const row = [
        ...document.querySelectorAll<HTMLElement>('li,[role="menuitem"]'),
      ].find(el => el.textContent.includes(t))
      if (row) {
        row.click()
        return true
      }
      return false
    }, text)
    expect(clicked).toBe(true)
  }

  async function waitForGraphDrawn() {
    await page.waitForSelector(GRAPH_CANVAS, { timeout: 120_000 })
    await page.waitForFunction(
      () =>
        window.JBrowseSession.views.some(
          (v: { type: string; nodeCount?: number }) =>
            v.type === 'GraphGenomeView' && (v.nodeCount ?? 0) > 0,
        ),
      { timeout: 120_000 },
    )
  }

  // ---------------------------------------------------------------- entry points

  // The view-level items exist at all — this is the extension applying to the
  // registered LinearGenomeView in a real app, which the unit suite could only
  // check against a hand-built plugin manager.
  it('the linear view offers the graph launch items', async () => {
    expect(await menuLabels('menuItems')).toContain(
      'Graph genome view (this region)',
    )
  })

  // A rubberband selection is the entry point that works at the zoom people
  // browse at, so it gets the full real-gesture treatment: shift-drag over the
  // tracks area, then click the row that appears.
  it('a rubberband selection launches a subgraph view', async () => {
    const box = await tracksContainerBox()
    const y = box.y + box.height / 2
    await page.keyboard.down('Shift')
    await page.mouse.move(box.x + box.width * 0.3, y)
    await page.mouse.down()
    for (let i = 1; i <= 8; i++) {
      await page.mouse.move(box.x + box.width * (0.3 + i * 0.02), y)
    }
    await page.mouse.up()
    await page.keyboard.up('Shift')

    await screenshot(page, 'demo-01-rubberband-menu')
    await clickMenuText('Graph genome view (this selection)')
    await waitForGraphDrawn()
    await screenshot(page, 'demo-02-subgraph-launched-from-selection')

    const state = await session()
    expect(state.viewTypes).toContain('GraphGenomeView')
    const graph = state.graph[0]!
    // the pairing that drives the hover sync, and the region it actually cut
    expect(graph.connectedViewId).toBe(LGV_ID)
    expect(graph.loadedTrackId).toBe(RGFA_TRACK_ID)
    expect(graph.nodeCount).toBeGreaterThan(0)
    expect(graph.loadedRegion).toMatchObject({
      refName: REF_NAME,
      assemblyName: ASSEMBLY,
    })
    // A menu launch takes the view's own defaults, and the colour default is
    // 'auto' — resolved, on a graph carrying reference coordinates, to the ramp
    // the linear lane above it can be painted with. It used to open flat grey
    // and both tutorials spent a step saying "now pick a colour".
    expect(graph.colorScheme).toBe('auto')
    expect(graph.effectiveColorScheme).toBe('reference-position')
    // ...and the key that says what the ramp spans is on screen with it, which
    // is the half a reader needs and no assertion on the model can see
    expect(
      await page.$('[data-testid="graph-ramp-legend"]'),
    ).not.toBeNull()
  }, 240_000)

  // ------------------------------------------------------------------ hover sync

  // Graph -> linear. A real mouse over the graph canvas has to end in a painted
  // band over the linear view, which means: hit detection -> hoveredNode ->
  // hoverHighlight -> the component mounted through
  // LinearGenomeView-TracksContainerComponent.
  it('hovering a graph node highlights its span in the linear view', async () => {
    await page.waitForSelector(GRAPH_CANVAS)

    // Aim at the mid-point of a node the model says is there, projected through
    // the view's own scale/translate, and pick a *backbone* node so its declared
    // reference span is the exact interval the highlight must cover.
    //
    // Sweeping painted pixels instead was flaky for a reason worth recording: the
    // first painted rows are the top edge of the drawn tube, ~4.6 screen px above
    // the centreline, against a 5 px hover threshold — so it sat right on the
    // boundary and hit or missed depending on the layout.
    const target = await page.evaluate((selector: string) => {
      const view = window.JBrowseSession.views.find(
        v => v.type === 'GraphGenomeView',
      )
      const rect = document
        .querySelector<HTMLCanvasElement>(selector)!
        .getBoundingClientRect()
      const node = view.graph.nodes.find(
        (n: { stable?: { rank: number } }) => n.stable?.rank === 0,
      )
      // The middle of the middle SEGMENT, not the midpoint of the two
      // endpoints. Under FMMM a node is a polyline of many points and its tube
      // follows every bend, so the straight line between its ends runs off the
      // drawing — this aimed into empty space and hovered nothing. A two-point
      // node gives the same answer either way.
      const segments = view.nodePositions[node.id]
      const i = Math.max(0, Math.floor((segments.length - 1) / 2))
      const a = segments[i]
      const b = segments[Math.min(i + 1, segments.length - 1)]
      const midX = (a.x + b.x) / 2
      const midY = (a.y + b.y) / 2
      return {
        nodeId: node.id as string,
        expected: {
          refName: node.stable.refName as string,
          start: node.stable.start as number,
          end: (node.stable.start + node.length) as number,
        },
        // scaleX and scaleY, not one `scale`: a row layout draws y in screen
        // px and x in reference bp, so the two axes carry different numbers and
        // projecting y through the x zoom lands the pointer hundreds of rows
        // off the node it was aimed at.
        x: rect.left + (midX * view.scaleX + view.translateX),
        y: rect.top + (midY * view.scaleY + view.translateY),
      }
    }, GRAPH_CANVAS)

    // a point off-screen would make the mouse move a no-op and the failure a lie
    expect(target.y).toBeLessThan(900)
    await page.mouse.move(target.x, target.y)

    const state = await session()
    expect(state.graph[0]!.hoveredNode).toBe(target.nodeId)
    // The band the linear view paints is exactly the hovered segment's own span.
    expect(state.graph[0]!.hoverHighlight).toEqual({
      refName: REF_NAME,
      assemblyName: ASSEMBLY,
      start: target.expected.start,
      end: target.expected.end,
    })
    // and the band is really painted over the linear view, not merely derivable
    // from the model — this is the component mounted through
    // LinearGenomeView-TracksContainerComponent
    const band = await page.evaluate(() => {
      const el = document.querySelector<HTMLElement>(
        '[data-testid="tracksContainer"] [data-testid="graph-node-highlight"]',
      )
      return el ? { width: el.getBoundingClientRect().width } : undefined
    })
    expect(band?.width).toBeGreaterThan(0)
    await screenshot(page, 'demo-03-graph-hover-highlights-linear-view')
  }, 240_000)

  // Linear -> graph, the direction that needs no new API: the LGV publishes its
  // hover to session.hovered and the graph view's autorun picks the node out of
  // it. Hovering the *plain* track proves the coordinate fallback works, not just
  // the segment-name match.
  it('hovering the linear view selects the matching graph node', async () => {
    const box = await tracksContainerBox()
    let hoveredNode: string | null = null
    for (let i = 0; i < 20 && hoveredNode === null; i++) {
      await page.mouse.move(
        box.x + box.width * (0.2 + i * 0.03),
        box.y + box.height * 0.5,
      )
      hoveredNode = await page.evaluate(() => {
        const graph = window.JBrowseSession.views.find(
          (v: { type: string }) => v.type === 'GraphGenomeView',
        )
        return graph?.hoveredNode ?? null
      })
    }

    expect(hoveredNode).not.toBeNull()
    await screenshot(page, 'demo-04-linear-hover-selects-graph-node')
  }, 240_000)

  // ------------------------------------------------------- cross-track and gating

  // The plain track cannot cut a subgraph, so the launch has to come from the
  // graph track instead. This is the bubble-track case: the thing worth
  // right-clicking is rarely the thing holding the graph.
  it('right-clicking a feature on a non-graph track launches from the graph track', async () => {
    const before = (await session()).graph.length
    const box = await page.evaluate((trackId: string) => {
      const el = document.querySelector(
        `[data-testid^="trackRenderingContainer-demo_lgv-${trackId}"]`,
      )
      const r = el?.getBoundingClientRect()
      return r
        ? { x: r.x, y: r.y, width: r.width, height: r.height }
        : undefined
    }, PLAIN_TRACK_ID)
    expect(box).toBeDefined()

    // Right-click across the track until a feature menu opens: a right-click only
    // carries a feature if it landed on one, and features occupy a few rows
    // rather than the whole track height. `seen` is kept so a failure says
    // whether no menu opened at all or one opened without the expected row.
    const seen = new Set<string>()
    let opened = false
    for (let row = 0; row < 4 && !opened; row++) {
      for (let i = 0; i < 12 && !opened; i++) {
        await page.mouse.click(
          box!.x + box!.width * (0.05 + i * 0.08),
          box!.y + 8 + row * 30,
          { button: 'right' },
        )
        const labels = await menuRowLabels()
        for (const label of labels) {
          seen.add(label)
        }
        opened = labels.some(l => l.includes(LAUNCH_SUBMENU))
        if (!opened) {
          await page.keyboard.press('Escape')
        }
      }
    }
    expect(opened, `menu rows seen: ${[...seen].join(' | ')}`).toBe(true)

    // The item lives in the shared "Launch view" submenu, whose children aren't
    // in the DOM until it is opened — so the demo has to expand it, exactly as a
    // user would.
    await clickMenuText(LAUNCH_SUBMENU)
    await screenshot(page, 'demo-05-cross-track-context-menu')
    await clickMenuText('Graph genome view (this feature)')
    await page.waitForFunction(
      (n: number) =>
        window.JBrowseSession.views.filter(
          (v: { type: string }) => v.type === 'GraphGenomeView',
        ).length > n,
      { timeout: 120_000 },
      before,
    )

    const graphs = (await session()).graph
    expect(graphs.length).toBe(before + 1)
    // launched from the plain track's menu, but cut from the graph track
    expect(graphs.at(-1)!.loadedTrackId).toBe(RGFA_TRACK_ID)
    await screenshot(page, 'demo-06-cross-track-launched')
  }, 300_000)

  // The item is live at a browsing zoom, which is what it exists for. It used
  // to assert the opposite here — greyed out at 1 Mb — written when the cap was
  // 100 kb; at 5 Mb no window of this 4.6 Mb genome can exceed it, so the
  // over-cap branch is pinned where it can be reached, in
  // launchSubgraph.test.ts against MAX_GRAPH_REGION_BP rather than a literal.
  it('a whole-chromosome region still offers the item', async () => {
    await page.evaluate(
      ([viewId, loc]: string[]) => {
        window.JBrowseSession.views
          .find(v => v.id === viewId)
          .navToLocString(loc)
      },
      [LGV_ID, `${REF_NAME}:1-4,000,000`],
    )
    await page.waitForFunction(
      (viewId: string) =>
        window.JBrowseSession.views.find(v => v.id === viewId).dynamicBlocks
          .totalBp > 1_000_000,
      { timeout: 30_000 },
      LGV_ID,
    )

    const item = await page.evaluate((viewId: string) => {
      const view = window.JBrowseSession.views.find(v => v.id === viewId)
      const find = (items: unknown[]): Record<string, unknown> | undefined => {
        for (const raw of items) {
          const i = raw as {
            label?: unknown
            subMenu?: unknown[]
            disabled?: unknown
            disabledHelpText?: unknown
          }
          if (i.label === 'Graph genome view (this region)') {
            return {
              disabled: i.disabled,
              disabledHelpText: i.disabledHelpText,
            }
          }
          const nested = i.subMenu ? find(i.subMenu) : undefined
          if (nested) {
            return nested
          }
        }
        return undefined
      }
      return find(view.menuItems())
    }, LGV_ID)

    expect(item).toMatchObject({ disabled: false })
    await screenshot(page, 'demo-07-whole-chromosome-region')
  }, 120_000)
})
