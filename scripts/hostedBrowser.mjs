// Launches Chrome and opens a JBrowse in it, for host-compat-probe.mjs,
// preview-candidate.mjs, shoot-figures.mjs and the e2e suites' test/setup.ts.
import puppeteer from 'puppeteer'

// A real shipped config that names this plugin
export const HPRC_CONFIG = 'https://jbrowse.org/demos/hprc/config.json'

// Chrome 155 turns WebGL off under --use-gl=swiftshader.
// --enable-unsafe-swiftshader lets it draw WebGL with SwiftShader on a machine
// with no GPU.
export function launchBrowser(options = {}) {
  return puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--enable-unsafe-swiftshader'],
    ...options,
  })
}

export function gotoHosted(page, version, query) {
  return page.goto(
    `https://jbrowse.org/code/jb2/${version}/?${query.replace(/^\?/, '')}`,
    { waitUntil: 'domcontentloaded', timeout: 60_000 },
  )
}

// Resolves two frames after core's AppReadyMarker reads "ready", which covers
// every view's showLoading and every display's displayPhase
export async function waitAppReady(page, timeout) {
  await page.waitForFunction(
    () =>
      document
        .querySelector('[data-testid="app-ready-marker"]')
        ?.getAttribute('data-app-phase') === 'ready',
    { timeout },
  )
  await page.evaluate(
    () =>
      new Promise(r => {
        requestAnimationFrame(() => requestAnimationFrame(r))
      }),
  )
}

// Painted, not merely loaded: a 15,808-node cut reports its node count seconds
// before FMMM finishes, and a screenshot then catches an empty pane.
export async function waitGraphPainted(page, timeout) {
  await page.waitForFunction(
    () => {
      const text = document.body.innerText
      const tracks = [
        ...document.querySelectorAll(
          '[data-testid="linear-graph-display"]:not([data-display-phase="tooLarge"])',
        ),
      ]
      const drawn =
        tracks.length > 0
          ? tracks.every(t => Number(t.getAttribute('data-node-count')) > 0)
          : /\d nodes/.test(text)
      return drawn && !/Computing layout|Laying out|Loading/.test(text)
    },
    { timeout, polling: 500 },
  )
  await waitAppReady(page, timeout)
}
