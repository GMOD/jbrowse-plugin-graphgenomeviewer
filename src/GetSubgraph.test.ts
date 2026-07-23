import PluginManager from '@jbrowse/core/PluginManager'
import { getAdapter } from '@jbrowse/core/data_adapters/dataAdapterCache'


import GetSubgraph from './GetSubgraph'
import { convertGFAToGraph } from './GraphGenomeView/gfa/gfaConverter'
import { anchoredLayout } from './GraphGenomeView/layout/anchoredLayout'
import { parseGFA, stableCoordinate } from './gfa-core/index'
import GraphPlugin from './index'

jest.mock('@jbrowse/core/data_adapters/dataAdapterCache')

const mockGetAdapter = jest.mocked(getAdapter)

const region = {
  refName: 'chr',
  assemblyName: 'K12',
  start: 993236,
  end: 997574,
}

function makeArgs(sessionId = 'graph') {
  return {
    adapterConfig: { type: 'RgfaTabixAdapter' },
    region,
    sessionId,
  }
}

function makeMethod() {
  const pluginManager = new PluginManager([new GraphPlugin()])
  pluginManager.createPluggableElements()
  pluginManager.configure()
  return new GetSubgraph(pluginManager)
}

// GraphGenomeView.loadFromTabixSubgraph calls rpcManager by this exact string;
// nothing else checks that a method answers to it, and when the method went
// missing the view failed only at runtime.
test('the plugin registers GetSubgraph under the name the view calls', () => {
  const pluginManager = new PluginManager([new GraphPlugin()])
  pluginManager.createPluggableElements()
  pluginManager.configure()
  expect(pluginManager.getRpcMethodType('GetSubgraph').name).toBe('GetSubgraph')
})

test('forwards the region and context to the adapter', async () => {
  const getSubgraph = jest.fn().mockResolvedValue('H\tVN:Z:1.0')
  mockGetAdapter.mockResolvedValue({
    dataAdapter: { getSubgraph },
  })

  const result = await makeMethod().execute(
    { ...makeArgs(), opts: { context: 2 } },
    'MainThreadRpcDriver',
  )
  expect(getSubgraph).toHaveBeenCalledWith(region, { context: 2 })
  expect(result).toBe('H\tVN:Z:1.0')
})

// An adapter without getSubgraph is the normal case for a PAF-backed synteny
// track, so it returns empty rather than throwing; the view turns that into a
// message.
test('returns empty for an adapter that cannot cut subgraphs', async () => {
  mockGetAdapter.mockResolvedValue({
    dataAdapter: { getFeatures: jest.fn() },
  })

  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
  const result = await makeMethod().execute(makeArgs(), 'MainThreadRpcDriver')
  expect(result).toBe('')
  expect(warn).toHaveBeenCalled()
  warn.mockRestore()
})

// The GFA an rGFA-backed adapter returns: no sequence, spans as LN, and the
// SN/SO/SR tags that let the view lay the subgraph out from the file rather
// than from a force simulation. Byte-for-byte what RgfaTabixAdapter emits for
// the region above (see its test).
const SUBGRAPH_GFA = [
  'H\tVN:Z:1.0',
  'S\ts1727\t*\tLN:i:226\tSN:Z:CFT073#1#chr\tSO:i:1044024\tSR:i:2',
  'S\ts1728\t*\tLN:i:75\tSN:Z:CFT073#1#chr\tSO:i:1048515\tSR:i:2',
  'S\ts322\t*\tLN:i:74\tSN:Z:K12#1#chr\tSO:i:993236\tSR:i:0',
  'S\ts323\t*\tLN:i:4264\tSN:Z:K12#1#chr\tSO:i:993310\tSR:i:0',
  'S\ts324\t*\tLN:i:7093\tSN:Z:K12#1#chr\tSO:i:997574\tSR:i:0',
  'L\ts1727\t+\ts323\t+\t0M',
  'L\ts322\t+\ts323\t+\t0M',
  'L\ts323\t+\ts1728\t+\t0M',
  'L\ts323\t+\ts324\t+\t0M',
].join('\n')

test('a sequenceless subgraph keeps its lengths and stable coordinates', () => {
  const gfa = parseGFA(SUBGRAPH_GFA)
  expect(gfa.nodes.map(n => n.length)).toEqual([226, 75, 74, 4264, 7093])
  expect(gfa.nodes.map(n => stableCoordinate(n))).toEqual([
    { refName: 'CFT073#1#chr', start: 1044024, rank: 2 },
    { refName: 'CFT073#1#chr', start: 1048515, rank: 2 },
    { refName: 'K12#1#chr', start: 993236, rank: 0 },
    { refName: 'K12#1#chr', start: 993310, rank: 0 },
    { refName: 'K12#1#chr', start: 997574, rank: 0 },
  ])
})

test('a subgraph lays out anchored, without the layout WASM', () => {
  const graph = convertGFAToGraph(parseGFA(SUBGRAPH_GFA), 'test')
  const layout = anchoredLayout(graph)
  expect(layout).toBeDefined()
  // node ids carry the canonical strand, so `s322` becomes `s322+`
  const at = (id: string) => layout!.nodePositions[id]![0]!
  // rank-0 segments sit at the offset they declare, all on row 0
  expect(at('s322+')).toEqual({ x: 993236, y: 0 })
  expect(at('s323+')).toEqual({ x: 993310, y: 0 })
  expect(at('s324+')).toEqual({ x: 997574, y: 0 })
  // rank 2 hangs off the backbone on a row of its own, from where it branches
  expect(at('s1727+').y).toBeGreaterThan(0)
  expect(at('s1727+').y).toBe(at('s1728+').y)
})
