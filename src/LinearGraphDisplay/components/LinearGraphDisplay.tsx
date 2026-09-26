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
  const { pane, height } = model
  return (
    <div
      data-testid="linear-graph-display"
      style={{
        position: 'relative',
        width: pane.width,
        height,
        overflow: 'hidden',
      }}
    >
      {pane.hasGraph ? (
        <GraphCanvas model={pane} toolbar={false} />
      ) : (
        <GraphLoadStatus model={pane} />
      )}
      {pane.cutNote ? (
        <Typography
          variant="caption"
          color="warning.main"
          style={noteStyle}
          data-testid="graph-cut-note"
        >
          {pane.cutNote}
        </Typography>
      ) : null}
    </div>
  )
})

export default LinearGraphDisplay
