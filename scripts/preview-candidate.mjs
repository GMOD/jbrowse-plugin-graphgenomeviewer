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

import {
  gotoHosted,
  launchBrowser,
  waitGraphPainted,
} from './hostedBrowser.mjs'
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

const browser = await launchBrowser({
  defaultViewport: {
    width: Number(values.width),
    height: Number(values.height),
  },
})
try {
  const page = await browser.newPage()
  await candidateServer(values.dist)(page)
  await gotoHosted(page, values.version, query)
  const ready = await waitGraphPainted(page, Number(values.timeout)).then(
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
