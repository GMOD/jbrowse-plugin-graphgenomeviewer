#!/usr/bin/env node
//
// Screenshots a hosted JBrowse session with this checkout's dist/ standing in
// for the published bundle, to look at a change before it is released.
//
// Usage:
//   node scripts/preview-candidate.mjs '<?config=...&session=...>' out.png
//   node scripts/preview-candidate.mjs '<query>' out.png --version main --width 1400
//
import { parseArgs } from 'node:util'

import puppeteer from 'puppeteer'

import { candidateServer } from './serveCandidate.mjs'

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    dist: { type: 'string', default: 'dist' },
    version: { type: 'string', default: 'main' },
    width: { type: 'string', default: '1400' },
    height: { type: 'string', default: '900' },
    timeout: { type: 'string', default: '120000' },
  },
})
const [query, out] = positionals
if (!query || !out) {
  console.error('usage: preview-candidate.mjs <query> <out.png>')
  process.exit(2)
}

const browser = await puppeteer.launch({
  args: ['--no-sandbox', '--enable-unsafe-swiftshader'],
})
try {
  const page = await browser.newPage()
  await page.setViewport({
    width: Number(values.width),
    height: Number(values.height),
  })
  await candidateServer(values.dist)(page)
  const url = `https://jbrowse.org/code/jb2/${values.version}/${query.startsWith('?') ? query : `?${query}`}`
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  const ready = await page
    .waitForFunction(
      () => {
        const roots = [
          ...document.querySelectorAll('[data-testid="linear-graph-display"]'),
        ]
        return (
          roots.length > 0 &&
          roots.every(
            r =>
              Number(r.getAttribute('data-node-count')) > 0 &&
              !r.textContent?.includes('Loading'),
          )
        )
      },
      { timeout: Number(values.timeout), polling: 500 },
    )
    .then(
      () => true,
      () => false,
    )
  if (ready) {
    await page.waitForNetworkIdle({ idleTime: 1500, timeout: 60_000 })
  }
  await page.screenshot({ path: out })
  console.log(`wrote ${out}${ready ? '' : ' (a graph display never finished)'}`)
  process.exitCode = ready ? 0 : 1
} finally {
  await browser.close()
}
