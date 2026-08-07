import { type ChildProcess, execSync, spawn } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'

import { launch } from 'puppeteer'

import type { Browser, Page } from 'puppeteer'

export const JBROWSE_PORT = 9876

// JBROWSE_TEST_DIR lets you point at a jbrowse-web built from a graph_viz
// checkout (see forceLayout.test.ts); otherwise the versioned nightly dir.
const TEST_JBROWSE_VERSION = process.env.TEST_JBROWSE_VERSION || 'nightly'
const TEST_JBROWSE_DIR =
  process.env.JBROWSE_TEST_DIR ??
  path.join(process.cwd(), `.test-jbrowse-${TEST_JBROWSE_VERSION}`)

export const BASE_URL = `http://localhost:${JBROWSE_PORT}`

export const PLUGIN_ESM_URL = `${BASE_URL}/plugin/jbrowse-plugin-graphgenomeviewer.esm.js`

// Where screenshots land. Gitignored: they are evidence a run produced, not
// committed baselines — nothing here diffs against a golden image.
export const SCREENSHOT_DIR = path.join(process.cwd(), 'test-screenshots')

export async function waitForServer(port: number, timeout = 30_000) {
  const start = Date.now()
  let lastError: unknown
  while (Date.now() - start < timeout) {
    try {
      await new Promise<void>((resolve, reject) => {
        const req = http.get(`http://localhost:${port}/`, res => {
          if (res.statusCode === 200) {
            resolve()
          } else {
            reject(new Error(`server returned ${res.statusCode}`))
          }
        })
        req.on('error', reject)
        req.setTimeout(1000, () => {
          req.destroy()
          reject(new Error('request timeout'))
        })
      })
      return
    } catch (e) {
      lastError = e
      await new Promise(r => setTimeout(r, 500))
    }
  }
  throw new Error(`server on ${port} not up in ${timeout}ms: ${lastError}`)
}

// Core APIs the plugin compiles against that a JBrowse older than them cannot
// provide. Both are recent and unreleased, and both fail the same expensive way:
// the plugin throws while installing, every suite dies in setup with a minified
// `e.<something> is not a function`, and the whole thing reads as a plugin bug.
// A copied host dir is a snapshot nothing refreshes — `.test-jbrowse-demos` sat
// at 2026-07-24 for two weeks — so this is checked rather than assumed.
//
// Grepping the served bundles is crude and exactly enough: the names are not
// mangled (they are property accesses on PluginManager and assemblyManager), and
// a false pass here just returns us to the old failure.
const HOST_REQUIRES = [
  ['contributeToExtensionPoint', 'core 2026-08-05'],
  ['requireAssembly', 'core 2026-08-04'],
] as const

function assertHostIsCurrentEnough() {
  const jsDir = path.join(TEST_JBROWSE_DIR, 'static', 'js')
  if (!fs.existsSync(jsDir)) {
    return
  }
  const bundles = fs
    .readdirSync(jsDir)
    .filter(f => f.endsWith('.js'))
    .map(f => fs.readFileSync(path.join(jsDir, f), 'utf8'))
  const missing = HOST_REQUIRES.filter(
    ([name]) => !bundles.some(b => b.includes(name)),
  )
  if (missing.length > 0) {
    throw new Error(
      `The JBrowse at ${TEST_JBROWSE_DIR} is older than this plugin needs — ` +
        `it has no ${missing.map(([name, since]) => `${name} (${since})`).join(', ')}. ` +
        'Every suite would fail in setup with a minified "is not a function" ' +
        'that looks like a plugin bug. Refresh it:\n' +
        '  cp -r ~/src/jbrowse-components/products/jbrowse-web/build ' +
        TEST_JBROWSE_DIR,
    )
  }
}

// The plugin bundle plus the hashed engine chunk are copied into the JBrowse
// static dir, and the GFA test file is served alongside so the view can fetch
// it over http exactly as a real deployment would.
export function setupJBrowse({
  config,
  dataFiles = [],
}: {
  // A whole JBrowse config to serve. Defaults to the force-layout graph view
  // the original e2e tests boot into.
  config?: unknown
  // `[sourcePathRelativeToRepo, destNameInServedDir]` pairs, copied verbatim so
  // a test can serve its own fixtures over http exactly as a deployment would.
  dataFiles?: [string, string][]
} = {}) {
  if (!fs.existsSync(TEST_JBROWSE_DIR)) {
    throw new Error(
      `JBrowse dir missing at ${TEST_JBROWSE_DIR}. Run: jbrowse create ${TEST_JBROWSE_DIR} --nightly`,
    )
  }
  assertHostIsCurrentEnough()

  const distDir = path.join(process.cwd(), 'dist')
  const skipBuild = process.env.SKIP_BUILD === '1'
  if (skipBuild && fs.existsSync(distDir)) {
    console.log('skipping build (SKIP_BUILD=1)')
  } else {
    fs.rmSync(distDir, { recursive: true, force: true })
    execSync('pnpm build:bundle', { stdio: 'inherit', timeout: 120_000 })
  }

  const pluginDir = path.join(TEST_JBROWSE_DIR, 'plugin')
  fs.mkdirSync(pluginDir, { recursive: true })
  fs.cpSync(distDir, pluginDir, { recursive: true })

  for (const [source, dest] of [
    ['test_data/ecoli_pggb_subgraph.gfa', 'test.gfa'],
    ...dataFiles,
  ] satisfies [string, string][]) {
    const target = path.join(TEST_JBROWSE_DIR, dest)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.copyFileSync(path.join(process.cwd(), source), target)
  }

  fs.writeFileSync(
    path.join(TEST_JBROWSE_DIR, 'config.json'),
    JSON.stringify(config ?? createTestConfig(), null, 2),
  )
}

// Written into the served dir rather than committed: it is derived from the rGFA
// fixture, so it can't drift from it.
export function writeServedFile(dest: string, contents: string) {
  const target = path.join(TEST_JBROWSE_DIR, dest)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, contents)
}

export async function screenshot(page: Page, name: string) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
  const file = path.join(SCREENSHOT_DIR, `${name}.png`)
  await page.screenshot({ path: file })
  console.log(`[screenshot] ${file}`)
}

// A GraphGenomeView instantiated straight from the session snapshot: gfaLocation
// points at the served file and layoutMode 'force' selects the Bandage engine,
// so loading the page alone drives the lazy-chunk path end to end.
function createTestConfig() {
  const base = BASE_URL
  return {
    plugins: [{ name: 'GraphGenomeView', esmUrl: PLUGIN_ESM_URL }],
    assemblies: [],
    defaultSession: {
      name: 'e2e',
      views: [
        {
          id: 'graph_e2e',
          type: 'GraphGenomeView',
          layoutMode: 'force',
          gfaLocation: { uri: `${base}/test.gfa`, locationType: 'UriLocation' },
        },
      ],
    },
  }
}

let jbrowseServer: ChildProcess | undefined

function killProcessOnPort(port: number) {
  try {
    execSync(`lsof -ti:${port} | xargs -r kill -9 2>/dev/null || true`, {
      stdio: 'ignore',
    })
  } catch {
    // port likely unused
  }
}

export async function startJBrowseServer() {
  killProcessOnPort(JBROWSE_PORT)
  const proc = spawn(
    'npx',
    [
      'serve',
      '--cors',
      '-l',
      `tcp://127.0.0.1:${JBROWSE_PORT}`,
      TEST_JBROWSE_DIR,
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  )
  proc.stdout.on('data', d => {
    console.log(`[serve] ${d}`.trimEnd())
  })
  proc.stderr.on('data', d => {
    console.log(`[serve] ${d}`.trimEnd())
  })
  jbrowseServer = proc
  await waitForServer(JBROWSE_PORT)
  return proc
}

export async function cleanupJBrowse() {
  const proc = jbrowseServer
  if (proc && !proc.killed) {
    await new Promise<void>(resolve => {
      proc.on('close', () => {
        resolve()
      })
      proc.kill('SIGTERM')
      setTimeout(() => {
        if (!proc.killed) {
          proc.kill('SIGKILL')
        }
        resolve()
      }, 5000)
    })
  }
}

export async function launchBrowser() {
  return launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
}

export async function createJBrowsePage(browser: Browser): Promise<Page> {
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 900 })
  page.on('console', msg => {
    console.log(`[browser ${msg.type()}] ${msg.text()}`)
  })
  page.on('pageerror', err => {
    const message = err instanceof Error ? err.message : String(err)
    console.log(`[browser error] ${message}`)
  })
  page.on('requestfailed', req => {
    console.log(`[req failed] ${req.url()}: ${req.failure()?.errorText}`)
  })
  await page.goto(`http://localhost:${JBROWSE_PORT}/`, {
    waitUntil: 'networkidle2',
    timeout: 60_000,
  })
  return page
}

export async function waitForReactMount(page: Page) {
  await page.waitForFunction(
    () => {
      const root = document.querySelector('#root')
      return !!root && root.children.length > 0
    },
    { timeout: 30_000 },
  )
}
