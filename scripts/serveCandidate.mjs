// Answers a hosted JBrowse's requests for this plugin with the local dist/, on
// the page and on every worker it starts, so a real shipped config loads the
// candidate instead of what jbrowse.org serves. Shared by host-compat-probe.mjs.
// `fixtures` maps a path on the host to a local directory, served the same
// way, so a figure can draw local data on a hosted JBrowse.
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

const CONTENT_TYPES = {
  '.js': 'application/javascript',
  '.json': 'application/json',
}

// The file a fixture route names, sliced to the Range a sqlite or tabix
// reader asks for
function fixtureResponse(file, range) {
  const bytes = fs.readFileSync(file)
  const headers = [
    {
      name: 'Content-Type',
      value: CONTENT_TYPES[path.extname(file)] ?? 'application/octet-stream',
    },
    { name: 'Access-Control-Allow-Origin', value: '*' },
    { name: 'Accept-Ranges', value: 'bytes' },
  ]
  const [, from, to] = /bytes=(\d+)-(\d*)/.exec(range ?? '') ?? []
  if (from === undefined) {
    return { responseCode: 200, responseHeaders: headers, body: bytes }
  }
  const start = Number(from)
  const end = Math.min(to ? Number(to) : bytes.length - 1, bytes.length - 1)
  return {
    responseCode: 206,
    responseHeaders: [
      ...headers,
      { name: 'Content-Range', value: `bytes ${start}-${end}/${bytes.length}` },
    ],
    body: bytes.subarray(start, end + 1),
  }
}

export function candidateServer(distDir, fixtures = {}) {
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

  function fixtureFile(url) {
    const { pathname } = new URL(url)
    for (const [prefix, dir] of Object.entries(fixtures)) {
      if (pathname.startsWith(prefix)) {
        const file = path.join(dir, pathname.slice(prefix.length))
        return fs.existsSync(file) ? file : undefined
      }
    }
    return undefined
  }

  function respond(request) {
    const fixture = fixtureFile(request.url)
    if (fixture) {
      return fixtureResponse(fixture, request.headers.Range)
    }
    const body = candidateBody(request.url)
    return body === undefined
      ? undefined
      : {
          responseCode: 200,
          responseHeaders: [
            { name: 'Content-Type', value: 'application/javascript' },
            { name: 'Access-Control-Allow-Origin', value: '*' },
          ],
          body,
        }
  }

  // Fetch patterns on each target's own session rather than
  // page.setRequestInterception, which pauses every request including the RPC
  // worker's and never resumes those. The worker imports the plugin too, for
  // the RPC methods it serves, so it gets the same interception.
  async function serveOn(client, where) {
    client.on('Fetch.requestPaused', async ({ requestId, request }) => {
      try {
        const response = respond(request)
        if (process.env.PROBE_DEBUG && response) {
          console.error(`served ${request.url} to ${where}`)
        }
        await (response === undefined
          ? client.send('Fetch.continueRequest', { requestId })
          : client.send('Fetch.fulfillRequest', {
              requestId,
              ...response,
              body: Buffer.from(response.body).toString('base64'),
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
        ...Object.keys(fixtures).map(prefix => ({ urlPattern: `*${prefix}*` })),
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
