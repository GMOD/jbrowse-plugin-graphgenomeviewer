import { Typography } from '@mui/material'
import { observer } from 'mobx-react'

import GraphCanvas from '../../GraphGenomeView/components/GraphCanvas'
import GraphLoadStatus from '../../GraphGenomeView/components/GraphLoadStatus'

import type { LinearGraphDisplayModel } from '../model'

const noteStyle = {
  position: 'absolute' as const,
  left: 8,
  top: 4,
  zIndex: 5,
  background: 'rgba(255,255,255,0.82)',
  padding: '0 4px',
  borderRadius: 3,
}

const LinearGraphDisplay = observer(function LinearGraphDisplay({
  model,
}: {
  model: LinearGraphDisplayModel
}) {
  return (
    <div
      data-testid="linear-graph-display"
      data-layout={model.chosenLayoutMode}
      data-cut-tier={model.cutTier}
      data-recuts={model.recuts}
      data-node-count={model.hasGraph ? model.nodeCount : undefined}
      data-loading={model.isLoading ? '' : undefined}
      style={{
        position: 'relative',
        width: model.paneWidth,
        height: model.height,
        overflow: 'hidden',
      }}
    >
      <GraphCanvas model={model} toolbar={false} />
      {model.hasGraph ? null : <GraphLoadStatus model={model} />}
      {model.cutNote ? (
        <Typography
          variant="caption"
          color="warning.main"
          style={noteStyle}
          data-testid="graph-cut-note"
        >
          {model.cutNote}
        </Typography>
      ) : null}
    </div>
  )
})

export default LinearGraphDisplay
