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
  waitForAppReady,
  writeServedFile,
} from './setup'

import type { Browser, ElementHandle, Page } from 'puppeteer'

// RUN_E2E=1 pnpm test:e2e test/walkFormsMenu.test.ts
//
// Reads the published HPRC walk file over the network, as the docs' track
// does: LPA's forms cut takes about 5 s.
const runE2E = process.env.RUN_E2E === '1'
const WALKS = 'https://jbrowse.org/demos/hprc/hprc-v2.1-mc-grch38-f5.GRCh38'
const LPA = { refName: 'chr6', start: 160_525_000, end: 160_655_000 }

function config() {
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
            chromSizesLocation: {
              uri: `${BASE_URL}/hg38_chr6.chrom.sizes`,
              locationType: 'UriLocation',
            },
          },
        },
      },
    ],
    tracks: [
      {
        type: 'VariantTrack',
        trackId: 'forms_lpa',
        name: 'Structural forms at LPA',
        assemblyNames: ['hg38'],
        adapter: {
          type: 'WalkFormsAdapter',
          walksUri: WALKS,
          pinned: LPA,
          exclude: ['CHM13'],
        },
        displays: [
          {
            type: 'LinearMultiSampleVariantDisplay',
            displayId: 'forms_lpa-display',
            showTree: false,
            shadeByDosage: false,
            color: {
              field: 'consequence',
              scale: 'categorical',
              domain: ['loss', 'gain', 'shift', 'inversion', 'net'],
              range: ['#e41a1c', '#800080', '#8a94a3', '#ff7f00', '#7e6148'],
              title: 'Change',
            },
          },
        ],
      },
    ],
    defaultSession: {
      name: 'forms menu e2e',
      views: [
        {
          id: 'forms_view',
          type: 'LinearGenomeView',
          init: {
            assembly: 'hg38',
            loc: 'chr6:160,525,001-160,655,000',
            tracks: ['forms_lpa'],
          },
        },
      ],
    },
  }
}

interface FormsState {
  rows: string[] | undefined
  error: string | undefined
  pinned: { refName: string; start: number; end: number } | undefined
  floor: number | 'auto'
  status: string | undefined
  forms: number | undefined
}

function formsState(page: Page) {
  return page.evaluate((): FormsState => {
    const d = window.JBrowseSession.views[0].tracks[0]?.displays[0]
    return {
      rows: d?.sourcesBase?.map((s: { label: string }) => s.label),
      error: d?.error ? String(d.error) : undefined,
      pinned: d?.formsWindow,
      floor: d?.formsFloor,
      status: d?.statusMessage,
      forms: d?.formsCount,
    }
  })
}

// Settled on a row set other than `before`, or on an error
async function waitForRows(page: Page, before?: string[]) {
  await page.waitForFunction(
    (was: string) => {
      const d = window.JBrowseSession.views[0].tracks[0]?.displays[0]
      const rows = d?.sourcesBase?.map((s: { label: string }) => s.label)
      return !!d?.error || (!!rows && JSON.stringify(rows) !== was)
    },
    { timeout: 120_000 },
    JSON.stringify(before),
  )
  await waitForAppReady(page)
  return formsState(page)
}

async function closeMenus(page: Page) {
  while (await page.$('[role="menu"]')) {
    await page.keyboard.press('Escape')
  }
}

async function clickMenu(page: Page, labels: string[]) {
  await closeMenus(page)
  await page.click('[data-testid="track_menu_icon"]')
  for (const label of labels) {
    const handle = await page.waitForFunction(
      (t: string) =>
        [...document.querySelectorAll<HTMLElement>('[role^="menuitem"]')].find(
          e => e.textContent.trim().startsWith(t),
        ),
      { timeout: 30_000 },
      label,
    )
    await (handle.asElement() as ElementHandle).click()
  }
  await closeMenus(page)
}

function menuLabels(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].map(e =>
      e.textContent.trim(),
    ),
  )
}

// No test waits for the app to settle away from the pinned window: core
// before 5.0.0-beta.14 never finishes loading a window with no records
describe.skipIf(!runE2E)('the forms track menu at LPA', () => {
  let browser: Browser
  let page: Page
  // The adapter reports "Cutting walks" only while it cuts, so the statuses
  // count cuts. The walk file's requests can't: core's range cache answers a
  // re-read without the network.
  const statuses = new Set<string>()

  beforeAll(async () => {
    setupJBrowse({ config: config() })
    writeServedFile('hg38_chr6.chrom.sizes', 'chr6\t170805979\n')
    await startJBrowseServer()
    browser = await launchBrowser()
    page = await createJBrowsePage(browser)
    await page.exposeFunction('noteStatus', (s: string) => {
      statuses.add(s)
    })
    await page.evaluate(() => {
      setInterval(() => {
        const d = window.JBrowseSession.views[0]?.tracks[0]?.displays[0]
        const s = d?.statusMessage
        if (s) {
          ;(
            window as unknown as { noteStatus: (s: string) => void }
          ).noteStatus(String(s))
        }
      }, 50)
    })
  }, 180_000)

  afterAll(async () => {
    await browser.close()
    await cleanupJBrowse()
  })

  it('draws the pinned window as rows of forms', async () => {
    const state = await waitForRows(page)
    expect(state.error).toBeUndefined()
    expect(state.rows!.length).toBeGreaterThan(2)
    expect(state.pinned).toEqual(LPA)
    await page.click('[data-testid="track_menu_icon"]')
    const labels = await menuLabels(page)
    expect(labels).toContain('Re-pin to visible region')
    expect(
      labels.find(l => l.startsWith('Pinned to chr6:160,525,001-160,655,000')),
    ).toMatch(/· \d+ forms$/)
    await screenshot(page, 'forms-menu-lpa-menu')
    await closeMenus(page)
    await screenshot(page, 'forms-menu-lpa')
  }, 180_000)

  it('keeps the rows when the view pans', async () => {
    const before = await formsState(page)
    statuses.clear()
    await page.evaluate(() => {
      window.JBrowseSession.views[0].horizontalScroll(400)
    })
    await waitForAppReady(page)
    await new Promise(r => setTimeout(r, 2000))
    const after = await formsState(page)
    expect(after.rows).toEqual(before.rows)
    expect(after.pinned).toEqual(LPA)
    expect([...statuses].some(s => s.includes('Cutting walks'))).toBe(false)
    await screenshot(page, 'forms-menu-panned')
  }, 120_000)

  // The MHC's forms merge at a coarser floor: 11 at 1 kb, 6 at 10 kb
  it('re-pins to the visible region, and the rows change', async () => {
    const before = await formsState(page)
    await page.evaluate(async () => {
      await window.JBrowseSession.views[0].navToLocString(
        'chr6:32,520,001-32,610,000',
      )
    })
    await screenshot(page, 'forms-menu-outside-pin')
    statuses.clear()
    await clickMenu(page, ['Re-pin to visible region'])
    const after = await waitForRows(page, before.rows)
    expect(after.error).toBeUndefined()
    expect(after.pinned?.refName).toBe('chr6')
    expect(after.pinned!.start).toBeGreaterThanOrEqual(32_519_000)
    expect(after.pinned!.end).toBeLessThanOrEqual(32_611_000)
    expect(after.rows).not.toEqual(before.rows)
    expect([...statuses].some(s => s.includes('Cutting walks'))).toBe(true)
    await screenshot(page, 'forms-menu-repinned')
  }, 180_000)

  it('merges the rows at a 10 kb floor without a new cut', async () => {
    const before = await formsState(page)
    statuses.clear()
    await clickMenu(page, ['Hide changes under', '10 kb'])
    const after = await waitForRows(page, before.rows)
    expect(after.error).toBeUndefined()
    expect(after.floor).toBe(10_000)
    expect(after.pinned).toEqual(before.pinned)
    console.log(
      `forms at the auto floor ${before.forms}, at 10 kb ${after.forms}`,
    )
    expect(after.forms).toBeLessThan(before.forms!)
    expect([...statuses].some(s => s.includes('Cutting walks'))).toBe(false)
    await screenshot(page, 'forms-menu-floor-10kb')
  }, 120_000)

  it('says the window is too large when a zoomed-out re-pin passes walkByteBudget', async () => {
    const before = await formsState(page)
    await page.evaluate(async () => {
      await window.JBrowseSession.views[0].navToLocString(
        'chr6:150,000,001-170,000,000',
      )
    })
    const started = Date.now()
    await clickMenu(page, ['Re-pin to visible region'])
    const after = await waitForRows(page, before.rows)
    expect(Date.now() - started).toBeLessThan(30_000)
    expect(after.error).toMatch(
      /The pinned window chr6:[\d,]+-[\d,]+ is too large to cut for structural forms: about .* of it fits in walkByteBudget, 1\.0 MB\. Pin a narrower window or raise walkByteBudget/,
    )
    await screenshot(page, 'forms-menu-over-budget')
  }, 120_000)
})
