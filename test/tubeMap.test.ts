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
  writeServedFile,
} from './setup'

import type { Browser, Page } from 'puppeteer'

// RUN_E2E=1 pnpm test:e2e test/tubeMap.test.ts
//
// The tube map layouts in a real browser: the five-strain pggb GFA as a
// standalone view on both axes, and a GBZ cut of the MICB locus as a graph
// track of a linear view on the reference axis. The GBZ fixture is
// sequenceTubeMap's exampleData/micb-kir3dl1.gbz.db, served from the adapter's
// test data.
const runE2E = process.env.RUN_E2E === '1'
const MICB = 'micb-kir3dl1.gbz.db'

const OWN_VIEW = 'tube_map_own'
const REFERENCE_VIEW = 'tube_map_reference'
const LGV = 'tube_map_lgv'
const GBZ_TRACK = 'micb_gbz'

function config() {
  const served = (file: string) => ({
    uri: `${BASE_URL}/${file}`,
    locationType: 'UriLocation',
  })
  return {
    plugins: [{ name: 'GraphGenomeView', esmUrl: PLUGIN_ESM_URL }],
    assemblies: [
      {
        name: 'hg38',
        sequence: {
          type: 'ReferenceSequenceTrack',
          trackId: 'hg38-refseq',
          adapter: {
            type: 'ChromSizesAdapter',
            chromSizesLocation: served('hg38_chr6.chrom.sizes'),
          },
        },
      },
    ],
    tracks: [
      {
        type: 'GraphTrack',
        trackId: GBZ_TRACK,
        name: 'MICB (GBZ)',
        assemblyNames: ['hg38'],
        adapter: {
          type: 'GbzBaseSyntenyAdapter',
          gbzDbLocation: served(MICB),
          assemblyNames: ['hg38'],
          assemblyNameToPanSN: { hg38: 'GRCh38' },
        },
        displays: [
          {
            type: 'LinearGraphDisplay',
            displayId: `${GBZ_TRACK}-LinearGraphDisplay`,
            layoutMode: 'tubemapref',
          },
        ],
      },
    ],
    defaultSession: {
      name: 'tube map e2e',
      views: [
        {
          id: OWN_VIEW,
          type: 'GraphGenomeView',
          displayName: 'E. coli, 5 strains',
          layoutMode: 'tubemap',
          referencePath: 'K12',
          gfaLocation: served('test.gfa'),
        },
        {
          id: REFERENCE_VIEW,
          type: 'GraphGenomeView',
          displayName: 'E. coli, 5 strains',
          layoutMode: 'tubemapref',
          referencePath: 'K12',
          gfaLocation: served('test.gfa'),
        },
        {
          id: LGV,
          type: 'LinearGenomeView',
          init: {
            assembly: 'hg38',
            loc: 'chr6:31,498,500-31,502,500',
            tracks: [GBZ_TRACK],
          },
        },
      ],
    },
  }
}

// How much of a canvas holds ink, so a blank overlay fails rather than passes.
function inkedPixels(page: Page, selector: string) {
  return page.evaluate(sel => {
    const canvas = document.querySelector<HTMLCanvasElement>(sel)
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || canvas.width === 0) {
      return 0
    }
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    let inked = 0
    for (let i = 3; i < data.length; i += 4) {
      if (data[i]! > 0) {
        inked++
      }
    }
    return inked
  }, selector)
}

describe.skipIf(!runE2E)('the tube map layouts', () => {
  let browser: Browser
  let page: Page

  beforeAll(async () => {
    writeServedFile('hg38_chr6.chrom.sizes', 'chr6\t170805979\n')
    setupJBrowse({
      config: config(),
      dataFiles: [
        ['src/GbzBaseSyntenyAdapter/test_data/micb-kir3dl1.gbz.db', MICB],
      ],
    })
    await startJBrowseServer()
    browser = await launchBrowser()
    page = await createJBrowsePage(browser)
    // tall enough for both views and the linear view's track below them
    await page.setViewport({ width: 1400, height: 1700 })
    await waitForReactMount(page)
    await page.waitForFunction(
      ids =>
        ids.every(
          id =>
            window.JBrowseSession.views.find(v => v.id === id)?.tubeMapPicture,
        ),
      { timeout: 120_000 },
      [OWN_VIEW, REFERENCE_VIEW],
    )
  }, 300_000)

  afterAll(async () => {
    await browser.close()
    await cleanupJBrowse()
  })

  it('draws every strain as a tube on its own axis', async () => {
    const state = await page.evaluate(id => {
      const view = window.JBrowseSession.views.find(v => v.id === id)
      return {
        error: view.error ? String(view.error) : undefined,
        tracks: view.layoutResult.tubeMap.layout.tracks.length,
        legend: view.pathLegend.map(e => e.label).sort(),
      }
    }, OWN_VIEW)
    expect(state.error).toBeUndefined()
    expect(state.tracks).toBe(5)
    expect(state.legend).toEqual(['CFT073', 'IAI39', 'K12', 'NCTC86', 'Sakai'])
    expect(
      await inkedPixels(
        page,
        `[data-testid="view-container-${OWN_VIEW}"] [data-testid="graph-tube-map"]`,
      ),
    ).toBeGreaterThan(1000)
    await screenshot(page, 'tubemap-00-standalone-both-axes')
  }, 60_000)

  it('outlines a hovered box on the hover layer, leaving the tubes', async () => {
    const pane = `[data-testid="view-container-${OWN_VIEW}"]`
    const layer = `${pane} [data-testid="graph-hover-layer"]`
    const tubes = () =>
      page.evaluate(
        sel => document.querySelector<HTMLCanvasElement>(sel)?.toDataURL(),
        `${pane} [data-testid="graph-tube-map"]`,
      )
    const hover = (on: boolean) =>
      page.evaluate(
        (id, on) => {
          const view = window.JBrowseSession.views.find(v => v.id === id)
          view.setHoveredNode(on ? view.tubeMapPicture.nodes[0].name : null)
        },
        OWN_VIEW,
        on,
      )
    const before = await tubes()
    expect(await inkedPixels(page, layer)).toBe(0)
    await hover(true)
    expect(await inkedPixels(page, layer)).toBeGreaterThan(0)
    expect(await tubes()).toBe(before)
    await hover(false)
    expect(await inkedPixels(page, layer)).toBe(0)
  }, 60_000)

  it('pins the reference axis to the cut in bp', async () => {
    const columns = await page.evaluate(id => {
      const view = window.JBrowseSession.views.find(v => v.id === id)
      return view.layoutResult.tubeMap.columns.map(c => [c.bp0, c.bp1])
    }, REFERENCE_VIEW)
    expect(columns[0][0]).toBe(1004500)
    expect(columns.at(-1)[1]).toBe(1004961)
  }, 60_000)

  it('draws a GBZ cut as a tube map track in a linear view', async () => {
    const display = '[data-testid="linear-graph-display"]'
    await page.waitForFunction(
      sel =>
        !!document.querySelector(
          `${sel}[data-display-phase="ready"][data-node-count]:not([data-loading])`,
        ),
      { timeout: 120_000 },
      display,
    )
    const state = await page.evaluate(
      ([viewId, trackId]) => {
        const view = window.JBrowseSession.views.find(v => v.id === viewId)
        const track = view.tracks.find(
          (t: { configuration: { trackId: string } }) =>
            t.configuration.trackId === trackId,
        )
        const pane = track.displays[0]
        return {
          error: pane.error ? String(pane.error) : undefined,
          mode: pane.chosenLayoutMode,
          tubes: pane.layoutResult?.tubeMap?.layout.tracks.length ?? 0,
          referenceAxis: pane.layoutResult?.referenceAxis,
        }
      },
      [LGV, GBZ_TRACK],
    )
    expect(state.error).toBeUndefined()
    expect(state.mode).toBe('tubemapref')
    expect(state.referenceAxis).toBe(true)
    expect(state.tubes).toBeGreaterThan(1)
    expect(
      await inkedPixels(page, `${display} [data-testid="graph-tube-map"]`),
    ).toBeGreaterThan(1000)
    await screenshot(page, 'tubemap-01-gbz-track-in-linear-view')
  }, 180_000)

  // Splitting reaches the layout through the facet setting alone, as a
  // session or the Panels menu writes it
  it('splits a tube map into a panel per strain, each hovered on its own', async () => {
    const container = `[data-testid="view-container-${REFERENCE_VIEW}"]`
    const view = <T>(body: string) =>
      page.evaluate(
        ([id, fn]) =>
          // eslint-disable-next-line @typescript-eslint/no-implied-eval
          new Function('view', fn)(
            window.JBrowseSession.views.find(v => v.id === id),
          ),
        [REFERENCE_VIEW, body],
      ) as Promise<T>
    await view(`view.setFacet('walk')`)
    await page.waitForFunction(
      id =>
        window.JBrowseSession.views.find(v => v.id === id).tubeMapPanelViews
          ?.length === 4,
      { timeout: 60_000 },
      REFERENCE_VIEW,
    )
    const panels = await view<
      { label: string; top: number; bottom: number; tubes: number }[]
    >(
      `return view.tubeMapPanelViews.map(p => ({ label: p.label, top: p.top, bottom: p.bottom, tubes: p.panel.result.tubeMap.layout.tracks.length }))`,
    )
    expect(panels.map(p => p.label)).toEqual([
      'Sakai',
      'CFT073',
      'NCTC86',
      'IAI39',
    ])
    expect(panels.every(p => p.tubes === 2)).toBe(true)
    for (let i = 1; i < panels.length; i++) {
      expect(panels[i]!.top).toBeGreaterThan(panels[i - 1]!.bottom)
    }

    // a box in IAI39's panel, found the way the pointer finds one
    const rect = await page.$eval(
      `${container} [data-testid="graph-genome-canvas"]`,
      el => {
        const r = el.getBoundingClientRect()
        return { x: r.x, y: r.y, width: r.width }
      },
    )
    const last = panels[3]!
    const hit = await view<{ sx: number; sy: number } | undefined>(
      `for (let sy = ${last.top}; sy < ${last.bottom}; sy += 2) for (let sx = ${rect.width / 2}; sx < ${rect.width}; sx += 3) if (view.tubeMapNodeAt(sx, sy)) return { sx, sy }`,
    )
    expect(hit).toBeDefined()
    await page.mouse.move(rect.x + hit!.sx, rect.y + hit!.sy)
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll('div')].some(d =>
          d.textContent.includes(' bp, depth '),
        ),
      { timeout: 10_000 },
    )
    expect(await view('return view.hoveredPanel')).toBe(3)
    expect(
      await inkedPixels(page, `${container} [data-testid="graph-hover-layer"]`),
    ).toBeGreaterThan(0)
    await screenshot(page, 'tubemap-03-panel-per-strain')
  }, 180_000)
})
