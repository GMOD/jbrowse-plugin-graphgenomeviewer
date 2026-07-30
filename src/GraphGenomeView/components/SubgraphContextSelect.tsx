import { makeStyles } from '@jbrowse/core/util/tss-react'
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from '@mui/material'
import { observer } from 'mobx-react'

import type { GraphGenomeViewModel } from '../model'

const useStyles = makeStyles()({
  section: {
    marginBottom: 24,
  },
  formControl: {
    minWidth: 200,
  },
})

// Hops past the region's own segments, each costing a tabix query per
// off-reference segment already reached. It stops at two because a coordinate
// frontier never closes the graph however far it runs — see subgraphContext in
// the model, and cut an exact slice with gfatools when that is what is wanted.
const SUBGRAPH_CONTEXTS = [
  { value: 0, label: 'None' },
  { value: 1, label: '1 hop' },
  { value: 2, label: '2 hops' },
]

// Only a graph cut from a track has a cut to widen: a file-loaded graph is
// already whatever its file holds, and re-cutting it means nothing.
const SubgraphContextSelect = observer(function SubgraphContextSelect({
  model,
}: {
  model: GraphGenomeViewModel
}) {
  const { classes } = useStyles()
  return model.loadedTrackId ? (
    <div className={classes.section}>
      <FormControl className={classes.formControl}>
        <InputLabel>Graph context</InputLabel>
        <Select
          value={model.subgraphContext}
          label="Graph context"
          data-testid="graph-context-select"
          onChange={e => {
            model.setSubgraphContext(e.target.value)
            void model.reloadSubgraph()
          }}
        >
          {SUBGRAPH_CONTEXTS.map(({ value, label }) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Typography variant="caption" color="text.secondary">
        How far the cut follows links out of the region. A detour that leaves
        the reference before the window and rejoins after it is indexed under
        its own sequence, so at none its middle is missing and it draws as two
        short stubs rather than as the bubble it is.
      </Typography>
    </div>
  ) : null
})

export default SubgraphContextSelect
