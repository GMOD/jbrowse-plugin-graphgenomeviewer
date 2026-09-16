import { LoadingEllipses } from '@jbrowse/core/ui'
import { LinearProgress, Paper } from '@mui/material'
import { observer } from 'mobx-react'
import { makeStyles } from 'tss-react/mui'

import type { GraphGenomeViewModel } from '../model'

const useStyles = makeStyles()({
  paper: {
    padding: 16,
    margin: 8,
    maxWidth: 560,
    marginInline: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
})

const GraphLoading = observer(function GraphLoading({
  model,
}: {
  model: GraphGenomeViewModel
}) {
  const { classes } = useStyles()
  return (
    <Paper className={classes.paper} data-testid="graph-genome-loading">
      <LoadingEllipses variant="h6" message={model.statusMessage} />
      <LinearProgress variant="indeterminate" />
    </Paper>
  )
})

export default GraphLoading
