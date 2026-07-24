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

// The plugin bundle plus the hashed engine chunk are copied into the JBrowse
// static dir, and the GFA test file is served alongside so the view can fetch
// it over http exactly as a real deployment would.
export function setupJBrowse() {
  if (!fs.existsSync(TEST_JBROWSE_DIR)) {
    throw new Error(
      `JBrowse dir missing at ${TEST_JBROWSE_DIR}. Run: jbrowse create ${TEST_JBROWSE_DIR} --nightly`,
    )
  }

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

  fs.copyFileSync(
    path.join(process.cwd(), 'test_data', 'ecoli_pggb_subgraph.gfa'),
    path.join(TEST_JBROWSE_DIR, 'test.gfa'),
  )

  fs.writeFileSync(
    path.join(TEST_JBROWSE_DIR, 'config.json'),
    JSON.stringify(createTestConfig(), null, 2),
  )
}

// A GraphGenomeView instantiated straight from the session snapshot: gfaLocation
// points at the served file and layoutMode 'force' selects the Bandage engine,
// so loading the page alone drives the lazy-chunk path end to end.
function createTestConfig() {
  const base = `http://localhost:${JBROWSE_PORT}`
  return {
    plugins: [
      {
        name: 'GraphGenomeView',
        esmUrl: `${base}/plugin/jbrowse-plugin-graphgenomeviewer.esm.js`,
      },
    ],
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
  proc.stdout.on('data', d => { console.log(`[serve] ${d}`.trimEnd()) })
  proc.stderr.on('data', d => { console.log(`[serve] ${d}`.trimEnd()) })
  jbrowseServer = proc
  await waitForServer(JBROWSE_PORT)
  return proc
}

export async function cleanupJBrowse() {
  const proc = jbrowseServer
  if (proc && !proc.killed) {
    await new Promise<void>(resolve => {
      proc.on('close', () => { resolve() })
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
  page.on('console', msg => { console.log(`[browser ${msg.type()}] ${msg.text()}`) })
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
