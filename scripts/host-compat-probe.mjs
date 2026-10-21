#!/usr/bin/env node
//
// Boots the built plugin on hosted JBrowse releases, cuts a subgraph on each,
// shows the graph track in a linear view and reads the walk lane track into
// a synteny view, and draws a structural forms track, failing if a host
// error-pages, never registers the view, cannot cut, or cannot draw any of
// them. The tutorials name the plugin by its
// jbrowse.org url, so a publish is a live change to every reader's session,
// and the failures this catches pass tsc, eslint and the unit tests: an RPC
// argument a released core cannot post to its worker, a re-export the host no
// longer serves. They show only when the bundle runs on the host. The hosts
// are every release in scripts/host-names/ and main, and the oldest release
// is the support floor.
//
// Usage:
//   node scripts/host-compat-probe.mjs
//   node scripts/host-compat-probe.mjs --versions v5.0.0-beta.13,main --dist dist
//   node scripts/host-compat-probe.mjs --published
//
// `--published` leaves the config's own plugin url alone, so the bundle under
// test is the one readers load. A host that moves with no commit here breaks
// that bundle, and host-watch.yml runs this daily to see it.
//
import fs from 'node:fs'
import { parseArgs } from 'node:util'

import { HPRC_CONFIG, gotoHosted, launchBrowser } from './hostedBrowser.mjs'
import { ENTRY, candidateServer } from './serveCandidate.mjs'

const DEFAULT_VERSIONS = [
  ...fs
    .readdirSync(new URL('host-names/', import.meta.url))
    .map(file => file.replace(/\.json$/, ''))
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true })),
  'main',
]
// The window part 1 of the HPRC tutorial cuts from its segments track
const TRACK_ID = 'hprc_minigraph_segments'
const REGION = {
  refName: 'chr6',
  assemblyName: 'hg38',
  start: 31_980_000,
  end: 32_050_000,
}
const LOCUS = 'chr6:31,980,001-32,050,000'
// HG00133's GSTM1 deletion against GRCh38, read from the graph, as the
// force_gstm1_walk figure draws it
const SYNTENY_TRACK_ID = 'hprc_v2_1_walk_lanes'
const SYNTENY_VIEWS = [
  { assembly: 'hg38', loc: 'chr1:109,670,000-109,705,000' },
  { assembly: 'HG00133.1', loc: 'CM090045.1:109,741,100-109,757,750' },
]
// A structural forms track at GSTM1, the docs' example, whose cut takes about
// half a second
const FORMS_TRACK = {
  type: 'VariantTrack',
  trackId: 'probe_walk_forms',
  name: 'Structural forms at GSTM1',
  assemblyNames: ['hg38'],
  adapter: {
    type: 'WalkFormsAdapter',
    walksUri: 'https://jbrowse.org/demos/hprc/hprc-v2.1-mc-grch38-f5.GRCh38',
    pinned: { refName: 'chr1', start: 109_680_000, end: 109_715_000 },
    exclude: ['CHM13'],
  },
  displays: [
    {
      type: 'LinearMultiSampleVariantDisplay',
      displayId: 'probe_walk_forms-display',
    },
  ],
}
const FORMS_LOCUS = 'chr1:109,680,001-109,715,000'

const { values } = parseArgs({
  options: {
    dist: { type: 'string', default: 'dist' },
    published: { type: 'boolean', default: false },
    versions: { type: 'string' },
    timeout: { type: 'string', default: '120000' },
  },
})
const versions = values.versions?.split(',') ?? DEFAULT_VERSIONS
const timeout = Number(values.timeout)
const serveCandidate = candidateServer(values.dist)

async function probeOne(browser, version) {
  const page = await browser.newPage()
  const served = values.published ? undefined : await serveCandidate(page)
  const consoleErrors = []
  page.on('console', m => {
    if (m.type() === 'error') {
      consoleErrors.push(m.text().slice(0, 300))
    }
  })
  page.on('pageerror', e => {
    consoleErrors.push(`pageerror: ${String(e).slice(0, 300)}`)
  })

  const result = { version, consoleErrors }
  try {
    await gotoHosted(page, version, `config=${encodeURIComponent(HPRC_CONFIG)}`)
    // Readiness is the session global or the error page, not markup: the
    // loading spinner is an svg, so an element wait returns before plugins load.
    await page.waitForFunction(
      () =>
        !!window.JBrowseSession ||
        /JBrowse Error|Fatal error/.test(document.body.innerText),
      { timeout },
    )
    result.appError = await page.evaluate(() => {
      const t = document.body.innerText
      return /JBrowse Error|Fatal error/.test(t)
        ? t.split('\n').slice(0, 4).join(' | ').slice(0, 300)
        : undefined
    })
    if (!result.appError) {
      result.viewRegistered = await page.evaluate(() =>
        window.JBrowseRootModel.pluginManager.viewTypes.has('GraphGenomeView'),
      )
    }
    if (result.viewRegistered) {
      const viewId = await page.evaluate(
        ({ trackId, region }) =>
          window.JBrowseSession.addView('GraphGenomeView', {
            loadedTrackId: trackId,
            loadedRegion: region,
          }).id,
        { trackId: TRACK_ID, region: REGION },
      )
      await page.waitForFunction(
        id => {
          const view = window.JBrowseSession.views.find(v => v.id === id)
          return !!view && (view.hasGraph || view.error !== undefined)
        },
        { timeout },
        viewId,
      )
      result.cut = await page.evaluate(id => {
        const view = window.JBrowseSession.views.find(v => v.id === id)
        return {
          nodes: view.nodeCount,
          error:
            view.error === undefined
              ? undefined
              : String(view.error).slice(0, 300),
        }
      }, viewId)

      // Cutting resolves the adapter's chunks; the Bandage engine is a
      // ~425kb sibling chunk that only `loadBandage()` pulls, and only a
      // force-directed layout calls it. It is the largest thing this plugin
      // ships and the whole reason the bundle is split, so a probe that stops
      // at the cut leaves it untested — a `chunks/` directory that did not
      // survive rehosting passes every other gate and fails the first time a
      // reader asks for the drawing.
      if (result.cut?.error === undefined) {
        await page.evaluate(id => {
          window.JBrowseSession.views
            .find(v => v.id === id)
            .setLayoutMode('force')
        }, viewId)
        await page.waitForFunction(
          id => {
            const view = window.JBrowseSession.views.find(v => v.id === id)
            return !!view && (view.nodePositions || view.error !== undefined)
          },
          { timeout },
          viewId,
        )
        result.layout = await page.evaluate(id => {
          const view = window.JBrowseSession.views.find(v => v.id === id)
          return {
            placed: view.nodePositions
              ? Object.keys(view.nodePositions).length
              : 0,
            error:
              view.error === undefined
                ? undefined
                : String(view.error).slice(0, 300),
          }
        }, viewId)
      }
    }
    // The same track as a linear view draws it. Its display renders host
    // components the graph view does not: jbrowse-web main dropped
    // DisplayStatusChrome on 2026-10-08, and the track failed there with
    // React error #130 while the cut above passed.
    if (result.layout?.error === undefined && result.layout?.placed) {
      await page.evaluate(
        async ({ trackId, locus }) => {
          const view = window.JBrowseSession.addView('LinearGenomeView', {})
          await view.navToLocString(locus, 'hg38')
          view.showTrack(trackId)
        },
        { trackId: TRACK_ID, locus: LOCUS },
      )
      await page.waitForFunction(
        () =>
          !!document.querySelector(
            '[data-testid="linear-graph-display"][data-display-drawn="true"]',
          ) ||
          /Minified React error|Element type is invalid/.test(
            document.body.innerText,
          ),
        { timeout },
      )
      result.linear = await page.evaluate(() => {
        const drawn = document.querySelector(
          '[data-testid="linear-graph-display"][data-display-drawn="true"]',
        )
        const crash =
          /(Minified React error[^\n]*|Element type is invalid[^\n]*)/.exec(
            document.body.innerText,
          )
        return {
          nodes: drawn ? Number(drawn.getAttribute('data-node-count')) : 0,
          error: crash?.[1]?.slice(0, 300),
        }
      })
    }
    // A synteny view asks for its window at fractional bp, which gbz-base
    // rejected unrounded: every such view errored from
    // 6.16.0 to 6.21.0 while the steps above passed. The zoom by 1.37 keeps
    // the window off whole bp whatever the viewport.
    if (result.linear?.nodes && result.linear.error === undefined) {
      const syntenyId = await page.evaluate(
        async ({ trackId, views }) => {
          await window.JBrowseRootModel.pluginManager
            .getViewType('LinearSyntenyView')
            .loadStateModel?.()
          return window.JBrowseSession.addView('LinearSyntenyView', {
            init: { views, tracks: [trackId] },
          }).id
        },
        { trackId: SYNTENY_TRACK_ID, views: SYNTENY_VIEWS },
      )
      result.synteny = await page.evaluate(
        async (id, ms) => {
          const view = window.JBrowseSession.views.find(v => v.id === id)
          const deadline = Date.now() + ms
          const display = () => view.levels[0]?.tracks[0]?.displays[0]
          const settled = d =>
            !!d && (!!d.error || (!!d.featureData && !d.statusMessage))
          const until = async done => {
            while (!done() && Date.now() < deadline) {
              await new Promise(r => setTimeout(r, 250))
            }
          }
          await until(() => settled(display()))
          const before = display()?.featureData
          if (!display()?.error) {
            view.views[0].zoomTo(view.views[0].bpPerPx * 1.37)
            await until(() => {
              const d = display()
              return !!d?.error || (settled(d) && d.featureData !== before)
            })
          }
          const d = display()
          return {
            features: d?.featureData?.featureIds.length ?? 0,
            error: d?.error ? String(d.error).slice(0, 300) : undefined,
          }
        },
        syntenyId,
        timeout,
      )
    }
    // The forms track draws through core's multi-sample variant display, which
    // none of the steps above touch, and its menu comes from this plugin's
    // extension of that display type
    if (result.viewRegistered) {
      result.forms = await page.evaluate(
        async ({ track, locus }, ms) => {
          const session = window.JBrowseSession
          session.addTrackConf(track)
          const view = session.addView('LinearGenomeView', {
            init: { assembly: 'hg38', loc: locus, tracks: [track.trackId] },
          })
          const deadline = Date.now() + ms
          const display = () => view.tracks[0]?.displays[0]
          while (Date.now() < deadline) {
            const d = display()
            if (d?.error || (d?.sourcesBase?.length && d.cellData)) {
              break
            }
            await new Promise(r => setTimeout(r, 250))
          }
          const d = display()
          const labels = d?.trackMenuItems?.().map(i => i.label) ?? []
          return {
            rows: d?.sourcesBase?.length ?? 0,
            cells: !!d?.cellData,
            menu: labels.includes('Re-pin to visible region'),
            error: d?.error ? String(d.error).slice(0, 300) : undefined,
          }
        },
        { track: FORMS_TRACK, locus: FORMS_LOCUS },
        timeout,
      )
    }
  } catch (e) {
    result.threw = String(e).slice(0, 300)
  }
  result.unserved = served && !served.some(s => s.file === ENTRY)
  await page.close()
  return result
}

function failure(r) {
  if (r.appError) {
    return `SESSION FAILED: ${r.appError}`
  }
  if (r.threw) {
    return `probe threw: ${r.threw}`
  }
  if (r.unserved) {
    return `${ENTRY} was never served, so the host loaded the plugin from a url the probe does not intercept`
  }
  if (!r.viewRegistered) {
    return 'GraphGenomeView never registered (the bundle threw while loading)'
  }
  if (r.cut?.error !== undefined) {
    return `the cut failed: ${r.cut.error}`
  }
  if (!r.cut?.nodes) {
    return 'the cut came back empty'
  }
  if (r.layout?.error !== undefined) {
    return `the force layout failed: ${r.layout.error}`
  }
  if (!r.layout?.placed) {
    return 'the force layout placed nothing, so the Bandage chunk did not load'
  }
  if (r.linear?.error !== undefined) {
    return `the linear view's graph track failed: ${r.linear.error}`
  }
  if (!r.linear?.nodes) {
    return "the linear view's graph track drew nothing"
  }
  if (r.synteny?.error !== undefined) {
    return `the synteny view on the walk lane track failed: ${r.synteny.error}`
  }
  if (!r.synteny?.features) {
    return 'the synteny view on the walk lane track read no features'
  }
  if (r.forms?.error !== undefined) {
    return `the structural forms track failed: ${r.forms.error}`
  }
  if (!r.forms?.rows || !r.forms.cells) {
    return 'the structural forms track drew no rows'
  }
  if (!r.forms.menu) {
    return "the structural forms track's menu has no re-pin item, so the display extension did not attach"
  }
  return undefined
}

const browser = await launchBrowser({
  defaultViewport: { width: 1400, height: 900 },
})

console.log(
  `${values.published ? 'the published bundle on' : `serving ${values.dist} to`} ${HPRC_CONFIG}\nhosts: ${versions.join(', ')}\n`,
)

const results = []
for (const version of versions) {
  const r = await probeOne(browser, version)
  results.push(r)
  const bad = failure(r)
  console.log(
    `${version.padEnd(14)} ${
      bad ??
      `ok, cut ${r.cut.nodes} nodes, laid out ${r.layout.placed}, track drew ${r.linear.nodes}, synteny read ${r.synteny.features}, ${r.forms.rows} form rows`
    }`,
  )
  if (bad) {
    for (const e of [...new Set(r.consoleErrors)].slice(0, 4)) {
      console.log(`               · ${e}`)
    }
  }
}
await browser.close()

const broken = results.filter(r => failure(r)).map(r => r.version)
if (broken.length > 0) {
  console.error(`\nFailed on: ${broken.join(', ')}`)
  process.exit(1)
}
console.log(
  '\nEvery probed host loaded the bundle, cut a graph, drew it with Bandage, drew the track in a linear view, read walk lane synteny and drew structural forms.',
)
