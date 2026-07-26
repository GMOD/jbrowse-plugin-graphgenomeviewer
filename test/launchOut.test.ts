import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  ASSEMBLY,
  GRAPH_ID,
  LGV_ID,
  REF_NAME,
  createLaunchOutConfig,
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

// The way *out* of the graph, in a real browser. Unit tests can say the model
// lists an item; they cannot say the view menu renders it, that right-clicking a
// node opens anything, or that clicking through moves the linear view beside it
// instead of stacking another pane on top.
const runE2E = process.env.RUN_E2E === '1'

const GRAPH_CANVAS = '[data-testid="graph-genome-canvas"]'
const LAUNCH_SUBMENU = 'Launch view'

describe.skipIf(!runE2E)('launching out of the graph', () => {
  let browser: Browser
  let page: Page

  beforeAll(async () => {
    expect(writePlainBedTrack()).toBeGreaterThan(0)
    setupJBrowse({
      config: createLaunchOutConfig(),
      dataFiles: demoDataFiles(),
    })
    await startJBrowseServer()
    browser = await launchBrowser()
    page = await createJBrowsePage(browser)
    await waitForReactMount(page)
    // The declaratively-opened graph fetches its subgraph on attach, so waiting
    // for nodes proves that whole path, not just that the pane mounted.
    await page.waitForSelector(GRAPH_CANVAS, { timeout: 120_000 })
    await page.waitForFunction(
      (viewId: string) =>
        (window.JBrowseSession.views.find(v => v.id === viewId)?.nodeCount ??
          0) > 0,
      { timeout: 120_000 },
      GRAPH_ID,
    )
    await screenshot(page, 'out-00-graph-beside-linear-view')
  }, 300_000)

  afterAll(async () => {
    await browser.close()
    await cleanupJBrowse()
  })

  function graphView() {
    return page.evaluate((viewId: string) => {
      const view = window.JBrowseSession.views.find(v => v.id === viewId)
      return {
        connectedViewId: view.connectedViewId as string | undefined,
        contributingAssemblies: view.contributingAssemblies.map(
          (c: { sample: string }) => c.sample,
        ),
        launchable: view.launchableAssemblies.map(
          (c: { sample: string }) => c.sample,
        ),
      }
    }, GRAPH_ID)
  }

  function viewTypes() {
    return page.evaluate(() =>
      window.JBrowseSession.views.map((v: { type: string }) => v.type),
    )
  }

  function menuLabels(viewId: string) {
    return page.evaluate((id: string) => {
      const view = window.JBrowseSession.views.find(v => v.id === id)
      const flatten = (items: unknown[]): string[] =>
        items.flatMap(item => {
          const i = item as { label?: unknown; subMenu?: unknown[] }
          return [
            ...(typeof i.label === 'string' ? [i.label] : []),
            ...(i.subMenu ? flatten(i.subMenu) : []),
          ]
        })
      return flatten(view.menuItems())
    }, viewId)
  }

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
      row?.click()
      return !!row
    }, text)
    expect(clicked).toBe(true)
  }

  // The graph names four E. coli strains in its segment tags, of which this
  // session loads one as an assembly. That split is the whole design: the graph
  // knows all four, and can only open the one — the same shape as an HPRC graph
  // whose contributing haplotypes are not assemblies.
  it('the graph names every contributor and offers the loaded one', async () => {
    const view = await graphView()
    expect(view.contributingAssemblies.length).toBeGreaterThan(1)
    expect(view.launchable).toEqual([ASSEMBLY])

    const labels = await menuLabels(GRAPH_ID)
    expect(labels).toContain(LAUNCH_SUBMENU)
    expect(labels.some(l => l.startsWith('Linear genome view — K12 chr:'))).toBe(
      true,
    )
    // one openable assembly: nothing to compare, so no synteny item at all
    expect(labels.some(l => l.includes('Linear synteny view'))).toBe(false)
  }, 120_000)

  // The gesture that had no answer before: right-click a node and ask where it
  // is. The paired linear view scrolls to it; no pane is added.
  it('right-clicking a node moves the paired linear view', async () => {
    const before = await viewTypes()

    const target = await page.evaluate(
      ([selector, viewId]: string[]) => {
        const view = window.JBrowseSession.views.find(v => v.id === viewId)
        const rect = document
          .querySelector<HTMLCanvasElement>(selector!)!
          .getBoundingClientRect()
        // a backbone segment: its own coordinates are on the one loaded
        // assembly, so the exact-span item is the one offered
        const node = view.graph.nodes.find(
          (n: { stable?: { rank: number } }) => n.stable?.rank === 0,
        )
        const segments = view.nodePositions[node.id]
        const first = segments[0]
        const last = segments.at(-1)
        return {
          nodeId: node.id as string,
          start: node.stable.start as number,
          x:
            rect.left +
            (((first.x + last.x) / 2) * view.scale + view.translateX),
          y:
            rect.top +
            (((first.y + last.y) / 2) * view.scale + view.translateY),
        }
      },
      [GRAPH_CANVAS, GRAPH_ID],
    )

    await page.mouse.click(target.x, target.y, { button: 'right' })
    await screenshot(page, 'out-01-node-context-menu')

    await clickMenuText(`Linear genome view — ${ASSEMBLY} ${REF_NAME}:`)
    await page.waitForFunction(
      ([viewId, start]: [string, number]) => {
        const view = window.JBrowseSession.views.find(v => v.id === viewId)
        const block = view.dynamicBlocks.contentBlocks[0]
        return !!block && block.start <= start && block.end >= start
      },
      { timeout: 60_000 },
      [LGV_ID, target.start],
    )
    await screenshot(page, 'out-02-linear-view-moved-to-node')

    // moved, not multiplied
    expect(await viewTypes()).toEqual(before)
  }, 240_000)

  // An allele from a strain this session has not loaded: its own coordinates
  // exist and are exact, but nothing can open them, so the only way back to a
  // coordinate is the reference projection. This is the HPRC case, where none of
  // the contributing haplotypes is ever a loaded assembly.
  it('an off-reference node offers only the reference projection', async () => {
    const targets = await page.evaluate((viewId: string) => {
      const view = window.JBrowseSession.views.find(v => v.id === viewId)
      const node = view.graph.nodes.find(
        (n: { stable?: { rank: number } }) => (n.stable?.rank ?? 0) > 0,
      )
      const { own, reference } = view.nodeLaunchTargets(node.id)
      return {
        stableName: node.stable.refName as string,
        own,
        referenceAssembly: reference?.assembly as string | undefined,
      }
    }, GRAPH_ID)

    expect(targets.stableName).not.toContain(`${ASSEMBLY}#`)
    expect(targets.own).toBeUndefined()
    expect(targets.referenceAssembly).toBe(ASSEMBLY)
  }, 120_000)

  // Same from the view menu, on the whole cut region rather than one node, and
  // the pairing that drives the hover sync survives it.
  it('the view menu shows the cut region in the same linear view', async () => {
    const before = await viewTypes()
    await page.evaluate(
      ([viewId, loc]: string[]) => {
        window.JBrowseSession.views
          .find(v => v.id === viewId)
          .navToLocString(loc)
      },
      [LGV_ID, `${REF_NAME}:500,000-510,000`],
    )

    const label = (await menuLabels(GRAPH_ID)).find(l =>
      l.startsWith('Linear genome view — K12 chr:'),
    )!
    await page.evaluate(
      ([viewId, text]: string[]) => {
        const view = window.JBrowseSession.views.find(v => v.id === viewId)
        const find = (items: unknown[]): { onClick?: () => void } | undefined => {
          for (const raw of items) {
            const i = raw as {
              label?: unknown
              subMenu?: unknown[]
              onClick?: () => void
            }
            if (i.label === text) {
              return i
            }
            const nested = i.subMenu ? find(i.subMenu) : undefined
            if (nested) {
              return nested
            }
          }
          return undefined
        }
        find(view.menuItems())?.onClick?.()
      },
      [GRAPH_ID, label],
    )

    await page.waitForFunction(
      (viewId: string) => {
        const block = window.JBrowseSession.views.find(v => v.id === viewId)
          .dynamicBlocks.contentBlocks[0]
        return !!block && block.start < 20_000
      },
      { timeout: 60_000 },
      LGV_ID,
    )
    expect(await viewTypes()).toEqual(before)
    expect((await graphView()).connectedViewId).toBe(LGV_ID)
    await screenshot(page, 'out-03-view-menu-region-shown')
  }, 240_000)
})
