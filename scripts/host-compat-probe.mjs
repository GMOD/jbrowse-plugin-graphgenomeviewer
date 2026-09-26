#!/usr/bin/env node
//
// Boots the built plugin on hosted JBrowse releases and cuts a subgraph on
// each, failing if a host error-pages, never registers the view, or cannot
// cut. The tutorials name the plugin by its jbrowse.org url, so a publish is a
// live change to every reader's session, and the failures this catches pass
// tsc, eslint and the unit tests: an RPC argument a released core cannot post
// to its worker, a re-export the host no longer serves. They show only when
// the bundle runs on the host. The oldest version listed is the support floor.
//
// Usage:
//   node scripts/host-compat-probe.mjs
//   node scripts/host-compat-probe.mjs --versions v5.0.0-beta.9,main --dist dist
//
import { parseArgs } from 'node:util'

import puppeteer from 'puppeteer'

import { candidateServer } from './serveCandidate.mjs'

const DEFAULT_VERSIONS = ['v5.0.0-beta.9', 'main']
// A real shipped config that names this plugin, and the window part 1 of the
// HPRC tutorial cuts from its segments track.
const CONFIG = 'https://jbrowse.org/demos/hprc/config.json'
const TRACK_ID = 'hprc_minigraph_segments'
const REGION = {
  refName: 'chr6',
  assemblyName: 'hg38',
  start: 31_980_000,
  end: 32_050_000,
}

const { values } = parseArgs({
  options: {
    dist: { type: 'string', default: 'dist' },
    versions: { type: 'string' },
    timeout: { type: 'string', default: '120000' },
  },
})
const versions = values.versions?.split(',') ?? DEFAULT_VERSIONS
const timeout = Number(values.timeout)
const serveCandidate = candidateServer(values.dist)

async function probeOne(browser, version) {
  const page = await browser.newPage()
  await serveCandidate(page)
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
    const url = `https://jbrowse.org/code/jb2/${version}/?config=${encodeURIComponent(CONFIG)}`
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 })
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
  } catch (e) {
    result.threw = String(e).slice(0, 300)
  }
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
  return undefined
}

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--use-gl=swiftshader'],
  defaultViewport: { width: 1400, height: 900 },
})

console.log(
  `serving ${values.dist} to ${CONFIG}\nhosts: ${versions.join(', ')}\n`,
)

const results = []
for (const version of versions) {
  const r = await probeOne(browser, version)
  results.push(r)
  const bad = failure(r)
  console.log(
    `${version.padEnd(14)} ${
      bad ?? `ok, cut ${r.cut.nodes} nodes, laid out ${r.layout.placed}`
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
  '\nEvery probed host loaded the bundle, cut a graph and drew it with Bandage.',
)
