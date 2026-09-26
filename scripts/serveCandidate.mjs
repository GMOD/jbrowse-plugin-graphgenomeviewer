// Answers a hosted JBrowse's requests for this plugin with the local dist/, on
// the page and on every worker it starts, so a real shipped config loads the
// candidate instead of what jbrowse.org serves. Shared by host-compat-probe.mjs.
import fs from 'node:fs'
import path from 'node:path'

// Where a hosted config names the bundle: the store's versioned path, or the
// demos path older configs still carry.
const DEMOS_PATH = '/demos/graphgenomeviewer/'
const STORE_PATH =
  /\/plugins\/jbrowse-plugin-graphgenomeviewer\/[^/]+\/dist\/(.*)$/

function distRelative(pathname) {
  const demos = pathname.indexOf(DEMOS_PATH)
  return demos === -1
    ? STORE_PATH.exec(pathname)?.[1]
    : pathname.slice(demos + DEMOS_PATH.length)
}

export function candidateServer(distDir) {
  // The whole dist, by the path under the plugin's url: the entry imports its
  // code-split chunks by their own hashed names, and answering those with the
  // entry would fail in a way that reads as a host incompatibility.
  function candidateBody(url) {
    const { pathname } = new URL(url)
    const relative = distRelative(pathname)
    if (relative === undefined || !pathname.endsWith('.js')) {
      return undefined
    }
    const file = path.join(distDir, relative)
    return fs.existsSync(file) ? fs.readFileSync(file) : undefined
  }

  // Fetch patterns on each target's own session rather than
  // page.setRequestInterception, which pauses every request including the RPC
  // worker's and never resumes those. The worker imports the plugin too, for
  // the RPC methods it serves, so it gets the same interception.
  async function serveOn(client, where) {
    client.on('Fetch.requestPaused', async ({ requestId, request }) => {
      try {
        const body = candidateBody(request.url)
        if (process.env.PROBE_DEBUG && body) {
          console.error(`served ${request.url} to ${where}`)
        }
        await (body === undefined
          ? client.send('Fetch.continueRequest', { requestId })
          : client.send('Fetch.fulfillRequest', {
              requestId,
              responseCode: 200,
              responseHeaders: [
                { name: 'Content-Type', value: 'application/javascript' },
                { name: 'Access-Control-Allow-Origin', value: '*' },
              ],
              body: body.toString('base64'),
            }))
      } catch {
        await client
          .send('Fetch.continueRequest', { requestId })
          .catch(() => {})
      }
    })
    await client.send('Fetch.enable', {
      patterns: [
        { urlPattern: `*${DEMOS_PATH}*` },
        { urlPattern: '*/plugins/jbrowse-plugin-graphgenomeviewer/*' },
      ],
    })
  }

  return async function serveCandidate(page) {
    page.on('workercreated', worker => {
      serveOn(worker.client, `worker ${worker.url()}`).catch(() => {})
    })
    await serveOn(await page.createCDPSession(), 'page')
  }
}
