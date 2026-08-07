import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  BASE_URL,
  PLUGIN_ESM_URL,
  cleanupJBrowse,
  createJBrowsePage,
  launchBrowser,
  screenshot,
  setupJBrowse,
  startJBrowseServer,
  waitForReactMount,
} from './setup'

import type { Browser, Page } from 'puppeteer'

// Opt-in the same way forceLayout.test.ts is:
//
//   JBROWSE_TEST_DIR=/path/to/jbrowse-web/build RUN_E2E=1 pnpm test:e2e
const runE2E = process.env.RUN_E2E === '1'

// test.gfa is test_data/ecoli_pggb_subgraph.gfa, the window the demo cuts with
// `odgi extract -r K12#1#chr:1004500-1004900`. It carries no SN/SO/SR tag at
// all, so before pathAnchoring the only layout it could get was FMMM.
const ANCHORED_VIEW = 'graph_anchored'
const SAMPLE_ROWS_VIEW = 'graph_sample_rows'
const RIBBONS_VIEW = 'graph_ribbons'

function config() {
  const gfaLocation = {
    uri: `${BASE_URL}/test.gfa`,
    locationType: 'UriLocation',
  }
  return {
    plugins: [{ name: 'GraphGenomeView', esmUrl: PLUGIN_ESM_URL }],
    assemblies: [],
    defaultSession: {
      name: 'anchored e2e',
      views: [
        {
          id: ANCHORED_VIEW,
          type: 'GraphGenomeView',
          layoutMode: 'auto',
          // no session assembly to infer from, so the axis is named outright
          referencePath: 'K12',
          colorScheme: 'depth',
          gfaLocation,
        },
        {
          id: SAMPLE_ROWS_VIEW,
          type: 'GraphGenomeView',
          layoutMode: 'samplerows',
          referencePath: 'K12',
          colorScheme: 'depth',
          gfaLocation,
        },
        // The one configuration no e2e loaded, and the one where the ribbon
        // geometry runs at all: five P records, an anchored layout, and
        // `drawPaths`. Grey with it, since depth is per node and carriage is
        // per path and the two colourings fight.
        {
          id: RIBBONS_VIEW,
          type: 'GraphGenomeView',
          layoutMode: 'auto',
          referencePath: 'K12',
          colorScheme: 'grey',
          drawPaths: true,
          gfaLocation,
        },
      ],
    },
  }
}

// Row labels are emitted by the layout that placed the rows, so reading them
// back is reading which layout ran — an FMMM fallback emits none at all.
function rowLabels(page: Page, viewId: string) {
  return page.evaluate(
    id =>
      [
        ...document.querySelectorAll(
          `[data-testid="view-container-${id}"] [data-testid="graph-row-label"]`,
        ),
      ]
        .map(el => el.textContent.trim())
        .filter(t => !!t),
    viewId,
  )
}

describe.skipIf(!runE2E)('a pggb GFA anchored from its paths', () => {
  let browser: Browser
  let page: Page

  beforeAll(async () => {
    setupJBrowse({ config: config() })
    await startJBrowseServer()
    browser = await launchBrowser()
    page = await createJBrowsePage(browser)
    await waitForReactMount(page)
    await page.waitForFunction(
      () =>
        document.querySelectorAll('[data-testid="graph-row-label"]').length > 0,
      { timeout: 120_000 },
    )
  }, 180_000)

  afterAll(async () => {
    await browser.close()
    await cleanupJBrowse()
  })

  it('draws the anchored layout instead of falling back to force', async () => {
    // Rank 1 is every segment the reference path never visits; a path GFA
    // supports no finer distinction, so two rows is the whole ladder.
    expect(await rowLabels(page, ANCHORED_VIEW)).toEqual([
      'Reference (rank 0)',
      'Rank 1',
    ])
    await screenshot(page, 'anchored-00-pggb-both-layouts')
  }, 60_000)

  it('rows the same graph by strain', async () => {
    // Carriage, which is what the walk buys over rGFA: every strain that
    // traverses a segment is known, not just the one that first contributed it.
    //
    // The reference keeps row 0; the rest are ordered by how much off-reference
    // sequence each carries here, not by name, so this asserts membership and
    // the reference's place rather than a fixed order. Which strain carries the
    // most is a fact about the window, and pinning it here would make this test
    // fail on a different cut of the same graph.
    const labels = await rowLabels(page, SAMPLE_ROWS_VIEW)
    expect(labels[0]).toBe('K12')
    expect([...labels].sort()).toEqual([
      'CFT073',
      'IAI39',
      'K12',
      'NCTC86',
      'Sakai',
    ])
  }, 60_000)

  // In an anchored layout consecutive segments abut, so every backbone link has
  // a zero-length chord. The ribbon fan is perpendicular to that chord, and it
  // used to give up when there was none: the whole chain drew with no edge
  // geometry. This is the smoke half of that — the unit tests count the curves,
  // this one says the path runs in a browser against a real 5-path GFA, which
  // nothing did before.
  it('draws a path-ribboned graph without falling over', async () => {
    const state = await page.evaluate(id => {
      const view = window.JBrowseSession.views.find(v => v.id === id)
      return {
        error: view.error ? String(view.error) : undefined,
        drawPaths: view.drawPaths,
        pathCount: view.pathCount,
        legend: view.pathLegend.map(e => e.label),
        rows: view.rowLabels.length,
      }
    }, RIBBONS_VIEW)

    expect(state.error).toBeUndefined()
    expect(state.drawPaths).toBe(true)
    expect(state.pathCount).toBe(5)
    // one swatch per path drawn, named the least of each path's own name that
    // separates it from the others
    expect([...state.legend].sort()).toEqual([
      'CFT073',
      'IAI39',
      'K12',
      'NCTC86',
      'Sakai',
    ])
    expect(state.rows).toBe(2)
    await screenshot(page, 'anchored-01-path-ribbons')
  }, 60_000)

  it('paints both canvases', async () => {
    const painted = await page.evaluate(() => {
      const canvases = [
        ...document.querySelectorAll('canvas'),
      ] as HTMLCanvasElement[]
      return canvases.filter(canvas => {
        const ctx = canvas.width > 50 ? canvas.getContext('2d') : null
        const data = ctx?.getImageData(
          0,
          0,
          canvas.width,
          canvas.height,
        ).data
        return (
          !!data && data.some((v, i) => i % 4 === 3 && v > 0)
        )
      }).length
    })
    expect(painted).toBeGreaterThanOrEqual(2)
  }, 60_000)
})
