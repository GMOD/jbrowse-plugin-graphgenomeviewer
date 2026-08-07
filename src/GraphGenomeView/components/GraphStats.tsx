import { makeStyles } from '@jbrowse/core/util/tss-react'
import { Typography } from '@mui/material'
import { observer } from 'mobx-react'

import type { GraphGenomeViewModel } from '../model'

const useStyles = makeStyles()({
  stats: {
    marginLeft: 'auto',
  },
  perf: {
    color: '#888',
    fontVariantNumeric: 'tabular-nums',
  },
})

function fmtMs(ms: number | undefined) {
  return ms === undefined ? '–' : `${Math.round(ms)}ms`
}

// Perf readout — always carries the raw numbers as data-* attributes, so browser
// tests can assert against timing budgets without scraping formatted text, and
// so turning the TEXT off costs no coverage.
//
// The text is off by default (`showPerf`, in the settings menu) because it sat
// in the toolbar of every published graph figure, where one machine's fetch time
// is a number a reader has to work out is not about them.
const GraphPerf = observer(function GraphPerf({
  model,
}: {
  model: GraphGenomeViewModel
}) {
  const { classes } = useStyles()
  const { lastFetchMs, lastLayoutMs, lastGeometryMs, lastGeometryVertexCount } =
    model
  const hasMetrics =
    lastFetchMs !== undefined ||
    lastLayoutMs !== undefined ||
    lastGeometryMs !== undefined
  return hasMetrics ? (
    <Typography
      variant="caption"
      className={classes.perf}
      data-testid="graph-perf-stats"
      data-fetch-ms={lastFetchMs ?? ''}
      data-layout-ms={lastLayoutMs ?? ''}
      data-geometry-ms={lastGeometryMs ?? ''}
      data-geometry-vertices={lastGeometryVertexCount ?? ''}
    >
      {model.showPerf
        ? `fetch ${fmtMs(lastFetchMs)} · layout ${fmtMs(lastLayoutMs)} · geom ${fmtMs(lastGeometryMs)}`
        : null}
    </Typography>
  ) : null
})

const GraphStats = observer(function GraphStats({
  model,
}: {
  model: GraphGenomeViewModel
}) {
  const { classes } = useStyles()
  return (
    <div
      className={classes.stats}
      data-testid="graph-stats"
      data-node-count={model.nodeCount}
      data-edge-count={model.edgeCount}
      data-path-count={model.pathCount}
    >
      <Typography variant="body2" component="span">
        {model.nodeCount} nodes, {model.edgeCount} edges
        {model.pathCount > 0 ? `, ${model.pathCount} paths` : ''}
      </Typography>{' '}
      <GraphPerf model={model} />
    </div>
  )
})

export default GraphStats
