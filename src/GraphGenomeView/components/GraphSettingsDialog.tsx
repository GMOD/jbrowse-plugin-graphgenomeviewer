import { Dialog } from '@jbrowse/core/ui'
import { makeStyles } from '@jbrowse/core/util/tss-react'
import {
  DialogActions,
  DialogContent,
  FormControl,
  FormControlLabel,
  FormLabel,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Switch,
  Tooltip,
  Typography,
} from '@mui/material'
import Button from '@mui/material/Button'
import { observer } from 'mobx-react'

import SubgraphContextSelect from './SubgraphContextSelect'
import { BUBBLE_SPREADS } from '../bubbleSpreads'
import { COLOR_SCHEMES } from '../colorSchemes'

import type { GraphGenomeViewModel } from '../model'

const useStyles = makeStyles()({
  section: {
    marginBottom: 24,
  },
  formControl: {
    minWidth: 200,
  },
})

const qualityLabels = ['Lowest', 'Low', 'Medium', 'High', 'Highest'] as const

const GraphSettingsDialog = observer(function GraphSettingsDialog(props: {
  model: GraphGenomeViewModel
  open: boolean
  onClose: () => void
}) {
  const { model, open, onClose } = props
  const { classes } = useStyles()

  return (
    <Dialog open={open} onClose={onClose} title="Graph settings">
      <DialogContent>
        <div className={classes.section}>
          <FormControl fullWidth>
            <FormLabel component="legend">Layout quality</FormLabel>
            <RadioGroup
              value={model.layoutQuality}
              onChange={e => {
                const quality = parseInt(e.target.value)
                model.setLayoutQuality(quality)
                void model.recomputeLayout()
              }}
            >
              {qualityLabels.map((label, i) => (
                <FormControlLabel
                  key={label}
                  value={i}
                  control={<Radio />}
                  label={label}
                />
              ))}
            </RadioGroup>
          </FormControl>
        </div>

        <div className={classes.section}>
          <FormControlLabel
            control={
              <Switch
                checked={model.drawPaths}
                onChange={e => {
                  model.setDrawPaths(e.target.checked)
                }}
              />
            }
            label="Draw paths"
          />
          <Typography variant="caption" color="text.secondary">
            Color each node and connector by the paths through it, one lane per
            path in legend order, so a path that skips a node leaves its lane
            empty
          </Typography>
        </div>

        {model.anchorPaths.length > 1 ? (
          <div className={classes.section}>
            <FormControl className={classes.formControl}>
              <InputLabel>Reference path</InputLabel>
              <Select
                value={model.activeReferencePath ?? ''}
                label="Reference path"
                data-testid="graph-reference-path-select"
                onChange={e => {
                  model.setReferencePath(e.target.value)
                  void model.recomputeLayout()
                }}
              >
                {model.anchorPaths.map(({ name }) => (
                  <MenuItem key={name} value={name}>
                    {name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography variant="caption" color="text.secondary">
              Which path the anchored layouts draw x against. A GFA with no rGFA
              tags states its coordinates only in its paths, and marks none of
              them as the reference.
            </Typography>
          </div>
        ) : null}

        <div className={classes.section}>
          <FormControl className={classes.formControl}>
            <InputLabel>Bubble spread</InputLabel>
            <Select
              value={model.bubbleSpread}
              label="Bubble spread"
              data-testid="graph-bubble-spread-select"
              onChange={e => {
                model.setBubbleSpread(e.target.value)
                void model.recomputeLayout()
              }}
            >
              {BUBBLE_SPREADS.map(({ value, label, description }) => (
                <MenuItem key={value} value={value}>
                  <Tooltip title={description} placement="right">
                    <span>{label}</span>
                  </Tooltip>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography variant="caption" color="text.secondary">
            How far the force layout opens a bubble. A pangenome allele is a few
            bp, so at Bandage's own scale both arms land inside one node
            thickness and the graph draws as a rope.
          </Typography>
        </div>

        <SubgraphContextSelect model={model} />

        <div className={classes.section}>
          <FormControl className={classes.formControl}>
            <InputLabel>Color scheme</InputLabel>
            <Select
              value={model.colorScheme}
              label="Color scheme"
              onChange={e => {
                model.setColorScheme(e.target.value)
              }}
            >
              {COLOR_SCHEMES.map(({ value, label }) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>
      </DialogContent>

      <DialogActions>
        <Button variant="contained" color="primary" onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
})

export default GraphSettingsDialog
